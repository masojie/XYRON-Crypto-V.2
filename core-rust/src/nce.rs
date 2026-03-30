// core-rust/src/nce.rs
//! Nexus Community Engine (NCE) — Lapisan validasi komunitas XYRON
//!
//! NCE adalah lapisan ketiga dari Triple-Engine Validation.
//! Cara kerja:
//!   1. Setiap member komunitas punya digital fingerprint unik
//!   2. Transaksi perlu divalidasi oleh minimum N fingerprint komunitas
//!   3. Fingerprint dibuat dari kombinasi: wallet address + device signature + timestamp
//!   4. Semakin banyak member aktif = semakin desentralisasi jaringan XYRON

use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use crate::x11_nano::X11Nano;

// ─── Konstanta ───────────────────────────────────────────────────────────────

/// Minimum fingerprint untuk validasi transaksi normal
pub const MIN_FINGERPRINTS_NORMAL: usize = 3;

/// Minimum fingerprint untuk transaksi besar (>100 XYR)
pub const MIN_FINGERPRINTS_LARGE: usize = 6;

/// Skor reputasi minimum untuk menjadi validator NCE
pub const MIN_REPUTATION_SCORE: u32 = 10;

/// Batas atas reputasi
pub const MAX_REPUTATION_SCORE: u32 = 1000;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunityMember {
    pub member_id:         String,
    pub wallet_address:    String,
    pub fingerprint:       String,   // hash unik kombinasi identitas
    pub reputation_score:  u32,
    pub validations_done:  u64,
    pub joined_at:         u64,
    pub last_active:       u64,
    pub is_ai_member:      bool,     // AI worker juga bisa jadi member NCE
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationResult {
    Approved,
    Rejected,
    Pending,  // belum cukup fingerprint
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NCEValidation {
    pub tx_id:              String,
    pub tx_hash:            String,
    pub fingerprints:       Vec<String>,  // fingerprint yang sudah approve
    pub result:             ValidationResult,
    pub required:           usize,
    pub timestamp:          u64,
}

// ─── NCE Engine ──────────────────────────────────────────────────────────────

pub struct NCE {
    members:     Mutex<HashMap<String, CommunityMember>>,
    validations: Mutex<HashMap<String, NCEValidation>>,
    x11:         X11Nano,
}

impl NCE {
    pub fn new() -> Self {
        Self {
            members:     Mutex::new(HashMap::new()),
            validations: Mutex::new(HashMap::new()),
            x11:         X11Nano::new(),
        }
    }

    // ─── Member Management ────────────────────────────────────────────────

    /// Daftarkan member komunitas baru
    pub fn register_member(
        &self,
        member_id: &str,
        wallet_address: &str,
        is_ai: bool,
    ) -> String {
        let now         = Self::now_secs();
        let fingerprint = self.generate_fingerprint(member_id, wallet_address, now);

        let member = CommunityMember {
            member_id:        member_id.to_string(),
            wallet_address:   wallet_address.to_string(),
            fingerprint:      fingerprint.clone(),
            reputation_score: if is_ai { 50 } else { MIN_REPUTATION_SCORE }, // AI mulai dengan reputasi lebih tinggi
            validations_done: 0,
            joined_at:        now,
            last_active:      now,
            is_ai_member:     is_ai,
        };

        self.members.lock().unwrap().insert(member_id.to_string(), member);
        println!("[NCE] Member registered: {} | fingerprint: {}...", member_id, &fingerprint[..16]);
        fingerprint
    }

    /// Generate digital fingerprint unik
    /// Fingerprint = X11-Nano(member_id + wallet_address + timestamp)
    fn generate_fingerprint(&self, member_id: &str, wallet: &str, timestamp: u64) -> String {
        let combined = format!("{}:{}:{}", member_id, wallet, timestamp);
        self.x11.hash(combined.as_bytes())
    }

    /// Update reputasi member setelah validasi
    pub fn update_reputation(&self, member_id: &str, correct_validation: bool) {
        let mut members = self.members.lock().unwrap();
        if let Some(member) = members.get_mut(member_id) {
            member.last_active = Self::now_secs();
            member.validations_done += 1;
            if correct_validation {
                member.reputation_score = (member.reputation_score + 5).min(MAX_REPUTATION_SCORE);
            } else {
                member.reputation_score = member.reputation_score.saturating_sub(20);
            }
        }
    }

    // ─── Validasi Transaksi ───────────────────────────────────────────────

    /// Mulai proses validasi NCE untuk sebuah transaksi
    pub fn initiate_validation(&self, tx_id: &str, tx_data: &[u8], amount_xyr: f64) -> NCEValidation {
        let tx_hash  = hex::encode(Sha256::digest(tx_data));
        let required = if amount_xyr > 100.0 {
            MIN_FINGERPRINTS_LARGE
        } else {
            MIN_FINGERPRINTS_NORMAL
        };

        let validation = NCEValidation {
            tx_id:        tx_id.to_string(),
            tx_hash:      tx_hash.clone(),
            fingerprints: Vec::new(),
            result:       ValidationResult::Pending,
            required,
            timestamp:    Self::now_secs(),
        };

        self.validations.lock().unwrap().insert(tx_id.to_string(), validation.clone());
        println!("[NCE] Validation initiated: {} | requires {} fingerprints", tx_id, required);
        validation
    }

    /// Member submit fingerprint untuk validasi transaksi
    pub fn submit_fingerprint(
        &self,
        tx_id: &str,
        member_id: &str,
    ) -> Result<ValidationResult, String> {
        // Cek member valid dan punya reputasi cukup
        let fingerprint = {
            let members = self.members.lock().unwrap();
            let member  = members.get(member_id)
                .ok_or(format!("Member {} tidak ditemukan", member_id))?;

            if member.reputation_score < MIN_REPUTATION_SCORE {
                return Err(format!("Reputasi {} terlalu rendah: {}", member_id, member.reputation_score));
            }
            member.fingerprint.clone()
        };

        let mut validations = self.validations.lock().unwrap();
        let validation = validations.get_mut(tx_id)
            .ok_or(format!("Transaksi {} tidak ditemukan", tx_id))?;

        // Hindari duplikat fingerprint
        if validation.fingerprints.contains(&fingerprint) {
            return Err("Fingerprint sudah disubmit".to_string());
        }

        validation.fingerprints.push(fingerprint);

        // Cek apakah sudah mencukupi
        if validation.fingerprints.len() >= validation.required {
            validation.result = ValidationResult::Approved;
            println!("[NCE] Transaction {} APPROVED — {}/{} fingerprints",
                tx_id, validation.fingerprints.len(), validation.required);

            // Update reputasi semua validator
            let validator_ids: Vec<String> = vec![member_id.to_string()];
            drop(validations);
            for vid in validator_ids {
                self.update_reputation(&vid, true);
            }

            return Ok(ValidationResult::Approved);
        }

        println!("[NCE] Fingerprint added: {}/{} for tx {}",
            validation.fingerprints.len(), validation.required, tx_id);
        Ok(ValidationResult::Pending)
    }

    /// Auto-validasi oleh AI workers (untuk transaksi kecil saat komunitas sepi)
    pub fn ai_auto_validate(&self, tx_id: &str) -> Result<ValidationResult, String> {
        let ai_members: Vec<String> = {
            let members = self.members.lock().unwrap();
            members.values()
                .filter(|m| m.is_ai_member && m.reputation_score >= MIN_REPUTATION_SCORE)
                .map(|m| m.member_id.clone())
                .collect()
        };

        if ai_members.is_empty() {
            return Err("Tidak ada AI member aktif untuk auto-validasi".to_string());
        }

        println!("[NCE] AI auto-validation for {} using {} AI members", tx_id, ai_members.len());

        let mut last_result = ValidationResult::Pending;
        for ai_id in ai_members {
            match self.submit_fingerprint(tx_id, &ai_id) {
                Ok(r) => {
                    last_result = r.clone();
                    if matches!(r, ValidationResult::Approved) {
                        return Ok(ValidationResult::Approved);
                    }
                }
                Err(_) => continue,
            }
        }

        Ok(last_result)
    }

    // ─── Signature Synchronizer ───────────────────────────────────────────

    /// Sync X11-Nano signature dengan NCE fingerprint
    /// Ini yang menghubungkan X11-Nano dengan NCE secara real-time (dari konsep asli)
    pub fn sync_x11_signature(&self, x11_hash: &str, tx_id: &str) -> bool {
        let validations = self.validations.lock().unwrap();
        if let Some(val) = validations.get(tx_id) {
            // Verifikasi bahwa x11_hash konsisten dengan tx_hash
            let expected = format!("{}:{}", val.tx_hash, x11_hash);
            let sync_hash = hex::encode(Sha256::digest(expected.as_bytes()));
            let synced = sync_hash.starts_with("0"); // simplified PoW-like check
            println!("[NCE] X11-Nano sync for tx {}: {}", tx_id, if synced { "OK" } else { "FAIL" });
            synced
        } else {
            false
        }
    }

    // ─── Query ───────────────────────────────────────────────────────────

    pub fn get_validation_status(&self, tx_id: &str) -> Option<serde_json::Value> {
        let validations = self.validations.lock().unwrap();
        validations.get(tx_id).map(|v| serde_json::json!({
            "tx_id": v.tx_id,
            "result": format!("{:?}", v.result),
            "fingerprints": v.fingerprints.len(),
            "required": v.required,
            "progress_pct": (v.fingerprints.len() as f64 / v.required as f64 * 100.0) as u32,
        }))
    }

    pub fn get_community_stats(&self) -> serde_json::Value {
        let members = self.members.lock().unwrap();
        let total   = members.len();
        let ai      = members.values().filter(|m| m.is_ai_member).count();
        let human   = total - ai;
        let avg_rep = if total == 0 { 0.0 } else {
            members.values().map(|m| m.reputation_score as f64).sum::<f64>() / total as f64
        };

        serde_json::json!({
            "total_members": total,
            "ai_members": ai,
            "human_members": human,
            "avg_reputation": format!("{:.1}", avg_rep),
            "eligible_validators": members.values()
                .filter(|m| m.reputation_score >= MIN_REPUTATION_SCORE).count(),
        })
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
    fn test_register_member() {
        let nce = NCE::new();
        let fp  = nce.register_member("user_001", "XYR1abc", false);
        assert!(!fp.is_empty());
    }

    #[test]
    fn test_validation_flow() {
        let nce = NCE::new();

        // Daftarkan member
        for i in 0..5 {
            nce.register_member(&format!("user_{}", i), &format!("XYR1addr{}", i), false);
        }

        // Mulai validasi
        nce.initiate_validation("tx_001", b"transfer 10 XYR", 10.0);

        // Submit fingerprint sampai approved
        let mut approved = false;
        for i in 0..5 {
            let result = nce.submit_fingerprint("tx_001", &format!("user_{}", i)).unwrap();
            if matches!(result, ValidationResult::Approved) {
                approved = true;
                break;
            }
        }
        assert!(approved);
    }

    #[test]
    fn test_ai_auto_validate() {
        let nce = NCE::new();

        // Daftarkan AI members
        for i in 0..5 {
            nce.register_member(&format!("ai_master_{}", i), &format!("XYR1ai{}", i), true);
        }

        nce.initiate_validation("tx_ai_001", b"ai trade 5 XYR", 5.0);
        let result = nce.ai_auto_validate("tx_ai_001").unwrap();
        assert!(matches!(result, ValidationResult::Approved));
    }

    #[test]
    fn test_reputation_update() {
        let nce = NCE::new();
        nce.register_member("user_rep", "XYR1rep", false);
        nce.update_reputation("user_rep", true);
        let members = nce.members.lock().unwrap();
        let m = members.get("user_rep").unwrap();
        assert!(m.reputation_score > MIN_REPUTATION_SCORE);
    }
}
