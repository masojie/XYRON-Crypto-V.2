/**
 * XYRON NODE.JS API GATEWAY
 * 
 * Main server yang menghubungkan semua engine:
 * - Tokenomics
 * - Currency
 * - Reward Schedule
 * - Fee Distribution
 * - Confirmations
 * 
 * Version: 2.0.0 (Final Tokenomics)
 * Status: PIP
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

app.get('/api/tokenomics/supply', (req, res) => {
    const tokenomics = new Tokenomics();
    const currentBlock = parseInt(req.query.block) || 0;
    
    res.json({
        status: 'PIP',
        data: {
            maxSupply: tokenomics.config.maxSupply,
            maxSupplyFormatted: `${tokenomics.config.maxSupply.toLocaleString()} XYR`,
            burnedSupply: tokenomics.config.maxSupply * tokenomics.config.genesisBurn,
            lockedSupply: tokenomics.config.maxSupply * tokenomics.config.genesisLock,
            finalSupply: tokenomics.getFinalSupply(),
            mineableSupply: tokenomics.getMineableSupply(),
            minedSupply: tokenomics.getMinedSupply ? tokenomics.getMinedSupply(currentBlock) : 0,
            remainingSupply: tokenomics.getRemainingSupply ? tokenomics.getRemainingSupply(currentBlock) : 0,
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
        return res.status(400).json({
            status: 'PIP PIP',
            error: 'Amount required',
        });
    }
    
    const numAmount = parseFloat(amount);
    const fromUnit = from?.toLowerCase() || 'xyr';
    const toUnit = to?.toLowerCase() || 'niz';
    
    let result;
    let resultFormatted;
    
    if (fromUnit === 'xyr' && toUnit === 'niz') {
        result = Currency.toNiz(numAmount);
        resultFormatted = Currency.formatNiz(result);
    } else if (fromUnit === 'niz' && toUnit === 'xyr') {
        result = Currency.toXyr(numAmount);
        resultFormatted = Currency.formatXyr(result);
    } else {
        result = numAmount;
        resultFormatted = Currency.format(numAmount);
    }
    
    res.json({
        status: 'PIP',
        data: {
            input: { amount: numAmount, unit: fromUnit },
            output: {
                value: result,
                unit: toUnit,
                formatted: resultFormatted,
            },
        },
    });
});

app.get('/api/currency/format/:amount', (req, res) => {
    const amount = parseFloat(req.params.amount);
    const { unit } = req.query;
    
    const response = {
        status: 'PIP',
        data: {
            amount,
            xyr: Currency.formatXyr(amount),
            niz: Currency.formatNiz(Currency.toNiz(amount)),
            auto: Currency.format(amount),
        },
    };
    
    if (unit === 'niz') {
        response.data.nizOnly = Currency.formatNiz(amount);
    }
    
    res.json(response);
});

app.get('/api/currency/examples', (req, res) => {
    res.json({
        status: 'PIP',
        data: Currency.getExamples(),
    });
});

// ============= REWARD SCHEDULE ENDPOINTS =============

app.get('/api/rewards', (req, res) => {
    const years = parseInt(req.query.years) || 10;
    
    res.json({
        status: 'PIP',
        data: {
            schedule: RewardSchedule.getScheduleDisplay(years),
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

app.get('/api/rewards/block/:block', (req, res) => {
    const block = parseInt(req.params.block) || 0;
    const tokenomics = new Tokenomics();
    
    const reward = tokenomics.getRewardByBlock(block);
    const year = Math.floor(block / tokenomics.config.blocksPerYear) + 1;
    const isHalving = RewardSchedule.isHalvingBlock ? RewardSchedule.isHalvingBlock(block) : null;
    
    res.json({
        status: 'PIP',
        data: {
            block,
            year,
            reward,
            rewardNiz: tokenomics.toNiz(reward),
            rewardFormatted: tokenomics.formatAmount(reward),
            isHalving: !!isHalving,
            halvingInfo: isHalving,
        },
    });
});

// ============= FEE DISTRIBUTION ENDPOINTS =============

app.post('/api/fees/distribute', (req, res) => {
    const { transactions, blockNumber } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({
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

app.post('/api/fees/calculate', (req, res) => {
    const { type, smsContent, priority, amount } = req.body;
    
    const tx = {
        type: type || 'standard',
        smsContent,
        priority: priority || 'normal',
        amount: amount || 0,
    };
    
    const fee = FeeDistribution.calculateTransactionFee(tx);
    
    res.json({
        status: 'PIP',
        data: {
            transaction: tx,
            fee,
            feeNiz: Math.floor(fee * 100_000_000),
            feeFormatted: fee < 0.001 
                ? `${Math.floor(fee * 100_000_000).toLocaleString()} nIZ`
                : `${fee.toFixed(6)} XYR`,
        },
    });
});

app.post('/api/fees/pc-miner', (req, res) => {
    const { hashrate, totalHashrate, pcPool } = req.body;
    
    if (!hashrate || !totalHashrate || !pcPool) {
        return res.status(400).json({
            status: 'PIP PIP',
            error: 'Missing parameters: hashrate, totalHashrate, pcPool',
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
        return res.status(400).json({
            status: 'PIP PIP',
            error: 'Missing parameters: activity, totalScore, hpPool',
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
    const date = req.query.date;
    
    res.json({
        status: 'PIP',
        data: {
            rates: FeeDistribution.getFeeRates(),
            dailyStats: date ? FeeDistribution.getDailyStats(date) : FeeDistribution.getDailyStats(),
            weeklyStats: FeeDistribution.getWeeklyStats(),
            summary: FeeDistribution.getSummary(),
        },
    });
});

app.get('/api/fees/info', (req, res) => {
    res.json({
        status: 'PIP',
        data: {
            pcShare: `${FeeDistribution.PC_SHARE * 100}%`,
            hpShare: `${FeeDistribution.HP_SHARE * 100}%`,
            feeRates: FeeDistribution.feeRates,
        },
    });
});

// ============= CONFIRMATIONS ENDPOINTS =============

app.get('/api/confirmations/:txBlock', (req, res) => {
    const txBlock = parseInt(req.params.txBlock);
    const currentBlock = parseInt(req.query.current) || txBlock + 5;
    const amount = parseFloat(req.query.amount) || 50;
    
    if (isNaN(txBlock)) {
        return res.status(400).json({
            status: 'PIP PIP',
            error: 'Invalid txBlock',
        });
    }
    
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
        return res.status(400).json({
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

app.get('/api/confirmations/estimate', (req, res) => {
    const target = parseInt(req.query.target) || 3;
    const current = parseInt(req.query.current) || 0;
    
    res.json({
        status: 'PIP',
        data: Confirmations.estimateTime(target, current),
    });
});

// ============= STATS ENDPOINTS =============

app.get('/api/stats', (req, res) => {
    const tokenomics = new Tokenomics();
    const currentBlock = parseInt(req.query.block) || 10000; // Mock, nanti ambil dari blockchain
    
    res.json({
        status: 'PIP',
        data: {
            currentBlock,
            timestamp: new Date().toISOString(),
            tokenomics: {
                maxSupply: tokenomics.config.maxSupply,
                maxSupplyFormatted: `${tokenomics.config.maxSupply.toLocaleString()} XYR`,
                finalSupply: tokenomics.getFinalSupply(),
                mineableSupply: tokenomics.getMineableSupply(),
                currentReward: tokenomics.getRewardByBlock(currentBlock),
                currentRewardFormatted: tokenomics.formatAmount(tokenomics.getRewardByBlock(currentBlock)),
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
                blockTimeFormatted: '3 menit',
                defaultLevel: '3 blocks (9 menit)',
                defaultLevelObj: Confirmations.LEVELS.STANDARD,
            },
        },
    });
});

app.get('/api/stats/miners', (req, res) => {
    const weeklyStats = FeeDistribution.getWeeklyStats();
    
    res.json({
        status: 'PIP',
        data: {
            distribution: {
                pc: `${FeeDistribution.PC_SHARE * 100}%`,
                hp: `${FeeDistribution.HP_SHARE * 100}%`,
            },
            weeklyFees: weeklyStats,
            totalFees: weeklyStats.reduce((sum, day) => sum + (day?.totalFees || 0), 0),
            pcPool: weeklyStats.reduce((sum, day) => sum + (day?.pcPool || 0), 0),
            hpPool: weeklyStats.reduce((sum, day) => sum + (day?.hpPool || 0), 0),
            averageDailyFees: weeklyStats.length ? 
                weeklyStats.reduce((sum, day) => sum + (day?.totalFees || 0), 0) / weeklyStats.length : 0,
        },
    });
});

// ============= ROOT ENDPOINT =============

app.get('/', (req, res) => {
    res.json({
        name: 'XYRON API Gateway',
        version: '2.0.0',
        status: 'PIP',
        description: 'XYRON Blockchain API with final tokenomics',
        documentation: '/api/docs',
        endpoints: [
            '/health',
            '/api/tokenomics',
            '/api/tokenomics/reward/:block',
            '/api/tokenomics/supply',
            '/api/currency',
            '/api/currency/convert',
            '/api/currency/format/:amount',
            '/api/currency/examples',
            '/api/rewards',
            '/api/rewards/halving',
            '/api/rewards/block/:block',
            '/api/fees/calculate',
            '/api/fees/distribute',
            '/api/fees/pc-miner',
            '/api/fees/hp-miner',
            '/api/fees/stats',
            '/api/fees/info',
            '/api/confirmations/:txBlock',
            '/api/confirmations/recommend/:amount',
            '/api/confirmations/info',
            '/api/confirmations/validate-block',
            '/api/confirmations/estimate',
            '/api/stats',
            '/api/stats/miners',
        ],
    });
});

// ============= SIMPLE API DOCS =============

app.get('/api/docs', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>XYRON API Documentation</title>
            <style>
                body { font-family: Arial; padding: 20px; background: #0D0D18; color: #F0F0FF; }
                h1 { color: #D4AF37; }
                h2 { color: #2563eb; margin-top: 30px; }
                code { background: #1E1E3A; padding: 2px 6px; border-radius: 4px; color: #3b82f6; }
                pre { background: #1E1E3A; padding: 10px; border-radius: 8px; overflow-x: auto; }
                .endpoint { margin-bottom: 20px; border-bottom: 1px solid #1E1E3A; padding-bottom: 20px; }
                .method { color: #10B981; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>🚀 XYRON API DOCUMENTATION</h1>
            <p>Version: 2.0.0 | Status: PIP</p>
            
            <h2>📦 Tokenomics</h2>
            <div class="endpoint">
                <p><span class="method">GET</span> <code>/api/tokenomics</code> - Info tokenomics lengkap</p>
                <p><span class="method">GET</span> <code>/api/tokenomics/reward/:block</code> - Reward di block tertentu</p>
                <p><span class="method">GET</span> <code>/api/tokenomics/supply</code> - Info supply</p>
            </div>
            
            <h2>🪙 Currency</h2>
            <div class="endpoint">
                <p><span class="method">GET</span> <code>/api/currency</code> - Info currency</p>
                <p><span class="method">GET</span> <code>/api/currency/convert?amount=1&from=xyr&to=niz</code> - Konversi XYR/nIZ</p>
                <p><span class="method">GET</span> <code>/api/currency/format/:amount</code> - Format amount</p>
            </div>
            
            <h2>📅 Rewards</h2>
            <div class="endpoint">
                <p><span class="method">GET</span> <code>/api/rewards?years=10</code> - Jadwal reward</p>
                <p><span class="method">GET</span> <code>/api/rewards/halving?block=0</code> - Info halving</p>
            </div>
            
            <h2>💰 Fees</h2>
            <div class="endpoint">
                <p><span class="method">POST</span> <code>/api/fees/calculate</code> - Hitung fee transaksi</p>
                <p><span class="method">GET</span> <code>/api/fees/info</code> - Info fee distribution (60/40)</p>
            </div>
            
            <h2>🔒 Confirmations</h2>
            <div class="endpoint">
                <p><span class="method">GET</span> <code>/api/confirmations/:txBlock?current=1000&amount=50</code> - Status konfirmasi</p>
                <p><span class="method">GET</span> <code>/api/confirmations/recommend/:amount</code> - Rekomendasi konfirmasi</p>
            </div>
            
            <h2>📊 Stats</h2>
            <div class="endpoint">
                <p><span class="method">GET</span> <code>/api/stats</code> - Statistik network</p>
                <p><span class="method">GET</span> <code>/health</code> - Health check</p>
            </div>
        </body>
        </html>
    `);
});

// ============= ERROR HANDLER =============

app.use((req, res) => {
    res.status(404).json({
        status: 'PIP PIP',
        error: 'Endpoint not found',
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'PIP PIP PIP',
        error: 'Internal server error',
        message: err.message,
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

module.exports = app;
