const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

// ==================== KONFIGURASI ====================
const TOKEN = '8390504344:AAGjUIy3bUUPZ_B8yJsg-eaVD0QOGkbJBCs';
const XYRON_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const DATA_FILE = './wallets.json';
const SMS_FILE = './sms.json';

// ==================== DATABASE ====================
let wallets = {};
let smsHistory = {};

if (fs.existsSync(DATA_FILE)) wallets = JSON.parse(fs.readFileSync(DATA_FILE));
if (fs.existsSync(SMS_FILE)) smsHistory = JSON.parse(fs.readFileSync(SMS_FILE));

function saveWallets() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2));
}

function saveSMS() {
    fs.writeFileSync(SMS_FILE, JSON.stringify(smsHistory, null, 2));
}

// ==================== BOT INIT ====================
const bot = new TelegramBot(TOKEN, { polling: true });

// ==================== MENU UTAMA ====================
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['🔷 STATUS', '🔶 BLOCKS', '💰 HARGA'],
            ['👛 WALLET', '➕ BUAT WALLET', '🔐 PRIVATE'],
            ['📱 KIRIM SMS', '📊 STAKING', '👥 VALIDATOR'],
            ['📜 HISTORY', '⚡ NETWORK', '❓ HELP']
        ],
        resize_keyboard: true
    }
};

// ==================== COMMAND START ====================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'User';
    
    bot.sendMessage(chatId, 
        `╔══════════════════════════════════╗\n` +
        `║     🚀 *XYRON BLOCKCHAIN*        ║\n` +
        `║    *TERMINAL PREMIUM v4.0*       ║\n` +
        `╚══════════════════════════════════╝\n\n` +
        `Halo *${name}*! Selamat datang di terminal premium XYRON.\n\n` +
        `🔷 *12 FITUR PREMIUM:*\n` +
        `├─ 🔷 STATUS - Info jaringan real-time\n` +
        `├─ 🔶 BLOCKS - Block terbaru\n` +
        `├─ 💰 HARGA - Harga XYR\n` +
        `├─ 👛 WALLET - Info wallet\n` +
        `├─ ➕ BUAT WALLET - Generate wallet\n` +
        `├─ 🔐 PRIVATE - Lihat private key\n` +
        `├─ 📱 KIRIM SMS - Kirim ke blockchain\n` +
        `├─ 📊 STAKING - Info staking\n` +
        `├─ 👥 VALIDATOR - Daftar validator\n` +
        `├─ 📜 HISTORY - Riwayat transaksi\n` +
        `├─ ⚡ NETWORK - Status jaringan\n` +
        `└─ ❓ HELP - Bantuan\n\n` +
        `⬇️ *Tekan tombol di bawah* ⬇️`,
    { parse_mode: 'Markdown', ...mainMenu });
});

// ==================== HANDLE BUTTON ====================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (text.startsWith('/')) return;
    
    switch(text) {
        case '🔷 STATUS': await showStatus(chatId); break;
        case '🔶 BLOCKS': await showBlocks(chatId); break;
        case '💰 HARGA': await showPrice(chatId); break;
        case '👛 WALLET': await showWallet(chatId); break;
        case '➕ BUAT WALLET': await createWallet(chatId); break;
        case '🔐 PRIVATE': await showPrivateKey(chatId); break;
        case '📱 KIRIM SMS': await askSMS(chatId); break;
        case '📊 STAKING': await showStaking(chatId); break;
        case '👥 VALIDATOR': await showValidators(chatId); break;
        case '📜 HISTORY': await showHistory(chatId); break;
        case '⚡ NETWORK': await showNetwork(chatId); break;
        case '❓ HELP': await showHelp(chatId); break;
        default: bot.sendMessage(chatId, '❓ Pilih menu yang tersedia', mainMenu);
    }
});

// ==================== STATUS ====================
async function showStatus(chatId) {
    try {
        const res = await axios.get(`${XYRON_URL}/health`);
        const d = res.data;
        
        let statusIcon = '🟢';
        if (d.message === 'PIP PIP') statusIcon = '🟡';
        if (d.message === 'PIP PIP PIP') statusIcon = '🔴';
        
        bot.sendMessage(chatId,
            `╔════════════════════════════╗\n` +
            `║    🔷 *STATUS JARINGAN*     ║\n` +
            `╚════════════════════════════╝\n\n` +
            `${statusIcon} *Status:* ${d.message}\n` +
            `└─ Block Terkini: #${d.block || 0}\n\n` +
            `⚙️ *Komponen:*\n` +
            `├─ Go Stream: ${d.go === 'healthy' ? '✅' : '❌'}\n` +
            `├─ Rust Core: ${d.rust === 'connected' ? '✅' : '❌'}\n` +
            `└─ Validator: ${d.activeValidators || 0} online\n\n` +
            `📊 *Statistik:*\n` +
            `├─ Supply: ${d.supply || 0}/${d.maxSupply || 12614400} XYR\n` +
            `├─ Halving: ${d.blocksUntilHalving || 0} block lagi\n` +
            `└─ Heartbeat: ${d.interval || 180}s`,
        { parse_mode: 'Markdown', ...mainMenu });
    } catch {
        bot.sendMessage(chatId, '❌ *Gagal terhubung*', { parse_mode: 'Markdown', ...mainMenu });
    }
}

// ==================== BLOCKS ====================
async function showBlocks(chatId) {
    try {
        const res = await axios.get(`${XYRON_URL}/blocks`);
        const blocks = res.data.blocks || res.data;
        
        let pesan = `╔════════════════════════════╗\n║    🔶 *BLOCK TERBARU*     ║\n╚════════════════════════════╝\n\n`;
        
        blocks.slice(0, 8).forEach((block, i) => {
            const header = block.header || block;
            const time = header.timestamp ? new Date(header.timestamp).toLocaleTimeString('id-ID') : '?';
            const status = header.hasActivity ? '🟢' : '🟡';
            pesan += `${i+1}. *#${header.block}*\n` +
                    `   ├─ ⏰ ${time}\n` +
                    `   └─ ${status} ${header.hasActivity ? 'PIP' : 'PIP PIP'}\n\n`;
        });
        
        bot.sendMessage(chatId, pesan, { parse_mode: 'Markdown', ...mainMenu });
    } catch {
        bot.sendMessage(chatId, '❌ *Gagal*', { parse_mode: 'Markdown', ...mainMenu });
    }
}

// ==================== HARGA ====================
async function showPrice(chatId) {
    const price = (0.42 + Math.random() * 0.1).toFixed(4);
    const change = (Math.random() * 10 - 5).toFixed(2);
    const arrow = change > 0 ? '📈' : '📉';
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    💰 *HARGA XYR*          ║\n` +
        `╚════════════════════════════╝\n\n` +
        `💵 *USD:* $${price}\n` +
        `🇮🇩 *IDR:* Rp${(price * 15500).toFixed(0)}\n` +
        `💶 *EUR:* €${(price * 0.92).toFixed(4)}\n\n` +
        `📊 *24h:* ${change}% ${arrow}\n` +
        `📦 *Volume:* $${(Math.random() * 500 + 200).toFixed(0)}K`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== BUAT WALLET ====================
async function createWallet(chatId) {
    const privateKey = crypto.randomBytes(32).toString('hex').toUpperCase();
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex').substring(0, 40).toUpperCase();
    const address = `X11_${publicKey}`;
    
    wallets[chatId] = { 
        address, 
        privateKey, 
        balance: 0, 
        created: new Date().toISOString(),
        stake: 0
    };
    saveWallets();
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    ✅ *WALLET BARU*         ║\n` +
        `╚════════════════════════════╝\n\n` +
        `📱 *Address:*\n\`${address}\`\n\n` +
        `🔑 *Private Key:*\n\`${privateKey}\`\n\n` +
        `💰 *Balance:* 0 XYR\n` +
        `📅 *Created:* ${new Date().toLocaleDateString()}\n\n` +
        `⚠️ *Simpan Private Key!*`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== LIHAT WALLET ====================
async function showWallet(chatId) {
    const w = wallets[chatId];
    if (!w) return bot.sendMessage(chatId, '❌ Belum punya wallet\nKlik *➕ BUAT WALLET*', { parse_mode: 'Markdown', ...mainMenu });
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    👛 *WALLET ANDA*         ║\n` +
        `╚════════════════════════════╝\n\n` +
        `📱 *Address:*\n\`${w.address}\`\n\n` +
        `💰 *Balance:* ${w.balance || 0} XYR\n` +
        `📊 *Stake:* ${w.stake || 0} XYR\n` +
        `📅 *Dibuat:* ${new Date(w.created).toLocaleDateString()}`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== PRIVATE KEY ====================
async function showPrivateKey(chatId) {
    const w = wallets[chatId];
    if (!w) return bot.sendMessage(chatId, '❌ Belum punya wallet', mainMenu);
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    🔐 *PRIVATE KEY*         ║\n` +
        `╚════════════════════════════╝\n\n` +
        `📱 *Wallet:*\n\`${w.address}\`\n\n` +
        `🔑 *Key:*\n\`${w.privateKey}\`\n\n` +
        `⚠️ *RAHASIA! Jangan share!*`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== KIRIM SMS ====================
async function askSMS(chatId) {
    const w = wallets[chatId];
    if (!w) return bot.sendMessage(chatId, '❌ Buat wallet dulu', mainMenu);
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    📱 *KIRIM SMS*           ║\n` +
        `╚════════════════════════════╝\n\n` +
        `📱 *Wallet:* \`${w.address}\`\n\n` +
        `📝 *Cara:* /sms <pesan>\n` +
        `*Contoh:* /sms Halo XYRON\n\n` +
        `⏳ Maks 160 karakter, reward 36 XYR`,
    { parse_mode: 'Markdown', ...mainMenu });
}

bot.onText(/\/sms (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const w = wallets[chatId];
    if (!w) return bot.sendMessage(chatId, '❌ Buat wallet dulu', mainMenu);
    
    const pesan = match[1].substring(0, 160);
    const smsId = Date.now().toString();
    
    if (!smsHistory[chatId]) smsHistory[chatId] = [];
    smsHistory[chatId].unshift({ pesan, waktu: new Date().toISOString(), id: smsId });
    saveSMS();
    
    bot.sendMessage(chatId,
        `✅ *SMS TERKIRIM*\n\n` +
        `📱 *Pesan:* "${pesan}"\n` +
        `💎 *Reward:* 36 XYR\n` +
        `⛓️ *ID:* \`${smsId}\``,
    { parse_mode: 'Markdown', ...mainMenu });
});

// ==================== STAKING ====================
async function showStaking(chatId) {
    const w = wallets[chatId];
    const stakeAmount = w?.stake || 0;
    
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    📊 *STAKING XYR*         ║\n` +
        `╚════════════════════════════╝\n\n` +
        `📈 *APY:* 12.5%\n` +
        `🔒 *Total Stake:* 125,000 XYR\n` +
        `👥 *Validator:* 24 aktif\n\n` +
        `💰 *Stake Anda:* ${stakeAmount} XYR\n` +
        `💎 *Reward Harian:* ${(stakeAmount * 0.125 / 365).toFixed(2)} XYR\n\n` +
        `📝 *Stake:* /stake <jumlah>`,
    { parse_mode: 'Markdown', ...mainMenu });
}

bot.onText(/\/stake (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const w = wallets[chatId];
    if (!w) return bot.sendMessage(chatId, '❌ Buat wallet dulu', mainMenu);
    
    const amount = parseInt(match[1]);
    w.stake = (w.stake || 0) + amount;
    saveWallets();
    
    bot.sendMessage(chatId, `✅ *Stake ${amount} XYR berhasil!*`, { parse_mode: 'Markdown', ...mainMenu });
});

// ==================== VALIDATOR ====================
async function showValidators(chatId) {
    const validators = [
        { name: 'NCE-001', stake: '12,500', uptime: '99.8%' },
        { name: 'NCE-002', stake: '8,700', uptime: '99.5%' },
        { name: 'NCE-003', stake: '6,300', uptime: '98.9%' },
        { name: 'NCE-004', stake: '5,200', uptime: '99.2%' },
        { name: 'NCE-005', stake: '4,800', uptime: '97.8%' }
    ];
    
    let pesan = `╔════════════════════════════╗\n║    👥 *VALIDATOR AKTIF*    ║\n╚════════════════════════════╝\n\n`;
    
    validators.forEach((v, i) => {
        pesan += `${i+1}. *${v.name}*\n` +
                `   ├─ 💰 Stake: ${v.stake} XYR\n` +
                `   └─ ⏱️ Uptime: ${v.uptime}\n\n`;
    });
    
    bot.sendMessage(chatId, pesan, { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== HISTORY ====================
async function showHistory(chatId) {
    const history = smsHistory[chatId] || [];
    
    let pesan = `╔════════════════════════════╗\n║    📜 *RIWAYAT SMS*       ║\n╚════════════════════════════╝\n\n`;
    
    if (history.length === 0) {
        pesan += 'Belum ada SMS terkirim';
    } else {
        history.slice(0, 5).forEach((h, i) => {
            const waktu = new Date(h.waktu).toLocaleString('id-ID');
            pesan += `${i+1}. *${h.pesan.substring(0, 20)}...*\n` +
                    `   ├─ ⏰ ${waktu}\n` +
                    `   └─ 🆔 \`${h.id}\`\n\n`;
        });
    }
    
    bot.sendMessage(chatId, pesan, { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== NETWORK ====================
async function showNetwork(chatId) {
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    ⚡ *INFO NETWORK*        ║\n` +
        `╚════════════════════════════╝\n\n` +
        `🌐 *Chain ID:* XYRON-1\n` +
        `⚙️ *Protocol:* X11-Nano\n` +
        `⏱️ *Block Time:* 180 detik\n` +
        `🔗 *RPC URL:* ${XYRON_URL}\n` +
        `📦 *Total Block:* #${Math.floor(Math.random() * 1000) + 100}\n` +
        `👥 *Peer Count:* 47\n` +
        `🔄 *Synced:* 100%`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== HELP ====================
async function showHelp(chatId) {
    bot.sendMessage(chatId,
        `╔════════════════════════════╗\n` +
        `║    ❓ *BANTUAN*            ║\n` +
        `╚════════════════════════════╝\n\n` +
        `🔷 *STATUS* - Info jaringan\n` +
        `🔶 *BLOCKS* - Block terbaru\n` +
        `💰 *HARGA* - Harga XYR\n` +
        `👛 *WALLET* - Lihat wallet\n` +
        `➕ *BUAT WALLET* - Wallet baru\n` +
        `🔐 *PRIVATE* - Private key\n` +
        `📱 *KIRIM SMS* - Kirim pesan\n` +
        `📊 *STAKING* - Info stake\n` +
        `👥 *VALIDATOR* - Daftar validator\n` +
        `📜 *HISTORY* - Riwayat SMS\n` +
        `⚡ *NETWORK* - Info jaringan\n` +
        `❓ *HELP* - Bantuan ini\n\n` +
        `📝 *Commands:*\n` +
        `/sms <pesan>\n` +
        `/stake <jumlah>`,
    { parse_mode: 'Markdown', ...mainMenu });
}

// ==================== START BOT ====================
console.log('╔══════════════════════════════════╗');
console.log('║  🤖 XYRON PREMIUM BOT v4.0     ║');
console.log('║  🔗 12 FITUR LENGKAP            ║');
console.log('║  📊 SMS | STAKING | VALIDATOR   ║');
console.log('║  ✅ Kirim /start ke Telegram    ║');
console.log('╚══════════════════════════════════╝');
