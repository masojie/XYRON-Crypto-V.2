/**
 * XYRON TOKENOMICS ENGINE
 * Max Supply: 12,614,400 XYR
 */

const fs = require('fs');
const EventEmitter = require('events');

class Tokenomics extends EventEmitter {
    constructor() {
        super();
        this.config = {
            maxSupply: 12_614_400,
            blockTime: 180_000,
            blocksPerYear: 175_200,
            subunitRatio: 100_000_000,
            genesisBurn: 0.05,
            genesisLock: 0.04,
        };
        
        this.rewardSchedule = {
            1: 6.0, 2: 5.0, 3: 4.0, 4: 3.0,
            5: 2.5, 6: 2.5, 7: 2.5, 8: 2.5,
            9: 1.25, 10: 1.25, 11: 1.25, 12: 1.25,
            13: 0.625, 14: 0.625, 15: 0.625, 16: 0.625,
        };
    }
    
    getRewardByYear(year) {
        if (year <= 16) return this.rewardSchedule[year] || 2.5;
        const halvings = Math.floor((year - 16) / 4) + 2;
        return 2.5 / Math.pow(2, halvings);
    }
    
    getRewardByBlock(blockNumber) {
        const year = Math.floor(blockNumber / this.config.blocksPerYear) + 1;
        return this.getRewardByYear(year);
    }
    
    toNiz(xyr) {
        return Math.floor(xyr * this.config.subunitRatio);
    }
    
    getFinalSupply() {
        return this.config.maxSupply * (1 - this.config.genesisBurn);
    }
    
    getMineableSupply() {
        return this.getFinalSupply() * (1 - this.config.genesisLock);
    }
    
    getInfo() {
        return {
            maxSupply: this.config.maxSupply,
            subunitRatio: this.config.subunitRatio,
            genesisBurn: `${this.config.genesisBurn * 100}%`,
            genesisLock: `${this.config.genesisLock * 100}%`,
            finalSupply: this.getFinalSupply(),
            mineableSupply: this.getMineableSupply(),
        };
    }
    
    getSummary() {
        return `
╔════════════════════════════════════╗
║     XYRON FINAL TOKENOMICS          ║
╠════════════════════════════════════╣
║  Max Supply: 12,614,400 XYR         ║
║  1 XYR = 100,000,000 nIZ            ║
║  Burn 5% | Lock 4%                  ║
╚════════════════════════════════════╝`;
    }
}

module.exports = Tokenomics;
