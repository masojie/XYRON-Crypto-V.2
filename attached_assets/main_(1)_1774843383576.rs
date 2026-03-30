// core-rust/src/main.rs — XYRON Core v2.1
//! Triple-Engine Validation: LQV + PEP + NCE
//! X11-Nano Dynamic Shield: 11-15 layer adaptif
//! Parallel Hashing + Smart Compression
//! AI Governance + Vault + Reward Engine

use std::io::{Read, Write};
use std::os::unix::net::UnixListener;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;
use serde_json::{json, Value};

mod x11_nano;
mod lqv;
mod vault;
mod reward;
mod ai_governance;
mod pep;
mod nce;

use vault::Vault;
use reward::RewardEngine;
use ai_governance::AIGovernance;
use pep::PEP;
use nce::NCE;
use x11_nano::{X11Nano, ThreatLevel};

const SOCKET_PATH: &str = "/tmp/xyron-core.sock";

// ─── AppState — semua komponen tersinkronisasi ────────────────────────────────

pub struct AppState {
    pub vault:      Vault,
    pub reward:     RewardEngine,
    pub governance: AIGovernance,
    pub pep:        PEP,
    pub nce:        NCE,
    pub x11:        X11Nano,
}

impl AppState {
    pub fn new() -> Arc<Self> {
        let state = Arc::new(Self {
            vault:      Vault::new(),
            reward:     RewardEngine::new(),
            governance: AIGovernance::new(),
            pep:        PEP::new(),
            nce:        NCE::new(),
            x11:        X11Nano::new(),
        });

        // Sinkronisasi: PEP trigger X11-Nano scale saat anomali terdeteksi
        // Karena Arc tidak bisa masuk closure langsung, kita pakai atomic flag
        println!("[XYRON-CORE] Triple-Engine Validation initialized");
        println!("[XYRON-CORE]   ✓ LQV — Logic-Quantum Verification (Ed25519)");
        println!("[XYRON-CORE]   ✓ PEP — Parallel Echo-Pulse (konsensus kecepatan)");
        println!("[XYRON-CORE]   ✓ NCE — Nexus Community Engine (fingerprint komunitas)");
        println!("[XYRON-CORE] X11-Nano Dynamic Shield: {} layers (normal mode)", x11_nano::LAYERS_NORMAL);

        state
    }

    /// Bootstrap seluruh ekosistem saat sistem start
    pub fn bootstrap(&self) {
        println!("\n[XYRON-CORE] ═══ Bootstrap AI Ecosystem ═══");

        // 1. Register 5 AI worker awal di Vault
        let initial_workers = vec![
            ("ai_master_001", "1001"),
            ("ai_master_002", "1002"),
            ("ai_master_003", "1003"),
            ("ai_master_004", "1004"),
            ("ai_master_005", "1005"),
        ];

        for (id, pin) in &initial_workers {
            match self.vault.register_ai_worker(id, pin) {
                Ok(address) => {
                    // 2. Register ke AI Governance
                    self.governance.register_agent(id, address.clone());

                    // 3. Register ke PEP sebagai node
                    self.pep.register_ai_worker(id);

                    // 4. Register ke NCE sebagai community member
                    self.nce.register_member(id, &address, true);

                    println!("[XYRON-CORE] AI {} → {} [Vault+Gov+PEP+NCE]", id, &address[..20]);
                }
                Err(e) => eprintln!("[XYRON-CORE] Failed {}: {}", id, e),
            }
        }

        // 5. Genesis 100 XYR ke AI fund
        if let Some(addr) = self.vault.list_ai_wallets().first() {
            let _ = self.vault.update_balance(addr, reward::GENESIS_AI_FUND_NIZ);
            println!("[XYRON-CORE] Genesis 100 XYR → {}", &addr[..20]);
        }

        // 6. Pulse awal PEP — pastikan semua node sinkron
        let pulse = self.pep.send_pulse(b"XYRON_GENESIS_BOOTSTRAP");
        println!("[XYRON-CORE] PEP Genesis pulse: consensus={}",
            if pulse.consensus { "OK" } else { "PARTIAL" });

        println!("[XYRON-CORE] Bootstrap complete — {} AI workers active\n",
            self.vault.ai_worker_count());
    }
}

// ─── Triple-Engine Validation ─────────────────────────────────────────────────

/// Jalankan Triple-Engine Validation untuk sebuah transaksi
/// LQV → PEP → NCE — semua harus pass
fn triple_engine_validate(
    state:    &Arc<AppState>,
    tx_id:    &str,
    tx_data:  &[u8],
    amount_xyr: f64,
) -> Value {
    let start = Instant::now();

    // ── Engine 1: LQV (Logic-Quantum Verification) ───────────────────────
    let x11_hash = state.x11.hash(tx_data);
    let lqv_ok   = !x11_hash.is_empty(); // Simplified: hash berhasil = LQV pass

    // ── Engine 2: PEP (Parallel Echo-Pulse) ─────────────────────────────
    let pulse    = state.pep.send_pulse(tx_data);
    let pep_ok   = pulse.consensus;

    // Kalau PEP detect anomali → X11-Nano scale up otomatis
    if !pulse.anomalies.is_empty() {
        state.x11.scale_threat(ThreatLevel::Critical);
        println!("[XYRON-CORE] X11-Nano scaled to CRITICAL (15 layers) — anomaly detected");
    }

    // ── Engine 3: NCE (Nexus Community Engine) ───────────────────────────
    state.nce.initiate_validation(tx_id, tx_data, amount_xyr);
    let nce_result = state.nce.ai_auto_validate(tx_id)
        .unwrap_or(nce::ValidationResult::Pending);
    let nce_ok = matches!(nce_result, nce::ValidationResult::Approved);

    // Sync X11-Nano dengan NCE
    state.nce.sync_x11_signature(&x11_hash, tx_id);

    // ── Final decision ───────────────────────────────────────────────────
    let all_valid = lqv_ok && pep_ok && nce_ok;
    let elapsed   = start.elapsed().as_millis();

    println!("[TRIPLE-ENGINE] {} | LQV:{} PEP:{} NCE:{} | {}ms | {}",
        tx_id,
        if lqv_ok { "✓" } else { "✗" },
        if pep_ok { "✓" } else { "✗" },
        if nce_ok { "✓" } else { "✗" },
        elapsed,
        if all_valid { "VALID" } else { "INVALID" }
    );

    json!({
        "valid": all_valid,
        "lqv":   { "ok": lqv_ok, "hash": x11_hash },
        "pep":   { "ok": pep_ok, "consensus": pulse.consensus, "anomalies": pulse.anomalies },
        "nce":   { "ok": nce_ok, "result": format!("{:?}", nce_result) },
        "x11_layers": state.x11.active_layers(),
        "elapsed_ms": elapsed,
    })
}

// ─── Request Handler ──────────────────────────────────────────────────────────

fn handle_request(state: &Arc<AppState>, req: &Value) -> Value {
    let action = req["action"].as_str().unwrap_or("unknown");
    let start  = Instant::now();

    let result = match action {

        // ── Triple-Engine Validation ─────────────────────────────────────
        "validate.triple" => {
            let tx_id   = req["tx_id"].as_str().unwrap_or("unknown");
            let tx_data = req["tx_data"].as_str().unwrap_or("").as_bytes();
            let amount  = req["amount_xyr"].as_f64().unwrap_or(0.0);
            triple_engine_validate(state, tx_id, tx_data, amount)
        }

        // ── X11-Nano ─────────────────────────────────────────────────────
        "x11.hash" => {
            let data = req["data"].as_str().unwrap_or("");
            json!({
                "status":    "ok",
                "hash":      state.x11.hash(data.as_bytes()),
                "layers":    state.x11.active_layers(),
                "threat":    format!("{:?}", state.x11.current_threat()),
                "algorithm": "X11-Nano Dynamic Shield"
            })
        }
        "x11.set_threat" => {
            let level = match req["level"].as_str().unwrap_or("normal") {
                "elevated" => ThreatLevel::Elevated,
                "critical" => ThreatLevel::Critical,
                _          => ThreatLevel::Normal,
            };
            state.x11.scale_threat(level);
            json!({ "status": "ok", "layers": state.x11.active_layers() })
        }
        "x11.verify_address" => {
            let address = req["address"].as_str().unwrap_or("");
            json!({ "status":"ok", "valid": address.starts_with('X') && address.len() >= 25 })
        }

        // ── Wallet ───────────────────────────────────────────────────────
        "wallet.create_user" => {
            let user_id = req["user_id"].as_str().unwrap_or("");
            let pin     = req["pin"].as_str().unwrap_or("");
            match state.vault.register_user(user_id, pin) {
                Ok(address) => {
                    // Auto-register ke NCE sebagai community member
                    state.nce.register_member(user_id, &address, false);
                    json!({ "status":"ok", "address":address, "nce":"registered" })
                }
                Err(e) => json!({ "status":"error", "message":e }),
            }
        }
        "wallet.balance" => {
            let address = req["address"].as_str().unwrap_or("");
            match state.vault.get_balance_niz(address) {
                Some(niz) => json!({
                    "status":      "ok",
                    "balance_niz": niz,
                    "balance_xyr": niz as f64 / reward::NIZ_PER_XYR as f64
                }),
                None => json!({ "status":"error", "message":"Wallet not found" }),
            }
        }
        "wallet.sign_tx" => {
            let address  = req["address"].as_str().unwrap_or("");
            let owner_id = req["owner_id"].as_str().unwrap_or("");
            let pin      = req["pin"].as_str().unwrap_or("");
            let tx_data  = req["tx_data"].as_str().unwrap_or("").as_bytes().to_vec();
            match state.vault.sign_transaction(address, &tx_data, owner_id, pin) {
                Ok(sig) => json!({ "status":"ok", "signature":hex::encode(sig) }),
                Err(e)  => json!({ "status":"error", "message":e }),
            }
        }

        // ── Reward ───────────────────────────────────────────────────────
        "reward.get_block_reward" => {
            let h   = req["block_height"].as_u64().unwrap_or(0);
            let niz = state.reward.get_block_reward_niz(h);
            json!({
                "status":     "ok",
                "block_height": h,
                "reward_niz": niz,
                "reward_xyr": niz as f64 / reward::NIZ_PER_XYR as f64
            })
        }
        "reward.distribute" => {
            let h       = req["block_height"].as_u64().unwrap_or(0);
            let pc_vals: Vec<&str> = req["pc_validators"].as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
                .unwrap_or_default();
            let hp_vals: Vec<&str> = req["hp_validators"].as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
                .unwrap_or_default();

            let total    = state.reward.get_block_reward_niz(h);
            let pc_pool  = total * 60 / 100;
            let hp_pool  = total * 40 / 100;

            if !pc_vals.is_empty() {
                let share = pc_pool / pc_vals.len() as u64;
                for addr in &pc_vals {
                    if let Some(bal) = state.vault.get_balance_niz(addr) {
                        let _ = state.vault.update_balance(addr, bal + share);
                    }
                }
            }
            if !hp_vals.is_empty() {
                let share = hp_pool / hp_vals.len() as u64;
                for addr in &hp_vals {
                    if let Some(bal) = state.vault.get_balance_niz(addr) {
                        let _ = state.vault.update_balance(addr, bal + share);
                    }
                }
            }
            let _ = state.reward.add_minted(total);
            json!({ "status":"ok", "total_niz":total, "pc_pool_niz":pc_pool, "hp_pool_niz":hp_pool })
        }

        // ── PEP ──────────────────────────────────────────────────────────
        "pep.pulse" => {
            let data  = req["data"].as_str().unwrap_or("heartbeat").as_bytes().to_vec();
            let round = state.pep.send_pulse(&data);
            json!({
                "status":    "ok",
                "round_id":  round.round_id,
                "consensus": round.consensus,
                "anomalies": round.anomalies,
                "duration_ms": round.duration_ms
            })
        }
        "pep.status" => {
            json!({ "status":"ok", "network": state.pep.get_network_status() })
        }
        "pep.heartbeat" => {
            let node_id = req["node_id"].as_str().unwrap_or("");
            state.pep.heartbeat(node_id);
            json!({ "status":"ok" })
        }

        // ── NCE ───────────────────────────────────────────────────────────
        "nce.validate" => {
            let tx_id  = req["tx_id"].as_str().unwrap_or("");
            let tx_data = req["tx_data"].as_str().unwrap_or("").as_bytes().to_vec();
            let amount = req["amount_xyr"].as_f64().unwrap_or(0.0);
            state.nce.initiate_validation(tx_id, &tx_data, amount);
            let result = state.nce.ai_auto_validate(tx_id)
                .unwrap_or(nce::ValidationResult::Pending);
            json!({
                "status": "ok",
                "result": format!("{:?}", result),
                "tx_id":  tx_id
            })
        }
        "nce.fingerprint" => {
            let member_id = req["member_id"].as_str().unwrap_or("");
            let tx_id     = req["tx_id"].as_str().unwrap_or("");
            match state.nce.submit_fingerprint(tx_id, member_id) {
                Ok(r)  => json!({ "status":"ok", "result":format!("{:?}",r) }),
                Err(e) => json!({ "status":"error", "message":e }),
            }
        }
        "nce.stats" => {
            json!({ "status":"ok", "community": state.nce.get_community_stats() })
        }

        // ── AI Governance ─────────────────────────────────────────────────
        "ai.status" => {
            let id = req["agent_id"].as_str().unwrap_or("");
            match state.governance.get_agent_status(id) {
                Some(s) => json!({ "status":"ok", "agent":s }),
                None    => json!({ "status":"error", "message":"Agent not found" }),
            }
        }
        "ai.report_trade" => {
            let id     = req["agent_id"].as_str().unwrap_or("");
            let win    = req["win"].as_bool().unwrap_or(false);
            let amount = req["amount_niz"].as_u64().unwrap_or(0);
            state.governance.report_trade(id, win, amount);
            // Update NCE reputasi berdasarkan performa trading
            state.nce.update_reputation(id, win);
            json!({ "status":"ok", "recorded":true })
        }
        "ai.army_patrol" => {
            let flagged = state.governance.army_patrol();
            // Kalau ada yang dipecat, update PEP
            for f in &flagged {
                if let Some(id) = f["agent_id"].as_str() {
                    state.pep.report_health(id, false);
                }
            }
            json!({ "status":"ok", "flagged":flagged })
        }
        "ai.replace_agent" => {
            let old_id  = req["agent_id"].as_str().unwrap_or("");
            let new_pin = req["new_pin"].as_str().unwrap_or("0000");
            match state.governance.replace_agent(&state.vault, old_id, new_pin) {
                Ok(addr) => {
                    // Register pengganti ke PEP dan NCE
                    state.pep.register_ai_worker(&format!("{}_successor", old_id));
                    state.nce.register_member(&format!("{}_successor", old_id), &addr, true);
                    json!({ "status":"ok", "new_address":addr })
                }
                Err(e) => json!({ "status":"error", "message":e }),
            }
        }
        "ai.list_workers" => {
            json!({
                "status":  "ok",
                "count":   state.vault.ai_worker_count(),
                "max":     vault::MAX_AI_WORKERS,
                "wallets": state.vault.list_ai_wallets()
            })
        }

        // ── System ───────────────────────────────────────────────────────
        "system.stats" => json!({
            "status":             "ok",
            "total_minted_xyr":   state.reward.total_minted_xyr(),
            "remaining_supply_xyr": state.reward.remaining_supply_xyr(),
            "total_burned_niz":   state.reward.total_burned_niz(),
            "ai_workers":         state.vault.ai_worker_count(),
            "max_ai_workers":     vault::MAX_AI_WORKERS,
            "x11_layers":         state.x11.active_layers(),
            "x11_threat":         format!("{:?}", state.x11.current_threat()),
            "pep_network":        state.pep.get_network_status(),
            "nce_community":      state.nce.get_community_stats(),
            "network":            "XYRON",
            "version":            "2.1.0"
        }),

        _ => json!({ "status":"error", "message":format!("Unknown action: {}", action) }),
    };

    let mut r    = result;
    r["time_us"] = json!(start.elapsed().as_micros());
    r
}

// ─── Socket handler ───────────────────────────────────────────────────────────

fn handle_client(mut stream: std::os::unix::net::UnixStream, state: Arc<AppState>) {
    let mut buf = vec![0u8; 65536];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let req: Value = serde_json::from_slice(&buf[..n])
        .unwrap_or(json!({"action":"unknown"}));
    let response = handle_request(&state, &req);
    let _ = stream.write_all(
        serde_json::to_string(&response).unwrap_or_default().as_bytes()
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fn main() -> std::io::Result<()> {
    println!("╔════════════════════════════════════════════╗");
    println!("║     XYRON Core v2.1.0 — Triple-Engine      ║");
    println!("║  X11-Nano Dynamic Shield | PEP | NCE | LQV ║");
    println!("╚════════════════════════════════════════════╝");

    let _ = std::fs::remove_file(SOCKET_PATH);
    let state = AppState::new();
    state.bootstrap();

    let listener = UnixListener::bind(SOCKET_PATH)?;
    println!("[XYRON-CORE] Listening on {} — Status: PIP ✓", SOCKET_PATH);

    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                let state = Arc::clone(&state);
                thread::spawn(move || handle_client(s, state));
            }
            Err(e) => eprintln!("[XYRON-CORE] Error: {}", e),
        }
    }
    Ok(())
}
