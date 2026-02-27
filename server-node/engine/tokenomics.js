// ============================================================================
// XYRON TOKENOMICS ENGINE
// Max Supply: 12,614,400 XYR (TERKUNCI)
// Block Time: 180 detik
// Initial Reward: 36 XYR per block
// Halving: Setiap 175,200 blocks (~1 tahun)
// SMS Inscribe: Permanen di history/ dengan signature X11-Nano
// ============================================================================

const fs = require('fs');
const path = require('fs').promises;
const EventEmitter = require('events');

class Tokenomics extends EventEmitter {
    constructor() {
        super();
        this.config = {
            maxSupply: 12614400,           // 12,614,400 XYR (TERKUNCI)
            initialReward: 36,              // 36 XYR per block
            blockTime: 180000,               // 180 detik
            halvingInterval: 175200          // ~1 tahun (175200 blocks)
        };
        
        this.state = this.loadGenesis();
        this.activeNodes = new Set();
        this.pendingSMS = [];
        this.historyDir = './history';
        this.validationCount = 0;
    }

    loadGenesis() {
        const genesisPath = './engine/ledger_state.json';
        try {
            if (fs.existsSync(genesisPath)) {
                const data = JSON.parse(fs.readFileSync(genesisPath));
                console.log('[TOKENOMICS] Genesis loaded: Block %d, Supply %d XYR', 
                    data.block, data.supply);
                return data;
            }
        } catch (err) {
            console.error('[TOKENOMICS] Error loading genesis:', err.message);
        }
        
        // Create genesis if not exists
        const genesis = { block: 0, supply: 0, lastHalving: 0 };
        fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2));
        console.log('[TOKENOMICS] Genesis created: Block 0, Supply 0 XYR');
        return genesis;
    }

    async ensureHistoryDir() {
        try {
            await path.mkdir(this.historyDir, { recursive: true });
        } catch (err) {
            // Ignore if exists
        }
    }

    // Add validator HANYA jika memiliki signature dari Rust
    addValidator(walletId, message = null, signature = null) {
        // Tolak jika ada message tapi tidak ada signature
        if (message && !signature) {
            console.log('[TOKENOMICS] ⚠️ Rejected SMS without signature from wallet: %s | Status: PIP PIP', 
                walletId.substring(0, 8));
            return "PIP PIP";
        }
        
        // Validasi signature format (harus dari Rust)
        if (signature && !signature.startsWith('X11_')) {
            console.log('[TOKENOMICS] ⚠️ Invalid signature format from wallet: %s | Status: PIP PIP', 
                walletId.substring(0, 8));
            return "PIP PIP";
        }
        
        this.activeNodes.add(walletId);
        this.validationCount++;
        
        if (message && signature) {
            // SMS sudah dienkripsi oleh Rust, simpan dengan signature
            this.pendingSMS.push({
                from: walletId,
                text: message,
                signature: signature,
                timestamp: new Date().toISOString(),
                encrypted: true
            });
            console.log('[TOKENOMICS] 📝 SMS inscribed with signature: %s', signature.substring(0, 20));
        }
        
        console.log('[TOKENOMICS] Validator added: %s | Active: %d | SMS: %d | Status: PIP',
            walletId.substring(0, 8), this.activeNodes.size, this.pendingSMS.length);
        
        return "PIP";
    }

    calculateReward() {
        const halvingCount = Math.floor(this.state.block / this.config.halvingInterval);
        const reward = this.config.initialReward / Math.pow(2, halvingCount);
        // Pastikan tidak melebihi max supply
        if (this.state.supply + reward > this.config.maxSupply) {
            return this.config.maxSupply - this.state.supply;
        }
        return reward;
    }

    async mintBlock() {
        await this.ensureHistoryDir();
        
        this.state.block++;
        const reward = this.calculateReward();
        const nodes = Array.from(this.activeNodes);
        const hasActivity = nodes.length > 0 || this.pendingSMS.length > 0;
        
        // Reward hanya jika ada aktivitas
        const totalReward = hasActivity ? reward : 0;
        
        // Update supply (TERKUNCI)
        this.state.supply += totalReward;
        if (this.state.supply > this.config.maxSupply) {
            this.state.supply = this.config.maxSupply;
        }
        
        // Cek halving
        const halvingCount = Math.floor(this.state.block / this.config.halvingInterval);
        if (halvingCount > this.state.lastHalving) {
            this.state.lastHalving = halvingCount;
            console.log('[TOKENOMICS] 🔄 HALVING! Reward sekarang: %d XYR', 
                this.config.initialReward / Math.pow(2, halvingCount));
        }
        
        const blockData = {
            header: {
                block: this.state.block,
                timestamp: new Date().toISOString(),
                reward: totalReward,
                validatorCount: nodes.length,
                hasActivity: hasActivity,
                supply: this.state.supply,
                maxSupply: this.config.maxSupply
            },
            rewards: {
                total: totalReward,
                perValidator: nodes.length > 0 ? totalReward / nodes.length : 0,
                validators: nodes
            },
            community_vault: {
                smsCount: this.pendingSMS.length,
                messages: this.pendingSMS.map(sms => ({
                    from: sms.from,
                    text: sms.text,
                    signature: sms.signature,
                    timestamp: sms.timestamp,
                    encrypted: true
                }))
            }
        };

        // Save block to history (PERMANEN)
        const blockFile = `${this.historyDir}/block_${String(this.state.block).padStart(8, '0')}.json`;
        fs.writeFileSync(blockFile, JSON.stringify(blockData, null, 2));

        // Update state
        fs.writeFileSync('./engine/ledger_state.json', JSON.stringify(this.state, null, 2));

        const status = hasActivity ? 'PIP' : 'PIP PIP';
        
        console.log('\n[TOKENOMICS] 📦 BLOCK #%d MINTED', this.state.block);
        console.log('   Reward: %d XYR', totalReward);
        console.log('   Validators: %d', nodes.length);
        console.log('   SMS Messages: %d', this.pendingSMS.length);
        console.log('   Supply: %d / %d XYR', this.state.supply, this.config.maxSupply);
        console.log('   Status: %s\n', status);

        // Emit event for listeners
        this.emit('blockMinted', blockData);

        // Reset untuk block berikutnya
        this.activeNodes.clear();
        this.pendingSMS = [];
        this.validationCount = 0;

        return blockData;
    }

    getStats() {
        const halvingCount = Math.floor(this.state.block / this.config.halvingInterval);
        const currentReward = this.config.initialReward / Math.pow(2, halvingCount);
        const blocksUntilHalving = this.config.halvingInterval - 
            (this.state.block % this.config.halvingInterval);
        const supplyLeft = this.config.maxSupply - this.state.supply;

        return {
            block: this.state.block,
            supply: this.state.supply,
            maxSupply: this.config.maxSupply,
            supplyLeft: supplyLeft,
            supplyPercentage: ((this.state.supply / this.config.maxSupply) * 100).toFixed(2),
            currentReward: currentReward,
            halvingCount: halvingCount,
            blocksUntilHalving: blocksUntilHalving,
            activeValidators: this.activeNodes.size,
            pendingSMS: this.pendingSMS.length,
            validationCount: this.validationCount,
            blockTime: this.config.blockTime,
            status: this.activeNodes.size > 0 ? 'PIP' : 'PIP PIP'
        };
    }

    getBlockHistory(limit = 10) {
        const blocks = [];
        try {
            const files = fs.readdirSync(this.historyDir)
                .filter(f => f.startsWith('block_'))
                .sort()
                .reverse()
                .slice(0, limit);
            
            for (const file of files) {
                const data = fs.readFileSync(`${this.historyDir}/${file}`);
                blocks.push(JSON.parse(data));
            }
        } catch (err) {
            console.error('[TOKENOMICS] Error reading history:', err.message);
        }
        return blocks;
    }
}

module.exports = Tokenomics;
