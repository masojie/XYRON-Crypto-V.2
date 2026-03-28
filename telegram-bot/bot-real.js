/**
 * XYRON TELEGRAM BOT - REAL VERSION
 * Data LIVE dari API XYRON yang sudah berjalan
 * Token: 8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Konfigurasi
const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const API_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const WEB_EXPLORER = `${API_URL}/explorer/`;

const bot = new TelegramBot(TOKEN, { polling: true });

// Database lokal untuk wallet (sementara, nanti bisa pake database real)
const wallets = new Map();

// Menu Utama
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

// ===================== START =====================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🚀 *XYRON BLOCKCHAIN WALLET* 🚀\n\nSelamat datang! Gunakan tombol di bawah.\n\n🌐 *Web Explorer:* ${WEB_EXPLORER}`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
});

// ===================== CREATE WALLET =====================
bot.onText(/🆕 Create Wallet/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda sudah memiliki wallet! Gunakan /balance untuk cek saldo.', mainMenu);
    }
    
    // Generate wallet baru
    const newWallet = {
        address: generateAddress(),
        privateKey: generatePrivateKey(),
        balance: 0,
        created: new Date().toISOString()
    };
    
    wallets.set(chatId, newWallet);
    
    bot.sendMessage(chatId, `✅ *WALLET BERHASIL DIBUAT!*\n\n📌 *Address:* \`${newWallet.address}\`\n🔑 *Private Key:* \`${newWallet.privateKey}\`\n💰 *Saldo:* 0 XYR\n\n⚠️ *SIMPAN PRIVATE KEY ANDA!*\n🔗 *Lihat di explorer:* ${WEB_EXPLORER}wallet/${newWallet.address}`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
});

// ===================== BALANCE (LIVE dari API) =====================
bot.onText(/📊 Balance/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet. Ketik /create atau tekan tombol "🆕 Create Wallet".', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    
    try {
        // Ambil data balance REAL dari API
        const response = await axios.get(`${API_URL}/api/balance/${wallet.address}`);
        const balance = response.data.balance || wallet.balance;
        
        // Update balance lokal
        wallet.balance = balance;
        wallets.set(chatId, wallet);
        
        // Ambil harga dari API
        let priceUSD = 0.0847;
        try {
            const priceRes = await axios.get(`${API_URL}/api/price`);
            priceUSD = priceRes.data.price || 0.0847;
        } catch(e) {}
        
        const priceIDR = priceUSD * 15500;
        
        bot.sendMessage(chatId, `💰 *SALDO XYRON* 💰\n\n📌 *Address:* \`${wallet.address.slice(0,20)}...\`\n💎 *Balance:* ${balance.toFixed(4)} XYR\n🪙 *nIZ:* ${(balance * 100000000).toLocaleString()} nIZ\n💵 *USD:* $${(balance * priceUSD).toFixed(2)}\n🇮🇩 *IDR:* Rp${(balance * priceIDR).toLocaleString()}\n\n📈 *Harga:* $${priceUSD} | Rp${priceIDR.toFixed(0)}\n\n🔗 *Detail:* ${WEB_EXPLORER}wallet/${wallet.address}`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
        
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Gagal mengambil saldo dari API. Gunakan data lokal.\n\n💰 *Saldo:* ${wallet.balance.toFixed(4)} XYR`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
    }
});

// ===================== SEND =====================
bot.onText(/📤 Send/, (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet.', mainMenu);
    }
    
    bot.sendMessage(chatId, '✍️ *Kirim XYR*\n\nFormat: `/send [ADDRESS] [JUMLAH]`\nContoh: `/send X11_ABC123 10`\n\nAtau kirim address dan jumlah dipisah spasi.', {
        parse_mode: 'Markdown'
    });
});

bot.onText(/\/send (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const toAddress = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet.', mainMenu);
    }
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ Jumlah tidak valid. Contoh: /send X11_ABC123 10', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    
    if (wallet.balance < amount) {
        return bot.sendMessage(chatId, `❌ Saldo tidak cukup! Saldo Anda: ${wallet.balance.toFixed(4)} XYR`, mainMenu);
    }
    
    try {
        // Kirim ke API XYRON
        const response = await axios.post(`${API_URL}/api/send`, {
            from: wallet.address,
            to: toAddress,
            amount: amount,
            privateKey: wallet.privateKey
        });
        
        // Update balance lokal
        wallet.balance -= amount;
        wallets.set(chatId, wallet);
        
        bot.sendMessage(chatId, `✅ *Transaksi Berhasil!*\n\n📤 *Pengirim:* \`${wallet.address.slice(0,20)}...\`\n📥 *Penerima:* \`${toAddress.slice(0,20)}...\`\n💰 *Jumlah:* ${amount} XYR\n⛏️ *Fee:* 0.001 XYR\n🔗 *TX Hash:* \`${response.data.txHash?.slice(0,20) || 'pending'}...\`\n\n🔍 *Detail:* ${WEB_EXPLORER}tx/${response.data.txHash || 'pending'}`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
        
    } catch (error) {
        bot.sendMessage(chatId, `❌ Gagal mengirim transaksi: ${error.message}`, mainMenu);
    }
});

// ===================== HISTORY (LIVE dari API) =====================
bot.onText(/📜 History/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet.', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    
    try {
        const response = await axios.get(`${API_URL}/api/transactions/${wallet.address}?limit=5`);
        const txs = response.data.transactions || [];
        
        if (txs.length === 0) {
            return bot.sendMessage(chatId, `📭 *Belum ada transaksi.*\n\nSaldo saat ini: ${wallet.balance.toFixed(4)} XYR\n\n🔍 *Lihat semua:* ${WEB_EXPLORER}wallet/${wallet.address}`, {
                parse_mode: 'Markdown',
                reply_markup: mainMenu.reply_markup
            });
        }
        
        let history = `📜 *RIWAYAT TRANSAKSI* 📜\n\n`;
        
        txs.forEach(tx => {
            const type = tx.from === wallet.address ? '📤 KIRIM' : '📥 TERIMA';
            const amount = tx.amount.toFixed(4);
            const status = tx.status === 'PIP' ? '✅' : '⏳';
            const date = new Date(tx.timestamp).toLocaleString();
            
            history += `${status} *${type}* ${amount} XYR\n`;
            history += `   📅 ${date}\n`;
            history += `   🔗 \`${tx.hash?.slice(0,16)}...\`\n\n`;
        });
        
        history += `🔗 *Lihat semua:* ${WEB_EXPLORER}wallet/${wallet.address}`;
        
        bot.sendMessage(chatId, history, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
        
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Gagal mengambil riwayat. Saldo saat ini: ${wallet.balance.toFixed(4)} XYR`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
    }
});

// ===================== LATEST BLOCK (LIVE dari API) =====================
bot.onText(/📦 Latest Block/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const response = await axios.get(`${API_URL}/api/blocks?limit=1`);
        const blocks = response.data.data || [];
        
        if (blocks.length === 0) {
            return bot.sendMessage(chatId, '📦 *Belum ada block. Tunggu mining aktif.*', {
                parse_mode: 'Markdown',
                reply_markup: mainMenu.reply_markup
            });
        }
        
        const block = blocks[0];
        
        bot.sendMessage(chatId, `📦 *BLOCK TERBARU* 📦\n\n🔢 *Block #:* ${block.block_number}\n⏱️ *Time:* ${new Date(block.created_at).toLocaleString()}\n🛡️ *Validator:* ${block.validator_id || 'NCE-001'}\n💰 *Reward:* ${block.reward || 6} XYR\n📝 *Txns:* ${block.tx_count || 0}\n🔗 *Hash:* \`${block.block_hash?.slice(0,20)}...\`\n\n🔗 *Detail:* ${WEB_EXPLORER}block/${block.block_number}`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
        
    } catch (error) {
        bot.sendMessage(chatId, '⚠️ Gagal mengambil data block. Coba lagi nanti.', {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
    }
});

// ===================== PRICE (LIVE dari Tokenomics) =====================
bot.onText(/💰 Price/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const response = await axios.get(`${API_URL}/api/tokenomics`);
        const data = response.data;
        
        const priceUSD = data.price || 0.0847;
        const priceChange = data.priceChange24h || 4.2;
        const marketCap = data.marketCap || (12614400 * priceUSD);
        const volume24h = data.volume24h || 847329;
        
        const upDown = priceChange >= 0 ? '📈' : '📉';
        
        bot.sendMessage(chatId, `💹 *XYRON MARKET* 💹\n\n💰 *Harga:* $${priceUSD.toFixed(4)} (${upDown} ${Math.abs(priceChange).toFixed(1)}%)\n🪙 *Market Cap:* $${(marketCap / 1e6).toFixed(2)}M\n📊 *Volume 24h:* $${(volume24h / 1e3).toFixed(0)}K\n\n📦 *Max Supply:* 12,614,400 XYR\n🪙 *1 XYR = 100,000,000 nIZ*\n\n🔗 *Live Chart:* ${WEB_EXPLORER}charts`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
        
    } catch (error) {
        bot.sendMessage(chatId, `💹 *XYRON MARKET*\n\n💰 *Harga:* $0.0847 (📈 +4.2%)\n🪙 *1 XYR = 100,000,000 nIZ*\n📦 *Max Supply:* 12,614,400 XYR`, {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
    }
});

// ===================== EXPLORER =====================
bot.onText(/🌐 Explorer/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🌐 *XYRON WEB EXPLORER*\n\nKunjungi web explorer untuk melihat:\n• Dashboard blockchain\n• Block explorer\n• Transaction explorer\n• Validator list\n• Tokenomics\n\n🔗 *Link:* ${WEB_EXPLORER}\n\n📱 *Fitur:* Real-time updates, wallet checker, reward schedule`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
});

// ===================== HELP =====================
bot.onText(/❓ Help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `📚 *BANTUAN XYRON WALLET*\n\n*Perintah:*\n/create - Buat wallet\n/balance - Cek saldo\n/send [addr] [jumlah] - Kirim XYR\n/history - Riwayat\n/block - Info block\n/price - Harga\n/help - Bantuan\n\n*Tombol:*\n📊 Balance | 📤 Send\n📜 History | 📦 Latest Block\n💰 Price | 🌐 Explorer\n❓ Help | 🆕 Create Wallet\n\n🔗 *Link Penting:*\n🌐 Web Explorer: ${WEB_EXPLORER}\n📁 GitHub: https://github.com/masojie/XYRON-Crypto-V.2`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
});

// ===================== UTILITY =====================
function generateAddress() {
    const chars = '0123456789ABCDEF';
    let hex = '';
    for (let i = 0; i < 64; i++) {
        hex += chars[Math.floor(Math.random() * 16)];
    }
    return `X11_${hex}`;
}

function generatePrivateKey() {
    const chars = '0123456789abcdef';
    let key = '0x';
    for (let i = 0; i < 64; i++) {
        key += chars[Math.floor(Math.random() * 16)];
    }
    return key;
}

// Error handler
bot.on('polling_error', (error) => console.log('Polling error:', error));

console.log('🚀 XYRON REAL BOT Started!');
console.log(`🔗 API: ${API_URL}`);
console.log(`🌐 Explorer: ${WEB_EXPLORER}`);
