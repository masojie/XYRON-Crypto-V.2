/**
 * XYRON FEE DISTRIBUTION
 * 
 * Pembagian fee transaksi:
 * - PC Miners (Full Mining): 60%
 * - HP Miners (Light Mining): 40%
 * - 100% fee untuk miner! No potong!
 */

class FeeDistribution {
    constructor() {
        // Pembagian fee (HASIL DISKUSI)
        this.PC_SHARE = 0.60;  // 60% untuk PC miners
        this.HP_SHARE = 0.40;  // 40% untuk HP miners
        
        // Fee rates per transaksi
        this.feeRates = {
            standard: 0.001,      // 0.001 XYR untuk transfer biasa
            sms: 0.01,            // 0.01 XYR untuk SMS (fitur unik)
            priority: 0.005,       // 0.005 XYR untuk prioritas
            smartContract: 0.005,  // 0.005 XYR untuk smart contract
        };
        
        // Stats harian
        this.dailyStats = new Map();
    }
    
    /**
     * Hitung fee untuk satu transaksi
     * @param {Object} tx - Data transaksi
     * @returns {number} Fee dalam XYR
     */
    calculateTransactionFee(tx) {
        let fee = this.feeRates.standard;
        
        // SMS transaction (fitur unik XYRON)
        if (tx.type === 'sms' || tx.smsContent) {
            fee = this.feeRates.sms;
        }
        
        // Smart contract
        if (tx.type === 'smartContract') {
            fee = this.feeRates.smartContract;
        }
        
        // Priority fee (biar cepet diproses)
        if (tx.priority === 'high') {
            fee += this.feeRates.priority;
        }
        
        // Fee lebih mahal kalau transaksi besar (keamanan ekstra)
        if (tx.amount > 1000) {
            fee *= 1.5;
        }
        
        // Bulatkan ke 8 desimal
        return Math.round(fee * 100_000_000) / 100_000_000;
    }
    
    /**
     * Distribusi fee untuk satu block
     * @param {Array} transactions - Daftar transaksi
     * @param {number} blockNumber - Nomor block
     * @returns {Object} Hasil distribusi
     */
    distributeBlockFees(transactions, blockNumber) {
        let totalFees = 0;
        const breakdown = [];
        
        // Hitung total fee
        for (const tx of transactions) {
            const fee = this.calculateTransactionFee(tx);
            totalFees += fee;
            
            breakdown.push({
                txHash: tx.hash || `tx_${Math.random().toString(36).substr(2, 8)}`,
                fee,
                feeNiz: Math.floor(fee * 100_000_000),
                type: tx.type || 'standard',
            });
        }
        
        // Bagi sesuai persentase
        const pcPool = totalFees * this.PC_SHARE;
        const hpPool = totalFees * this.HP_SHARE;
        
        // Catat statistik
        this._recordStats(blockNumber, {
            totalFees,
            pcPool,
            hpPool,
            txCount: transactions.length,
        });
        
        return {
            totalFees,
            totalFeesNiz: Math.floor(totalFees * 100_000_000),
            pcPool,
            pcPoolNiz: Math.floor(pcPool * 100_000_000),
            hpPool,
            hpPoolNiz: Math.floor(hpPool * 100_000_000),
            distribution: {
                pc: `${this.PC_SHARE * 100}%`,
                hp: `${this.HP_SHARE * 100}%`,
            },
            breakdown,
            blockNumber,
            timestamp: Date.now(),
        };
    }
    
    /**
     * Hitung reward untuk PC miner berdasarkan hashrate
     * @param {number} hashrate - Hashrate miner (H/s)
     * @param {number} totalHashrate - Total hashrate jaringan
     * @param {number} pcPool - Total pool fee untuk PC
     * @returns {Object} Reward miner
     */
    calculatePCMinerReward(hashrate, totalHashrate, pcPool) {
        const share = hashrate / totalHashrate;
        const rewardXyr = pcPool * share;
        const rewardNiz = Math.floor(rewardXyr * 100_000_000);
        
        return {
            hashrate,
            totalHashrate,
            share: (share * 100).toFixed(4) + '%',
            rewardXyr,
            rewardNiz,
            formatted: rewardXyr < 0.001 
                ? `${rewardNiz.toLocaleString()} nIZ`
                : `${rewardXyr.toFixed(6)} XYR`,
        };
    }
    
    /**
     * Hitung reward untuk HP miner berdasarkan aktivitas
     * @param {Object} activity - Data aktivitas user
     * @param {number} totalScore - Total skor semua HP miner
     * @param {number} hpPool - Total pool fee untuk HP
     * @returns {Object} Reward HP miner
     */
    calculateHPMinerReward(activity, totalScore, hpPool) {
        const {
            pagesVisited = 0,     // Jumlah website dikunjungi
            timeSpent = 0,         // Waktu online (menit)
            socialActions = 0,     // Like, share, comment
            referrals = 0,         // Jumlah referral
            streak = 1,            // Hari aktif berturut-turut
        } = activity;
        
        // Hitung skor aktivitas
        const score = 
            pagesVisited * 0.1 +
            timeSpent * 0.01 +
            socialActions * 0.5 +
            referrals * 5 +
            (streak > 1 ? streak * 0.1 : 0);
        
        const share = score / totalScore;
        const rewardXyr = hpPool * share;
        const rewardNiz = Math.floor(rewardXyr * 100_000_000);
        
        return {
            score,
            totalScore,
            share: (share * 100).toFixed(4) + '%',
            rewardXyr,
            rewardNiz,
            formatted: rewardXyr < 0.001 
                ? `${rewardNiz.toLocaleString()} nIZ`
                : `${rewardXyr.toFixed(6)} XYR`,
            activity: {
                pagesVisited,
                timeSpent,
                socialActions,
                referrals,
                streak,
            },
        };
    }
    
    /**
     * Catat statistik harian
     * @private
     */
    _recordStats(blockNumber, data) {
        const date = new Date().toISOString().split('T')[0];
        
        if (!this.dailyStats.has(date)) {
            this.dailyStats.set(date, {
                date,
                totalFees: 0,
                pcPool: 0,
                hpPool: 0,
                txCount: 0,
                blocks: [],
            });
        }
        
        const stats = this.dailyStats.get(date);
        stats.totalFees += data.totalFees;
        stats.pcPool += data.pcPool;
        stats.hpPool += data.hpPool;
        stats.txCount += data.txCount;
        stats.blocks.push(blockNumber);
    }
    
    /**
     * Dapatkan statistik harian
     * @param {string} date - Tanggal (YYYY-MM-DD)
     * @returns {Object} Statistik
     */
    getDailyStats(date = new Date().toISOString().split('T')[0]) {
        return this.dailyStats.get(date) || {
            date,
            totalFees: 0,
            pcPool: 0,
            hpPool: 0,
            txCount: 0,
            blocks: [],
        };
    }
    
    /**
     * Dapatkan statistik mingguan
     * @returns {Array} Statistik 7 hari terakhir
     */
    getWeeklyStats() {
        const dates = Array.from(this.dailyStats.keys()).slice(-7);
        return dates.map(date => this.dailyStats.get(date));
    }
    
    /**
     * Dapatkan informasi fee rates
     * @returns {Object} Fee rates
     */
    getFeeRates() {
        return {
            ...this.feeRates,
            pcShare: this.PC_SHARE,
            hpShare: this.HP_SHARE,
            pcSharePercent: `${this.PC_SHARE * 100}%`,
            hpSharePercent: `${this.HP_SHARE * 100}%`,
        };
    }
    
    /**
     * Dapatkan ringkasan fee distribution
     * @returns {string} Ringkasan
     */
    getSummary() {
        return `
╔══════════════════════════════════════════════════════════╗
║                 XYRON FEE DISTRIBUTION                     ║
╠══════════════════════════════════════════════════════════╣
║  💻 PC MINERS: ${this.PC_SHARE * 100}% (based on hashrate)                      ║
║  📱 HP MINERS: ${this.HP_SHARE * 100}% (based on activity)                      ║
║  🔥 100% FEE UNTUK MINER! No potong!                      ║
╠══════════════════════════════════════════════════════════╣
║  💰 FEE RATES:                                             ║
║  • Standard Transfer: ${this.feeRates.standard} XYR                        ║
║  • SMS Transaction: ${this.feeRates.sms} XYR (fitur unik!)                 ║
║  • Priority Fee: +${this.feeRates.priority} XYR                            ║
║  • Smart Contract: ${this.feeRates.smartContract} XYR                       ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}

module.exports = new FeeDistribution();
