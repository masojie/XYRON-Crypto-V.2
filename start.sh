#!/bin/bash
# XYRON TECHNOLOGY V.2 - START SCRIPT
# Data Pipeline: Node.js → Go → Rust
# Socket: /tmp/xyron-go.sock and /tmp/xyron-core.sock

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

LOGS_DIR="logs"
RUST_SOCKET="/tmp/xyron-core.sock"
GO_SOCKET="/tmp/xyron-go.sock"

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         XYRON TECHNOLOGY V.2 - STARTING SERVICES          ║"
echo "║         Node.js → Go → Rust | Socket Bridge               ║"
echo "║         Status: PIP                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Bersihkan sisa socket lama
echo -e "${BLUE}[1/4] Membersihkan socket lama...${NC}"
rm -f /tmp/xyron-*.sock
echo -e "${GREEN}   ✅ Socket cleaned${NC}"

# Pastikan folder history ada
mkdir -p history logs

# Pastikan ledger_state.json ada
if [ ! -f server-node/engine/ledger_state.json ]; then
    echo '{"block":0,"supply":0,"lastHalving":0}' > server-node/engine/ledger_state.json
    echo -e "${GREEN}   ✅ Genesis ledger created${NC}"
fi

# 2. Jalankan Rust (Tunggu 5 detik sampai siap)
echo -e "${BLUE}[2/4] Memulai Rust Core Engine (X11-Nano)...${NC}"
cd core-rust
cargo build --release > ../logs/rust-build.log 2>&1
if [ $? -eq 0 ]; then
    ./target/release/xyron-core > ../logs/rust.log 2>&1 &
    RUST_PID=$!
    echo -e "${GREEN}   ✅ Rust Core started (PID: $RUST_PID) | Socket: $RUST_SOCKET${NC}"
else
    echo -e "${RED}   ❌ Rust Core build failed${NC}"
    exit 1
fi
cd ..

# Tunggu Rust siap
sleep 5

# 3. Jalankan Go (Tunggu 2 detik)
echo -e "${BLUE}[3/4] Memulai Go Nexus Stream...${NC}"
cd stream-go
go mod tidy > ../logs/go-tidy.log 2>&1
go build -o xyron-stream > ../logs/go-build.log 2>&1
if [ $? -eq 0 ]; then
    ./xyron-stream > ../logs/go.log 2>&1 &
    GO_PID=$!
    echo -e "${GREEN}   ✅ Go Stream started (PID: $GO_PID) | Socket: $GO_SOCKET${NC}"
else
    echo -e "${RED}   ❌ Go Stream build failed${NC}"
    exit 1
fi
cd ..

# Tunggu Go siap
sleep 2

# 4. Jalankan Node.js (Main Engine)
echo -e "${BLUE}[4/4] Memulai Node.js API Gateway...${NC}"
cd server-node
npm install > ../logs/npm-install.log 2>&1
if [ $? -eq 0 ]; then
    node server.js > ../logs/node.log 2>&1 &
    NODE_PID=$!
    echo -e "${GREEN}   ✅ Node.js Gateway started (PID: $NODE_PID) | Port: 3000${NC}"
else
    echo -e "${RED}   ❌ Node.js dependencies failed${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ALL SERVICES STARTED SUCCESSFULLY                 ║"
echo "║                                                            ║"
echo "║   DATA PIPELINE:                                           ║"
echo "║      Node.js → ${GO_SOCKET} → Go                         ║"
echo "║      Go → ${RUST_SOCKET} → Rust                          ║"
echo "║      Rust (X11-Nano) → Go → Node.js → history/           ║"
echo "║                                                            ║"
echo "║   Rust Core    : PID $RUST_PID - $RUST_SOCKET            ║"
echo "║   Go Stream    : PID $GO_PID - $GO_SOCKET                ║"
echo "║   Node Gateway : PID $NODE_PID - http://localhost:3000   ║"
echo "║                                                            ║"
echo "║   HEARTBEAT: 180 seconds                                  ║"
echo "║      • Ada transaksi → Status: PIP                        ║"
echo "║      • Tidak ada transaksi → Status: PIP PIP              ║"
echo "║                                                            ║"
echo "║   X11-NANO ENCRYPTION: AKTIF                              ║"
echo "║   SMS STORAGE: ./history/block_*.json                     ║"
echo "║                                                            ║"
echo "║   STATUS: PIP - XYRON TECHNOLOGY V.2 READY                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Press Ctrl+C to stop all services"
echo ""

# Tunggu semua proses
wait $RUST_PID $GO_PID $NODE_PID
