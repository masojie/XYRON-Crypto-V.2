// core-rust/src/ai_governance.rs
//! AI Governance System — XYRON
//!
//! Mengatur:
//!   - Registrasi & status AI Master (maks 21)
//!   - AI Army patrol & enforcement
//!   - Penilaian performa trading (win rate)
//!   - Terminate & replace AI yang buruk
//!   - Pewarisan memori ke pengganti
//!
//! Rules AI Master:
//!   BOLEH  : trading ≤10 XYR/tx · mining setiap block · analisa market
//!   WARNING: trading >10 XYR (perlu Army approval) · >50 tx/hari
//!   BANNED : transfer ke luar ekosistem · collude · 2x pelanggaran berat

use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use crate::vault::Vault;

// ─── Konstanta ───────────────────────────────────────────────────────────────

/// Win rate minimum untuk tetap aktif (45%)
pub const MIN_WIN_RATE: f64 = 0.45;

/// Win rate target elite (65%)
pub const ELITE_WIN_RATE: f64 = 0.65;

/// Maksimal transaksi per hari tanpa approval Army
pub const MAX_TX_PER_DAY: u64 = 50;

/// Maksimal amount per tx tanpa approval Army (10 XYR = 10_000_000 nIZ)
pub const MAX_TX_AMOUNT_NIZ: u64 = 10_000_000;

/// Pelanggaran berat maksimal sebelum terminate
pub const MAX_VIOLATIONS: u32 = 2;

/// Minimum trade history sebelum dievaluasi (30 trade)
pub const MIN_TRADES_FOR_EVAL: u64 = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgentTier {
    Elite,      // win rate >65%
    Active,     // win rate 45-65%
    Probation,  // win rate <45% tapi belum cukup data atau baru warning
    Terminated, // dipecat — menunggu diganti
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DeviceType {
    PcMiner,
    SmartphoneMiner,
    AiWorker, // AI tidak dikategorikan PC/HP
}

/// Memori yang diwariskan ke AI pengganti
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMemory {
    pub total_trades: u64,
    pub total_wins: u64,
    pub total_volume_niz: u64,
    pub best_patterns: Vec<String>,  // pattern candlestick yang berhasil
    pub worst_patterns: Vec<String>, // pattern yang selalu loss
    pub inherited_from: Option<String>, // ID agent pendahulu
    pub generation: u32,             // generasi ke berapa (1 = original)
}

impl AgentMemory {
    pub fn new() -> Self {
        Self {
            total_trades: 0,
            total_wins: 0,
            total_volume_niz: 0,
            best_patterns: vec![],
            worst_patterns: vec![],
            inherited_from: None,
            generation: 1,
        }
    }

    pub fn win_rate(&self) -> f64 {
        if self.total_trades == 0 { return 0.0; }
        self.total_wins as f64 / self.total_trades as f64
    }

    /// Wariskan memori ke agent baru — agent baru tidak mulai dari nol
    pub fn inherit_from(predecessor: &AgentMemory, predecessor_id: &str) -> Self {
        Self {
            total_trades: predecessor.total_trades,
            total_wins: predecessor.total_wins,
            total_volume_niz: predecessor.total_volume_niz,
            best_patterns: predecessor.best_patterns.clone(),
            worst_patterns: predecessor.worst_patterns.clone(),
            inherited_from: Some(predecessor_id.to_string()),
            generation: predecessor.generation + 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAgent {
    pub id: String,
    pub wallet_address: String,
    pub tier: AgentTier,
    pub violations: u32,
    pub tx_count_today: u64,
    pub memory: AgentMemory,
    pub registered_at: u64,
    pub suspended_until: Option<u64>, // timestamp suspend sementara
}

impl AIAgent {
    pub fn new(id: &str, wallet_address: &str) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Self {
            id: id.to_string(),
            wallet_address,
            tier: AgentTier::Active,
            violations: 0,
            tx_count_today: 0,
            memory: AgentMemory::new(),
            registered_at: now,
            suspended_until: None,
        }
    }

    pub fn is_suspended(&self) -> bool {
        if let Some(until) = self.suspended_until {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            return now < until;
        }
        false
    }

    pub fn evaluate_tier(&mut self) {
        if self.memory.total_trades < MIN_TRADES_FOR_EVAL {
            return; // belum cukup data untuk evaluasi
        }
        let wr = self.memory.win_rate();
        self.tier = if wr >= ELITE_WIN_RATE {
            AgentTier::Elite
        } else if wr >= MIN_WIN_RATE {
            AgentTier::Active
        } else {
            AgentTier::Probation
        };
    }
}

// ─── AIGovernance ────────────────────────────────────────────────────────────

pub struct AIGovernance {
    agents: Mutex<HashMap<String, AIAgent>>,
}

impl AIGovernance {
    pub fn new() -> Self {
        Self {
            agents: Mutex::new(HashMap::new()),
        }
    }

    /// Daftarkan AI agent baru
    pub fn register_agent(&self, agent_id: &str, wallet_address: String) {
        let agent = AIAgent::new(agent_id, &wallet_address);
        self.agents.lock().unwrap().insert(agent_id.to_string(), agent);
        println!("[AI-ARMY] Agent {} registered — tier: Active", agent_id);
    }

    /// Catat hasil trade — update memori dan evaluasi tier
    pub fn report_trade(&self, agent_id: &str, win: bool, amount_niz: u64) {
        let mut agents = self.agents.lock().unwrap();
        if let Some(agent) = agents.get_mut(agent_id) {
            // Cek rule: amount tidak boleh melebihi limit tanpa approval
            if amount_niz > MAX_TX_AMOUNT_NIZ {
                agent.violations += 1;
                println!("[AI-ARMY] WARNING: {} exceeded tx limit ({} nIZ). Violation #{}/{}",
                    agent_id, amount_niz, agent.violations, MAX_VIOLATIONS);
                if agent.violations >= MAX_VIOLATIONS {
                    agent.tier = AgentTier::Terminated;
                    println!("[AI-ARMY] TERMINATE: {} — too many violations", agent_id);
                    return;
                }
            }

            // Cek rule: tx count harian
            agent.tx_count_today += 1;
            if agent.tx_count_today > MAX_TX_PER_DAY {
                agent.violations += 1;
                println!("[AI-ARMY] WARNING: {} exceeded daily tx limit. Violation #{}/{}",
                    agent_id, agent.violations, MAX_VIOLATIONS);
            }

            // Update memori
            agent.memory.total_trades += 1;
            if win { agent.memory.total_wins += 1; }
            agent.memory.total_volume_niz += amount_niz;

            // Evaluasi tier setiap 10 trade
            if agent.memory.total_trades % 10 == 0 {
                agent.evaluate_tier();
                println!("[AI-ARMY] {} evaluated — win rate: {:.1}% — tier: {:?}",
                    agent_id,
                    agent.memory.win_rate() * 100.0,
                    agent.tier
                );
            }
        }
    }

    /// AI Army patrol — cek semua agent, return list yang perlu ditindak
    pub fn army_patrol(&self) -> Vec<serde_json::Value> {
        let mut agents = self.agents.lock().unwrap();
        let mut flagged = vec![];

        for (id, agent) in agents.iter_mut() {
            match agent.tier {
                AgentTier::Probation => {
                    flagged.push(serde_json::json!({
                        "agent_id": id,
                        "action": "warning",
                        "win_rate": agent.memory.win_rate(),
                        "trades": agent.memory.total_trades,
                        "message": "Win rate below 45% — improve or face termination"
                    }));
                }
                AgentTier::Terminated => {
                    flagged.push(serde_json::json!({
                        "agent_id": id,
                        "action": "terminate",
                        "violations": agent.violations,
                        "message": "Agent terminated — pending replacement"
                    }));
                }
                _ => {}
            }
        }

        if flagged.is_empty() {
            println!("[AI-ARMY] Patrol complete — all agents nominal");
        } else {
            println!("[AI-ARMY] Patrol complete — {} agents flagged", flagged.len());
        }

        flagged
    }

    /// Ganti AI Master yang ter-terminate dengan instance baru
    /// Memori DIWARISKAN ke pengganti — tidak mulai dari nol
    pub fn replace_agent(
        &self,
        vault: &Vault,
        old_agent_id: &str,
        new_pin: &str,
    ) -> Result<String, String> {
        let mut agents = self.agents.lock().unwrap();

        let old_agent = agents.get(old_agent_id)
            .ok_or(format!("Agent {} not found", old_agent_id))?;

        if old_agent.tier != AgentTier::Terminated {
            return Err(format!("Agent {} is not terminated — cannot replace", old_agent_id));
        }

        // Ambil memori pendahulu untuk diwariskan
        let inherited_memory = AgentMemory::inherit_from(
            &old_agent.memory,
            old_agent_id
        );
        let generation = inherited_memory.generation;

        // Buat ID agent baru (generasi berikutnya)
        let new_id = format!("{}_gen{}", old_agent_id, generation);

        // Drop lock sebelum panggil vault (hindari deadlock)
        drop(agents);

        // Register wallet baru di vault
        let new_address = vault.register_ai_worker(&new_id, new_pin)
            .map_err(|e| format!("Failed to create wallet for {}: {}", new_id, e))?;

        // Buat agent baru dengan memori warisan
        let mut new_agent = AIAgent::new(&new_id, &new_address);
        new_agent.memory = inherited_memory;

        // Simpan agent baru, hapus yang lama
        let mut agents = self.agents.lock().unwrap();
        agents.remove(old_agent_id);
        agents.insert(new_id.clone(), new_agent);

        println!("[AI-ARMY] Agent {} replaced by {} (gen {}) — memory inherited",
            old_agent_id, new_id, generation);

        Ok(new_address)
    }

    /// Approve transaksi besar dari AI Master (>10 XYR)
    pub fn army_approve_large_tx(
        &self,
        agent_id: &str,
        amount_niz: u64,
    ) -> Result<bool, String> {
        let agents = self.agents.lock().unwrap();
        let agent = agents.get(agent_id)
            .ok_or("Agent not found")?;

        if agent.tier == AgentTier::Terminated {
            return Err("Terminated agent cannot transact".to_string());
        }
        if agent.is_suspended() {
            return Err("Agent is suspended".to_string());
        }

        // Army approve berdasarkan track record
        let wr = agent.memory.win_rate();
        let approved = wr >= MIN_WIN_RATE && agent.violations == 0;

        println!("[AI-ARMY] Large tx approval for {} ({} nIZ): {}",
            agent_id, amount_niz, if approved { "APPROVED" } else { "REJECTED" });

        Ok(approved)
    }

    /// Status lengkap satu agent
    pub fn get_agent_status(&self, agent_id: &str) -> Option<serde_json::Value> {
        let agents = self.agents.lock().unwrap();
        agents.get(agent_id).map(|a| serde_json::json!({
            "id": a.id,
            "wallet": a.wallet_address,
            "tier": format!("{:?}", a.tier),
            "violations": a.violations,
            "tx_today": a.tx_count_today,
            "win_rate": format!("{:.1}%", a.memory.win_rate() * 100.0),
            "total_trades": a.memory.total_trades,
            "total_volume_xyr": a.memory.total_volume_niz as f64 / 1_000_000.0,
            "generation": a.memory.generation,
            "inherited_from": a.memory.inherited_from,
            "suspended": a.is_suspended(),
        }))
    }

    /// Reset tx count harian (dipanggil setiap 24 jam dari Node.js)
    pub fn reset_daily_counts(&self) {
        let mut agents = self.agents.lock().unwrap();
        for agent in agents.values_mut() {
            agent.tx_count_today = 0;
        }
        println!("[AI-ARMY] Daily tx counts reset");
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_agent() {
        let gov = AIGovernance::new();
        gov.register_agent("ai_001", "XYR1abc123".to_string());
        assert!(gov.get_agent_status("ai_001").is_some());
    }

    #[test]
    fn test_win_rate_evaluation() {
        let gov = AIGovernance::new();
        gov.register_agent("ai_002", "XYR1def456".to_string());

        // Simulasi 30 trade dengan 20 win (66.7% win rate → Elite)
        for i in 0..30 {
            gov.report_trade("ai_002", i < 20, 1_000_000);
        }

        let status = gov.get_agent_status("ai_002").unwrap();
        assert_eq!(status["tier"], "Elite");
    }

    #[test]
    fn test_violation_terminate() {
        let gov = AIGovernance::new();
        gov.register_agent("ai_003", "XYR1ghi789".to_string());

        // 2x pelanggaran amount besar → terminate
        gov.report_trade("ai_003", true, MAX_TX_AMOUNT_NIZ + 1);
        gov.report_trade("ai_003", true, MAX_TX_AMOUNT_NIZ + 1);

        let status = gov.get_agent_status("ai_003").unwrap();
        assert_eq!(status["tier"], "Terminated");
    }

    #[test]
    fn test_memory_inheritance() {
        let mut pred = AgentMemory::new();
        pred.total_trades = 100;
        pred.total_wins = 70;
        pred.generation = 1;
        pred.best_patterns = vec!["bullish_engulfing".to_string()];

        let inherited = AgentMemory::inherit_from(&pred, "ai_001");
        assert_eq!(inherited.total_trades, 100);
        assert_eq!(inherited.total_wins, 70);
        assert_eq!(inherited.generation, 2);
        assert_eq!(inherited.inherited_from, Some("ai_001".to_string()));
        assert_eq!(inherited.best_patterns, vec!["bullish_engulfing"]);
    }

    #[test]
    fn test_army_patrol() {
        let gov = AIGovernance::new();
        gov.register_agent("ai_good", "XYR1aaa".to_string());
        gov.register_agent("ai_bad", "XYR1bbb".to_string());

        // ai_bad: banyak loss
        for i in 0..35 {
            gov.report_trade("ai_bad", i < 10, 1_000_000); // 28% win rate
        }

        let flagged = gov.army_patrol();
        assert!(!flagged.is_empty());
    }
}
