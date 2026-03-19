/**
 * XYRON REWARD SCHEDULE
 * Jadwal reward per tahun dan halving
 * 
 * Reward: 6 → 5 → 4 → 3 → 2.5 + halving 4 tahun mulai tahun 9
 */

const Tokenomics = require('./tokenomics');

class RewardSchedule {
    constructor() {
        this.tokenomics = new Tokenomics();
        this.blocksPerYear = this.tokenomics.config.blocksPerYear;
        
        // Jadwal reward (sama dengan di tokenomics)
        this.schedule = {
            1: 6.0, 2: 5.0, 3: 4.0, 4: 3.0,
            5: 2.5, 6: 2.5, 7: 2.5, 8: 2.5,
            9: 1.25, 10: 1.25, 11: 1.25, 12: 1.25,
            13: 0.625, 14: 0.625, 15: 0.625, 16: 0.625,
        };
        
        // Event halving
        this.halvingEvents = [
            { number: 1, year: 9, fromReward: 2.5, toReward: 1.25, blockStart: 8 * this.blocksPerYear },
            { number: 2, year: 13, fromReward: 1.25, toReward: 0.625, blockStart: 12 * this.blocksPerYear },
            { number: 3, year: 17, fromReward: 0.625, toReward: 0.3125, blockStart: 16 * this.blocksPerYear },
            { number: 4, year: 21, fromReward: 0.3125, toReward: 0.15625, blockStart: 20 * this.blocksPerYear },
        ];
    }
    
    /**
     * Dapatkan reward berdasarkan tahun
     * @param {number} year - Tahun (1, 2, 3, ...)
     * @returns {number} Reward dalam XYR
     */
    getRewardByYear(year) {
        return this.tokenomics.getRewardByYear(year);
    }
    
    /**
     * Dapatkan reward berdasarkan block
     * @param {number} blockNumber - Nomor block
     * @returns {number} Reward dalam XYR
     */
    getRewardByBlock(blockNumber) {
        return this.tokenomics.getRewardByBlock(blockNumber);
    }
    
    /**
     * Dapatkan reward dalam nIZ
     * @param {number} blockNumber - Nomor block
     * @returns {number} Reward dalam nIZ
     */
    getRewardNiz(blockNumber) {
        const xyr = this.getRewardByBlock(blockNumber);
        return this.tokenomics.toNiz(xyr);
    }
    
    /**
     * Cek apakah block ini adalah block halving
     * @param {number} blockNumber - Nomor block
     * @returns {Object|null} Info halving atau null
     */
    isHalvingBlock(blockNumber) {
        return this.halvingEvents.find(h => h.blockStart === blockNumber) || null;
    }
    
    /**
     * Dapatkan informasi halving berikutnya
     * @param {number} currentBlock - Block saat ini
     * @returns {Object} Info halving berikutnya
     */
    getNextHalving(currentBlock) {
        const currentYear = Math.floor(currentBlock / this.blocksPerYear) + 1;
        
        // Cari halving berikutnya
        let nextHalving = this.halvingEvents.find(h => h.year > currentYear);
        
        if (!nextHalving) {
            // Hitung halving setelah tahun 21
            const yearsSinceLast = currentYear - 16;
            const halvingsSince = Math.floor(yearsSinceLast / 4) + 2;
            const nextYear = 16 + (halvingsSince * 4) + 4;
            const blockStart = (nextYear - 1) * this.blocksPerYear;
            const fromReward = 2.5 / Math.pow(2, halvingsSince);
            const toReward = fromReward / 2;
            
            nextHalving = {
                number: halvingsSince + 1,
                year: nextYear,
                fromReward,
                toReward,
                blockStart,
            };
        }
        
        const blocksRemaining = nextHalving.blockStart - currentBlock;
        const yearsRemaining = (nextHalving.year - currentYear);
        const daysRemaining = Math.floor(blocksRemaining * 180 / 86400); // 180 detik per block
        
        return {
            ...nextHalving,
            blocksRemaining,
            yearsRemaining,
            daysRemaining,
            estimatedDate: `${daysRemaining} hari lagi`,
        };
    }
    
    /**
     * Dapatkan jadwal reward untuk ditampilkan
     * @param {number} maxYear - Tahun maksimal (default 20)
     * @returns {Array} Array jadwal reward
     */
    getScheduleDisplay(maxYear = 20) {
        const schedule = [];
        
        for (let year = 1; year <= maxYear; year++) {
            const reward = this.getRewardByYear(year);
            const isHalving = this.halvingEvents.some(h => h.year === year);
            
            schedule.push({
                year,
                reward,
                rewardNiz: this.tokenomics.toNiz(reward),
                isHalving,
                note: isHalving ? `HALVING ${this.halvingEvents.find(h => h.year === year)?.number}` : '',
            });
        }
        
        return schedule;
    }
    
    /**
     * Dapatkan ringkasan reward schedule
     * @returns {string} Ringkasan
     */
    getSummary() {
        const schedule = this.getScheduleDisplay(20);
        
        let output = `
╔══════════════════════════════════════════════════════════╗
║                 XYRON REWARD SCHEDULE                      ║
╠══════════════════════════════════════════════════════════╣
║  Tahun 1: 6.0 XYR 🚀     | Tahun 8: 2.5 XYR ✅           ║
║  Tahun 2: 5.0 XYR 🔥     | Tahun 9: 1.25 XYR 🔄 HALVING 1 ║
║  Tahun 3: 4.0 XYR ⚡     | Tahun 13: 0.625 XYR 🔄 HALVING 2║
║  Tahun 4: 3.0 XYR 🌊     | Tahun 17: 0.3125 XYR 🔄 HALVING 3║
║  Tahun 5-8: 2.5 XYR ✅   | Tahun 21: 0.15625 XYR 🔄 HALVING 4║
╚══════════════════════════════════════════════════════════╝
        `;
        
        return output;
    }
}

module.exports = new RewardSchedule();
