/**
 * XYRON TOKENOMICS ENGINE
 * VERSION FINAL - HASIL DISKUSI
 * 
 * Max Supply: 12,614,400 XYR (TERKUNCI)
 * Block Time: 180 detik (3 menit)
 * Subunit: nIZ (1 XYR = 100,000,000 nIZ)
 * Reward: 6 → 5 → 4 → 3 → 2.5 + halving 4 tahun
 * Genesis: Burn 5% | Lock 4%
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class Tokenomics extends EventEmitter {
    constructor() {
        super();
        
        // ===== KONFIGURASI FINAL =====
        this.config = {
            // SUPPLY (TERKUNCI)
            maxSupply: 12_614_400,           // 12,6 Juta XYR
            
            // BLOCK
            blockTime: 180_000,                // 180 detik (3 menit)
            blocksPerYear: 175_200,            // Block per tahun
            
            // SUBUNIT
            subunitRatio: 100_000_000,         // 1 XYR = 100 Juta nIZ
            
            // GENESIS BURN & LOCK
            genesisBurn: 0.05,                  // 5% dibakar
            genesisLock: 0.04,                   // 4% dikunci
        };
        
        // ===== REWARD SCHEDULE (HASIL DISKUSI) =====
        this.rewardSchedule = {
            // TAHUN 1-4: PENURUNAN BERTAHAP
            1: 6.0,   // Tahun 1: 6 XYR 🚀
            2: 5.0,   // Tahun 2: 5 XYR 🔥
            3: 4.0,   // Tahun 3: 4 XYR ⚡
            4: 3.0,   // Tahun 4: 3 XYR 🌊
            
            // TAHUN 5-8: STABIL DI 2.5 XYR
            5: 2.5,   // Tahun 5: 2.5 XYR ✅
            6: 2.5,   // Tahun 6: 2.5 XYR
            7: 2.5,   // Tahun 7: 2.5 XYR
            8: 2.5,   // Tahun 8: 2.5 XYR
            
            // TAHUN 9-12: HALVING 1 (1.25 XYR)
            9: 1.25,  // Tahun 9: 1.25 XYR 🔄
            10: 1.25, // Tahun 10: 1.25 XYR
            11: 1.25, // Tahun 11: 1.25 XYR
            12: 1.25, // Tahun 12: 1.25 XYR
            
            // TAHUN 13-16: HALVING 2 (0.625 XYR)
            13: 0.625, // Tahun 13: 0.625 XYR 🔄
            14: 0.625,
            15: 0.625,
            16: 0.625,
        };
        
        this.state = this.loadGenesis();
        this.activeNodes = new Set();
        this.pendingSMS = [];
        this.historyDir = './history';
        this.validationCount = 0;
    }

    loadGenesis() {
        const genesisPath = './engine/ledger_state.json';
        try {
            if (fs.existsSync(genesisPath)) {
                console.log(`✅ Genesis ditemukan: ${genesisPath}`);
                const data = JSON.parse(fs.readFileSync(genesisPath));
                return data;
            } else {
                console.log(`⚠️ Genesis tidak ditemukan, buat baru`);
                return this.createGenesis();
            }
        } catch (err) {
            console.error(`❌ Error load genesis:`, err.message);
            return this.createGenesis();
        }
    }
    
    createGenesis() {
        return {
            blockHeight: 0,
            totalSupply: 0,
            burnedSupply: this.config.maxSupply * this.config.genesisBurn,
            lockedSupply: this.config.maxSupply * this.config.genesisLock,
            validators: [],
            timestamp: Date.now()
        };
    }
    
    // ===== FUNGSI BARU =====
    
    /**
     * Dapatkan reward berdasarkan tahun
     * @param {number} year - Tahun (1, 2, 3, ...)
     * @returns {number} Reward dalam XYR
     */
    getRewardByYear(year) {
        // Tahun 1-16: ambil dari schedule
        if (year <= 16) {
            return this.rewardSchedule[year] || 2.5;
        }
        
        // Tahun 17+: halving setiap 4 tahun
        const halvings = Math.floor((year - 16) / 4) + 2;
        return 2.5 / Math.pow(2, halvings);
    }
    
    /**
     * Dapatkan reward berdasarkan nomor block
     * @param {number} blockNumber - Nomor block
     * @returns {number} Reward dalam XYR
     */
    getRewardByBlock(blockNumber) {
        const year = Math.floor(blockNumber / this.config.blocksPerYear) + 1;
        return this.getRewardByYear(year);
    }
    
    /**
     * Konversi XYR ke nIZ
     * @param {number} xyrAmount - Jumlah dalam XYR
     * @returns {number} Jumlah dalam nIZ
     */
    toNiz(xyrAmount) {
        return Math.floor(xyrAmount * this.config.subunitRatio);
    }
    
    /**
     * Konversi nIZ ke XYR
     * @param {number} nizAmount - Jumlah dalam nIZ
     * @returns {number} Jumlah dalam XYR
     */
    toXyr(nizAmount) {
        return nizAmount / this.config.subunitRatio;
    }
    
    /**
     * Format amount dengan unit terbaik
     * @param {number} amount - Jumlah dalam XYR
     * @returns {string} String terformat (contoh: "1.234 nIZ" atau "5.67 XYR")
     */
    formatAmount(amount) {
        if (amount < 0.001) {
            return `${this.toNiz(amount).toLocaleString()} nIZ`;
        }
        return `${amount.toFixed(4)} XYR`;
    }
    
    /**
     * Hitung final supply setelah burn
     * @returns {number} Final supply dalam XYR
     */
    getFinalSupply() {
        return this.config.maxSupply * (1 - this.config.genesisBurn);
    }
    
    /**
     * Hitung mineable supply setelah burn & lock
     * @returns {number} Mineable supply dalam XYR
     */
    getMineableSupply() {
        return this.getFinalSupply() * (1 - this.config.genesisLock);
    }
    
    /**
     * Dapatkan informasi lengkap tokenomics
     * @returns {Object} Info tokenomics
     */
    getInfo() {
        return {
            maxSupply: this.config.maxSupply,
            maxSupplyFormatted: `${this.config.maxSupply.toLocaleString()} XYR`,
            subunit: "nIZ",
            subunitRatio: this.config.subunitRatio,
            blockTime: "3 menit",
            genesisBurn: `${this.config.genesisBurn * 100}%`,
            genesisLock: `${this.config.genesisLock * 100}%`,
            finalSupply: this.getFinalSupply(),
            finalSupplyFormatted: `${this.getFinalSupply().toLocaleString()} XYR`,
            mineableSupply: this.getMineableSupply(),
            mineableSupplyFormatted: `${this.getMineableSupply().toLocaleString()} XYR`,
            rewardSchedule: this.rewardSchedule,
        };
    }
    
    /**
     * Dapatkan ringkasan untuk ditampilkan
     * @returns {string} Ringkasan tokenomics
     */
    getSummary() {
        return `
╔══════════════════════════════════════════════════════════╗
║                 XYRON FINAL TOKENOMICS                     ║
╠══════════════════════════════════════════════════════════╣
║  📦 Max Supply: ${this.config.maxSupply.toLocaleString()} XYR                ║
║  🔥 Burn 5%: ${(this.config.maxSupply * 0.05).toLocaleString()} XYR                    ║
║  🔐 Lock 4%: ${(this.config.maxSupply * 0.04).toLocaleString()} XYR                    ║
║  📊 Final Supply: ${this.getFinalSupply().toLocaleString()} XYR              ║
║  ⛏️ Mineable: ${this.getMineableSupply().toLocaleString()} XYR               ║
║  🪙 1 XYR = 100,000,000 nIZ                                   ║
║  ⏱️ Block Time: 3 menit                                       ║
╠══════════════════════════════════════════════════════════╣
║  📅 REWARD SCHEDULE:                                        ║
║  Tahun 1: 6.0 XYR 🚀      | Tahun 5-8: 2.5 XYR ✅          ║
║  Tahun 2: 5.0 XYR 🔥      | Tahun 9-12: 1.25 XYR 🔄        ║
║  Tahun 3: 4.0 XYR ⚡      | Tahun 13-16: 0.625 XYR 🔄      ║
║  Tahun 4: 3.0 XYR 🌊      | Tahun 17+: Halving 4 tahun     ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}

module.exports = Tokenomics;
