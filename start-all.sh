#!/bin/bash
# ⚔️ XYRON AI COMMAND - START ALL SYSTEMS
# 🚀 Launch XYRON Blockchain + AI Nexus + 3 ARMY Guardians

# Auto-detect root path (Replit friendly)
ROOT=$(pwd)

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚔️ XYRON AI COMMAND - STARTING ALL SYSTEMS                 ║"
echo "║  📁 Root: $ROOT"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Buat folder log jika belum ada
mkdir -p "$ROOT/ai-logs" "$ROOT/logs" "$ROOT/history"

# ============================================================
# 1. Start XYRON Blockchain Core (Rust + Go + Node.js)
# ============================================================
echo "🟢 Starting XYRON Blockchain Core..."
cd "$ROOT"
bash start.sh > "$ROOT/logs/blockchain.log" 2>&1 &
XYRON_PID=$!
echo "   ✅ Blockchain started (PID: $XYRON_PID)"
echo "   ⏳ Tunggu 10 detik sampai blockchain siap..."
sleep 10

# ============================================================
# 2. Start AI Nexus V3 (Mining Helper - PALING PENTING)
# ============================================================
echo ""
echo "🧠 Starting AI Nexus V3 (Mining Helper)..."
cd "$ROOT/ai-master-5agents"
python3 xyron-nexus-live.py > "$ROOT/ai-logs/nexus.log" 2>&1 &
NEXUS_PID=$!
echo "   ✅ AI Nexus V3 started (PID: $NEXUS_PID)"
sleep 3

# ============================================================
# 3. Start ARMY-01 (Network Guardian)
# ============================================================
echo ""
echo "🛡️ Starting ARMY-01 (Network Guardian)..."
cd "$ROOT/ai-army"
python3 army-01-v2.py > "$ROOT/ai-logs/army-01.log" 2>&1 &
ARMY01_PID=$!
echo "   ✅ ARMY-01 started (PID: $ARMY01_PID)"
sleep 2

# ============================================================
# 4. Start ARMY-02 (Transaction Guardian)
# ============================================================
echo ""
echo "🔍 Starting ARMY-02 (Transaction Guardian)..."
python3 army-02.py > "$ROOT/ai-logs/army-02.log" 2>&1 &
ARMY02_PID=$!
echo "   ✅ ARMY-02 started (PID: $ARMY02_PID)"
sleep 2

# ============================================================
# 5. Start ARMY-03 (AI Guardian)
# ============================================================
echo ""
echo "🤖 Starting ARMY-03 (AI Guardian)..."
python3 army-03.py > "$ROOT/ai-logs/army-03.log" 2>&1 &
ARMY03_PID=$!
echo "   ✅ ARMY-03 started (PID: $ARMY03_PID)"
sleep 2

# ============================================================
# 6. Start AI Visual Dashboard
# ============================================================
echo ""
echo "🎨 Starting AI Visual Dashboard..."
cd "$ROOT/ai-visual"
python3 ai-visual-full.py > "$ROOT/ai-logs/visual.log" 2>&1 &
VISUAL_PID=$!
echo "   ✅ AI Visual started (PID: $VISUAL_PID)"

# ============================================================
# SEMUA SISTEM AKTIF
# ============================================================
cd "$ROOT"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL SYSTEMS OPERATIONAL! STATUS: PIP                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🟢 Blockchain Core  : PID $XYRON_PID                        ║"
echo "║  🧠 AI Nexus V3      : PID $NEXUS_PID                        ║"
echo "║  🛡️ ARMY-01          : PID $ARMY01_PID                       ║"
echo "║  🔍 ARMY-02          : PID $ARMY02_PID                       ║"
echo "║  🤖 ARMY-03          : PID $ARMY03_PID                       ║"
echo "║  🎨 AI Visual        : PID $VISUAL_PID                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🌐 API          : http://localhost:5000                     ║"
echo "║  🧠 AI Dashboard : http://localhost:3002                     ║"
echo "║  🎨 AI Visual    : http://localhost:3003                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📋 Cek logs:                                                ║"
echo "║     tail -f logs/blockchain.log                              ║"
echo "║     tail -f ai-logs/nexus.log                               ║"
echo "║     tail -f ai-logs/army-01.log                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🛑 Stop semua: pkill -f 'node\|python3\|xyron'             ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Tunggu semua proses
wait
