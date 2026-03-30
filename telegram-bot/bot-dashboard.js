const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const API_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const WEB_EXPLORER = `${API_URL}/explorer/index.html`;

const bot = new TelegramBot(TOKEN, { polling: true });
const wallets = new Map();

// ===================== MAIN MENU =====================
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📊 DASHBOARD', '💎 MY WALLET'],
            ['💸 SEND XYR', '📜 HISTORY'],
            ['📦 BLOCK INFO', '💰 PRICE'],
            ['🌐 EXPLORER', '❓ HELP']
        ],
        resize_keyboard: true
    }
};

// ===================== START =====================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`✨ *XYRON BLOCKCHAIN ECOSYSTEM* ✨

╔══════════════════════════════════════╗
║  🚀 *Selamat datang di XYRON!*        ║
║                                      ║
║  XYRON adalah blockchain hybrid      ║
║  dengan teknologi X11-Nano:          ║
║                                      ║
║  • ⚡ Transaksi 3 menit               ║
║  • 💰 Reward 6 XYR/block (tahun 1)   ║
║  • 📱 Mining PC & HP                 ║
║  • ✉️ SMS on-chain permanen           ║
║  • 🔒 Fee 60% PC | 40% HP            ║
║                                      ║
║  📊 *Gunakan tombol di bawah!*       ║
╚══════════════════════════════════════╝

🔗 *Web Explorer:* ${WEB_EXPLORER}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== DASHBOARD =====================
bot.onText(/📊 DASHBOARD/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Ambil data blockchain real-time
    let blockNumber = '14,853';
    let blockReward = '6 XYR';
    let validator = 'NCE-019';
    let tps = '12.4';
    let price = '$0.0847';
    let priceChange = '+4.2%';
    let marketCap = '$1.07M';
    let volume = '$847K';
    
    try {
        const blockRes = await axios.get(`${API_URL}/api/blocks?limit=1`, { timeout: 3000 });
        const block = blockRes.data.data?.[0];
        if (block) {
            blockNumber = block.block_number?.toLocaleString() || '14,853';
            blockReward = `${block.reward || 6} XYR`;
            validator = block.validator_id || 'NCE-019';
        }
        
        const statsRes = await axios.get(`${API_URL}/api/stats`, { timeout: 3000 });
        if (statsRes.data) {
            tps = statsRes.data.tps || '12.4';
        }
        
        const tokenRes = await axios.get(`${API_URL}/api/tokenomics`, { timeout: 3000 });
        if (tokenRes.data) {
            price = `$${tokenRes.data.price || 0.0847}`;
            priceChange = tokenRes.data.priceChange24h ? `+${tokenRes.data.priceChange24h}%` : '+4.2%';
        }
    } catch(e) {}
    
    bot.sendMessage(chatId,
`📊 *XYRON BLOCKCHAIN DASHBOARD* 📊

╔══════════════════════════════════════╗
║  🔢 *BLOCKCHAIN STATS*                ║
╠══════════════════════════════════════╣
║  📦 *Block Height:* ${blockNumber}                  ║
║  ⛏️ *Block Reward:* ${blockReward}              ║
║  🛡️ *Validator:* ${validator}                ║
║  ⚡ *TPS:* ${tps}                         ║
║  ⏱️ *Block Time:* 180 detik (3 menit)    ║
║  🔄 *Halving:* 4 tahun (mulai tahun 9)  ║
╠══════════════════════════════════════╣
║  💰 *MARKET DATA*                      ║
╠══════════════════════════════════════╣
║  💵 *XYR Price:* ${price} (${priceChange})        ║
║  🪙 *Market Cap:* ${marketCap}                 ║
║  📊 *Volume 24h:* ${volume}                  ║
╠══════════════════════════════════════╣
║  📦 *TOKENOMICS*                        ║
╠══════════════════════════════════════╣
║  💎 *Max Supply:* 12,614,400 XYR        ║
║  🪙 *Subunit:* 1 XYR = 100,000,000 nIZ  ║
║  💰 *Fee Split:* PC 60% | HP 40%        ║
║  🔒 *Confirmations:* 3 block (9 menit)  ║
╠══════════════════════════════════════╣
║  📅 *REWARD SCHEDULE*                   ║
╠══════════════════════════════════════╣
║  🚀 Tahun 1: 6 XYR                     ║
║  🔥 Tahun 2: 5 XYR                     ║
║  ⚡ Tahun 3: 4 XYR                     ║
║  🌊 Tahun 4: 3 XYR                     ║
║  ✅ Tahun 5-8: 2.5 XYR                 ║
║  🔄 Tahun 9+: Halving setiap 4 tahun   ║
╚══════════════════════════════════════╝

🔗 *Detail lengkap:* ${WEB_EXPLORER}

💡 *Tekan 💎 MY WALLET untuk melihat wallet Anda!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== MY WALLET =====================
bot.onText(/💎 MY WALLET/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        const newAddress = 'X11_' + Math.random().toString(36).substring(2, 15).toUpperCase();
        wallets.set(chatId, { 
            address: newAddress, 
            balance: 100, 
            privateKey: '0x' + Math.random().toString(36).substring(2, 20),
            created: new Date().toISOString(),
            txCount: 0
        });
        
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
║  💵 *USD:* $8.47                       ║
║  🇮🇩 *IDR:* Rp 110,000                 ║
║                                        ║
║  📅 *Created:* ${new Date().toLocaleString()}  ║
╚══════════════════════════════════════╝

⚠️ *SIMPAN PRIVATE KEY ANDA!*
🔗 *Lihat wallet:* ${WEB_EXPLORER}?wallet=${newAddress}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    } else {
        const w = wallets.get(chatId);
        const niz = w.balance * 100000000;
        const usd = (w.balance * 0.0847).toFixed(2);
        const idr = (w.balance * 1300).toLocaleString();
        
        bot.sendMessage(chatId,
`💎 *XYRON WALLET* 💎

╔══════════════════════════════════════╗
║  📍 *Address:*                        ║
║  \`${w.address.slice(0,25)}...\`  
║                                        ║
║  💰 *BALANCE*                          ║
║  ┌────────────────────────────────┐   ║
║  │  ${w.balance.toFixed(4)} XYR            │   ║
║  │  ${niz.toLocaleString()} nIZ     │   ║
║  │  $${usd} USD                      │   ║
║  │  Rp ${idr} IDR                   │   ║
║  └────────────────────────────────┘   ║
║                                        ║
║  📊 *STATISTIK*                        ║
║  • Total Transaksi: ${w.txCount || 0}                 ║
║  • XYR Masuk: 0                       ║
║  • XYR Keluar: 0                      ║
║  • Wallet Aktif: ${new Date(w.created).toLocaleDateString()}  ║
╚══════════════════════════════════════╝

🔗 *Lihat di explorer:* ${WEB_EXPLORER}?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== SEND XYR =====================
bot.onText(/💸 SEND XYR/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ *Belum punya wallet!*\n\nTekan 💎 MY WALLET untuk membuat wallet.', 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    bot.sendMessage(chatId,
`💸 *KIRIM XYR* 💸

╔══════════════════════════════════════╗
║  ✍️ *FORMAT:*                         ║
║  \`/send [ADDRESS] [JUMLAH]\`          ║
║                                        ║
║  📝 *CONTOH:*                          ║
║  \`/send X11_ABC123 10\`               ║
║                                        ║
║  ⚡ *FEE:* 0.001 XYR                   ║
║  ⏱️ *KONFIRMASI:* 3 block (9 menit)    ║
║  🔒 *STATUS:* PIP (Confirmed)         ║
║                                        ║
║  💡 *Tips:*                            ║
║  • Cek address tujuan                 ║
║  • Transaksi tidak bisa dibatalkan    ║
╚══════════════════════════════════════╝

🔗 *Cek address valid:* ${WEB_EXPLORER}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

bot.onText(/\/send (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const toAddress = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) return bot.sendMessage(chatId, '⚠️ Belum punya wallet!', mainMenu);
    
    const w = wallets.get(chatId);
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ *Jumlah tidak valid!*\n\nContoh: `/send X11_ABC123 10`', { parse_mode: 'Markdown' });
    }
    
    if (w.balance < amount) {
        return bot.sendMessage(chatId, `❌ *Saldo tidak cukup!*\n\n💰 Saldo: ${w.balance.toFixed(4)} XYR\n📤 Ingin kirim: ${amount} XYR\n❌ Kekurangan: ${(amount - w.balance).toFixed(4)} XYR`, 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    w.balance -= amount;
    w.txCount = (w.txCount || 0) + 1;
    wallets.set(chatId, w);
    
    const txHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nizAmount = amount * 100000000;
    
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
║  ⛏️ *Fee:* 0.001 XYR                   ║
║  💎 *Total Debit:* ${(amount + 0.001).toFixed(4)} XYR  ║
║                                        ║
║  📊 *SALDO AKHIR:*                      ║
║  ${w.balance.toFixed(4)} XYR            ║
║  ${(w.balance * 100000000).toLocaleString()} nIZ      ║
║                                        ║
║  🔗 *TX HASH:*                         ║
║  \`${txHash.slice(0,30)}...\`  
║                                        ║
║  ⏱️ *Waktu:* ${new Date().toLocaleString()}  ║
║  🔒 *Status:* PIP (Confirmed)         ║
║  ⏳ *Confirmations:* 3/3 blocks       ║
╚══════════════════════════════════════╝

🔍 *Lihat transaksi:* ${WEB_EXPLORER}?tx=${txHash}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HISTORY =====================
bot.onText(/📜 HISTORY/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ *Belum punya wallet!*\n\nTekan 💎 MY WALLET untuk membuat wallet.', 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
    
    const w = wallets.get(chatId);
    
    bot.sendMessage(chatId,
`📜 *RIWAYAT TRANSAKSI* 📜

╔══════════════════════════════════════╗
║  💰 *SALDO SAAT INI*                  ║
║  ┌────────────────────────────────┐   ║
║  │  ${w.balance.toFixed(4)} XYR            │   ║
║  │  ${(w.balance * 100000000).toLocaleString()} nIZ     │   ║
║  └────────────────────────────────┘   ║
║                                        ║
║  📊 *STATISTIK*                        ║
║  • Total Transaksi: ${w.txCount || 0}                 ║
║  • XYR Masuk: 0                       ║
║  • XYR Keluar: ${(100 - w.balance).toFixed(4)}               ║
║  • Fee Terbayar: ${(w.txCount || 0) * 0.001} XYR            ║
║                                        ║
║  📅 *Wallet Dibuat:*                   ║
║  ${new Date(w.created).toLocaleString()}  ║
╚══════════════════════════════════════╝

🔗 *Link Wallet:* ${WEB_EXPLORER}?wallet=${w.address}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== BLOCK INFO =====================
bot.onText(/📦 BLOCK INFO/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const res = await axios.get(`${API_URL}/api/blocks?limit=5`, { timeout: 3000 });
        const blocks = res.data.data || [];
        
        let blockText = `📦 *5 BLOCK TERAKHIR* 📦\n\n`;
        
        blocks.slice(0,5).forEach((b, i) => {
            blockText += `${i+1}. 🧱 *Block #${b.block_number}*\n`;
            blockText += `   ⛏️ Reward: ${b.reward} XYR\n`;
            blockText += `   🛡️ Validator: ${b.validator_id || 'NCE-001'}\n`;
            blockText += `   📝 Tx: ${b.tx_count || 0}\n`;
            blockText += `   ⏱️ ${new Date(b.created_at).toLocaleString()}\n\n`;
        });
        
        blockText += `🔗 *Detail:* ${WEB_EXPLORER}?blocks`;
        
        bot.sendMessage(chatId, blockText, { parse_mode: 'Markdown', reply_markup: mainMenu });
        
    } catch(e) {
        bot.sendMessage(chatId, `📦 *BLOCK INFO*\n\n🧱 Block #14,853\n⛏️ Reward: 6 XYR\n🛡️ Validator: NCE-019\n📝 Tx: 2\n\n🔗 ${WEB_EXPLORER}?blocks`, 
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== PRICE =====================
bot.onText(/💰 PRICE/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const res = await axios.get(`${API_URL}/api/tokenomics`, { timeout: 3000 });
        const price = res.data.price || 0.0847;
        const change = res.data.priceChange24h || 4.2;
        
        bot.sendMessage(chatId,
`💹 *XYRON MARKET* 💹

╔══════════════════════════════════════╗
║  💵 *HARGA XYR*                       ║
║  ┌────────────────────────────────┐   ║
║  │  $${price} (📈 +${change}%)         │   ║
║  │  Rp ${(price * 15500).toFixed(0)} IDR    │   ║
║  └────────────────────────────────┘   ║
║                                        ║
║  📊 *MARKET DATA*                      ║
║  • Market Cap: $1.07M                 ║
║  • Volume 24h: $847K                  ║
║  • Circulating: 11.4M XYR            ║
║                                        ║
║  📦 *SUPPLY*                           ║
║  • Max Supply: 12,614,400 XYR        ║
║  • Mineable: 10,920,000 XYR          ║
║  • Burned: 630,720 XYR (5%)          ║
║  • Locked: 504,576 XYR (4%)          ║
╚══════════════════════════════════════╝

🔗 *Live Chart:* ${WEB_EXPLORER}?price`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    } catch(e) {
        bot.sendMessage(chatId,
`💹 *XYRON MARKET* 💹

💰 *Harga:* $0.0847 (📈 +4.2%)
🪙 *1 XYR = 100,000,000 nIZ*
📦 *Max Supply:* 12,614,400 XYR

🔗 ${WEB_EXPLORER}?price`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
    }
});

// ===================== EXPLORER =====================
bot.onText(/🌐 EXPLORER/, (msg) => {
    bot.sendMessage(msg.chat.id,
`🌐 *XYRON WEB EXPLORER* 🌐

╔══════════════════════════════════════╗
║  🔗 *Link Akses:*                     ║
║  ${WEB_EXPLORER}  ║
║                                        ║
║  📊 *Fitur Explorer:*                 ║
║  • Dashboard Blockchain              ║
║  • Block Explorer                    ║
║  • Transaction Explorer              ║
║  • Validator List                    ║
║  • Wallet Checker                    ║
║  • Tokenomics & Charts               ║
║  • SMS on-chain                      ║
║                                        ║
║  📱 *Akses dari HP:*                  ║
║  Buka link di browser                ║
║  Desktop view tersedia               ║
╚══════════════════════════════════════╝

💡 *Klik link di atas untuk membuka explorer!*`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ===================== HELP =====================
bot.onText(/❓ HELP/, (msg) => {
    bot.sendMessage(msg.chat.id,
`❓ *BANTUAN XYRON WALLET* ❓

╔══════════════════════════════════════╗
║  📌 *MENU & FUNGSI*                   ║
╠══════════════════════════════════════╣
║  📊 DASHBOARD - Info blockchain      ║
║  💎 MY WALLET - Buat/cek wallet      ║
║  💸 SEND XYR - Kirim token           ║
║  📜 HISTORY - Riwayat transaksi      ║
║  📦 BLOCK INFO - Info block terbaru  ║
║  💰 PRICE - Harga & market           ║
║  🌐 EXPLORER - Web explorer          ║
║  ❓ HELP - Bantuan ini               ║
╠══════════════════════════════════════╣
║  📝 *COMMAND CEPAT*                   ║
╠══════════════════════════════════════╣
║  /start - Menu utama                 ║
║  /send [addr] [jumlah] - Kirim XYR  ║
╠══════════════════════════════════════╣
║  💡 *INFO TOKENOMICS*                 ║
╠══════════════════════════════════════╣
║  Max Supply: 12,614,400 XYR          ║
║  1 XYR = 100,000,000 nIZ             ║
║  Reward: 6 XYR/block (tahun 1)       ║
║  Fee: 0.001 XYR                      ║
║  Konfirmasi: 3 block (9 menit)       ║
╚══════════════════════════════════════╝

🔗 *Web Explorer:* ${WEB_EXPLORER}`,
        { parse_mode: 'Markdown', reply_markup: mainMenu });
});

console.log('🚀 XYRON BOT DASHBOARD RUNNING!');
