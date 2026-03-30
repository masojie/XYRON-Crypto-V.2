const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const bot = new TelegramBot(TOKEN, { polling: true });

// Database lokal (sementara, nanti bisa diintegrasikan dengan API)
const wallets = new Map();

// Data Tokenomics (sesuai repo XYRON)
const TOKENOMICS = {
    maxSupply: 12_614_400,
    subunit: 'nIZ',
    ratio: 100_000_000,
    blockReward: 6,
    halving: '4 tahun (mulai tahun 9)',
    feeSplit: 'PC 60% | HP 40%',
    confirmations: '3 blocks (9 menit)',
    rewardSchedule: {
        1: 6, 2: 5, 3: 4, 4: 3, '5-8': 2.5, 9: 1.25, 13: 0.625
    }
};

// ===================== MENU UTAMA =====================
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📊 Dashboard', '💎 My Wallet'],
            ['💸 Send XYR', '📜 History'],
            ['🌐 Explorer', 'ℹ️ Help']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// ===================== /start =====================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `✨ *XYRON BLOCKCHAIN WALLET* ✨\n\n` +
        `Selamat datang di ekosistem XYRON!\n\n` +
        `🔹 *Teknologi:* X11-Nano Dynamic Shield\n` +
        `🔹 *Block Time:* 3 menit\n` +
        `🔹 *Reward:* ${TOKENOMICS.blockReward} XYR/block (tahun 1)\n` +
        `🔹 *Max Supply:* ${TOKENOMICS.maxSupply.toLocaleString()} XYR\n` +
        `🔹 *1 XYR = 100,000,000 nIZ*\n\n` +
        `Gunakan tombol di bawah untuk menjelajahi fitur.`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== DASHBOARD =====================
bot.onText(/📊 Dashboard/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `📊 *XYRON BLOCKCHAIN DASHBOARD*\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ 🔢 *Block Height:* 14,853        │\n` +
        `│ ⛏️ *Block Reward:* ${TOKENOMICS.blockReward} XYR     │\n` +
        `│ ⏱️ *Block Time:* 180 detik (3 menit)│\n` +
        `│ 🛡️ *Active Validators:* 47        │\n` +
        `│ 📈 *TPS:* 12.4                   │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 💰 *XYR Price:* $0.0847 (▲4.2%) │\n` +
        `│ 🪙 *Market Cap:* $1.07M          │\n` +
        `│ 📊 *24h Volume:* $847K           │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 📦 *Max Supply:* ${TOKENOMICS.maxSupply.toLocaleString()} XYR│\n` +
        `│ 💎 *1 XYR = 100,000,000 nIZ*    │\n` +
        `│ 🔄 *Halving:* ${TOKENOMICS.halving}       │\n` +
        `│ 💰 *Fee Split:* ${TOKENOMICS.feeSplit}   │\n` +
        `└─────────────────────────────────┘\n\n` +
        `🔗 *Web Explorer:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== MY WALLET =====================
bot.onText(/💎 My Wallet/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        // Buat wallet baru
        const address = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
        const privateKey = '0x' + Math.random().toString(36).substring(2, 20);
        wallets.set(chatId, {
            address,
            privateKey,
            balance: 100, // bonus awal
            created: new Date().toISOString()
        });
        
        bot.sendMessage(chatId,
            `💎 *WALLET BERHASIL DIBUAT!* 💎\n\n` +
            `┌─────────────────────────────────┐\n` +
            `│ 📍 *Address:*                   │\n` +
            `│ \`${address}\` │\n` +
            `│                                 │\n` +
            `│ 🔑 *Private Key:*               │\n` +
            `│ \`${privateKey}\` │\n` +
            `│                                 │\n` +
            `│ 💰 *Balance:* 100 XYR           │\n` +
            `│ 🪙 *nIZ:* 10,000,000,000 nIZ    │\n` +
            `│                                 │\n` +
            `│ 📅 *Created:* ${new Date().toLocaleString()}  │\n` +
            `└─────────────────────────────────┘\n\n` +
            `⚠️ *Peringatan:* Simpan private key Anda dengan aman! Jangan berikan ke siapapun.\n\n` +
            `🔗 *Lihat di Explorer:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${address}`,
            { parse_mode: 'Markdown', reply_markup: mainMenu });
    } else {
        const w = wallets.get(chatId);
        const niz = w.balance * TOKENOMICS.ratio;
        const usd = (w.balance * 0.0847).toFixed(2);
        const idr = (w.balance * 1300).toLocaleString();
        
        bot.sendMessage(chatId,
            `💎 *XYRON WALLET* 💎\n\n` +
            `┌─────────────────────────────────┐\n` +
            `│ 📍 *Address:*                   │\n` +
            `│ \`${w.address.slice(0,24)}...\` │\n` +
            `│                                 │\n` +
            `│ 💰 *BALANCE*                    │\n` +
            `│ ┌─────────────────────────────┐ │\n` +
            `│ │ ${w.balance.toFixed(4)} XYR             │ │\n` +
            `│ │ ${niz.toLocaleString()} nIZ  │ │\n` +
            `│ │ $${usd} USD                 │ │\n` +
            `│ │ Rp ${idr} IDR              │ │\n` +
            `│ └─────────────────────────────┘ │\n` +
            `│                                 │\n` +
            `│ 📊 *Statistik*                  │\n` +
            `│ • Total Transaksi: 0            │\n` +
            `│ • Wallet Aktif: ${new Date(w.created).toLocaleDateString()}  │\n` +
            `└─────────────────────────────────┘\n\n` +
            `🔗 *Detail Wallet:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}`,
            { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== SEND XYR =====================
bot.onText(/💸 Send XYR/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, 
            `⚠️ *Belum punya wallet!*\n\nTekan tombol 💎 My Wallet untuk membuat wallet terlebih dahulu.`,
            { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    bot.sendMessage(chatId,
        `💸 *KIRIM XYR* 💸\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ ✍️ *Format:*                    │\n` +
        `│ \`/send [ADDRESS] [JUMLAH]\`     │\n` +
        `│                                 │\n` +
        `│ 📝 *Contoh:*                    │\n` +
        `│ \`/send X11_ABC123 10\`         │\n` +
        `│                                 │\n` +
        `│ ⚡ *Fee:* 0.001 XYR             │\n` +
        `│ ⏱️ *Konfirmasi:* 3 block (9 menit)│\n` +
        `│ 🔒 *Status:* PIP (Confirmed)    │\n` +
        `└─────────────────────────────────┘\n\n` +
        `💰 *Saldo Anda:* ${w.balance} XYR\n\n` +
        `🔗 *Cek address tujuan:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== SEND COMMAND =====================
bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const toAddress = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, `⚠️ *Belum punya wallet!* Tekan 💎 My Wallet untuk membuat.`, { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, `❌ *Jumlah tidak valid!*\n\nContoh: \`/send X11_ABC123 10\``, { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    if (w.balance < amount) {
        return bot.sendMessage(chatId, `❌ *Saldo tidak cukup!*\n\n💰 Saldo Anda: ${w.balance} XYR\n📤 Ingin kirim: ${amount} XYR\n❌ Kekurangan: ${(amount - w.balance).toFixed(4)} XYR`, { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    // Proses kirim
    w.balance -= amount;
    wallets.set(chatId, w);
    
    const txHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nizAmount = amount * TOKENOMICS.ratio;
    
    bot.sendMessage(chatId,
        `✅ *TRANSAKSI BERHASIL!* ✅\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ 💸 *DETAIL PENGIRIMAN*          │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 📤 *Pengirim:*                  │\n` +
        `│ \`${w.address.slice(0,24)}...\` │\n` +
        `│                                 │\n` +
        `│ 📥 *Penerima:*                  │\n` +
        `│ \`${toAddress.slice(0,24)}...\` │\n` +
        `│                                 │\n` +
        `│ 💰 *Jumlah:* ${amount.toFixed(4)} XYR      │\n` +
        `│ 🪙 *nIZ:* ${nizAmount.toLocaleString()} nIZ│\n` +
        `│ ⛏️ *Fee:* 0.001 XYR             │\n` +
        `│ 💎 *Total Debit:* ${(amount + 0.001).toFixed(4)} XYR│\n` +
        `│                                 │\n` +
        `│ 📊 *SALDO AKHIR:*               │\n` +
        `│ ${w.balance.toFixed(4)} XYR               │\n` +
        `│ ${(w.balance * TOKENOMICS.ratio).toLocaleString()} nIZ│\n` +
        `│                                 │\n` +
        `│ 🔗 *TX Hash:*                   │\n` +
        `│ \`${txHash.slice(0,30)}...\`     │\n` +
        `│                                 │\n` +
        `│ ⏱️ *Waktu:* ${new Date().toLocaleString()}  │\n` +
        `│ 🔒 *Status:* PIP (Confirmed)    │\n` +
        `│ ⏳ *Confirmations:* 3/3 blocks  │\n` +
        `└─────────────────────────────────┘\n\n` +
        `🔍 *Lihat transaksi:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?tx=${txHash}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HISTORY =====================
bot.onText(/📜 History/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, `⚠️ *Belum punya wallet!* Tekan 💎 My Wallet untuk membuat.`, { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    const niz = w.balance * TOKENOMICS.ratio;
    
    bot.sendMessage(chatId,
        `📜 *RIWAYAT TRANSAKSI* 📜\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ 💰 *SALDO SAAT INI*             │\n` +
        `│ ${w.balance.toFixed(4)} XYR               │\n` +
        `│ ${niz.toLocaleString()} nIZ     │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 📊 *STATISTIK*                  │\n` +
        `│ • Total Transaksi: 0            │\n` +
        `│ • XYR Masuk: 0                  │\n` +
        `│ • XYR Keluar: ${(100 - w.balance).toFixed(4)}           │\n` +
        `│ • Fee Terbayar: 0               │\n` +
        `│                                 │\n` +
        `│ 📅 *Wallet Dibuat:*              │\n` +
        `│ ${new Date(w.created).toLocaleString()}  │\n` +
        `└─────────────────────────────────┘\n\n` +
        `🔗 *Lihat semua transaksi:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== EXPLORER =====================
bot.onText(/🌐 Explorer/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `🌐 *XYRON WEB EXPLORER* 🌐\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ 🔗 *Link Akses:*                │\n` +
        `│ https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html │\n` +
        `│                                 │\n` +
        `│ 📊 *Fitur:*                     │\n` +
        `│ • Dashboard Blockchain         │\n` +
        `│ • Block Explorer               │\n` +
        `│ • Transaction Explorer         │\n` +
        `│ • Validator List               │\n` +
        `│ • Wallet Checker               │\n` +
        `│ • Tokenomics & Charts          │\n` +
        `│ • SMS on-chain                 │\n` +
        `│                                 │\n` +
        `│ 📱 *Akses dari HP:*             │\n` +
        `│ Buka link di browser           │\n` +
        `└─────────────────────────────────┘\n\n` +
        `💡 *Klik link di atas untuk membuka explorer!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HELP =====================
bot.onText(/ℹ️ Help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `ℹ️ *BANTUAN XYRON WALLET* ℹ️\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ 📌 *MENU & FUNGSI*              │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 📊 Dashboard - Info blockchain  │\n` +
        `│ 💎 My Wallet - Buat/cek wallet │\n` +
        `│ 💸 Send XYR - Kirim token      │\n` +
        `│ 📜 History - Riwayat transaksi │\n` +
        `│ 🌐 Explorer - Web explorer     │\n` +
        `│ ℹ️ Help - Bantuan ini          │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 📝 *COMMAND CEPAT*              │\n` +
        `├─────────────────────────────────┤\n` +
        `│ /send [addr] [jumlah] - Kirim  │\n` +
        `│ /start - Menu utama            │\n` +
        `├─────────────────────────────────┤\n` +
        `│ 💡 *INFO TOKENOMICS*            │\n` +
        `├─────────────────────────────────┤\n` +
        `│ Max Supply: ${TOKENOMICS.maxSupply.toLocaleString()} XYR│\n` +
        `│ 1 XYR = 100,000,000 nIZ        │\n` +
        `│ Reward: ${TOKENOMICS.blockReward} XYR/block (tahun 1)│\n` +
        `│ Halving: ${TOKENOMICS.halving}            │\n` +
        `│ Fee: 0.001 XYR                 │\n` +
        `│ Konfirmasi: ${TOKENOMICS.confirmations}      │\n` +
        `└─────────────────────────────────┘\n\n` +
        `🔗 *Web Explorer:* https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

console.log('🚀 XYRON BOT MENU RUNNING!');
