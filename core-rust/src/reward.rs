// core-rust/src/reward.rs
//! XYRON Reward & Tokenomics Engine
//!
//! Max Supply : 6.657.700 XYR (termasuk 100 XYR genesis AI)
//! Satuan     : nIZ (1 XYR = 1.000.000 nIZ) — hindari floating point
//!
//! Schedule reward:
//!   Tahun 1  : 6 XYR/block   → menarik early miner
//!   Tahun 2  : 5 XYR/block
//!   Tahun 3  : 4 XYR/block
//!   Tahun 4  : 3 XYR/block
//!   Tahun 5–8: 2.5 XYR/block → halving era mulai
//!   Tahun 9–12 : 1.25 XYR/block
//!   Tahun 13–16: 0.625 XYR/block
//!   Tahun 17–20: 0.3125 XYR/block
//!   Tahun 21+  : halving setiap 4 tahun → sampai ~93 tahun
//!
//! Deflasi transaksi:
//!   6% dari setiap tx → burn permanen
//!   4% dari setiap tx → lock pool

use std::sync::atomic::{AtomicU64, Ordering};

// ─── Konstanta tokenomics ───────────────────────────────────────────────────

/// 1 XYR = 1.000.000 nIZ
pub const NIZ_PER_XYR: u64 = 1_000_000;

/// Max supply: 6.657.600 XYR dari mining + 100 XYR genesis AI
pub const MAX_SUPPLY_XYR: u64 = 6_657_700;
pub const MAX_SUPPLY_NIZ: u64 = MAX_SUPPLY_XYR * NIZ_PER_XYR;

/// 100 XYR genesis untuk AI ecosystem fund (dibuat saat genesis block)
pub const GENESIS_AI_FUND_NIZ: u64 = 100 * NIZ_PER_XYR;

/// Block time 180 detik (3 menit)
pub const BLOCK_TIME_SECS: u64 = 180;

/// Jumlah block per tahun: 365 * 24 * 3600 / 180 = 175.200
pub const BLOCKS_PER_YEAR: u64 = 175_200;

/// Burn rate dari setiap transaksi (6%)
pub const BURN_RATE_BPS: u64 = 600; // basis points, 600 = 6%

/// Lock rate dari setiap transaksi (4%)
pub const LOCK_RATE_BPS: u64 = 400; // basis points, 400 = 4%

// ─── RewardEngine ───────────────────────────────────────────────────────────

pub struct RewardEngine {
    total_minted_niz: AtomicU64,
    total_burned_niz: AtomicU64,
    total_locked_niz: AtomicU64,
}

impl RewardEngine {
    pub fn new() -> Self {
        Self {
            total_minted_niz: AtomicU64::new(0),
            total_burned_niz: AtomicU64::new(0),
            total_locked_niz: AtomicU64::new(0),
        }
    }

    /// Hitung block reward dalam nIZ berdasarkan block height
    pub fn get_block_reward_niz(&self, block_height: u64) -> u64 {
        let year = (block_height / BLOCKS_PER_YEAR) + 1;

        let reward_niz = match year {
            1       => 6_000_000,       // 6 XYR
            2       => 5_000_000,       // 5 XYR
            3       => 4_000_000,       // 4 XYR
            4       => 3_000_000,       // 3 XYR
            5..=8   => 2_500_000,       // 2.5 XYR
            9..=12  => 1_250_000,       // 1.25 XYR
            13..=16 =>   625_000,       // 0.625 XYR
            17..=20 =>   312_500,       // 0.3125 XYR
            _ => {
                // Halving setiap 4 tahun setelah tahun 20
                // Tahun 21-24 = halving ke-1, 25-28 = halving ke-2, dst
                let halving = (year - 17) / 4;
                let reward = 312_500u64 >> halving;
                reward
            }
        };

        // Pastikan tidak melebihi sisa supply
        let minted = self.total_minted_niz.load(Ordering::Relaxed);
        let remaining = MAX_SUPPLY_NIZ.saturating_sub(minted + GENESIS_AI_FUND_NIZ);
        reward_niz.min(remaining)
    }

    /// Versi XYR (untuk display)
    pub fn get_block_reward_xyr(&self, block_height: u64) -> f64 {
        self.get_block_reward_niz(block_height) as f64 / NIZ_PER_XYR as f64
    }

    /// Catat reward yang telah dibagikan
    pub fn add_minted(&self, amount_niz: u64) -> Result<(), String> {
        let current = self.total_minted_niz.load(Ordering::Relaxed);
        let new_total = current + amount_niz;
        if new_total > MAX_SUPPLY_NIZ {
            return Err(format!(
                "Cannot mint beyond max supply: {} nIZ > {} nIZ",
                new_total, MAX_SUPPLY_NIZ
            ));
        }
        self.total_minted_niz.store(new_total, Ordering::Relaxed);
        Ok(())
    }

    /// Hitung burn amount dari nilai transaksi (6%)
    pub fn calc_burn(&self, tx_amount_niz: u64) -> u64 {
        tx_amount_niz * BURN_RATE_BPS / 10_000
    }

    /// Hitung lock amount dari nilai transaksi (4%)
    pub fn calc_lock(&self, tx_amount_niz: u64) -> u64 {
        tx_amount_niz * LOCK_RATE_BPS / 10_000
    }

    /// Catat transaksi burn
    pub fn add_burned(&self, amount_niz: u64) {
        self.total_burned_niz.fetch_add(amount_niz, Ordering::Relaxed);
    }

    /// Catat transaksi lock
    pub fn add_locked(&self, amount_niz: u64) {
        self.total_locked_niz.fetch_add(amount_niz, Ordering::Relaxed);
    }

    // ─── Getters ──────────────────────────────────────────────────────────

    pub fn total_minted_niz(&self) -> u64 {
        self.total_minted_niz.load(Ordering::Relaxed)
    }

    pub fn total_minted_xyr(&self) -> f64 {
        self.total_minted_niz() as f64 / NIZ_PER_XYR as f64
    }

    pub fn total_burned_niz(&self) -> u64 {
        self.total_burned_niz.load(Ordering::Relaxed)
    }

    pub fn total_locked_niz(&self) -> u64 {
        self.total_locked_niz.load(Ordering::Relaxed)
    }

    pub fn remaining_supply_niz(&self) -> u64 {
        MAX_SUPPLY_NIZ
            .saturating_sub(self.total_minted_niz())
            .saturating_sub(GENESIS_AI_FUND_NIZ)
    }

    pub fn remaining_supply_xyr(&self) -> f64 {
        self.remaining_supply_niz() as f64 / NIZ_PER_XYR as f64
    }

    /// Prediksi block halving berikutnya
    pub fn next_halving_block(&self, current_block: u64) -> u64 {
        let current_year = (current_block / BLOCKS_PER_YEAR) + 1;
        let next_year = if current_year <= 20 {
            current_year + 1
        } else {
            let era = (current_year - 17) / 4;
            17 + (era + 1) * 4
        };
        (next_year - 1) * BLOCKS_PER_YEAR
    }

    /// Estimasi detik ke halving berikutnya
    pub fn seconds_to_next_halving(&self, current_block: u64) -> u64 {
        let next = self.next_halving_block(current_block);
        next.saturating_sub(current_block) * BLOCK_TIME_SECS
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reward_tahun1() {
        let e = RewardEngine::new();
        assert_eq!(e.get_block_reward_niz(0), 6_000_000);
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR - 1), 6_000_000);
    }

    #[test]
    fn test_reward_schedule() {
        let e = RewardEngine::new();
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR),     5_000_000); // thn 2
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 2), 4_000_000); // thn 3
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 3), 3_000_000); // thn 4
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 4), 2_500_000); // thn 5
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 8), 1_250_000); // thn 9
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 12),  625_000); // thn 13
        assert_eq!(e.get_block_reward_niz(BLOCKS_PER_YEAR * 16),  312_500); // thn 17
    }

    #[test]
    fn test_decimal_reward_presisi() {
        let e = RewardEngine::new();
        // 2.5 XYR harus tepat, bukan 2 XYR
        assert_eq!(e.get_block_reward_xyr(BLOCKS_PER_YEAR * 4), 2.5);
        // 1.25 XYR harus tepat
        assert_eq!(e.get_block_reward_xyr(BLOCKS_PER_YEAR * 8), 1.25);
        // 0.625 XYR harus tepat
        assert_eq!(e.get_block_reward_xyr(BLOCKS_PER_YEAR * 12), 0.625);
    }

    #[test]
    fn test_burn_lock_calc() {
        let e = RewardEngine::new();
        let tx = 1_000_000; // 1 XYR
        assert_eq!(e.calc_burn(tx), 60_000);  // 6% = 0.06 XYR
        assert_eq!(e.calc_lock(tx), 40_000);  // 4% = 0.04 XYR
    }

    #[test]
    fn test_supply_limit() {
        let e = RewardEngine::new();
        assert!(e.add_minted(MAX_SUPPLY_NIZ + 1).is_err());
    }

    #[test]
    fn test_genesis_ai_fund() {
        assert_eq!(GENESIS_AI_FUND_NIZ, 100 * NIZ_PER_XYR);
    }
            }
