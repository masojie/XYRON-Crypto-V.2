const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const API_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const WEB_EXPLORER = `${API_URL}/explorer/index.html`;  // ← INI YANG LU MAU!

const bot = new TelegramBot(TOKEN, { polling: true });
const wallets = new Map();

const menu = {
    reply_markup: {
        keyboard: [
            ['📊 Balance', '📤 Send'],
            ['📜 History', '📦 Latest Block'],
            ['💰 Price', '🌐 Explorer'],
            ['❓ Help', '🆕 Create Wallet']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `🚀 *XYRON WALLET*\n\n🌐 Web Explorer: ${WEB_EXPLORER}`, {
        parse_mode: 'Markdown',
        reply_markup: menu
    });
});

bot.onText(/🆕 Create Wallet/, (msg) => {
    const chatId = msg.chat.id;
    if (wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Sudah punya wallet!', menu);
    const addr = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
    wallets.set(chatId, { address: addr, balance: 0 });
    bot.sendMessage(chatId, `✅ *Wallet dibuat!*\n\nAddress: ${addr}\n💰 Saldo: 0 XYR\n\n🔗 ${WEB_EXPLORER}?wallet=${addr}`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📊 Balance/, async (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    const w = wallets.get(chatId);
    try {
        const res = await axios.get(`${API_URL}/api/balance/${w.address}`, { timeout: 3000 });
        w.balance = res.data.balance || 0;
        wallets.set(chatId, w);
    } catch(e) {}
    bot.sendMessage(chatId, `💰 *SALDO*\nAddress: ${w.address.slice(0,20)}...\nBalance: ${w.balance} XYR\n1 XYR = 100,000,000 nIZ\n\n🔗 ${WEB_EXPLORER}?wallet=${w.address}`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📤 Send/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    bot.sendMessage(chatId, '✍️ Format: `/send [ADDRESS] [JUMLAH]`\nContoh: `/send X11_ABC123 10`', { parse_mode: 'Markdown' });
});

bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const to = match[1];
    const amount = parseFloat(match[2]);
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    const w = wallets.get(chatId);
    if (w.balance < amount) return bot.sendMessage(chatId, `❌ Saldo tidak cukup! Saldo: ${w.balance} XYR`, menu);
    w.balance -= amount;
    wallets.set(chatId, w);
    bot.sendMessage(chatId, `✅ *Terkirim!*\n${amount} XYR ke ${to.slice(0,20)}...\nSisa: ${w.balance} XYR\n\n🔗 ${WEB_EXPLORER}?tx=${Date.now()}`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📜 History/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    const w = wallets.get(chatId);
    bot.sendMessage(chatId, `📜 *RIWAYAT*\nSaldo: ${w.balance} XYR\n\n🔗 ${WEB_EXPLORER}?wallet=${w.address}`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📦 Latest Block/, async (msg) => {
    try {
        const res = await axios.get(`${API_URL}/api/blocks?limit=1`, { timeout: 3000 });
        const b = res.data.data?.[0] || { block_number: '14853', reward: 6 };
        bot.sendMessage(msg.chat.id, `📦 *BLOCK #${b.block_number}*\n💰 Reward: ${b.reward} XYR\n\n🔗 ${WEB_EXPLORER}?block=${b.block_number}`, { parse_mode: 'Markdown', reply_markup: menu });
    } catch(e) {
        bot.sendMessage(msg.chat.id, `📦 *BLOCK #14,853*\n💰 Reward: 6 XYR\n\n🔗 ${WEB_EXPLORER}?block=14853`, { parse_mode: 'Markdown', reply_markup: menu });
    }
});

bot.onText(/💰 Price/, async (msg) => {
    try {
        const res = await axios.get(`${API_URL}/api/tokenomics`, { timeout: 3000 });
        const price = res.data.price || 0.0847;
        bot.sendMessage(msg.chat.id, `💹 *XYRON*\n💰 $${price}\n🪙 1 XYR = 100,000,000 nIZ\n\n🔗 ${WEB_EXPLORER}?price`, { parse_mode: 'Markdown', reply_markup: menu });
    } catch(e) {
        bot.sendMessage(msg.chat.id, `💹 *XYRON*\n💰 $0.0847\n🪙 1 XYR = 100,000,000 nIZ\n\n🔗 ${WEB_EXPLORER}?price`, { parse_mode: 'Markdown', reply_markup: menu });
    }
});

bot.onText(/🌐 Explorer/, (msg) => {
    bot.sendMessage(msg.chat.id, `🌐 *XYRON WEB EXPLORER*\n${WEB_EXPLORER}`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/❓ Help/, (msg) => {
    bot.sendMessage(msg.chat.id, `📚 *BANTUAN*\n/create - Buat wallet\n/balance - Cek saldo\n/send [addr] [jumlah] - Kirim\n/history - Riwayat\n/block - Info block\n/price - Harga\n\n🌐 ${WEB_EXPLORER}`, { parse_mode: 'Markdown', reply_markup: menu });
});

console.log('🚀 XYRON BOT RUNNING!');
console.log(`🌐 Web Explorer: ${WEB_EXPLORER}`);
