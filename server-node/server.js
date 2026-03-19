/**
 * XYRON NODE.JS API GATEWAY
 * 
 * Main server yang menghubungkan semua engine:
 * - Tokenomics
 * - Currency
 * - Reward Schedule
 * - Fee Distribution
 * - Confirmations
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import semua engine
const Tokenomics = require('./engine/tokenomics');
const Currency = require('./engine/currency');
const RewardSchedule = require('./engine/reward-schedule');
const FeeDistribution = require('./engine/fee-distribution');
const Confirmations = require('./engine/confirmations');

// Inisialisasi
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= HEALTH CHECK =============

app.get('/health', (req, res) => {
    res.json({
        status: 'PIP',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        message: 'XYRON API Gateway - Ready',
        tokenomics: 'final',
        engines: [
            'tokenomics',
            'currency',
            'reward-schedule',
            'fee-distribution',
            'confirmations',
        ],
    });
});

// ============= TOKENOMICS ENDPOINTS =============

app.get('/api/tokenomics', (req, res) => {
    const tokenomics = new Tokenomics();
    
    res.json({
        status: 'PIP',
        data: tokenomics.getInfo(),
        summary: tokenomics.getSummary(),
    });
});

app.get('/api/tokenomics/reward/:block', (req, res) => {
    const tokenomics = new Tokenomics();
    const block = parseInt(req.params.block) || 0;
    
    const reward = tokenomics.getRewardByBlock(block);
    const rewardNiz = tokenomics.toNiz(reward);
    
    res.json({
        status: 'PIP',
        data: {
            block,
            year: Math.floor(block / tokenomics.config.blocksPerYear) + 1,
            reward,
            rewardNiz,
            rewardFormatted: tokenomics.formatAmount(reward),
        },
    });
});

// ============= CURRENCY ENDPOINTS =============

app.get('/api/currency', (req, res) => {
    res.json({
        status: 'PIP',
        data: Currency.getInfo(),
    });
});

app.get('/api/currency/convert', (req, res) => {
    const { amount, from, to } = req.query;
    
    if (!amount) {
        return res.json({
            status: 'PIP PIP',
            error: 'Amount required',
        });
    }
    
    const xyr = parseFloat(amount);
    const fromUnit = from || 'xyr';
    const toUnit = to || 'niz';
    
    let result;
    if (fromUnit === 'xyr' && toUnit === 'niz') {
        result = Currency.toNiz(xyr);
    } else if (fromUnit === 'niz' && toUnit === 'xyr') {
        result = Currency.toXyr(xyr);
    } else {
        result = xyr;
    }
    
    res.json({
        status: 'PIP',
        data: {
            input: { amount: xyr, unit: fromUnit },
            output: {
                value: result,
                unit: toUnit,
                formatted: toUnit === 'niz' 
                    ? Currency.formatNiz(result)
                    : Currency.formatXyr(result),
            },
        },
    });
});

app.get('/api/currency/format/:amount', (req, res) => {
    const amount = parseFloat(req.params.amount);
    const { unit } = req.query;
    
    res.json({
        status: 'PIP',
        data: {
            amount,
            xyr: Currency.formatXyr(amount),
            niz: Currency.formatNiz(Currency.toNiz(amount)),
            auto: Currency.format(amount),
            ...(unit === 'niz' ? { nizOnly: Currency.formatNiz(amount) } : {}),
        },
    });
});

// ============= REWARD SCHEDULE ENDPOINTS =============

app.get('/api/rewards', (req, res) => {
    const years = parseInt(req.query.years) || 10;
    
    res.json({
        status: 'PIP',
        data: {
            schedule: RewardSchedule.getScheduleDisplay(years),
            nextHalving: RewardSchedule.getNextHalving(0),
            summary: RewardSchedule.getSummary(),
        },
    });
});

app.get('/api/rewards/halving', (req, res) => {
    const currentBlock = parseInt(req.query.block) || 0;
    
    res.json({
        status: 'PIP',
        data: {
            currentBlock,
            nextHalving: RewardSchedule.getNextHalving(currentBlock),
            halvingEvents: RewardSchedule.halvingEvents,
        },
    });
});

// ============= FEE DISTRIBUTION ENDPOINTS =============

app.post('/api/fees/distribute', (req, res) => {
    const { transactions, blockNumber } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
        return res.json({
            status: 'PIP PIP',
            error: 'Invalid transactions data',
        });
    }
    
    const distribution = FeeDistribution.distributeBlockFees(
        transactions,
        blockNumber || 0
    );
    
    res.json({
        status: 'PIP',
        data: distribution,
    });
});

app.post('/api/fees/pc-miner', (req, res) => {
    const { hashrate, totalHashrate, pcPool } = req.body;
    
    if (!hashrate || !totalHashrate || !pcPool) {
        return res.json({
            status: 'PIP PIP',
            error: 'Missing parameters',
        });
    }
    
    const reward = FeeDistribution.calculatePCMinerReward(
        hashrate,
        totalHashrate,
        pcPool
    );
    
    res.json({
        status: 'PIP',
        data: reward,
    });
});

app.post('/api/fees/hp-miner', (req, res) => {
    const { activity, totalScore, hpPool } = req.body;
    
    if (!activity || !totalScore || !hpPool) {
        return res.json({
            status: 'PIP PIP',
            error: 'Missing parameters',
        });
    }
    
    const reward = FeeDistribution.calculateHPMinerReward(
        activity,
        totalScore,
        hpPool
    );
    
    res.json({
        status: 'PIP',
        data: reward,
    });
});

app.get('/api/fees/stats', (req, res) => {
    res.json({
        status: 'PIP',
        data: {
            rates: FeeDistribution.getFeeRates(),
            dailyStats: FeeDistribution.getDailyStats(),
            weeklyStats: FeeDistribution.getWeeklyStats(),
            summary: FeeDistribution.getSummary(),
        },
    });
});

// ============= CONFIRMATIONS ENDPOINTS =============

app.get('/api/confirmations/:txBlock', (req, res) => {
    const txBlock = parseInt(req.params.txBlock);
    const currentBlock = parseInt(req.query.current) || txBlock + 5;
    const amount = parseFloat(req.query.amount) || 50;
    
    const status = Confirmations.getStatus(txBlock, currentBlock, amount);
    
    res.json({
        status: 'PIP',
        data: status,
    });
});

app.get('/api/confirmations/recommend/:amount', (req, res) => {
    const amount = parseFloat(req.params.amount) || 0;
    
    res.json({
        status: 'PIP',
        data: Confirmations.getRecommendation(amount),
    });
});

app.get('/api/confirmations/info', (req, res) => {
    res.json({
        status: 'PIP',
        data: {
            info: Confirmations.getInfo(),
            levels: Confirmations.LEVELS,
            summary: Confirmations.getSummary(),
        },
    });
});

app.post('/api/confirmations/validate-block', (req, res) => {
    const { prevTimestamp, currTimestamp } = req.body;
    
    if (!prevTimestamp || !currTimestamp) {
        return res.json({
            status: 'PIP PIP',
            error: 'Missing timestamps',
        });
    }
    
    const validation = Confirmations.validateBlockTime(prevTimestamp, currTimestamp);
    
    res.json({
        status: validation.valid ? 'PIP' : 'PIP PIP',
        data: validation,
    });
});

// ============= STATS ENDPOINTS =============

app.get('/api/stats', (req, res) => {
    const tokenomics = new Tokenomics();
    const currentBlock = 10000; // Mock, nanti ambil dari blockchain
    
    res.json({
        status: 'PIP',
        data: {
            currentBlock,
            timestamp: new Date().toISOString(),
            tokenomics: {
                maxSupply: tokenomics.config.maxSupply,
                finalSupply: tokenomics.getFinalSupply(),
                mineableSupply: tokenomics.getMineableSupply(),
                currentReward: tokenomics.getRewardByBlock(currentBlock),
            },
            currency: {
                ratio: Currency.ratio,
                ratioFormatted: `1 XYR = ${Currency.ratio.toLocaleString()} nIZ`,
            },
            fees: {
                total24h: FeeDistribution.getDailyStats().totalFees || 0,
                pcPool24h: FeeDistribution.getDailyStats().pcPool || 0,
                hpPool24h: FeeDistribution.getDailyStats().hpPool || 0,
            },
            confirmations: {
                blockTime: Confirmations.BLOCK_TIME,
                defaultLevel: '3 blocks (9 menit)',
            },
        },
    });
});

// ============= ROOT ENDPOINT =============

app.get('/', (req, res) => {
    res.json({
        name: 'XYRON API Gateway',
        version: '2.0.0',
        status: 'PIP',
        endpoints: [
            '/health',
            '/api/tokenomics',
            '/api/tokenomics/reward/:block',
            '/api/currency',
            '/api/currency/convert',
            '/api/currency/format/:amount',
            '/api/rewards',
            '/api/rewards/halving',
            '/api/fees/distribute',
            '/api/fees/pc-miner',
            '/api/fees/hp-miner',
            '/api/fees/stats',
            '/api/confirmations/:txBlock',
            '/api/confirmations/recommend/:amount',
            '/api/confirmations/info',
            '/api/confirmations/validate-block',
            '/api/stats',
        ],
    });
});

// ============= START SERVER =============

app.listen(PORT, () => {
    const tokenomics = new Tokenomics();
    
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                 XYRON API GATEWAY v2.0                     ║
╠══════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                                  ║
║  📦 Max Supply: ${tokenomics.config.maxSupply.toLocaleString()} XYR        ║
║  🔥 Genesis: Burn 5% | Lock 4%                             ║
║  🪙 1 XYR = 100,000,000 nIZ                                 ║
║  ⏱️ Block Time: 3 menit                                      ║
╠══════════════════════════════════════════════════════════╣
║  💰 Fee Split: PC 60% | HP 40%                              ║
║  🔒 Confirmations: 3 blocks (9 menit) default               ║
╠══════════════════════════════════════════════════════════╣
║  📅 Reward Schedule:                                         ║
║  Tahun 1: 6.0 🚀 | Tahun 2: 5.0 🔥 | Tahun 3: 4.0 ⚡        ║
║  Tahun 4: 3.0 🌊 | Tahun 5-8: 2.5 ✅                         ║
║  Tahun 9: 1.25 🔄 | Tahun 13: 0.625 🔄                       ║
╚══════════════════════════════════════════════════════════╝
    `);
});
