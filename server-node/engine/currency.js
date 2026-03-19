/**
 * XYRON CURRENCY UTILITIES
 * 
 * 1 XYR = 100,000,000 nIZ (nano Xyron)
 * nIZ adalah subunit terkecil (1 nIZ = 0.00000001 XYR)
 */

const Currency = {
    // Basic info
    symbol: "XYR",
    subunit: "nIZ",
    ratio: 100_000_000,  // 1 XYR = 100 juta nIZ
    decimals: 8,          // 8 desimal untuk XYR
    
    /**
     * Konversi XYR ke nIZ
     * @param {number|string} xyr - Jumlah dalam XYR
     * @returns {number} Jumlah dalam nIZ (integer)
     */
    toNiz(xyr) {
        if (typeof xyr === 'string') xyr = parseFloat(xyr);
        if (isNaN(xyr) || xyr < 0) return 0;
        return Math.floor(xyr * this.ratio);
    },
    
    /**
     * Konversi nIZ ke XYR
     * @param {number|string} niz - Jumlah dalam nIZ
     * @returns {number} Jumlah dalam XYR
     */
    toXyr(niz) {
        if (typeof niz === 'string') niz = parseInt(niz);
        if (isNaN(niz) || niz < 0) return 0;
        return niz / this.ratio;
    },
    
    /**
     * Format XYR dengan unit
     * @param {number} xyr - Jumlah dalam XYR
     * @param {boolean} includeUnit - Sertakan unit XYR
     * @returns {string} String terformat
     */
    formatXyr(xyr, includeUnit = true) {
        if (typeof xyr === 'string') xyr = parseFloat(xyr);
        if (isNaN(xyr)) return '0';
        
        const formatted = xyr.toFixed(this.decimals).replace(/\.?0+$/, '');
        return includeUnit ? `${formatted} ${this.symbol}` : formatted;
    },
    
    /**
     * Format nIZ dengan unit
     * @param {number} niz - Jumlah dalam nIZ
     * @param {boolean} includeUnit - Sertakan unit nIZ
     * @returns {string} String terformat
     */
    formatNiz(niz, includeUnit = true) {
        if (typeof niz === 'string') niz = parseInt(niz);
        if (isNaN(niz)) return '0';
        
        const formatted = niz.toLocaleString();
        return includeUnit ? `${formatted} ${this.subunit}` : formatted;
    },
    
    /**
     * Format amount dengan unit terbaik (otomatis pilih XYR atau nIZ)
     * @param {number} amount - Jumlah dalam XYR
     * @param {Object} options - Opsi formatting
     * @returns {string} String terformat
     */
    format(amount, options = {}) {
        if (typeof amount === 'string') amount = parseFloat(amount);
        if (isNaN(amount) || amount < 0) return '0';
        
        const { forceUnit = 'auto', includeUnit = true } = options;
        
        // Force pake unit tertentu
        if (forceUnit === 'niz') {
            return this.formatNiz(this.toNiz(amount), includeUnit);
        }
        
        if (forceUnit === 'xyr') {
            return this.formatXyr(amount, includeUnit);
        }
        
        // Auto: pake nIZ kalau < 0.001 XYR
        if (amount < 0.001) {
            return this.formatNiz(this.toNiz(amount), includeUnit);
        }
        
        return this.formatXyr(amount, includeUnit);
    },
    
    /**
     * Parse input string ke XYR
     * @param {string} input - Input seperti "1.5 XYR" atau "50000000 nIZ"
     * @returns {Object} Hasil parsing
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            return { xyr: 0, niz: 0, unit: 'xyr' };
        }
        
        input = input.trim().toLowerCase();
        
        // Cek apakah mengandung "niz" atau "niz"
        if (input.includes('niz') || input.includes('niz')) {
            const numStr = input.replace(/[^0-9.-]/g, '');
            const niz = parseInt(numStr) || 0;
            return {
                xyr: this.toXyr(niz),
                niz: niz,
                unit: 'niz'
            };
        }
        
        // Default: parse sebagai XYR
        const numStr = input.replace(/[^0-9.-]/g, '');
        const xyr = parseFloat(numStr) || 0;
        return {
            xyr: xyr,
            niz: this.toNiz(xyr),
            unit: 'xyr'
        };
    },
    
    /**
     * Validasi apakah amount valid
     * @param {number|string} amount - Jumlah
     * @param {string} unit - 'xyr' atau 'niz'
     * @returns {boolean} Valid atau tidak
     */
    isValid(amount, unit = 'xyr') {
        if (typeof amount === 'string') {
            if (unit === 'niz') amount = parseInt(amount);
            else amount = parseFloat(amount);
        }
        
        if (isNaN(amount) || amount < 0) return false;
        
        // Untuk nIZ harus integer
        if (unit === 'niz') {
            return Number.isInteger(amount);
        }
        
        return true;
    },
    
    /**
     * Dapatkan minimum amount (1 nIZ)
     * @param {string} unit - 'xyr' atau 'niz'
     * @returns {number} Minimum amount
     */
    getMinAmount(unit = 'xyr') {
        if (unit === 'niz') return 1;
        return this.toXyr(1); // 0.00000001 XYR
    },
    
    /**
     * Dapatkan contoh konversi
     * @returns {Object} Contoh konversi
     */
    getExamples() {
        return {
            '1 XYR': this.formatNiz(this.toNiz(1), true),
            '0.1 XYR': this.formatNiz(this.toNiz(0.1), true),
            '0.01 XYR': this.formatNiz(this.toNiz(0.01), true),
            '0.001 XYR': this.formatNiz(this.toNiz(0.001), true),
            '0.0001 XYR': this.formatNiz(this.toNiz(0.0001), true),
            '1,000 nIZ': `${this.toXyr(1000)} XYR`,
            '10,000 nIZ': `${this.toXyr(10000)} XYR`,
            '100,000 nIZ': `${this.toXyr(100000)} XYR`,
            '1,000,000 nIZ': `${this.toXyr(1000000)} XYR`,
        };
    },
    
    /**
     * Dapatkan info lengkap currency
     * @returns {Object} Info currency
     */
    getInfo() {
        return {
            symbol: this.symbol,
            subunit: this.subunit,
            ratio: this.ratio,
            ratioFormatted: `1 ${this.symbol} = ${this.ratio.toLocaleString()} ${this.subunit}`,
            decimals: this.decimals,
            minAmount: {
                xyr: this.getMinAmount('xyr'),
                niz: this.getMinAmount('niz'),
            },
            examples: this.getExamples(),
        };
    }
};

module.exports = Currency;
