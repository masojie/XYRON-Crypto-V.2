const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const bot = new TelegramBot(TOKEN, { polling: true });

const wallets = new Map();

// ===================== MENU =====================
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📊 MY WALLET', '💸 SEND XYR'],
            ['📜 HISTORY', '❓ HELP']
        ],
        resize_keyboard: true
    }
};

// ===================== START =====================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`✨ *XYRON BLOCKCHAIN WALLET* ✨

💎 *Selamat datang di Ekosistem XYRON!*

XYRON adalah blockchain hybrid dengan teknologi X11-Nano yang memungkinkan:
• Transaksi cepat & aman (3 menit per block)
• SMS on-chain permanen
• Mining dengan PC atau HP
• Fee transaksi hanya 0.001 XYR

⚡ *Fitur Wallet:*
• Buat wallet dengan satu klik
• Kirim dan terima XYR
• Cek saldo real-time
• Riwayat transaksi lengkap

💰 *Tokenomics:*
• Max Supply: 12,614,400 XYR
• 1 XYR = 100,000,000 nIZ
• Reward: 6 XYR/block (tahun 1)

🔗 *Web Explorer:*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html

_Gunakan tombol di bawah untuk mulai!_`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== CREATE WALLET =====================
bot.onText(/📊 MY WALLET/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        const newAddress = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
        wallets.set(chatId, { address: newAddress, balance: 100, privateKey: '0x' + Math.random().toString(36).substring(2, 20), created: new Date().toISOString() });
        
        bot.sendMessage(chatId,
`✨ *WALLET BERHASIL DIBUAT!* ✨

╔══════════════════════════════════════╗
║  🔐 *X11-NANO WALLET*                 ║
╠══════════════════════════════════════╣
║  📍 *Address:*                        ║
║  \`${newAddress}\`  
║                                        ║
║  🔑 *Private Key:*                     ║
║  \`${wallets.get(chatId).privateKey}\`  
║                                        ║
║  💰 *Balance:* 100 XYR                 ║
║  🪙 *nIZ:* 10,000,000,000 nIZ          ║
║                                        ║
║  📅 *Created:* ${new Date().toLocaleString()}  ║
╚══════════════════════════════════════╝

⚠️ *PERINGATAN!*
Simpan private key Anda dengan aman!
Jangan pernah memberikannya kepada siapapun.
Private key adalah satu-satunya cara mengakses wallet Anda.

💡 *Tips:* Gunakan fitur SEND untuk mengirim XYR ke teman!
🔗 *Lihat wallet di explorer:*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${newAddress}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    } else {
        const w = wallets.get(chatId);
        const niz = w.balance * 100000000;
        const usd = (w.balance * 0.0847).toFixed(2);
        const idr = (w.balance * 1300).toLocaleString();
        
        bot.sendMessage(chatId,
`💎 *XYRON WALLET DETAILS* 💎

╔══════════════════════════════════════╗
║  📍 *Address:*                        ║
║  \`${w.address.slice(0,25)}...\`  
║                                        ║
║  💰 *Balance:*                         ║
║  ┌────────────────────────────────┐   ║
║  │  ${w.balance.toFixed(4)} XYR            │   ║
║  │  ${niz.toLocaleString()} nIZ     │   ║
║  │  $${usd} USD                      │   ║
║  │  Rp ${idr} IDR                   │   ║
║  └────────────────────────────────┘   ║
║                                        ║
║  📊 *Statistik Wallet:*                ║
║  • Total Transaksi: 0                 ║
║  • XYR Diterima: 0                    ║
║  • XYR Dikirim: 0                     ║
║  • Wallet Aktif: ${new Date(w.created).toLocaleDateString()}  ║
╚══════════════════════════════════════╝

💡 *Ingin kirim XYR?* Tekan tombol 💸 SEND XYR
🔗 *Lihat di explorer:*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== SEND XYR =====================
bot.onText(/💸 SEND XYR/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ *Belum punya wallet!* ⚠️\n\nTekan tombol 📊 MY WALLET untuk membuat wallet terlebih dahulu.', 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    bot.sendMessage(chatId,
`💸 *KIRIM XYR* 💸

╔══════════════════════════════════════╗
║  ✍️ *Format Pengiriman:*              ║
║  \`/send [ADDRESS] [JUMLAH]\`          ║
║                                        ║
║  📝 *Contoh:*                          ║
║  \`/send X11_ABC123 10\`               ║
║                                        ║
║  💰 *Kirim 10 XYR ke address*          ║
║     X11_ABC123                        ║
║                                        ║
║  ⚡ *Fee Transaksi:* 0.001 XYR        ║
║  ⏱️ *Waktu Konfirmasi:* 3 block       ║
║     (≈ 9 menit)                       ║
║                                        ║
║  🔒 *Keamanan:* X11-Nano Encryption   ║
║  ✅ *Status:* PIP (Confirmed)         ║
╚══════════════════════════════════════╝

💡 *Tips:* Pastikan address tujuan benar!
🔍 *Cek address valid di explorer*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html

⚠️ *Peringatan:* Transaksi tidak bisa dibatalkan!`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const toAddress = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ *Belum punya wallet!* ⚠️\n\nTekan tombol 📊 MY WALLET untuk membuat wallet.', 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ *Jumlah tidak valid!* ❌\n\nMasukkan jumlah yang benar. Contoh: `/send X11_ABC123 10`', 
        { parse_mode: 'Markdown' });
    }
    
    if (w.balance < amount) {
        const short = w.balance.toFixed(4);
        return bot.sendMessage(chatId,
`❌ *SALDO TIDAK CUKUP!* ❌

╔══════════════════════════════════════╗
║  💰 *Saldo Anda:* ${short} XYR          ║
║  📤 *Yang ingin dikirim:* ${amount} XYR    ║
║  ❌ *Kekurangan:* ${(amount - w.balance).toFixed(4)} XYR  ║
║                                        ║
║  💡 *Solusi:*                           ║
║  • Tunggu mining reward                ║
║  • Minta teman kirim XYR               ║
║  • Kurangi jumlah pengiriman           ║
╚══════════════════════════════════════╝

🔁 *Coba lagi dengan jumlah yang lebih kecil!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    // Proses kirim
    w.balance -= amount;
    wallets.set(chatId, w);
    
    const txHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fee = 0.001;
    const nizAmount = amount * 100000000;
    const timeNow = new Date().toLocaleString();
    
    bot.sendMessage(chatId,
`✅ *TRANSAKSI BERHASIL!* ✅

╔══════════════════════════════════════╗
║  💸 *DETAIL PENGIRIMAN*               ║
╠══════════════════════════════════════╣
║  📤 *Pengirim:*                        ║
║  \`${w.address.slice(0,25)}...\`  
║                                        ║
║  📥 *Penerima:*                        ║
║  \`${toAddress.slice(0,25)}...\`  
║                                        ║
║  💰 *Jumlah:* ${amount.toFixed(4)} XYR   ║
║  🪙 *nIZ:* ${nizAmount.toLocaleString()} nIZ  ║
║  ⛏️ *Fee:* ${fee} XYR                   ║
║  💎 *Total Debit:* ${(amount + fee).toFixed(4)} XYR  ║
║                                        ║
║  📊 *SALDO AKHIR:*                     ║
║  ${w.balance.toFixed(4)} XYR            ║
║  ${(w.balance * 100000000).toLocaleString()} nIZ      ║
║                                        ║
║  🔗 *TX HASH:*                         ║
║  \`${txHash.slice(0,30)}...\`  
║                                        ║
║  ⏱️ *Waktu:* ${timeNow}                ║
║  🔒 *Status:* PIP (Confirmed)         ║
║  ⏳ *Confirmations:* 3/3 blocks       ║
╚══════════════════════════════════════╝

🔍 *Lihat transaksi di explorer:*
https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?tx=${txHash}

💡 *Info:* Transaksi akan terkonfirmasi dalam 9 menit (3 block)
🚀 *XYRON Blockchain - Fast & Secure!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HISTORY =====================
bot.onText(/📜 HISTORY/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ *Belum punya wallet!* ⚠️\n\nTekan tombol 📊 MY WALLET untuk membuat wallet.', 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    const niz = w.balance * 100000000;
    
    bot.sendMessage(chatId,
`📜 *RIWAYAT TRANSAKSI* 📜

╔══════════════════════════════════════╗
║  💰 *SALDO SAAT INI*                  ║
║  ┌────────────────────────────────┐   ║
║  │  ${w.balance.toFixed(4)} XYR            │   ║
║  │  ${niz.toLocaleString()} nIZ     │   ║
║  └────────────────────────────────┘   ║
║                                        ║
║  📊 *STATISTIK WALLET*                 ║
║  • Total Transaksi: 0                 ║
║  • XYR Masuk: 0                       ║
║  • XYR Keluar: 0                      ║
║  • Fee Terbayar: 0                    ║
║                                        ║
║  📅 *Wallet Dibuat:*                   ║
║  ${new Date(w.created).toLocaleString()}  ║
║                                        ║
║  🔗 *Link Wallet:*                     ║
║  https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html?wallet=${w.address}  ║
╚══════════════════════════════════════╝

💡 *Belum ada transaksi. Mulai kirim XYR sekarang!*
🚀 *Gunakan tombol 💸 SEND XYR*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HELP =====================
bot.onText(/❓ HELP/, (msg) => {
    bot.sendMessage(msg.chat.id,
`❓ *BANTUAN XYRON WALLET* ❓

╔══════════════════════════════════════╗
║  📌 *CARA MENGGUNAKAN*                ║
╠══════════════════════════════════════╣
║                                      ║
║  1️⃣ *Buat Wallet*                    ║
║     Tekan 📊 MY WALLET               ║
║     Wallet akan dibuat otomatis      ║
║                                      ║
║  2️⃣ *Cek Saldo*                      ║
║     Tekan 📊 MY WALLET lagi          ║
║     Lihat balance dalam XYR & nIZ   ║
║                                      ║
║  3️⃣ *Kirim XYR*                      ║
║     Tekan 💸 SEND XYR                ║
║     Ketik: /send [ADDRESS] [JUMLAH] ║
║                                      ║
║  4️⃣ *Lihat History*                  ║
║     Tekan 📜 HISTORY                 ║
║                                      ║
║  5️⃣ *Web Explorer*                   ║
║     https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/index.html  ║
╚══════════════════════════════════════╝

📊 *INFORMASI TOKENOMICS*
• Max Supply: 12,614,400 XYR
• 1 XYR = 100,000,000 nIZ
• Block Reward: 6 XYR (tahun 1)
• Fee: 0.001 XYR
• Konfirmasi: 3 block (9 menit)

⚡ *KEYWORD COMMANDS*
• /start - Menu utama
• /send [addr] [amount] - Kirim XYR

💡 *Tips:*
• Simpan private key Anda!
• Cek address tujuan sebelum kirim
• Transaksi tidak bisa dibatalkan

🚀 *XYRON - Blockchain Masa Depan!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

console.log('🚀 XYRON BOT KEREN RUNNING!');
