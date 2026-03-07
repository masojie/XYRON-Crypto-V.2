// ============================================================================
// XYRON API GATEWAY - NODE.JS
// Socket Client ke Go: /tmp/xyron-go.sock
// Heartbeat: 180 detik | Tokenomics: 12,614,400 XYR
// Status: PIP untuk sukses, PIP PIP untuk idle
// ============================================================================

const express = require('express');
const net = require('net');
const { createServer } = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const winston = require('winston');

// Local modules
const Tokenomics = require('./engine/tokenomics');
const Heartbeat = require('./engine/heartbeat');

// ============================================================================
// KONSTANTA
// ============================================================================
const PORT = process.env.PORT || 3000;
const GO_SOCKET = '/tmp/xyron-go.sock'; // Socket ke Go
const REQUEST_TIMEOUT = 5000;
const BLOCK_TIME = 180000; // 3 menit dalam milidetik

// ============================================================================
// LOGGER
// ============================================================================
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `[API-NODE] [${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/node.log' })
    ]
});

// ============================================================================
// GO BRIDGE - KONEKSI KE GO STREAM VIA UNIX SOCKET
// ============================================================================
class GoBridge {
    constructor(socketPath) {
        this.socketPath = socketPath;
        this.pendingRequests = new Map();
        this.requestCounter = 0;
    }

    async sendValidation(walletId, message = '') {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(this.socketPath);
            const txId = `tx_${Date.now()}_${++this.requestCounter}_${crypto.randomBytes(4).toString('hex')}`;
            
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(txId);
                client.destroy();
                reject(new Error('Request timeout - PIP PIP'));
            }, REQUEST_TIMEOUT);

            this.pendingRequests.set(txId, { resolve, reject, timeout });

            const request = {
                wallet_id: walletId,
                message: message,
                tx_id: txId
            };

            client.on('connect', () => {
                logger.debug(`Connected to Go for validation ${txId}`);
                client.write(JSON.stringify(request));
            });

            client.on('data', (data) => {
                clearTimeout(timeout);
                try {
                    const response = JSON.parse(data.toString());
                    const pending = this.pendingRequests.get(txId);
                    if (pending) {
                        if (response.signature && response.signature.startsWith('X11_')) {
                            pending.resolve(response);
                        } else {
                            pending.reject(new Error('Invalid signature'));
                        }
                    }
                } catch (err) {
                    const pending = this.pendingRequests.get(txId);
                    if (pending) pending.reject(err);
                } finally {
                    this.pendingRequests.delete(txId);
                    client.end();
                }
            });

            client.on('error', (err) => {
                clearTimeout(timeout);
                const pending = this.pendingRequests.get(txId);
                if (pending) pending.reject(err);
                this.pendingRequests.delete(txId);
                logger.error(`Socket error: ${err.message} | PIP PIP`);
            });
        });
    }

    async health() {
        return new Promise((resolve) => {
            const client = net.createConnection(this.socketPath, () => {
                client.end();
                resolve(true);
            });
            client.on('error', () => resolve(false));
            client.setTimeout(1000, () => {
                client.destroy();
                resolve(false);
            });
        });
    }
}

// ============================================================================
// INISIALISASI
// ============================================================================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = crypto.randomBytes(8).toString('hex');
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Initialize components
const goBridge = new GoBridge(GO_SOCKET);
const tokenomics = new Tokenomics();
const heartbeat = new Heartbeat(BLOCK_TIME);

// ============================================================================
// HEARTBEAT - 180 DETIK
// ============================================================================
heartbeat.on('beat', async (beatInfo) => {
    const stats = tokenomics.getStats();
    
    if (stats.activeValidators === 0 && stats.pendingSMS === 0) {
        // TIDAK ADA TRANSAKSI - STATUS PIP PIP
        logger.info(`[HEARTBEAT] Cycle #${beatInfo.beat} Complete: No Transactions. Status: PIP PIP`);
        await tokenomics.mintBlock(); // Block kosong
    } else {
        // ADA TRANSAKSI - STATUS PIP
        const blockData = await tokenomics.mintBlock();
        io.emit('new_block', blockData);
        logger.info(`[HEARTBEAT] Block #${blockData.header.block} Minted | Validators: ${blockData.header.validatorCount} | SMS: ${blockData.community_vault.smsCount} | Status: PIP`);
    }
});

heartbeat.start();

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
    const goHealth = await goBridge.health();
    const heartbeatStatus = heartbeat.getStatus();
    const stats = tokenomics.getStats();
    
    const status = (goHealth && heartbeatStatus.running) ? 'PIP' : 'PIP PIP';
    
    res.json({
        status: 'operational',
        timestamp: Date.now(),
        components: {
            node: 'healthy',
            go: goHealth ? 'healthy' : 'unhealthy',
            rust: goHealth ? 'connected' : 'unknown'
        },
        heartbeat: heartbeatStatus,
        tokenomics: stats,
        message: status
    });
});

// Validasi wallet + SMS
app.post('/xyron/validate', async (req, res) => {
    const startTime = Date.now();
    const { wallet_id, message } = req.body;
    
    logger.info(`Validation request from wallet: ${wallet_id}`);
    
    if (!wallet_id || wallet_id.length < 10) {
        logger.warn(`Invalid wallet ID: ${wallet_id} | PIP PIP`);
        return res.status(400).json({
            status: 'error',
            message: 'Invalid wallet ID',
            pip: 'PIP'
        });
    }
    
    try {
        // Kirim ke Go → Rust
        const goResponse = await goBridge.sendValidation(wallet_id, message || '');
        
        if (goResponse.verified && goResponse.signature) {
            // Tambah ke tokenomics
            tokenomics.addValidator(wallet_id, message, goResponse.signature);
            
            const processingTime = Date.now() - startTime;
            
            logger.info(`Wallet ${wallet_id} validated in ${processingTime}ms | Signature: ${goResponse.signature.substring(0,20)} | Status: PIP`);
            
            res.json({
                status: 'success',
                wallet_id,
                verified: true,
                signature: goResponse.signature,
                sms_encrypted: goResponse.data?.sms_encrypted || null,
                processing_time: processingTime,
                tokenomics: tokenomics.getStats(),
                message: 'PIP'
            });
        } else {
            logger.warn(`Wallet ${wallet_id} validation failed | Status: PIP PIP`);
            res.status(403).json({
                status: 'error',
                message: 'Validation failed',
                pip: 'PIP PIP'
            });
        }
    } catch (err) {
        logger.error(`Validation error: ${err.message} | PIP PIP PIP`);
        res.status(500).json({
            status: 'error',
            message: 'Internal error',
            pip: 'PIP PIP PIP'
        });
    }
});

// Tokenomics stats
app.get('/tokenomics', (req, res) => {
    res.json(tokenomics.getStats());
});

// Block history
app.get('/blocks', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const blocks = tokenomics.getBlockHistory(limit);
    res.json({
        count: blocks.length,
        blocks,
        message: 'PIP'
    });
});

// Specific block
app.get('/blocks/:block', (req, res) => {
    try {
        const blockNum = String(req.params.block).padStart(8, '0');
        const blockFile = `./history/block_${blockNum}.json`;
        const blockData = JSON.parse(fs.readFileSync(blockFile));
        res.json(blockData);
    } catch {
        res.status(404).json({ error: 'Block not found', message: 'PIP PIP' });
    }
});

// System stats
app.get('/stats', async (req, res) => {
    const goHealth = await goBridge.health();
    const heartbeatStatus = heartbeat.getStatus();
    const stats = tokenomics.getStats();
    
    res.json({
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: {
            go: goHealth ? 'connected' : 'disconnected'
        },
        heartbeat: heartbeatStatus,
        tokenomics: stats,
        message: goHealth ? 'PIP' : 'PIP PIP'
    });
});

// ============================================================================
// WEBSOCKET
// ============================================================================
io.on('connection', (socket) => {
    logger.info(`WebSocket connected: ${socket.id} | PIP`);
    
    socket.emit('connected', {
        message: 'PIP',
        timestamp: Date.now(),
        tokenomics: tokenomics.getStats()
    });
    
    socket.on('validate', async (data, callback) => {
        try {
            if (!data.wallet_id) {
                callback({ status: 'error', message: 'PIP PIP' });
                return;
            }
            
            const goResponse = await goBridge.sendValidation(data.wallet_id, data.message);
            
            if (goResponse.verified && goResponse.signature) {
                tokenomics.addValidator(data.wallet_id, data.message, goResponse.signature);
                callback({ 
                    status: 'success', 
                    message: 'PIP',
                    signature: goResponse.signature,
                    data: goResponse 
                });
            } else {
                callback({ status: 'error', message: 'PIP PIP' });
            }
        } catch (error) {
            callback({ status: 'error', message: 'PIP PIP PIP', error: error.message });
        }
    });
    
    socket.on('disconnect', () => {
        logger.info(`WebSocket disconnected: ${socket.id} | PIP PIP`);
    });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message} | PIP PIP PIP`);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        pip: 'PIP PIP PIP',
        requestId: req.requestId
    });
});

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        pip: 'PIP'
    });
});

// ============================================================================
// START SERVER
// ============================================================================
async function startServer() {
    try {
        // Pastikan folder history ada
        if (!fs.existsSync('./history')) {
            fs.mkdirSync('./history');
        }
        
        // Pastikan folder engine ada
        if (!fs.existsSync('./engine')) {
            fs.mkdirSync('./engine');
        }
        
        // Pastikan ledger_state.json ada
        if (!fs.existsSync('./engine/ledger_state.json')) {
            fs.writeFileSync('./engine/ledger_state.json', JSON.stringify({block: 0, supply: 0, lastHalving: 0}, null, 2));
        }
        
        const goHealth = await goBridge.health();
        
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║         XYRON API GATEWAY - RUNNING                        ║
║         Node.js → ${GO_SOCKET} → Go → Rust                ║
║         Heartbeat: 180s | X11-Nano: ACTIVE                ║
║         Max Supply: 12,614,400 XYR                        ║
║         Status: ${goHealth ? 'PIP' : 'PIP PIP'}                         ║
╚════════════════════════════════════════════════════════════╝
            `);
            
            logger.info(`Server listening on port ${PORT}`);
            logger.info(`Connected to Go: ${goHealth ? 'YES' : 'NO'}`);
            logger.info(`Status: ${goHealth ? 'PIP' : 'PIP PIP'}`);
        });
        
    } catch (error) {
        logger.error(`Failed to start: ${error} | PIP PIP PIP`);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down... | PIP');
    heartbeat.stop();
    httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down... | PIP');
    heartbeat.stop();
    httpServer.close(() => process.exit(0));
});

startServer();
