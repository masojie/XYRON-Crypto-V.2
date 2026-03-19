/**
 * XYRON TOKENOMICS ENGINE
 * VERSION FINAL - HASIL DISKUSI
 * 
 * Max Supply: 12,614,400 XYR (TERKUNCI)
 * Block Time: 180 detik (3 menit)
 * Subunit: nIZ (1 XYR = 100,000,000 nIZ)
 * Reward: 6 → 5 → 4 → 3 → 2.5 + halving 4 tahun
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
            1: 6.0,   // Tahun 1: 6 XYR 🚀
            2: 5.0,   // Tahun 2: 5 XYR 🔥
            3: 4.0,   // Tahun 3: 4 XYR ⚡
            4: 3.0,   // Tahun 4: 3 XYR 🌊
            5: 2.5,   // Tahun 5: 2.5 XYR ✅
            6: 2.5,   // Tahun 6: 2.5 XYR
            7: 2.5,   // Tahun 7: 2.5 XYR
            8: 2.5,   // Tahun 8: 2.5 XYR
            9: 1.25,  // Tahun 9: 1.25 XYR 🔄 (HALVING 1)
            10: 1.25, // Tahun 10: 1.25 XYR
            11: 1.25, // Tahun 11: 1.25 XYR
            12: 1.25, // Tahun 12: 1.25 XYR
            13: 0.625, // Tahun 13: 0.625 XYR 🔄 (HALVING 2)
            14: 0.625,
            15: 0.625,
            16: 0.625,
            // Tahun 17+: halving setiap 4 tahun
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
    
    // Dapatkan reward berdasarkan tahun
    getRewardByYear(year) {
        if (year <= 16) {
            return this.rewardSchedule[year] || 2.5;
        }
        
        // Tahun 17+: halving setiap 4 tahun
        const halvings = Math.floor((year - 16) / 4) + 2;
        return 2.5 / Math.pow(2, halvings);
    }
    
    // Dapatkan reward berdasarkan block
    getRewardByBlock(blockNumber) {
        const year = Math.floor(blockNumber / this.config.blocksPerYear) + 1;
        return this.getRewardByYear(year);
    }
    
    // Konversi XYR ke nIZ
    toNiz(xyrAmount) {
        return Math.floor(xyrAmount * this.config.subunitRatio);
    }
    
    // Konversi nIZ ke XYR
    toXyr(nizAmount) {
        return nizAmount / this.config.subunitRatio;
    }
    
    // Format amount (otomatis pilih unit terbaik)
    formatAmount(amount) {
        if (amount < 0.001) {
            return `${this.toNiz(amount).toLocaleString()} nIZ`;
        }
        return `${amount.toFixed(4)} XYR`;
    }
    
    // Hitung final supply (setelah burn)
    getFinalSupply() {
        return this.config.maxSupply * (1 - this.config.genesisBurn);
    }
    
    // Hitung mineable supply (setelah burn & lock)
    getMineableSupply() {
        return this.getFinalSupply() * (1 - this.config.genesisLock);
    }
    
    // Info lengkap tokenomics
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
            mineableSupply: this.getMineableSupply(),
            rewardSchedule: this.rewardSchedule,
        };
    }
}

module.exports = Tokenomics;
