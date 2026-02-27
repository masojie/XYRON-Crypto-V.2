.PHONY: help all build run clean logs status

COLOR_GREEN := \033[0;32m
COLOR_BLUE := \033[0;34m
COLOR_YELLOW := \033[1;33m
COLOR_RED := \033[0;31m
COLOR_NC := \033[0m

help:
	@echo "$(COLOR_BLUE)╔════════════════════════════════════════════════════════════╗$(COLOR_NC)"
	@echo "$(COLOR_BLUE)║         XYRON TECHNOLOGY V.2 - MAKE COMMANDS              ║$(COLOR_NC)"
	@echo "$(COLOR_BLUE)╚════════════════════════════════════════════════════════════╝$(COLOR_NC)"
	@echo ""
	@echo "$(COLOR_YELLOW)Available commands:$(COLOR_NC)"
	@echo "  $(COLOR_GREEN)make all$(COLOR_NC)      - Build semua komponen"
	@echo "  $(COLOR_GREEN)make run$(COLOR_NC)      - Jalankan semua services"
	@echo "  $(COLOR_GREEN)make clean$(COLOR_NC)    - Bersihkan build"
	@echo "  $(COLOR_GREEN)make logs$(COLOR_NC)     - Lihat logs"
	@echo "  $(COLOR_GREEN)make status$(COLOR_NC)   - Cek status services"
	@echo ""

all:
	@echo "$(COLOR_BLUE)📦 Building XYRON components...$(COLOR_NC)"
	@mkdir -p logs engine history
	
	@cd core-rust && cargo build --release > ../logs/rust-build.log 2>&1 && \
		echo "$(COLOR_GREEN)   ✅ Rust Core built$(COLOR_NC)" || \
		echo "$(COLOR_RED)   ❌ Rust Core failed$(COLOR_NC)"
	
	@cd stream-go && go mod tidy > ../logs/go-tidy.log 2>&1 && \
		go build -o xyron-stream > ../logs/go-build.log 2>&1 && \
		echo "$(COLOR_GREEN)   ✅ Go Stream built$(COLOR_NC)" || \
		echo "$(COLOR_RED)   ❌ Go Stream failed$(COLOR_NC)"
	
	@cd server-node && npm install --silent > ../logs/npm-install.log 2>&1 && \
		echo "$(COLOR_GREEN)   ✅ Node dependencies installed$(COLOR_NC)" || \
		echo "$(COLOR_RED)   ❌ Node dependencies failed$(COLOR_NC)"
	
	@echo "$(COLOR_GREEN)✨ Build complete | PIP$(COLOR_NC)"

run:
	@echo "$(COLOR_BLUE)🚀 Starting XYRON services...$(COLOR_NC)"
	@mkdir -p logs engine history
	@rm -f /tmp/xyron-*.sock
	
	@if [ ! -f engine/ledger_state.json ]; then \
		echo '{"block":0,"supply":0,"lastHalving":0}' > engine/ledger_state.json; \
	fi
	
	@cd core-rust && RUST_LOG=info cargo run --release > ../logs/rust.log 2>&1 &
	@sleep 3
	@cd stream-go && ./xyron-stream > ../logs/go.log 2>&1 &
	@sleep 2
	@cd server-node && npm start > ../logs/node.log 2>&1 &
	@sleep 2
	
	@echo "$(COLOR_GREEN)✅ All services started | PIP$(COLOR_NC)"
	@echo "$(COLOR_BLUE)📡 API: http://localhost:3000$(COLOR_NC)"
	@echo "$(COLOR_YELLOW)⏱️  Block time: 180 seconds$(COLOR_NC)"
	@echo "$(COLOR_YELLOW)Press Ctrl+C to stop$(COLOR_NC)"
	@tail -f logs/*.log 2>/dev/null

clean:
	@echo "$(COLOR_YELLOW)🧹 Cleaning...$(COLOR_NC)"
	@-pkill -f "cargo run" 2>/dev/null
	@-pkill -f "xyron-stream" 2>/dev/null
	@-pkill -f "node" 2>/dev/null
	@rm -f /tmp/xyron-*.sock
	@cd core-rust && cargo clean > /dev/null 2>&1
	@cd stream-go && rm -f xyron-stream > /dev/null 2>&1
	@rm -rf server-node/node_modules > /dev/null 2>&1
	@echo "$(COLOR_GREEN)✅ Clean complete | PIP$(COLOR_NC)"

logs:
	@tail -f logs/*.log 2>/dev/null

status:
	@echo "$(COLOR_BLUE)📊 System Status:$(COLOR_NC)"
	@pgrep -f "cargo run" > /dev/null && echo "  $(COLOR_GREEN)✅ Rust Core: RUNNING$(COLOR_NC)" || echo "  $(COLOR_RED)❌ Rust Core: STOPPED$(COLOR_NC)"
	@pgrep -f "xyron-stream" > /dev/null && echo "  $(COLOR_GREEN)✅ Go Stream: RUNNING$(COLOR_NC)" || echo "  $(COLOR_RED)❌ Go Stream: STOPPED$(COLOR_NC)"
	@pgrep -f "node" | grep -v make > /dev/null && echo "  $(COLOR_GREEN)✅ Node Gateway: RUNNING$(COLOR_NC)" || echo "  $(COLOR_RED)❌ Node Gateway: STOPPED$(COLOR_NC)"
	@[ -e /tmp/xyron-core.sock ] && echo "  $(COLOR_GREEN)🔌 Rust Socket: ACTIVE$(COLOR_NC)" || echo "  $(COLOR_RED)🔌 Rust Socket: INACTIVE$(COLOR_NC)"
	@[ -e /tmp/xyron-go.sock ] && echo "  $(COLOR_GREEN)🔌 Go Socket: ACTIVE$(COLOR_NC)" || echo "  $(COLOR_RED)🔌 Go Socket: INACTIVE$(COLOR_NC)"
	
	@if pgrep -f "cargo run" && pgrep -f "xyron-stream" && pgrep -f "node"; then \
		echo "$(COLOR_GREEN)✨ Overall Status: PIP$(COLOR_NC)"; \
	else \
		echo "$(COLOR_RED)✨ Overall Status: PIP PIP$(COLOR_NC)"; \
	fi

.DEFAULT_GOAL := help
