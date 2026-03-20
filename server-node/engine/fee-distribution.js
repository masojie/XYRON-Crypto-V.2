/**
 * XYRON FEE DISTRIBUTION
 * PC 60% | HP 40%
 */

class FeeDistribution {
    constructor() {
        this.PC_SHARE = 0.60;
        this.HP_SHARE = 0.40;
        
        this.feeRates = {
            standard: 0.001,
            sms: 0.01,
            priority: 0.005,
            smartContract: 0.005,
        };
        
        this.dailyStats = new Map();
    }
    
    calculateTransactionFee(tx) {
        let fee = this.feeRates.standard;
        if (tx.type === 'sms') fee = this.feeRates.sms;
        if (tx.type === 'smartContract') fee = this.feeRates.smartContract;
        if (tx.priority === 'high') fee += this.feeRates.priority;
        return Math.round(fee * 100_000_000) / 100_000_000;
    }
    
    getFeeRates() {
        return {
            ...this.feeRates,
            pcShare: this.PC_SHARE,
            hpShare: this.HP_SHARE,
            pcSharePercent: `${this.PC_SHARE * 100}%`,
            hpSharePercent: `${this.HP_SHARE * 100}%`,
        };
    }
}

module.exports = new FeeDistribution();
