// server-node/server.js — XYRON API Gateway v2.0
'use strict';

const net     = require('net');
const fs      = require('fs');
const path    = require('path');
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Tokenomics (sinkron dengan reward.rs) ───────────────────────────────
const TOKENOMICS = {
    maxSupplyXyr:     6_657_700,
    nizPerXyr:        1_000_000,
    genesisAiFundXyr: 100,
    blockTime:        180,
    blocksPerYear:    175_200,
    burnRatePct:      6,
    lockRatePct:      4,
    rewardSchedule: [
        { yearFrom:1,  yearTo:1,  xyr:6.0    },
        { yearFrom:2,  yearTo:2,  xyr:5.0    },
        { yearFrom:3,  yearTo:3,  xyr:4.0    },
        { yearFrom:4,  yearTo:4,  xyr:3.0    },
        { yearFrom:5,  yearTo:8,  xyr:2.5    },
        { yearFrom:9,  yearTo:12, xyr:1.25   },
        { yearFrom:13, yearTo:16, xyr:0.625  },
        { yearFrom:17, yearTo:20, xyr:0.3125 },
    ],
    miningPools: {
        pc:          { pct:60, layers:11 },
        smartphone:  { pct:40, layers:5  },
    },
    confirmationLevels: {
        receive:  3,
        send:     6,
        exchange: 9,
        ai_trade: 1,
    },
};

// ─── State ───────────────────────────────────────────────────────────────
let blockHeight  = 0;
let pendingTxs   = [];
let activeMiners = { pc: [], smartphone: [], ai: [] };
let systemStats  = { totalBlocks: 0, totalTxs: 0, uptime: Date.now() };

// ─── Komunikasi ke Go/Rust ────────────────────────────────────────────────
const GO_SOCKET = '/tmp/xyron-go.sock';

function sendToRust(action, payload = {}) {
    return new Promise((resolve) => {
        const client = net.createConnection(GO_SOCKET, () => {
            client.write(JSON.stringify({ action, ...payload }));
        });
        let data = '';
        client.on('data', c => { data += c; });
        client.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { resolve({ status: 'error', message: 'Invalid response' }); }
        });
        client.on('error', () => resolve({ status: 'error', message: 'Core unavailable' }));
        client.setTimeout(5000, () => { client.destroy(); resolve({ status: 'error', message: 'Timeout' }); });
    });
}

// ─── Fee calculator ───────────────────────────────────────────────────────
function calcFees(amountXyr) {
    const burn = amountXyr * TOKENOMICS.burnRatePct / 100;
    const lock = amountXyr * TOKENOMICS.lockRatePct / 100;
    return { burn, lock, net: amountXyr - burn - lock };
}

// ─── Heartbeat ────────────────────────────────────────────────────────────
async function heartbeat() {
    blockHeight++;
    const hasActivity = pendingTxs.length > 0;

    // Distribusi reward
    if (activeMiners.pc.length + activeMiners.smartphone.length + activeMiners.ai.length > 0) {
        const dist = await sendToRust('reward.distribute', {
            block_height: blockHeight,
            pc_validators: activeMiners.pc,
            hp_validators: [...activeMiners.smartphone, ...activeMiners.ai],
        });
        if (dist.status === 'ok') {
            console.log(`[HEARTBEAT] #${blockHeight} — PC: ${(dist.pc_pool_niz/1e6).toFixed(4)} XYR | HP: ${(dist.hp_pool_niz/1e6).toFixed(4)} XYR`);
        }
    }

    // Simpan block
    const block = {
        height: blockHeight, timestamp: Date.now(),
        txCount: pendingTxs.length, txs: [...pendingTxs],
        status: hasActivity ? 'PIP' : 'PIP PIP',
        miners: { pc: activeMiners.pc.length, hp: activeMiners.smartphone.length, ai: activeMiners.ai.length },
    };
    const histDir = path.join(__dirname, '../history');
    if (!fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });
    fs.writeFileSync(path.join(histDir, `block_${String(blockHeight).padStart(8,'0')}.json`), JSON.stringify(block, null, 2));

    pendingTxs = [];
    systemStats.totalBlocks++;
    console.log(`[HEARTBEAT] Block #${blockHeight} | ${block.status} | TXs: ${block.txCount}`);

    // AI Army patrol setiap 10 block
    if (blockHeight % 10 === 0) {
        const patrol = await sendToRust('ai.army_patrol');
        if (patrol.flagged?.length) console.log(`[AI-ARMY] ${patrol.flagged.length} agents flagged`);
    }
}

setInterval(heartbeat, TOKENOMICS.blockTime * 1000);

// ─── Routes: System ───────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
    status:'ok', network:'XYRON', version:'2.0.0', blockHeight,
    uptime: Math.floor((Date.now()-systemStats.uptime)/1000),
}));

app.get('/tokenomics', (req, res) => res.json({ status:'ok', tokenomics:TOKENOMICS }));

app.get('/stats', async (req, res) => {
    const core = await sendToRust('system.stats');
    res.json({ status:'ok',
        blockchain: { height:blockHeight, totalTxs:systemStats.totalTxs, pending:pendingTxs.length },
        supply: { minted_xyr:core.total_minted_xyr, remaining_xyr:core.remaining_supply_xyr },
        miners: activeMiners,
        ai: { active:core.ai_workers, max:core.max_ai_workers },
    });
});

app.get('/blocks', (req, res) => {
    const limit = parseInt(req.query.limit)||10;
    const dir = path.join(__dirname,'../history');
    if (!fs.existsSync(dir)) return res.json({ status:'ok', blocks:[] });
    const blocks = fs.readdirSync(dir).filter(f=>f.startsWith('block_')).sort().reverse().slice(0,limit)
        .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir,f))); } catch { return null; } })
        .filter(Boolean);
    res.json({ status:'ok', count:blocks.length, blocks });
});

app.get('/blocks/:n', (req, res) => {
    const file = path.join(__dirname,'../history',`block_${String(req.params.n).padStart(8,'0')}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ status:'error', message:'Block not found' });
    res.json({ status:'ok', block: JSON.parse(fs.readFileSync(file)) });
});

// ─── Routes: Wallet ───────────────────────────────────────────────────────
app.post('/wallet/create', async (req, res) => {
    const { user_id, pin } = req.body;
    if (!user_id || !pin) return res.status(400).json({ status:'error', message:'user_id dan pin wajib' });
    res.json(await sendToRust('wallet.create_user', { user_id, pin }));
});

app.get('/wallet/:address/balance', async (req, res) => {
    res.json(await sendToRust('wallet.balance', { address:req.params.address }));
});

app.post('/wallet/send', async (req, res) => {
    const { from_address, to_address, amount_xyr, owner_id, pin } = req.body;
    if (!from_address||!to_address||!amount_xyr||!owner_id||!pin)
        return res.status(400).json({ status:'error', message:'Field tidak lengkap' });

    const fees = calcFees(amount_xyr);
    const tx = { from:from_address, to:to_address, amount_xyr, fees,
        timestamp:Date.now(), type:'SEND',
        confirmations_required: TOKENOMICS.confirmationLevels.send };

    const sign = await sendToRust('wallet.sign_tx', { address:from_address, owner_id, pin, tx_data:JSON.stringify(tx) });
    if (sign.status !== 'ok') return res.json(sign);

    tx.signature = sign.signature;
    tx.id = `tx_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    pendingTxs.push(tx);
    systemStats.totalTxs++;

    res.json({ status:'ok', tx_id:tx.id, fees,
        confirmations_required: tx.confirmations_required,
        estimated_time_min: tx.confirmations_required * 3 });
});

// ─── Routes: Mining ───────────────────────────────────────────────────────
app.post('/mining/register', (req, res) => {
    const { address, device_type } = req.body;
    if (!address||!['pc','smartphone'].includes(device_type))
        return res.status(400).json({ status:'error', message:'address dan device_type (pc/smartphone) wajib' });
    const pool = device_type==='pc' ? activeMiners.pc : activeMiners.smartphone;
    if (!pool.includes(address)) pool.push(address);
    res.json({ status:'ok', device_type,
        pool_share_pct: device_type==='pc' ? 60 : 40,
        x11_layers: device_type==='pc' ? 11 : 5 });
});

app.post('/mining/submit', async (req, res) => {
    const { address, proof_hash } = req.body;
    if (!address||!proof_hash) return res.status(400).json({ status:'error', message:'address dan proof_hash wajib' });
    const result = await sendToRust('x11.hash', { data:proof_hash });
    if (result.status!=='ok') return res.json({ status:'error', message:'Invalid proof' });
    res.json({ status:'ok', message:'Mining proof accepted', block_height:blockHeight });
});

// ─── Routes: AI ───────────────────────────────────────────────────────────
app.get('/ai/workers', async (req, res) => res.json(await sendToRust('ai.list_workers')));

app.get('/ai/status/:agent_id', async (req, res) =>
    res.json(await sendToRust('ai.status', { agent_id:req.params.agent_id })));

app.post('/ai/trade', async (req, res) => {
    const { agent_id, win, amount_xyr, pattern } = req.body;
    if (!agent_id) return res.status(400).json({ status:'error', message:'agent_id wajib' });
    const amount_niz = Math.floor((amount_xyr||1) * TOKENOMICS.nizPerXyr);
    await sendToRust('ai.report_trade', { agent_id, win:!!win, amount_niz });
    if (win) pendingTxs.push({ from:'ai_ecosystem', to:agent_id, amount_xyr:amount_xyr||0,
        timestamp:Date.now(), type:'AI_TRADE', pattern:pattern||'unknown',
        label:'System Bootstrap Transaction',
        confirmations_required:TOKENOMICS.confirmationLevels.ai_trade });
    res.json({ status:'ok', recorded:true });
});

app.post('/ai/army/patrol', async (req, res) => res.json(await sendToRust('ai.army_patrol')));

app.post('/ai/replace', async (req, res) => {
    const { agent_id, new_pin } = req.body;
    if (!agent_id||!new_pin) return res.status(400).json({ status:'error', message:'agent_id dan new_pin wajib' });
    res.json(await sendToRust('ai.replace_agent', { agent_id, new_pin }));
});

// Endpoint lama — tetap ada untuk kompatibilitas
app.post('/xyron/validate', async (req, res) => {
    const { wallet_id, message } = req.body;
    const hash = await sendToRust('x11.hash', { data:wallet_id||'' });
    const tx = { id:`tx_${Date.now()}`, wallet_id, message, hash:hash.hash, timestamp:Date.now(), type:'VALIDATE' };
    pendingTxs.push(tx);
    systemStats.totalTxs++;
    res.json({ status:'ok', tx_id:tx.id, hash:hash.hash, block_height:blockHeight, network:'XYRON' });
});

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   XYRON API Gateway — Node.js v2.0   ║');
    console.log(`║   Port ${PORT} | Block: ${TOKENOMICS.blockTime}s          ║`);
    console.log('╚══════════════════════════════════════╝');
});

module.exports = app;
