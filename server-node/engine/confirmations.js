/**
 * XYRON CONFIRMATION MANAGER
 */

class Confirmations {
    constructor() {
        this.BLOCK_TIME = 180;
        this.BASE_RISK = 0.1;
        
        this.LEVELS = {
            MICRO: { blocks: 1, maxAmount: 10, risk: '0.1%' },
            STANDARD: { blocks: 3, maxAmount: 100, risk: '0.001%' },
            EXCHANGE: { blocks: 6, maxAmount: 1000, risk: '0.000001%' },
            INSTITUTIONAL: { blocks: 12, maxAmount: Infinity, risk: '<0.0000001%' },
        };
    }
    
    getLevelByAmount(amount) {
        if (amount < 10) return this.LEVELS.MICRO;
        if (amount < 100) return this.LEVELS.STANDARD;
        if (amount < 1000) return this.LEVELS.EXCHANGE;
        return this.LEVELS.INSTITUTIONAL;
    }
    
    getStatus(txBlock, currentBlock, amount) {
        const conf = currentBlock - txBlock;
        const level = this.getLevelByAmount(amount);
        return {
            confirmations: conf,
            target: level.blocks,
            isComplete: conf >= level.blocks,
            risk: level.risk,
        };
    }
    
    getRecommendation(amount) {
        const level = this.getLevelByAmount(amount);
        return {
            amount,
            recommendedBlocks: level.blocks,
            recommendedTime: (level.blocks * this.BLOCK_TIME / 60) + ' menit',
        };
    }
    
    getInfo() {
        return {
            blockTime: this.BLOCK_TIME,
            blockTimeFormatted: '3 menit',
            levels: this.LEVELS,
        };
    }
}

module.exports = new Confirmations();
