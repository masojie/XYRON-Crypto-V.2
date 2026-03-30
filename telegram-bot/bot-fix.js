const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const bot = new TelegramBot(TOKEN, { polling: true });

const wallets = new Map();

// Menu utama dengan callback
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📊 DASHBOARD', '💎 MY WALLET'],
            ['💸 SEND XYR', '📜 HISTORY'],
            ['❓ HELP']
        ],
        resize_keyboard: true
    }
};

// ===================== START =====================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`✨ *XYRON BLOCKCHAIN WALLET* ✨

Selamat datang di XYRON!

Gunakan tombol di bawah untuk mulai.`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== DASHBOARD =====================
bot.onText(/📊 DASHBOARD/, (msg) => {
    bot.sendMessage(msg.chat.id,
`📊 *XYRON DASHBOARD*

╔════════════════════════════════╗
║  🔢 *Block Height:* 14,853       ║
║  ⛏️ *Reward:* 6 XYR              ║
║  ⏱️ *Block Time:* 3 menit        ║
║  💰 *Price:* $0.0847             ║
║  📈 *24h Change:* +4.2%          ║
║  🪙 *Max Supply:* 12,614,400     ║
║  💎 *1 XYR = 100,000,000 nIZ*   ║
╚════════════════════════════════╝

🔗 Web: https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== MY WALLET =====================
bot.onText(/💎 MY WALLET/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        const newAddr = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
        wallets.set(chatId, { address: newAddr, balance: 100, privateKey: '0x' + Math.random().toString(36).substring(2, 20) });
        
        bot.sendMessage(chatId,
`✅ *WALLET BERHASIL DIBUAT!*

📍 *Address:* \`${newAddr}\`
🔑 *Private Key:* \`${wallets.get(chatId).privateKey}\`
💰 *Balance:* 100 XYR
🪙 *nIZ:* 10,000,000,000

⚠️ *Simpan private key Anda!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    } else {
        const w = wallets.get(chatId);
        const niz = w.balance * 100000000;
        bot.sendMessage(chatId,
`💎 *MY WALLET*

📍 *Address:* \`${w.address.slice(0,20)}...\`
💰 *Balance:* ${w.balance} XYR
🪙 *nIZ:* ${niz.toLocaleString()} nIZ
💵 *USD:* $${(w.balance * 0.0847).toFixed(2)}

🔗 *Explorer:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== SEND XYR =====================
bot.onText(/💸 SEND XYR/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Belum punya wallet! Tekan 💎 MY WALLET dulu.', { reply_markup: mainMenu });
    }
    
    bot.sendMessage(chatId,
`💸 *KIRIM XYR*

Format: \`/send [ADDRESS] [JUMLAH]\`

Contoh: \`/send X11_ABC123 10\`

⚡ Fee: 0.001 XYR
⏱️ Konfirmasi: 3 block (9 menit)

🔗 Cek address: https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const to = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Belum punya wallet!', mainMenu);
    }
    
    const w = wallets.get(chatId);
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ Jumlah tidak valid! Contoh: /send X11_ABC123 10', mainMenu);
    }
    
    if (w.balance < amount) {
        return bot.sendMessage(chatId, `❌ Saldo tidak cukup! Saldo: ${w.balance} XYR`, mainMenu);
    }
    
    w.balance -= amount;
    wallets.set(chatId, w);
    
    bot.sendMessage(chatId,
`✅ *TRANSAKSI BERHASIL!*

📤 Kirim: ${amount} XYR
📥 Ke: ${to.slice(0,20)}...
💰 Sisa: ${w.balance} XYR

🔗 https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?tx=${Date.now()}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HISTORY =====================
bot.onText(/📜 HISTORY/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Belum punya wallet! Tekan 💎 MY WALLET dulu.', { reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    
    bot.sendMessage(chatId,
`📜 *RIWAYAT*

💰 Saldo: ${w.balance} XYR
📊 Total Transaksi: 0

🔗 Lihat semua: https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HELP =====================
bot.onText(/❓ HELP/, (msg) => {
    bot.sendMessage(msg.chat.id,
`❓ *BANTUAN*

📊 DASHBOARD - Info blockchain
💎 MY WALLET - Buat/cek wallet
💸 SEND XYR - Kirim token
📜 HISTORY - Riwayat transaksi

📝 *COMMAND*
/send [addr] [jumlah] - Kirim XYR

💡 *INFO*
Max Supply: 12,614,400 XYR
1 XYR = 100,000,000 nIZ
Reward: 6 XYR/block
Fee: 0.001 XYR

🔗 *Web Explorer*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

console.log('🚀 XYRON BOT FIX RUNNING!');
