/**
 * XYRON FINAL TOKENOMICS
 * Max Supply: 12,614,400 XYR
 * Subunit: nIZ (1 XYR = 100,000,000 nIZ)
 * Block Time: 3 menit
 * Reward: 6→5→4→3→2.5 + halving 4 tahun
 */

const XYRON = {
    // Basic
    name: "XYRON",
    symbol: "XYR",
    subunit: "nIZ",
    maxSupply: 12_614_400,
    subunitRatio: 100_000_000,
    
    // Genesis
    genesisBurn: 0.05,
    genesisLock: 0.04,
    get finalSupply() {
        return this.maxSupply * (1 - this.genesisBurn);
    },
    get mineableSupply() {
        return this.finalSupply * (1 - this.genesisLock);
    },
    
    // Block
    blockTime: 180,
    blocksPerYear: 175_200,
    
    // Reward
    getReward(year) {
        if (year === 1) return 6.0;
        if (year === 2) return 5.0;
        if (year === 3) return 4.0;
        if (year === 4) return 3.0;
        if (year <= 8) return 2.5;
        if (year <= 12) return 1.25;
        if (year <= 16) return 0.625;
        
        // Halving setiap 4 tahun setelah tahun 16
        const halvings = Math.floor((year - 16) / 4) + 2;
        return 2.5 / Math.pow(2, halvings);
    },
    
    // Konversi
    toNiz(xyr) {
        return Math.floor(xyr * this.subunitRatio);
    },
    
    // Format
    format(amount) {
        if (amount < 0.001) {
            return `${this.toNiz(amount).toLocaleString()} nIZ`;
        }
        return `${amount.toFixed(4)} XYR`;
    },
    
    // Summary
    summary() {
        console.log(`
╔════════════════════════════════════╗
║       XYRON FINAL TOKENOMICS        ║
╠════════════════════════════════════╣
║  Max Supply: ${this.maxSupply.toLocaleString()} XYR  ║
║  1 XYR = ${this.subunitRatio.toLocaleString()} nIZ   ║
║  Burn 5%: ${(this.maxSupply * 0.05).toLocaleString()} XYR    ║
║  Lock 4%: ${(this.maxSupply * 0.04).toLocaleString()} XYR    ║
║  Final: ${this.finalSupply.toLocaleString()} XYR      ║
║  Mineable: ${this.mineableSupply.toLocaleString()} XYR ║
║  Block Time: 3 menit               ║
╚════════════════════════════════════╝

📅 Reward Schedule:
Tahun 1: 6.0 XYR 🚀
Tahun 2: 5.0 XYR 🔥
Tahun 3: 4.0 XYR ⚡
Tahun 4: 3.0 XYR 🌊
Tahun 5-8: 2.5 XYR ✅
Tahun 9-12: 1.25 XYR 🔄 (Halving 1)
Tahun 13-16: 0.625 XYR 🔄 (Halving 2)
Tahun 17+: Halving setiap 4 tahun
        `);
    }
};

// Jalanin summary
XYRON.summary();

// Export
if (typeof module !== 'undefined') {
    module.exports = XYRON;
}
