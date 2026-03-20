/**
 * XYRON REWARD SCHEDULE
 */

const Tokenomics = require('./tokenomics');

class RewardSchedule {
    constructor() {
        this.tokenomics = new Tokenomics();
        this.blocksPerYear = this.tokenomics.config.blocksPerYear;
        
        this.halvingEvents = [
            { number: 1, year: 9, fromReward: 2.5, toReward: 1.25, blockStart: 8 * this.blocksPerYear },
            { number: 2, year: 13, fromReward: 1.25, toReward: 0.625, blockStart: 12 * this.blocksPerYear },
            { number: 3, year: 17, fromReward: 0.625, toReward: 0.3125, blockStart: 16 * this.blocksPerYear },
        ];
    }
    
    getRewardByYear(year) {
        return this.tokenomics.getRewardByYear(year);
    }
    
    getRewardByBlock(blockNumber) {
        return this.tokenomics.getRewardByBlock(blockNumber);
    }
    
    getScheduleDisplay(years = 10) {
        const schedule = [];
        for (let year = 1; year <= years; year++) {
            schedule.push({
                year,
                reward: this.getRewardByYear(year),
                isHalving: this.halvingEvents.some(h => h.year === year),
            });
        }
        return schedule;
    }
    
    getNextHalving(currentBlock) {
        const currentYear = Math.floor(currentBlock / this.blocksPerYear) + 1;
        const next = this.halvingEvents.find(h => h.year > currentYear);
        return next || { number: 4, year: 21, fromReward: 0.3125, toReward: 0.15625 };
    }
}

module.exports = new RewardSchedule();
