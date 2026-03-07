#!/bin/bash
echo "🚀 AUTO SETUP XYRON - TINGGAL JALAN!"

# Install Rust
echo "📦 Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Fix Cargo.toml
echo "🔧 Fixing Cargo.toml..."
cd core-rust
sed -i 's/default = \["jemalloc"\]/default = []/' Cargo.toml
cd ..

# Build Rust
echo "🦀 Building Rust Core (5 menit)..."
cd core-rust && cargo build --release && cd ..

# Install Go
echo "📦 Installing Go..."
wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# Build Go
echo "🐹 Building Go Stream..."
cd stream-go && go build -o xyron-stream && cd ..

# Install Node
echo "📡 Installing Node dependencies..."
cd server-node && npm install && cd ..

# Jalankan
echo "🚀 Menjalankan XYRON..."
./start.sh
