#!/bin/bash
while true; do
    if [ ! -S /tmp/xyron-core.sock ]; then
        echo "$(date) - Rust core mati, restarting..." >> logs/monitor.log
        cd /workspaces/XYRON-Crypto-V.2/core-rust && ./target/release/xyron-core &
    fi
    if [ ! -S /tmp/xyron-go.sock ]; then
        echo "$(date) - Go stream mati, restarting..." >> logs/monitor.log
        cd /workspaces/XYRON-Crypto-V.2/stream-go && ./xyron-stream &
    fi
    sleep 30
done
