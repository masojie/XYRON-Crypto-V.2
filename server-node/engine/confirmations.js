/**
 * XYRON CONFIRMATION MANAGER
 * 
 * Sistem konfirmasi transaksi:
 * - Micro: 1 block (3 menit) - untuk transaksi kecil
 * - Standard: 3 blocks (9 menit) - untuk transfer biasa ✅ DEFAULT
 * - Exchange: 6 blocks (18 menit) - untuk withdraw exchange
 * - Institutional: 12 blocks (36 menit) - untuk nilai besar
 */

class Confirmations {
    constructor() {
        // Block time 3 menit
        this.BLOCK_TIME = 180; // detik
        this.BLOCK_TIME_MS = 180000; // milidetik
        
        // Level konfirmasi
        this.LEVELS = {
            MICRO: {
                blocks: 1,
                time: '3 menit',
                maxAmount: 10,
                risk: '0.1%',
                icon: '⚡',
                name: 'Micro',
            },
            STANDARD: {
                blocks: 3,
                time: '9 menit',
                maxAmount: 100,
                risk: '0.001%',
                icon: '✅',
                name: 'Standard',
            },
            EXCHANGE: {
                blocks: 6,
                time: '18 menit',
                maxAmount: 1000,
                risk: '0.000001%',
                icon: '🏛️',
                name: 'Exchange',
            },
            INSTITUTIONAL: {
                blocks: 12,
                time: '36 menit',
                maxAmount: Infinity,
                risk: '<0.0000001%',
                icon: '🏦',
                name: 'Institutional',
            },
        };
        
        // Base risk factor (ditingkatkan oleh X11-NANO)
        this.BASE_RISK = 0.1;
    }
    
    /**
     * Hitung risiko double-spend
     * @param {number} confirmations - Jumlah konfirmasi
     * @returns {number} Risiko (0-1)
     */
    calculateRisk(confirmations) {
        return Math.pow(this.BASE_RISK, confirmations);
    }
    
    /**
     * Dapatkan level konfirmasi berdasarkan amount
     * @param {number} amount - Jumlah dalam XYR
     * @returns {Object} Level konfirmasi
     */
    getLevelByAmount(amount) {
        if (amount < this.LEVELS.MICRO.maxAmount) return this.LEVELS.MICRO;
        if (amount < this.LEVELS.STANDARD.maxAmount) return this.LEVELS.STANDARD;
        if (amount < this.LEVELS.EXCHANGE.maxAmount) return this.LEVELS.EXCHANGE;
        return this.LEVELS.INSTITUTIONAL;
    }
    
    /**
     * Cek apakah transaksi aman
     * @param {number} confirmations - Jumlah konfirmasi
     * @param {number} amount - Jumlah dalam XYR
     * @returns {boolean} Aman atau tidak
     */
    isSafe(confirmations, amount) {
        const level = this.getLevelByAmount(amount);
        return confirmations >= level.blocks;
    }
    
    /**
     * Dapatkan status konfirmasi
     * @param {number} txBlock - Block transaksi
     * @param {number} currentBlock - Block saat ini
     * @param {number} amount - Jumlah dalam XYR
     * @returns {Object} Status konfirmasi
     */
    getStatus(txBlock, currentBlock, amount) {
        const confirmations = currentBlock - txBlock;
        const level = this.getLevelByAmount(amount);
        const isComplete = confirmations >= level.blocks;
        const progress = Math.min(100, (confirmations / level.blocks) * 100);
        const remaining = Math.max(0, level.blocks - confirmations);
        const timeRemaining = remaining * this.BLOCK_TIME;
        
        // Hitung risiko
        const risk = this.calculateRisk(confirmations);
        let riskFormatted;
        if (risk < 0.000001) riskFormatted = '<0.0001%';
        else riskFormatted = (risk * 100).toFixed(6) + '%';
        
        // Cek keamanan di berbagai level
        const isMicroSafe = confirmations >= 1;
        const isStandardSafe = confirmations >= 3;
        const isExchangeSafe = confirmations >= 6;
        const isInstitutionalSafe = confirmations >= 12;
        
        // Status message
        let status = 'pending';
        let statusMessage = '';
        let icon = '⏳';
        
        if (isComplete) {
            status = 'confirmed';
            icon = level.icon;
            statusMessage = `✅ Confirmed (${level.blocks} blocks)`;
        } else if (confirmations >= 3) {
            status = 'verifying';
            icon = '🔵';
            statusMessage = `🔵 Verifying (${confirmations}/${level.blocks})`;
        } else if (confirmations >= 1) {
            status = 'micro-confirmed';
            icon = '⚡';
            statusMessage = `⚡ Micro-confirmed (${confirmations}/1)`;
        }
        
        return {
            confirmations,
            target: level.blocks,
            progress: progress.toFixed(1) + '%',
            remaining,
            timeRemaining: this._formatTime(timeRemaining),
            timeRemainingSeconds: timeRemaining,
            risk: riskFormatted,
            riskValue: risk,
            isComplete,
            isMicroSafe,
            isStandardSafe,
            isExchangeSafe,
            isInstitutionalSafe,
            recommendedAction: isComplete ? 'use' : 'wait',
            status,
            statusMessage,
            icon,
            level: level.name,
        };
    }
    
    /**
     * Dapatkan rekomendasi berdasarkan amount
     * @param {number} amount - Jumlah dalam XYR
     * @returns {Object} Rekomendasi
     */
    getRecommendation(amount) {
        const level = this.getLevelByAmount(amount);
        
        return {
            amount,
            amountNiz: Math.floor(amount * 100_000_000),
            recommendedBlocks: level.blocks,
            recommendedTime: level.time,
            recommendedTimeSeconds: level.blocks * this.BLOCK_TIME,
            riskLevel: this._getRiskLevel(level.blocks),
            advice: this._getAdvice(amount, level.blocks),
            level: level.name,
            alternatives: [
                {
                    blocks: 1,
                    time: '3 menit',
                    risk: this._formatRisk(this.calculateRisk(1)),
                    suitable: 'Transaksi kecil (<10 XYR)',
                },
                {
                    blocks: 3,
                    time: '9 menit',
                    risk: this._formatRisk(this.calculateRisk(3)),
                    suitable: 'Transfer biasa (10-100 XYR)',
                },
                {
                    blocks: 6,
                    time: '18 menit',
                    risk: this._formatRisk(this.calculateRisk(6)),
                    suitable: 'Exchange withdraw (100-1000 XYR)',
                },
                {
                    blocks: 12,
                    time: '36 menit',
                    risk: this._formatRisk(this.calculateRisk(12)),
                    suitable: 'Nilai besar (>1000 XYR)',
                },
            ],
        };
    }
    
    /**
     * Estimasi waktu untuk konfirmasi
     * @param {number} targetBlocks - Target konfirmasi
     * @param {number} currentConfirmations - Konfirmasi saat ini
     * @returns {Object} Estimasi waktu
     */
    estimateTime(targetBlocks, currentConfirmations = 0) {
        const remaining = Math.max(0, targetBlocks - currentConfirmations);
        const minTime = remaining * (this.BLOCK_TIME - 10);
        const maxTime = remaining * (this.BLOCK_TIME + 10);
        const avgTime = remaining * this.BLOCK_TIME;
        
        return {
            remaining,
            min: this._formatTime(minTime),
            max: this._formatTime(maxTime),
            avg: this._formatTime(avgTime),
            estimated: this._formatTime(avgTime),
        };
    }
    
    /**
     * Validasi waktu block
     * @param {number} prevTimestamp - Timestamp block sebelumnya
     * @param {number} currTimestamp - Timestamp block saat ini
     * @returns {Object} Hasil validasi
     */
    validateBlockTime(prevTimestamp, currTimestamp) {
        const actual = (currTimestamp - prevTimestamp) / 1000; // dalam detik
        
        // Allow ±10 detik variance
        if (Math.abs(actual - this.BLOCK_TIME) > 10) {
            return {
                valid: false,
                actual,
                expected: this.BLOCK_TIME,
                difference: actual - this.BLOCK_TIME,
                penalty: Math.abs(actual - this.BLOCK_TIME) * 0.01,
            };
        }
        
        return {
            valid: true,
            actual,
            expected: this.BLOCK_TIME,
            difference: actual - this.BLOCK_TIME,
        };
    }
    
    /**
     * Dapatkan info lengkap konfirmasi
     * @returns {Object} Info konfirmasi
     */
    getInfo() {
        return {
            blockTime: this.BLOCK_TIME,
            blockTimeFormatted: '3 menit',
            levels: this.LEVELS,
            baseRisk: this.BASE_RISK,
            riskFormula: `Risk = (${this.BASE_RISK})^confirmations`,
        };
    }
    
    /**
     * Dapatkan ringkasan konfirmasi
     * @returns {string} Ringkasan
     */
    getSummary() {
        return `
╔══════════════════════════════════════════════════════════╗
║                 XYRON CONFIRMATION SYSTEM                  ║
╠══════════════════════════════════════════════════════════╣
║  ⏱️ Block Time: 3 menit                                     ║
║                                                              ║
║  📊 CONFIRMATION LEVELS:                                    ║
║  ──────────────────────────────────────────────────────  ║
║  ${this.LEVELS.MICRO.icon} Micro: 1 block (3 menit) - <10 XYR              ║
║  ${this.LEVELS.STANDARD.icon} Standard: 3 blocks (9 menit) - 10-100 XYR    ║
║  ${this.LEVELS.EXCHANGE.icon} Exchange: 6 blocks (18 menit) - 100-1000 XYR ║
║  ${this.LEVELS.INSTITUTIONAL.icon} Institutional: 12 blocks (36 menit) - >1000 XYR ║
║                                                              ║
║  📈 RISK FORMULA: Risk = (0.1)^confirmations                ║
║  1 conf: 0.1% | 3 conf: 0.001% | 6 conf: 0.000001%         ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
    
    // ========== PRIVATE METHODS ==========
    
    _formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)} detik`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        if (remainingSeconds === 0) return `${minutes} menit`;
        return `${minutes} menit ${remainingSeconds} detik`;
    }
    
    _formatRisk(risk) {
        if (risk < 0.000001) return '<0.0001%';
        if (risk < 0.001) return (risk * 100).toFixed(6) + '%';
        return (risk * 100).toFixed(4) + '%';
    }
    
    _getRiskLevel(blocks) {
        const risk = this.calculateRisk(blocks);
        if (risk < 0.000001) return 'Extremely Low';
        if (risk < 0.0001) return 'Very Low';
        if (risk < 0.01) return 'Low';
        if (risk < 0.1) return 'Medium';
        return 'High';
    }
    
    _getAdvice(amount, blocks) {
        if (amount < 10) {
            return 'Untuk transaksi kecil, 1 konfirmasi sudah cukup.';
        }
        if (amount < 100) {
            return 'Untuk transfer biasa, tunggu 3 konfirmasi (9 menit).';
        }
        if (amount < 1000) {
            return 'Untuk keamanan exchange, tunggu 6 konfirmasi (18 menit).';
        }
        return 'Untuk nilai besar, tunggu 12+ konfirmasi (36 menit).';
    }
}

module.exports = new Confirmations();
