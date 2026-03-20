/**
 * XYRON API GATEWAY
 * Version 2.0.0 - Final Tokenomics with COLORS!
 */

const express = require('express');
const cors = require('cors');
const Tokenomics = require('./engine/tokenomics');
const Currency = require('./engine/currency');
const RewardSchedule = require('./engine/reward-schedule');
const FeeDistribution = require('./engine/fee-distribution');
const Confirmations = require('./engine/confirmations');

// ============= COLOR CODES =============
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============= API ENDPOINTS =============

app.get('/health', (req, res) => {
    res.json({ 
        status: 'PIP', 
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/tokenomics', (req, res) => {
    const tokenomics = new Tokenomics();
    res.json({ 
        status: 'PIP', 
        data: tokenomics.getInfo() 
    });
});

app.get('/api/tokenomics/reward/:block', (req, res) => {
    const tokenomics = new Tokenomics();
    const block = parseInt(req.params.block) || 0;
    const reward = tokenomics.getRewardByBlock(block);
    res.json({
        status: 'PIP',
        data: {
            block,
            reward,
            rewardNiz: tokenomics.toNiz(reward),
            rewardFormatted: tokenomics.formatAmount(reward)
        }
    });
});

app.get('/api/currency/convert', (req, res) => {
    const { amount, from, to } = req.query;
    const xyr = parseFloat(amount) || 1;
    
    let result;
    if (from === 'niz' && to === 'xyr') {
        result = Currency.toXyr(xyr);
    } else {
        result = Currency.toNiz(xyr);
    }
    
    res.json({
        status: 'PIP',
        data: {
            input: { amount: xyr, unit: from || 'xyr' },
            output: {
                value: result,
                unit: to || 'niz',
                formatted: to === 'xyr' ? Currency.formatXyr(result) : Currency.formatNiz(result)
            }
        }
    });
});

app.get('/api/currency/format/:amount', (req, res) => {
    const amount = parseFloat(req.params.amount) || 0;
    res.json({
        status: 'PIP',
        data: {
            amount,
            xyr: Currency.formatXyr(amount),
            niz: Currency.formatNiz(Currency.toNiz(amount)),
            auto: Currency.format(amount)
        }
    });
});

app.get('/api/rewards', (req, res) => {
    const years = parseInt(req.query.years) || 10;
    res.json({
        status: 'PIP',
        data: {
            schedule: RewardSchedule.getScheduleDisplay(years)
        }
    });
});

app.get('/api/rewards/halving', (req, res) => {
    const currentBlock = parseInt(req.query.block) || 0;
    res.json({
        status: 'PIP',
        data: {
            nextHalving: RewardSchedule.getNextHalving(currentBlock),
            halvingEvents: RewardSchedule.halvingEvents
        }
    });
});

app.get('/api/fees/info', (req, res) => {
    res.json({
        status: 'PIP',
        data: FeeDistribution.getFeeRates()
    });
});

app.post('/api/fees/calculate', (req, res) => {
    const { type, priority, amount } = req.body;
    const fee = FeeDistribution.calculateTransactionFee({ type, priority, amount });
    res.json({
        status: 'PIP',
        data: {
            fee,
            feeNiz: Math.floor(fee * 100_000_000),
            feeFormatted: fee < 0.001 
                ? `${Math.floor(fee * 100_000_000).toLocaleString()} nIZ`
                : `${fee.toFixed(6)} XYR`
        }
    });
});

app.get('/api/confirmations/recommend/:amount', (req, res) => {
    const amount = parseFloat(req.params.amount) || 0;
    res.json({
        status: 'PIP',
        data: Confirmations.getRecommendation(amount)
    });
});

app.get('/api/confirmations/info', (req, res) => {
    res.json({
        status: 'PIP',
        data: Confirmations.getInfo()
    });
});

app.get('/api/stats', (req, res) => {
    const tokenomics = new Tokenomics();
    res.json({
        status: 'PIP',
        data: {
            maxSupply: tokenomics.config.maxSupply,
            finalSupply: tokenomics.getFinalSupply(),
            mineableSupply: tokenomics.getMineableSupply(),
            blockTime: '3 menit',
            feeSplit: {
                pc: '60%',
                hp: '40%'
            },
            confirmations: '3 blocks (9 menit) default'
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'XYRON API Gateway',
        version: '2.0.0',
        status: 'PIP',
        endpoints: [
            '/health',
            '/api/tokenomics',
            '/api/tokenomics/reward/:block',
            '/api/currency/convert',
            '/api/currency/format/:amount',
            '/api/rewards',
            '/api/rewards/halving',
            '/api/fees/info',
            '/api/fees/calculate',
            '/api/confirmations/recommend/:amount',
            '/api/confirmations/info',
            '/api/stats'
        ]
    });
});

app.get('/api/docs', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>XYRON API Docs</title>
            <style>
                body { 
                    background: #0D0D18; 
                    color: #F0F0FF; 
                    font-family: Arial; 
                    padding: 20px; 
                }
                h1 { color: #D4AF37; }
                a { color: #3b82f6; }
                .endpoint { 
                    background: #1E1E3A; 
                    padding: 10px; 
                    margin: 10px 0; 
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <h1>🚀 XYRON API DOCUMENTATION</h1>
            <p>Version: 2.0.0 | Status: PIP</p>
            
            <div class="endpoint">
                <h3>📊 Tokenomics</h3>
                <a href="/api/tokenomics">/api/tokenomics</a><br>
                <a href="/api/tokenomics/reward/1000">/api/tokenomics/reward/1000</a>
            </div>
            
            <div class="endpoint">
                <h3>🪙 Currency</h3>
                <a href="/api/currency/convert?amount=1">/api/currency/convert?amount=1</a><br>
                <a href="/api/currency/format/0.0005">/api/currency/format/0.0005</a>
            </div>
            
            <div class="endpoint">
                <h3>📅 Rewards</h3>
                <a href="/api/rewards">/api/rewards</a><br>
                <a href="/api/rewards/halving">/api/rewards/halving</a>
            </div>
            
            <div class="endpoint">
                <h3>💰 Fees</h3>
                <a href="/api/fees/info">/api/fees/info</a>
            </div>
            
            <div class="endpoint">
                <h3>🔒 Confirmations</h3>
                <a href="/api/confirmations/recommend/500">/api/confirmations/recommend/500</a><br>
                <a href="/api/confirmations/info">/api/confirmations/info</a>
            </div>
            
            <div class="endpoint">
                <h3>📊 Stats</h3>
                <a href="/api/stats">/api/stats</a><br>
                <a href="/health">/health</a>
            </div>
        </body>
        </html>
    `);
});

// ============= START SERVER with COLORS =============
app.listen(PORT, () => {
    const tokenomics = new Tokenomics();
    
    console.log(colors.cyan + "╔══════════════════════════════════════════════════════════╗" + colors.reset);
    console.log(colors.cyan + "║" + colors.yellow + colors.bright + "                 XYRON API GATEWAY v2.0                     " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "╠══════════════════════════════════════════════════════════╣" + colors.reset);
    console.log(colors.cyan + "║" + colors.reset + "                                                              " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.green + "  🚀 Server running on port " + colors.white + PORT + "                               " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.green + "  📦 Max Supply: " + colors.white + tokenomics.config.maxSupply.toLocaleString() + " XYR" + colors.green + "                              " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.yellow + "  🔥 Genesis: Burn 5% | Lock 4%" + colors.green + "                             " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.magenta + "  🪙 1 XYR = 100,000,000 nIZ" + colors.green + "                                 " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.blue + "  ⏱️ Block Time: 3 menit" + colors.green + "                                      " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "╠══════════════════════════════════════════════════════════╣" + colors.reset);
    console.log(colors.cyan + "║" + colors.white + "  💰 Fee Split: " + colors.yellow + "PC 60% | HP 40%" + colors.white + "                              " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "║" + colors.white + "  🔒 Confirmations: " + colors.green + "3 blocks (9 menit) default" + colors.white + "               " + colors.cyan + "║" + colors.reset);
    console.log(colors.cyan + "╚══════════════════════════════════════════════════════════╝" + colors.reset);
    
    console.log(colors.green + "\n✅ Server ready! Open http://localhost:" + PORT + " in your browser" + colors.reset);
    console.log(colors.cyan + "📚 API Docs: http://localhost:" + PORT + "/api/docs" + colors.reset);
});
