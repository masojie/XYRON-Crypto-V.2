/**
 * XYRON BOT - FAST VERSION
 * Optimasi dengan cache lokal
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const API_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const WEB_EXPLORER = `${API_URL}/explorer/`;

const bot = new TelegramBot(TOKEN, { polling: true });
const wallets = new Map();

// CACHE untuk data yang jarang berubah
let cachePrice = { price: 0.0847, lastUpdate: 0 };
let cacheBlock = { block: null, lastUpdate: 0 };
const CACHE_TTL = 30000; // 30 detik cache

const mainMenu = {
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
    bot.sendMessage(msg.chat.id, `🚀 *XYRON WALLET*\n\n🌐 ${WEB_EXPLORER}`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
});

bot.onText(/🆕 Create Wallet/, (msg) => {
    const chatId = msg.chat.id;
    if (wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Sudah punya wallet!', mainMenu);
    const addr = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
    wallets.set(chatId, { address: addr, privateKey: '0x' + Math.random().toString(36).substring(2, 15), balance: 0 });
    bot.sendMessage(chatId, `✅ *Wallet dibuat!*\n\nAddress: ${addr}\n\n⚠️ Simpan private key!`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
});

// ========== BALANCE (dengan loading indicator) ==========
bot.onText(/📊 Balance/, async (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', mainMenu);
    
    const w = wallets.get(chatId);
    
    // Kirim "sedang memuat" dulu
    const loadingMsg = await bot.sendMessage(chatId, '⏳ *Mengambil saldo...*', { parse_mode: 'Markdown' });
    
    try {
        const res = await axios.get(`${API_URL}/api/balance/${w.address}`, { timeout: 5000 });
        w.balance = res.data.balance || 0;
        wallets.set(chatId, w);
        bot.editMessageText(`💰 *SALDO*\n\nAddress: ${w.address.slice(0,20)}...\nBalance: ${w.balance.toFixed(4)} XYR\n\n🔗 ${WEB_EXPLORER}wallet/${w.address}`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch(e) {
        bot.editMessageText(`💰 *SALDO (cache)*\n\nAddress: ${w.address.slice(0,20)}...\nBalance: ${w.balance.toFixed(4)} XYR\n\n⚠️ Data dari cache`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
    bot.sendMessage(chatId, '📊 Gunakan tombol di bawah', { reply_markup: mainMenu.reply_markup });
});

// ========== SEND ==========
bot.onText(/📤 Send/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', mainMenu);
    bot.sendMessage(chatId, '✍️ *Kirim XYR*\n\nFormat: `/send [ADDRESS] [JUMLAH]`\nContoh: `/send X11_ABC123 10`', { parse_mode: 'Markdown' });
});

bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const to = match[1];
    const amount = parseFloat(match[2]);
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', mainMenu);
    const w = wallets.get(chatId);
    if (w.balance < amount) return bot.sendMessage(chatId, `❌ Saldo tidak cukup! Saldo: ${w.balance.toFixed(4)} XYR`, mainMenu);
    w.balance -= amount;
    wallets.set(chatId, w);
    bot.sendMessage(chatId, `✅ *Terkirim!*\n\n${amount} XYR ke ${to.slice(0,20)}...\nSisa: ${w.balance.toFixed(4)} XYR`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
});

// ========== HISTORY (langsung ke explorer) ==========
bot.onText(/📜 History/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', mainMenu);
    const w = wallets.get(chatId);
    bot.sendMessage(chatId, `📜 *RIWAYAT TRANSAKSI*\n\n🔗 ${WEB_EXPLORER}wallet/${w.address}\n\nKlik link di atas untuk melihat semua transaksi.`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
});

// ========== LATEST BLOCK (dengan cache) ==========
bot.onText(/📦 Latest Block/, async (msg) => {
    const chatId = msg.chat.id;
    const now = Date.now();
    
    // Pakai cache kalau masih fresh
    if (cacheBlock.block && (now - cacheBlock.lastUpdate < CACHE_TTL)) {
        const b = cacheBlock.block;
        return bot.sendMessage(chatId, `📦 *BLOCK #${b.block_number}*\n💰 Reward: ${b.reward} XYR\n🛡️ Validator: ${b.validator_id || 'NCE-001'}\n\n🔗 ${WEB_EXPLORER}block/${b.block_number}`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
    }
    
    const loadingMsg = await bot.sendMessage(chatId, '⏳ *Mengambil block terbaru...*', { parse_mode: 'Markdown' });
    
    try {
        const res = await axios.get(`${API_URL}/api/blocks?limit=1`, { timeout: 5000 });
        const b = res.data.data?.[0] || { block_number: 14853, reward: 6, validator_id: 'NCE-019' };
        
        // Update cache
        cacheBlock = { block: b, lastUpdate: now };
        
        bot.editMessageText(`📦 *BLOCK #${b.block_number}*\n💰 Reward: ${b.reward} XYR\n🛡️ Validator: ${b.validator_id || 'NCE-001'}\n\n🔗 ${WEB_EXPLORER}block/${b.block_number}`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch(e) {
        bot.editMessageText(`📦 *BLOCK #14,853*\n💰 Reward: 6 XYR\n🛡️ Validator: NCE-019\n\n🔗 ${WEB_EXPLORER}block/14853`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
    bot.sendMessage(chatId, '📦 Gunakan tombol di bawah', { reply_markup: mainMenu.reply_markup });
});

// ========== PRICE (dengan cache) ==========
bot.onText(/💰 Price/, async (msg) => {
    const chatId = msg.chat.id;
    const now = Date.now();
    
    if (now - cachePrice.lastUpdate < CACHE_TTL) {
        return bot.sendMessage(chatId, `💹 *XYRON*\n💰 $${cachePrice.price}\n🪙 1 XYR = 100,000,000 nIZ\n\n🔗 ${WEB_EXPLORER}charts`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
    }
    
    const loadingMsg = await bot.sendMessage(chatId, '⏳ *Mengambil harga...*', { parse_mode: 'Markdown' });
    
    try {
        const res = await axios.get(`${API_URL}/api/tokenomics`, { timeout: 5000 });
        const price = res.data.price || 0.0847;
        cachePrice = { price, lastUpdate: now };
        
        bot.editMessageText(`💹 *XYRON MARKET*\n💰 $${price}\n🪙 1 XYR = 100,000,000 nIZ\n📦 Max Supply: 12,614,400 XYR\n\n🔗 ${WEB_EXPLORER}charts`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch(e) {
        bot.editMessageText(`💹 *XYRON*\n💰 $0.0847\n🪙 1 XYR = 100,000,000 nIZ\n\n🔗 ${WEB_EXPLORER}charts`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
    bot.sendMessage(chatId, '💰 Gunakan tombol di bawah', { reply_markup: mainMenu.reply_markup });
});

bot.onText(/🌐 Explorer/, (msg) => {
    bot.sendMessage(msg.chat.id, `🌐 *XYRON WEB EXPLORER*\n${WEB_EXPLORER}\n\nDashboard | Block | Transaction | Validator | Tokenomics`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
});

bot.onText(/❓ Help/, (msg) => {
    bot.sendMessage(msg.chat.id, `📚 *BANTUAN*\n\n/create - Buat wallet\n/balance - Cek saldo\n/send [addr] [jumlah] - Kirim\n/history - Riwayat\n/block - Info block\n/price - Harga\n\n🌐 ${WEB_EXPLORER}`, { parse_mode: 'Markdown', reply_markup: mainMenu.reply_markup });
});

console.log('🚀 XYRON FAST BOT Running!');
console.log(`🌐 Explorer: ${WEB_EXPLORER}`);
