use std::sync::atomic::{AtomicU64, Ordering};
pub const NIZ_PER_XYR: u64 = 1_000_000;
pub const MAX_SUPPLY_NIZ: u64 = 6_657_700 * 1_000_000;
pub const GENESIS_AI_FUND_NIZ: u64 = 100 * 1_000_000;
pub const BLOCKS_PER_YEAR: u64 = 175_200;
pub struct RewardEngine {
    total_minted_niz: AtomicU64,
    total_burned_niz: AtomicU64,
    total_locked_niz: AtomicU64,
}
impl RewardEngine {
    pub fn new() -> Self { Self { total_minted_niz: AtomicU64::new(0), total_burned_niz: AtomicU64::new(0), total_locked_niz: AtomicU64::new(0) } }
    pub fn get_block_reward_niz(&self, block_height: u64) -> u64 {
        let year = (block_height / BLOCKS_PER_YEAR) + 1;
        let reward = match year { 1 => 6_000_000, 2 => 5_000_000, 3 => 4_000_000, 4 => 3_000_000, 5..=8 => 2_500_000, 9..=12 => 1_250_000, 13..=16 => 625_000, 17..=20 => 312_500, _ => { let h = (year - 17) / 4; 312_500u64 >> h } };
        let remaining = MAX_SUPPLY_NIZ.saturating_sub(self.total_minted_niz.load(Ordering::Relaxed) + GENESIS_AI_FUND_NIZ);
        reward.min(remaining)
    }
    pub fn get_block_reward_xyr(&self, h: u64) -> f64 { self.get_block_reward_niz(h) as f64 / NIZ_PER_XYR as f64 }
    pub fn add_minted(&self, n: u64) -> Result<(), String> {
        let c = self.total_minted_niz.load(Ordering::Relaxed);
        if c + n > MAX_SUPPLY_NIZ { return Err("Exceeds max supply".to_string()); }
        self.total_minted_niz.store(c + n, Ordering::Relaxed); Ok(())
    }
    pub fn calc_burn(&self, tx: u64) -> u64 { tx * 600 / 10_000 }
    pub fn calc_lock(&self, tx: u64) -> u64 { tx * 400 / 10_000 }
    pub fn add_burned(&self, n: u64) { self.total_burned_niz.fetch_add(n, Ordering::Relaxed); }
    pub fn add_locked(&self, n: u64) { self.total_locked_niz.fetch_add(n, Ordering::Relaxed); }
    pub fn total_minted_niz(&self) -> u64 { self.total_minted_niz.load(Ordering::Relaxed) }
    pub fn total_minted_xyr(&self) -> f64 { self.total_minted_niz() as f64 / NIZ_PER_XYR as f64 }
    pub fn total_burned_niz(&self) -> u64 { self.total_burned_niz.load(Ordering::Relaxed) }
    pub fn total_locked_niz(&self) -> u64 { self.total_locked_niz.load(Ordering::Relaxed) }
    pub fn remaining_supply_niz(&self) -> u64 { MAX_SUPPLY_NIZ.saturating_sub(self.total_minted_niz()).saturating_sub(GENESIS_AI_FUND_NIZ) }
    pub fn remaining_supply_xyr(&self) -> f64 { self.remaining_supply_niz() as f64 / NIZ_PER_XYR as f64 }
}
