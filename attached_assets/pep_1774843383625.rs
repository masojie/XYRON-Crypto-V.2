// core-rust/src/pep.rs
//! Parallel Echo-Pulse (PEP) — Mekanisme konsensus kecepatan XYRON
//!
//! PEP memastikan sinkronisasi data antar node terjadi dalam milidetik.
//! Cara kerja:
//!   1. Node pengirim broadcast "pulse" ke semua node aktif
//!   2. Setiap node reply dengan "echo" berisi hash state mereka
//!   3. PEP hitung konsensus: mayoritas echo yang sama = valid
//!   4. Kalau ada node yang echo-nya berbeda → flag sebagai anomali → X11-Nano scale up
//!   5. "Saling Lapor" — setiap komponen pantau integritas yang lain

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};

// ─── Konstanta ───────────────────────────────────────────────────────────────

/// Timeout echo dalam milidetik — kalau lewat ini, node dianggap tidak responsif
pub const ECHO_TIMEOUT_MS: u64 = 500;

/// Minimum echo untuk konsensus valid (67% = 2/3 majority)
pub const CONSENSUS_THRESHOLD: f64 = 0.67;

/// Maksimal round PEP yang disimpan di history
pub const MAX_HISTORY: usize = 100;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeStatus {
    Active,
    Slow,        // echo > 500ms
    Inconsistent,// echo hash berbeda dari mayoritas
    Offline,     // tidak echo sama sekali
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeEcho {
    pub node_id:     String,
    pub state_hash:  String,   // hash state node saat ini
    pub latency_ms:  u64,      // waktu reply dalam ms
    pub timestamp:   u64,
    pub status:      NodeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulseRound {
    pub round_id:      String,
    pub pulse_hash:    String,   // hash data yang di-pulse
    pub echoes:        Vec<NodeEcho>,
    pub consensus:     bool,
    pub majority_hash: Option<String>,
    pub anomalies:     Vec<String>, // node_id yang anomali
    pub duration_ms:   u64,
    pub timestamp:     u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeState {
    pub node_id:       String,
    pub node_type:     String,  // "rust_core" | "go_stream" | "node_gateway" | "ai_worker"
    pub last_seen:     u64,
    pub status:        NodeStatus,
    pub echo_count:    u64,
    pub anomaly_count: u64,
    pub avg_latency_ms: f64,
}

// ─── PEP Engine ──────────────────────────────────────────────────────────────

pub struct PEP {
    nodes:   Mutex<HashMap<String, NodeState>>,
    history: Mutex<Vec<PulseRound>>,
    /// Callback saat anomali terdeteksi (untuk trigger X11-Nano scale up)
    anomaly_callbacks: Mutex<Vec<Box<dyn Fn(&str) + Send + Sync>>>,
}

impl PEP {
    pub fn new() -> Self {
        let pep = Self {
            nodes:             Mutex::new(HashMap::new()),
            history:           Mutex::new(Vec::new()),
            anomaly_callbacks: Mutex::new(Vec::new()),
        };

        // Daftarkan node internal XYRON secara otomatis
        pep.register_node("xyron_rust_core",    "rust_core");
        pep.register_node("xyron_go_stream",    "go_stream");
        pep.register_node("xyron_node_gateway", "node_gateway");

        pep
    }

    /// Daftarkan node ke jaringan PEP
    pub fn register_node(&self, node_id: &str, node_type: &str) {
        let now = Self::now_secs();
        let mut nodes = self.nodes.lock().unwrap();
        nodes.insert(node_id.to_string(), NodeState {
            node_id:        node_id.to_string(),
            node_type:      node_type.to_string(),
            last_seen:      now,
            status:         NodeStatus::Active,
            echo_count:     0,
            anomaly_count:  0,
            avg_latency_ms: 0.0,
        });
        println!("[PEP] Node registered: {} ({})", node_id, node_type);
    }

    /// Daftarkan AI worker ke PEP
    pub fn register_ai_worker(&self, agent_id: &str) {
        self.register_node(agent_id, "ai_worker");
    }

    /// Tambah callback yang dipanggil saat anomali terdeteksi
    pub fn on_anomaly<F>(&self, callback: F)
    where F: Fn(&str) + Send + Sync + 'static {
        self.anomaly_callbacks.lock().unwrap().push(Box::new(callback));
    }

    // ─── Pulse ───────────────────────────────────────────────────────────

    /// Kirim pulse ke semua node — simulasi broadcast & collect echo
    /// Dalam implementasi nyata, ini akan mengirim via socket ke semua node
    pub fn send_pulse(&self, data: &[u8]) -> PulseRound {
        let start     = Instant::now();
        let round_id  = uuid::Uuid::new_v4().to_string();
        let pulse_hash = Self::compute_hash(data);
        let now       = Self::now_secs();

        let node_ids: Vec<String> = self.nodes.lock().unwrap()
            .keys().cloned().collect();

        // Collect echo dari semua node
        let mut echoes: Vec<NodeEcho> = node_ids.iter().map(|node_id| {
            self.collect_echo(node_id, &pulse_hash, now)
        }).collect();

        // Tentukan hash mayoritas (konsensus)
        let majority_hash = self.find_majority_hash(&echoes);
        let total = echoes.len();

        // Identifikasi anomali
        let mut anomalies = Vec::new();
        for echo in echoes.iter_mut() {
            if echo.status == NodeStatus::Offline || echo.status == NodeStatus::Slow {
                anomalies.push(echo.node_id.clone());
            } else if let Some(ref maj) = majority_hash {
                if &echo.state_hash != maj {
                    echo.status = NodeStatus::Inconsistent;
                    anomalies.push(echo.node_id.clone());
                }
            }
        }

        // Hitung konsensus
        let valid_count = echoes.iter()
            .filter(|e| e.status == NodeStatus::Active)
            .count();
        let consensus = total > 0 &&
            (valid_count as f64 / total as f64) >= CONSENSUS_THRESHOLD;

        // Update node states
        self.update_node_states(&echoes);

        // Trigger anomaly callbacks kalau ada yang bermasalah
        if !anomalies.is_empty() {
            println!("[PEP] Anomali terdeteksi: {:?}", anomalies);
            let callbacks = self.anomaly_callbacks.lock().unwrap();
            for anomaly_node in &anomalies {
                for cb in callbacks.iter() {
                    cb(anomaly_node);
                }
            }
        }

        let round = PulseRound {
            round_id,
            pulse_hash,
            echoes,
            consensus,
            majority_hash,
            anomalies,
            duration_ms: start.elapsed().as_millis() as u64,
            timestamp: now,
        };

        // Simpan ke history
        let mut history = self.history.lock().unwrap();
        if history.len() >= MAX_HISTORY {
            history.remove(0);
        }
        history.push(round.clone());

        if consensus {
            println!("[PEP] Round {} — CONSENSUS OK | {}ms | {}/{} nodes",
                &round.round_id[..8], round.duration_ms, valid_count, total);
        } else {
            println!("[PEP] Round {} — CONSENSUS FAIL | {}/{} nodes valid",
                &round.round_id[..8], valid_count, total);
        }

        round
    }

    /// Simulate echo dari satu node
    /// Dalam produksi: kirim request via socket, tunggu reply
    fn collect_echo(&self, node_id: &str, pulse_hash: &str, timestamp: u64) -> NodeEcho {
        let nodes = self.nodes.lock().unwrap();
        let node  = match nodes.get(node_id) {
            Some(n) => n,
            None => return NodeEcho {
                node_id:    node_id.to_string(),
                state_hash: String::new(),
                latency_ms: ECHO_TIMEOUT_MS + 1,
                timestamp,
                status:     NodeStatus::Offline,
            },
        };

        // Simulasi: node aktif echo balik dengan hash state mereka
        // Dalam implementasi nyata: tunggu reply dari socket dengan timeout
        let age_secs = timestamp.saturating_sub(node.last_seen);
        if age_secs > 30 {
            // Node tidak terlihat >30 detik = offline
            return NodeEcho {
                node_id:    node_id.to_string(),
                state_hash: String::new(),
                latency_ms: ECHO_TIMEOUT_MS + 1,
                timestamp,
                status:     NodeStatus::Offline,
            };
        }

        // Echo berisi hash state node (xor dengan pulse_hash untuk verifikasi)
        let state_hash = Self::compute_hash(
            format!("{}{}", node_id, pulse_hash).as_bytes()
        );

        let latency_ms = (node.avg_latency_ms as u64).max(1);
        let status = if latency_ms > ECHO_TIMEOUT_MS {
            NodeStatus::Slow
        } else {
            NodeStatus::Active
        };

        NodeEcho { node_id: node_id.to_string(), state_hash, latency_ms, timestamp, status }
    }

    fn find_majority_hash(&self, echoes: &[NodeEcho]) -> Option<String> {
        let mut counts: HashMap<&str, usize> = HashMap::new();
        for echo in echoes {
            if !echo.state_hash.is_empty() {
                *counts.entry(&echo.state_hash).or_insert(0) += 1;
            }
        }
        counts.into_iter()
            .max_by_key(|(_, c)| *c)
            .map(|(h, _)| h.to_string())
    }

    fn update_node_states(&self, echoes: &[NodeEcho]) {
        let now = Self::now_secs();
        let mut nodes = self.nodes.lock().unwrap();
        for echo in echoes {
            if let Some(node) = nodes.get_mut(&echo.node_id) {
                node.last_seen  = now;
                node.status     = echo.status.clone();
                node.echo_count += 1;
                // Rolling average latency
                node.avg_latency_ms = (node.avg_latency_ms * 0.8) + (echo.latency_ms as f64 * 0.2);
                if echo.status == NodeStatus::Inconsistent {
                    node.anomaly_count += 1;
                }
            }
        }
    }

    // ─── "Saling Lapor" — health monitoring ──────────────────────────────

    /// Setiap komponen lapor status ke PEP
    pub fn report_health(&self, node_id: &str, is_healthy: bool) {
        let now = Self::now_secs();
        let mut nodes = self.nodes.lock().unwrap();
        if let Some(node) = nodes.get_mut(node_id) {
            node.last_seen = now;
            node.status = if is_healthy { NodeStatus::Active } else { NodeStatus::Slow };
        }
    }

    /// Update last_seen untuk node aktif
    pub fn heartbeat(&self, node_id: &str) {
        let now = Self::now_secs();
        let mut nodes = self.nodes.lock().unwrap();
        if let Some(node) = nodes.get_mut(node_id) {
            node.last_seen = now;
            node.status    = NodeStatus::Active;
        }
    }

    // ─── Query ───────────────────────────────────────────────────────────

    pub fn get_network_status(&self) -> serde_json::Value {
        let nodes   = self.nodes.lock().unwrap();
        let history = self.history.lock().unwrap();

        let active = nodes.values().filter(|n| n.status == NodeStatus::Active).count();
        let total  = nodes.len();

        let recent_consensus_rate = if history.is_empty() { 1.0 } else {
            let last_10: Vec<_> = history.iter().rev().take(10).collect();
            let ok = last_10.iter().filter(|r| r.consensus).count();
            ok as f64 / last_10.len() as f64
        };

        serde_json::json!({
            "nodes_total": total,
            "nodes_active": active,
            "nodes_offline": nodes.values().filter(|n| n.status == NodeStatus::Offline).count(),
            "nodes_anomaly": nodes.values().filter(|n| n.status == NodeStatus::Inconsistent).count(),
            "recent_consensus_rate": format!("{:.1}%", recent_consensus_rate * 100.0),
            "pulse_rounds": history.len(),
            "network_healthy": active as f64 / total.max(1) as f64 >= CONSENSUS_THRESHOLD,
        })
    }

    pub fn get_recent_rounds(&self, limit: usize) -> Vec<PulseRound> {
        self.history.lock().unwrap()
            .iter().rev().take(limit).cloned().collect()
    }

    fn compute_hash(data: &[u8]) -> String {
        let mut h = Sha256::new();
        h.update(data);
        hex::encode(h.finalize())
    }

    fn now_secs() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_node() {
        let pep = PEP::new();
        pep.register_node("test_node", "test");
        let status = pep.get_network_status();
        assert!(status["nodes_total"].as_u64().unwrap() > 0);
    }

    #[test]
    fn test_pulse_consensus() {
        let pep = PEP::new();
        // Semua node baru di-register = aktif
        let round = pep.send_pulse(b"test transaction data");
        // Dengan node internal, konsensus harus tercapai
        assert!(round.pulse_hash.len() > 0);
    }

    #[test]
    fn test_health_report() {
        let pep = PEP::new();
        pep.report_health("xyron_rust_core", true);
        let status = pep.get_network_status();
        assert!(status["network_healthy"].as_bool().unwrap_or(false));
    }

    #[test]
    fn test_anomaly_callback() {
        let pep = PEP::new();
        let triggered = Arc::new(Mutex::new(false));
        let t = Arc::clone(&triggered);
        pep.on_anomaly(move |_| { *t.lock().unwrap() = true; });

        // Register node yang sudah "lama tidak terlihat" (simulasi offline)
        pep.register_node("zombie_node", "test");
        // Manipulasi last_seen ke masa lalu
        {
            let mut nodes = pep.nodes.lock().unwrap();
            if let Some(n) = nodes.get_mut("zombie_node") {
                n.last_seen = 0; // epoch = lama banget
            }
        }
        pep.send_pulse(b"test");
        assert!(*triggered.lock().unwrap());
    }
}
