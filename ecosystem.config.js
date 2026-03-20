module.exports = {
  apps: [
    {
      name: 'xyron-rust',
      cwd: '/workspaces/XYRON-Crypto-V.2/core-rust',
      script: './target/release/xyron-core',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/rust.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/rust-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/rust-out.log',
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'xyron-go',
      cwd: '/workspaces/XYRON-Crypto-V.2/stream-go',
      script: './xyron-stream',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/go.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/go-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/go-out.log',
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'xyron-node',
      cwd: '/workspaces/XYRON-Crypto-V.2/server-node',
      script: 'server.js',
      interpreter: 'node',
      log_file: '/workspaces/XYRON-Crypto-V.2/logs/node.log',
      error_file: '/workspaces/XYRON-Crypto-V.2/logs/node-error.log',
      out_file: '/workspaces/XYRON-Crypto-V.2/logs/node-out.log',
      autorestart: true,
      restart_delay: 5000,
      env: { PORT: 3000 }
    }
  ]
};
