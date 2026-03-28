#!/bin/bash
# ⚔️ XYRON AI COMMAND - START ALL SYSTEMS

ROOT=$(pwd)

echo "╔══════════════════════════════════════════╗"
echo "║  ⚔️ XYRON AI COMMAND - STARTING ALL     ║"
echo "╚══════════════════════════════════════════╝"

mkdir -p "$ROOT/ai-logs" "$ROOT/logs" "$ROOT/history"

echo "🟢 Starting Blockchain Core..."
cd "$ROOT"
bash start.sh > "$ROOT/logs/blockchain.log" 2>&1 &
XYRON_PID=$!
echo "   ✅ PID: $XYRON_PID"
sleep 10

echo "🧠 Starting AI Nexus V3..."
cd "$ROOT/ai-master-5agents"
python3 xyron-nexus-live.py > "$ROOT/ai-logs/nexus.log" 2>&1 &
NEXUS_PID=$!
echo "   ✅ PID: $NEXUS_PID"
sleep 3

echo "🛡️ Starting ARMY-01..."
cd "$ROOT/ai-army"
python3 army-01-v2.py > "$ROOT/ai-logs/army-01.log" 2>&1 &
ARMY01_PID=$!
sleep 2

echo "🔍 Starting ARMY-02..."
python3 army-02.py > "$ROOT/ai-logs/army-02.log" 2>&1 &
ARMY02_PID=$!
sleep 2

echo "🤖 Starting ARMY-03..."
python3 army-03.py > "$ROOT/ai-logs/army-03.log" 2>&1 &
ARMY03_PID=$!
sleep 2

cd "$ROOT"
echo ""
echo "✅ ALL SYSTEMS OPERATIONAL — PIP"
echo "Blockchain: $XYRON_PID | Nexus: $NEXUS_PID | ARMY: $ARMY01_PID $ARMY02_PID $ARMY03_PID"
wait
