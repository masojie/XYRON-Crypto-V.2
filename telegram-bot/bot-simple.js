const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const bot = new TelegramBot(TOKEN, { polling: true });
const wallets = new Map();

const menu = {
    reply_markup: {
        keyboard: [
            ['📊 Balance', '📤 Send'],
            ['📜 History', '🆕 Create Wallet'],
            ['❓ Help']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '🚀 *XYRON WALLET*\nGunakan tombol di bawah.', {
        parse_mode: 'Markdown',
        reply_markup: menu
    });
});

bot.onText(/🆕 Create Wallet/, (msg) => {
    const chatId = msg.chat.id;
    if (wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Sudah punya wallet!', menu);
    const addr = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
    wallets.set(chatId, { address: addr, balance: 100 });
    bot.sendMessage(chatId, `✅ *Wallet dibuat!*\n\nAddress: ${addr}\n💰 Saldo: 100 XYR`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📊 Balance/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    const w = wallets.get(chatId);
    bot.sendMessage(chatId, `💰 *SALDO*\nAddress: ${w.address.slice(0,20)}...\nBalance: ${w.balance} XYR`, { parse_mode: 'Markdown', reply_markup: menu });
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
    bot.sendMessage(chatId, `✅ *Terkirim!*\n${amount} XYR ke ${to.slice(0,20)}...\nSisa: ${w.balance} XYR`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/📜 History/, (msg) => {
    const chatId = msg.chat.id;
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet.', menu);
    const w = wallets.get(chatId);
    bot.sendMessage(chatId, `📜 *RIWAYAT*\nSaldo saat ini: ${w.balance} XYR\nBelum ada transaksi.`, { parse_mode: 'Markdown', reply_markup: menu });
});

bot.onText(/❓ Help/, (msg) => {
    bot.sendMessage(msg.chat.id, `📚 *BANTUAN*\n/create - Buat wallet\n/balance - Cek saldo\n/send [addr] [jumlah] - Kirim\n/history - Riwayat`, { parse_mode: 'Markdown', reply_markup: menu });
});

console.log('🚀 XYRON BOT RUNNING!');
