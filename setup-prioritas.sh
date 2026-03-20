#!/bin/bash
# AUTO SETUP PRIORITAS 1 & 2 - XYRON STABIL!

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   SETUP PRIORITAS 1 & 2 - MONITOR + PM2                  ║"
echo "║   XYRON Technology V.2 - Stabil 24/7                     ║"
echo "╚════════════════════════════════════════════════════════════╝"

# ==============================================
# 1. INSTALL PM2 (Process Manager)
# ==============================================
echo "📦 [1/6] Installing PM2..."
npm install -g pm2
echo "✅ PM2 installed"

# ==============================================
# 2. BUAT FILE ECOSYSTEM UNTUK PM2
# ==============================================
echo "📝 [2/6] Creating PM2 ecosystem file..."

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'xyron-rust',
      cwd: '/workspaces/XYRON-Crypto-V.2/core-rust',
      script: './target/release/xyron-core',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/rust.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/rust-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/rust-out.log',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: 10000,
    },
    {
      name: 'xyron-go',
      cwd: '/workspaces/XYRON-Crypto-V.2/stream-go',
      script: './xyron-stream',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/go.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/go-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/go-out.log',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: 10000,
    },
    {
      name: 'xyron-node',
      cwd: '/workspaces/XYRON-Crypto-V.2/server-node',
      script: 'server.js',
      interpreter: 'node',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/node.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/node-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/node-out.log',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
