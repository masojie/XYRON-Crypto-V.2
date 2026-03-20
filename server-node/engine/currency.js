/**
 * XYRON CURRENCY UTILITIES
 * 1 XYR = 100,000,000 nIZ
 */

const Currency = {
    symbol: "XYR",
    subunit: "nIZ",
    ratio: 100_000_000,
    
    toNiz(xyr) {
        return Math.floor(xyr * this.ratio);
    },
    
    toXyr(niz) {
        return niz / this.ratio;
    },
    
    format(amount) {
        if (amount < 0.001) {
            return `${this.toNiz(amount).toLocaleString()} nIZ`;
        }
        return `${amount.toFixed(4)} XYR`;
    },
    
    formatXyr(amount) {
        return `${amount.toFixed(4)} XYR`;
    },
    
    formatNiz(amount) {
        return `${amount.toLocaleString()} nIZ`;
    },
    
    getInfo() {
        return {
            symbol: this.symbol,
            subunit: this.subunit,
            ratio: this.ratio,
            ratioFormatted: `1 XYR = ${this.ratio.toLocaleString()} nIZ`,
        };
    }
};

module.exports = Currency;
