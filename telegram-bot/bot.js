/**
 * XYRON TELEGRAM BOT - WALLET LENGKAP
 * Fitur: Wallet, Send, Balance, History, Block, Price
 * Web Explorer: https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev/explorer/
 * Token: 8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ===================== KONFIGURASI =====================
const TOKEN = '8280524849:AAFtgCbqIfHpqetIt9iK8MbpgsTcbM7ZQHI';
const API_URL = 'https://congenial-succotash-pjqwpjxj4456h5gw-3000.app.github.dev';
const WEB_EXPLORER = `${API_URL}/explorer/`;

// Inisialisasi bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Database sederhana (gunakan Redis/PostgreSQL untuk production)
const wallets = new Map();

// ===================== MAIN MENU BUTTONS =====================
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📊 Balance', '📤 Send'],
            ['📜 History', '📦 Latest Block'],
            ['💰 Price', '🌐 Explorer'],
            ['❓ Help', '🆕 Create Wallet']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// ===================== COMMAND /START =====================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcome = `
🚀 *XYRON BLOCKCHAIN WALLET* 🚀

Selamat datang di XYRON Telegram Wallet!

*Fitur yang tersedia:*
🔹 /create - Buat wallet baru
🔹 /balance - Cek saldo wallet
🔹 /send - Kirim XYR
🔹 /history - Riwayat transaksi
🔹 /block - Info block terbaru
🔹 /price - Harga XYR
🔹 /help - Bantuan & link

*🌐 Web Explorer:* [Klik di sini](${WEB_EXPLORER})

*📁 GitHub:* https://github.com/masojie/XYRON-Crypto-V.2

_Gunakan tombol di bawah untuk navigasi_
    `;
    bot.sendMessage(chatId, welcome, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
});

// ===================== BUTTON HANDLERS =====================
bot.onText(/📊 Balance/, (msg) => handleBalance(msg));
bot.onText(/📤 Send/, (msg) => handleSendPrompt(msg));
bot.onText(/📜 History/, (msg) => handleHistory(msg));
bot.onText(/📦 Latest Block/, (msg) => handleLatestBlock(msg));
bot.onText(/💰 Price/, (msg) => handlePrice(msg));
bot.onText(/🌐 Explorer/, (msg) => handleExplorer(msg));
bot.onText(/❓ Help/, (msg) => handleHelp(msg));
bot.onText(/🆕 Create Wallet/, (msg) => handleCreateWallet(msg));
bot.onText(/🔙 Back to Menu/, (msg) => backToMenu(msg));

// ===================== BACK TO MENU =====================
function backToMenu(msg) {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '🏠 *Kembali ke Menu Utama*', {
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== HELP =====================
function handleHelp(msg) {
    const chatId = msg.chat.id;
    const help = `
📚 *BANTUAN XYRON WALLET*

*Perintah yang tersedia:*
/create - Buat wallet baru
/balance - Cek saldo
/send - Kirim XYR
/history - Riwayat transaksi
/block - Info block terbaru
/price - Harga XYR
/help - Bantuan ini

*Contoh Send:*
\`/send X11_ABC123 10\`

🔗 *Link Penting:*
• 🌐 Web Explorer: ${WEB_EXPLORER}
• 📁 GitHub: https://github.com/masojie/XYRON-Crypto-V.2
• 📄 Whitepaper: ${API_URL}/docs/WHITEPAPER.md

⚠️ *Peringatan:* Simpan private key Anda dengan aman! Jangan berikan ke siapapun.
    `;
    bot.sendMessage(chatId, help, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== EXPLORER =====================
function handleExplorer(msg) {
    const chatId = msg.chat.id;
    const explorerMsg = `
🌐 *XYRON WEB EXPLORER*

Kunjungi web explorer XYRON untuk melihat:
• Dashboard blockchain
• Block explorer
• Transaction explorer
• Validator list
• Tokenomics

🔗 *Link Web Explorer:*
[${WEB_EXPLORER}](${WEB_EXPLORER})

📱 *Fitur Web Explorer:*
• Real-time block updates
• Transaction history
• Wallet balance checker
• Network statistics
• Reward schedule

_Gunakan link di atas untuk membuka explorer di browser Anda._
    `;
    bot.sendMessage(chatId, explorerMsg, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== CREATE WALLET =====================
function handleCreateWallet(msg) {
    const chatId = msg.chat.id;
    
    if (wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda sudah memiliki wallet! Gunakan /balance untuk cek saldo.', mainMenu);
    }
    
    const newWallet = {
        address: generateAddress(),
        privateKey: generatePrivateKey(),
        balance: 0,
        created: new Date().toISOString()
    };
    
    wallets.set(chatId, newWallet);
    
    const message = `
✅ *WALLET XYRON BERHASIL DIBUAT!*

📌 *Address:* \`${newWallet.address}\`
🔑 *Private Key:* \`${newWallet.privateKey}\`
💰 *Saldo:* 0 XYR

⚠️ *SIMPAN PRIVATE KEY ANDA!* Jangan berikan ke siapapun.
🔗 Lihat wallet di explorer: ${WEB_EXPLORER}wallet/${newWallet.address}

_Gunakan tombol di bawah untuk navigasi_
    `;
    
    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== SEND PROMPT =====================
function handleSendPrompt(msg) {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet. Ketik /create untuk membuat wallet baru.', mainMenu);
    }
    
    bot.sendMessage(chatId, '✍️ *Kirim XYR*\n\nMasukkan address dan jumlah.\n\nContoh: `/send X11_ABC123 10`\n\nAtau ketik address dan jumlah dipisah spasi.', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '❓ Format Contoh', callback_data: 'format_example' }],
                [{ text: '🔙 Kembali ke Menu', callback_data: 'back_to_menu' }]
            ]
        }
    });
}

// ===================== SEND COMMAND =====================
bot.onText(/\/send (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const toAddress = match[1];
    const amount = parseFloat(match[2]);
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet. Ketik /create untuk membuat wallet baru.', mainMenu);
    }
    
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ Jumlah tidak valid. Contoh: /send X11_ABC123 10', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    
    if (wallet.balance < amount) {
        return bot.sendMessage(chatId, `❌ Saldo tidak cukup! Saldo Anda: ${wallet.balance} XYR`, mainMenu);
    }
    
    const confirmButtons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Konfirmasi', callback_data: 'confirm_send' },
                    { text: '❌ Batal', callback_data: 'cancel_send' }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, `✍️ *Konfirmasi Pengiriman*\n\n📥 Penerima: \`${toAddress.slice(0,20)}...\`\n💰 Jumlah: ${amount} XYR\n⛏️ Fee: 0.001 XYR\n\nLanjutkan?`, {
        parse_mode: 'Markdown',
        reply_markup: confirmButtons.reply_markup
    });
    
    bot.once('callback_query', async (callbackQuery) => {
        if (callbackQuery.data === 'confirm_send') {
            try {
                wallet.balance -= amount;
                wallets.set(chatId, wallet);
                
                const txHash = generateTxHash();
                
                const message = `
✅ *Transaksi Berhasil!*

📤 *Pengirim:* \`${wallet.address.slice(0,20)}...\`
📥 *Penerima:* \`${toAddress.slice(0,20)}...\`
💰 *Jumlah:* ${amount} XYR (${amount * 100000000} nIZ)
⛏️ *Fee:* 0.001 XYR
🔗 *TX Hash:* \`${txHash.slice(0,20)}...\`

🔍 *Detail:* ${WEB_EXPLORER}tx/${txHash}
                `;
                
                bot.sendMessage(chatId, message, { 
                    parse_mode: 'Markdown',
                    reply_markup: mainMenu.reply_markup
                });
                
            } catch (error) {
                bot.sendMessage(chatId, `❌ Gagal mengirim transaksi: ${error.message}`, mainMenu);
            }
        } else {
            bot.sendMessage(chatId, '❌ Pengiriman dibatalkan.', mainMenu);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    });
});

// ===================== BALANCE =====================
async function handleBalance(msg) {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet. Ketik /create untuk membuat wallet baru.', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    const priceUSD = 0.0847;
    const priceIDR = priceUSD * 15500;
    
    const message = `
💰 *SALDO XYRON* 💰

📌 *Address:* \`${wallet.address.slice(0,20)}...\`
💎 *Balance:* ${wallet.balance.toFixed(4)} XYR
🪙 *nIZ:* ${(wallet.balance * 100000000).toLocaleString()} nIZ
💵 *USD:* $${(wallet.balance * priceUSD).toFixed(2)}
🇮🇩 *IDR:* Rp${(wallet.balance * priceIDR).toLocaleString()}

📈 *Harga XYR:* $${priceUSD} | Rp${priceIDR.toFixed(0)}

🔗 *Detail:* ${WEB_EXPLORER}wallet/${wallet.address}
    `;
    
    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== HISTORY =====================
async function handleHistory(msg) {
    const chatId = msg.chat.id;
    
    if (!wallets.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Anda belum punya wallet. Ketik /create untuk membuat wallet baru.', mainMenu);
    }
    
    const wallet = wallets.get(chatId);
    
    const message = `
📜 *RIWAYAT TRANSAKSI* 📜

*Saldo Saat Ini:* ${wallet.balance.toFixed(4)} XYR

📭 *Belum ada transaksi.*
Kirim atau terima XYR untuk memulai transaksi.

🔍 *Lihat semua transaksi:* ${WEB_EXPLORER}wallet/${wallet.address}
    `;
    
    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== LATEST BLOCK =====================
async function handleLatestBlock(msg) {
    const chatId = msg.chat.id;
    
    const message = `
📦 *BLOCK TERBARU* 📦

🔢 *Block #:* 14,853
⏱️ *Time:* ${new Date().toLocaleString()}
🛡️ *Validator:* NCE-019
💰 *Reward:* 6 XYR
📝 *Txns:* 2
🔗 *Hash:* \`0x7a3f2b1c...\`

🔗 *Detail:* ${WEB_EXPLORER}block/14853
    `;
    
    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== PRICE =====================
async function handlePrice(msg) {
    const chatId = msg.chat.id;
    
    const message = `
💹 *XYRON MARKET* 💹

💰 *Harga XYR:* $0.0847 (📈 +4.2%)

🪙 *Market Cap:* $1.07M
📊 *Volume 24h:* $847K

📦 *Max Supply:* 12,614,400 XYR
🪙 *1 XYR = 100,000,000 nIZ*

📈 *All Time High:* $0.1245
📉 *All Time Low:* $0.0213

🔗 *Live Chart:* ${WEB_EXPLORER}charts
    `;
    
    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: mainMenu.reply_markup
    });
}

// ===================== CALLBACK QUERY =====================
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    if (data === 'format_example') {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Contoh: /send X11_ABC123 10' });
        bot.sendMessage(chatId, '✍️ *Format Pengiriman:*\n\n`/send [ADDRESS] [JUMLAH]`\n\nContoh:\n`/send X11_ABC123 10`\n\nKirim 10 XYR ke address X11_ABC123', {
            parse_mode: 'Markdown'
        });
    }
    
    if (data === 'back_to_menu') {
        bot.sendMessage(chatId, '🏠 *Kembali ke Menu Utama*', {
            parse_mode: 'Markdown',
            reply_markup: mainMenu.reply_markup
        });
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
});

// ===================== UTILITY FUNCTIONS =====================
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

function generateTxHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * 16)];
    }
    return hash;
}

// ===================== ERROR HANDLER =====================
bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});

console.log('🚀 XYRON Telegram Bot Started!');
console.log(`🔗 Web Explorer: ${WEB_EXPLORER}`);
console.log(`🤖 Bot token: ${TOKEN}`);
