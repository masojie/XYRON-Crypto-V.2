#!/usr/bin/env python3
# =============================================================================
# ai-visual-full.py — XYRON AI Visual Dashboard + AI Chat Panel
# Developer: M Fauzi Nizam — Blitar, East Java, Indonesia
# =============================================================================

import os
import json
import time
import threading
import logging
from datetime import datetime
from typing import Dict, Any
import random

try:
    import requests as _requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False

try:
    from flask import Flask, jsonify, request
    _HAS_FLASK = True
except ImportError:
    _HAS_FLASK = False
    print("[ERROR] Flask tidak tersedia. Install: pip install flask requests")
    exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [AIVisual] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AIVisual")

# =============================================================================
# KONFIGURASI
# =============================================================================

DASHBOARD_PORT = 3003

SERVICES: Dict[str, Dict] = {
    "coordinator": {
        "port": 3010, "name": "AI Team Coordinator", "short": "COORDINATOR",
        "endpoint": "/health", "status": "checking",
        "last_check": None, "response_time": None, "details": None, "url_used": None,
    },
    "ai_master": {
        "port": 3002, "name": "AI Master (Nexus)", "short": "AI MASTER",
        "endpoint": "/health", "status": "checking",
        "last_check": None, "response_time": None, "details": None, "url_used": None,
    },
    "army": {
        "port": 3011, "name": "AI Army-01", "short": "AI ARMY",
        "endpoint": "/health", "status": "checking",
        "last_check": None, "response_time": None, "details": None, "url_used": None,
    },
    "core_blockchain": {
        "port": 3000, "name": "Core Blockchain", "short": "BLOCKCHAIN",
        "endpoint": "/health", "status": "checking",
        "last_check": None, "response_time": None, "details": None, "url_used": None,
    },
}

# AI Agents yang akan ngobrol
AI_AGENTS = [
    {"id": "openclaw", "name": "🦞 OpenClaw", "role": "Scout - Mengumpulkan data pasar", "color": "#16a34a"},
    {"id": "langgraph", "name": "📊 LangGraph", "role": "Analyst - Menganalisis market", "color": "#3b82f6"},
    {"id": "agentkit", "name": "🤖 AgentKit", "role": "Trader - Eksekusi order", "color": "#f59e0b"},
    {"id": "autogen", "name": "🔄 AutoGen", "role": "Coordinator - Sinkronisasi agent", "color": "#8b5cf6"},
    {"id": "crewai", "name": "👥 CrewAI", "role": "Manager - Manajemen role", "color": "#ec489a"},
]

TRIPLE_ENGINE = [
    {"name": "NLV · RUST", "latency": "342 µs"},
    {"name": "PEP · GO",   "latency": "412 µs"},
    {"name": "NCE · NODE", "latency": "856 µs"},
]

# =============================================================================
# CODESPACES DETECTION
# =============================================================================

def is_codespaces() -> bool:
    return bool(os.environ.get("CODESPACE_NAME"))

def get_service_base_url(port: int) -> str:
    codespace_name = os.environ.get("CODESPACE_NAME", "")
    if codespace_name:
        return f"https://{codespace_name}-{port}.app.github.dev"
    return f"http://localhost:{port}"

def get_env_label() -> str:
    if is_codespaces():
        name = os.environ.get("CODESPACE_NAME", "")
        short = name[:16] if len(name) > 16 else name
        return f"CODESPACES · {short}" if short else "CODESPACES"
    return "LOCALHOST · V.2"

# =============================================================================
# HEALTH CHECKER
# =============================================================================

_services_lock = threading.Lock()

class HealthChecker:
    def __init__(self):
        self._running = False
        self._thread = None

    def _check_one(self, key: str) -> Dict[str, Any]:
        svc = SERVICES[key]
        base_url = get_service_base_url(svc["port"])
        full_url = f"{base_url}{svc['endpoint']}"
        result = {"status": "offline", "response_time": None, "details": None, "url_used": full_url}

        if not _HAS_REQUESTS:
            return result

        t0 = time.time()
        try:
            r = _requests.get(full_url, timeout=5)
            ms = int((time.time() - t0) * 1000)
            if r.status_code == 200:
                result["status"] = "online"
                result["response_time"] = ms
                try:
                    result["details"] = r.json()
                except:
                    result["details"] = {"status": "ok"}
            else:
                result["status"] = "error"
                result["details"] = {"http_status": r.status_code}
        except:
            result["status"] = "offline"
        return result

    def check_all(self):
        for key in list(SERVICES.keys()):
            res = self._check_one(key)
            with _services_lock:
                SERVICES[key].update({
                    "status": res["status"],
                    "last_check": datetime.now().isoformat(),
                    "response_time": res["response_time"],
                    "details": res["details"],
                    "url_used": res["url_used"],
                })
        online = sum(1 for s in SERVICES.values() if s["status"] == "online")
        logger.info(f"Check → {online}/{len(SERVICES)} online")

    def start(self, interval: int = 5):
        if self._running:
            return
        self._running = True
        def _loop():
            self.check_all()
            while self._running:
                time.sleep(interval)
                try:
                    self.check_all()
                except:
                    pass
        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

health_checker = HealthChecker()

# =============================================================================
# AI CHAT SIMULATOR
# =============================================================================

class AIChatSimulator:
    def __init__(self):
        self._running = False
        self._thread = None
        self._messages = []
        self._agents = AI_AGENTS
        self._topics = [
            "market analysis", "blockchain data", "validator status", 
            "transaction volume", "token price", "network security",
            "mining rewards", "community activity", "X11-Nano encryption"
        ]
        self._actions = [
            "collecting data", "analyzing trend", "executing trade",
            "syncing agents", "managing roles", "validating block",
            "checking security", "updating model", "reporting status"
        ]
        
    def _generate_message(self):
        agent = random.choice(self._agents)
        topic = random.choice(self._topics)
        action = random.choice(self._actions)
        confidence = random.randint(75, 99)
        
        templates = [
            f"[{agent['name']}] 📡 {action} for {topic}... confidence: {confidence}%",
            f"[{agent['name']}] 🔍 Analysis: {topic} shows bullish pattern. confidence {confidence}%",
            f"[{agent['name']}] ⚡ {action}: {topic} data collected in {random.randint(100, 500)}ms",
            f"[{agent['name']}] 🧠 Learning: accuracy improved to {confidence}% on {topic}",
            f"[{agent['name']}] ✅ {topic} validation complete. Status: PIP",
            f"[{agent['name']}] 📊 Market report: {topic} up {random.randint(1, 5)}% today",
            f"[{agent['name']}] 🔐 X11-Nano shield active: {random.randint(11, 15)} layers",
            f"[{agent['name']}] 💬 Agent sync: {random.choice(['OpenClaw', 'LangGraph', 'AgentKit', 'AutoGen', 'CrewAI'])} reporting"
        ]
        return random.choice(templates)
    
    def _chat_loop(self):
        while self._running:
            time.sleep(random.uniform(3, 8))
            msg = self._generate_message()
            self._messages.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": msg,
                "agent": msg.split(']')[0].strip('[') if ']' in msg else "System"
            })
            if len(self._messages) > 50:
                self._messages.pop(0)
    
    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._chat_loop, daemon=True)
        self._thread.start()
        
    def stop(self):
        self._running = False
        
    def get_messages(self):
        return self._messages[-30:][::-1]  # 30 terakhir, newest first
    
    def add_user_message(self, msg: str):
        self._messages.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"👤 YOU: {msg}",
            "agent": "User"
        })

ai_chat = AIChatSimulator()

# =============================================================================
# DASHBOARD HTML
# =============================================================================

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<title>XYRON AI Dashboard · V.2</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --w:#ffffff;--off:#f7f7f6;--off2:#f0f0ee;
  --b1:#e8e8e6;--b2:#d4d4d0;
  --t1:#111110;--t2:#5a5a56;--t3:#9a9a96;
  --pip:#16a34a;--pip-bg:#f0fdf4;--pip-b:#bbf7d0;
  --pip2:#d97706;--pip2-bg:#fffbeb;--pip2-b:#fde68a;
  --pip3:#dc2626;--pip3-bg:#fef2f2;
  --r:12px;--font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
}
.dark{
  --w:#0f0f0e;--off:#181817;--off2:#1e1e1c;
  --b1:#2a2a28;--b2:#3a3a38;
  --t1:#f0f0ee;--t2:#a0a09c;--t3:#606060;
  --pip:#22c55e;--pip-bg:#052e16;--pip-b:#166534;
  --pip2:#f59e0b;--pip2-bg:#1c1200;--pip2-b:#854d0e;
  --pip3:#ef4444;--pip3-bg:#1a0000;
}
.dark body{background:#0f0f0e;}
html,body{height:100%;background:#e8e8e6;font-family:var(--font);color:var(--t1);}
.app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--w);display:flex;flex-direction:column;position:relative;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;}
.logo{font-size:13px;font-weight:600;letter-spacing:.14em;}
.net-pill{font-size:10px;font-family:var(--mono);color:var(--t3);background:var(--off);padding:4px 10px;border-radius:20px;border:1px solid var(--b1);}
.pip-live{display:flex;align-items:center;gap:5px;font-size:10px;font-family:var(--mono);color:var(--pip);}
.pip-dot{width:6px;height:6px;border-radius:50%;background:var(--pip);animation:pulse 2s infinite;}
.bal-block{padding:28px 22px 20px;text-align:center;}
.bal-label{font-size:11px;letter-spacing:.09em;color:var(--t3);}
.bal-num{font-size:44px;font-weight:400;letter-spacing:-.03em;}
.bal-num em{font-size:22px;color:var(--t3);}
.addr-chip{display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:var(--off);border:1px solid var(--b1);border-radius:20px;padding:6px 14px;font-size:12px;font-family:var(--mono);cursor:pointer;}
.section{padding:18px 22px 0;}
.sec-header{display:flex;justify-content:space-between;margin-bottom:12px;}
.sec-title{font-size:11px;letter-spacing:.08em;color:var(--t3);}
.services-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 22px;}
.svc-card{background:var(--off);border-radius:var(--r);padding:14px;border:1px solid var(--b1);}
.svc-name{font-size:13px;font-weight:500;margin-bottom:9px;}
.st-chip{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-family:var(--mono);padding:3px 9px;border-radius:20px;}
.st-online{background:var(--pip-bg);color:var(--pip);border:1px solid var(--pip-b);}
.st-offline{background:var(--pip3-bg);color:var(--pip3);border:1px solid var(--pip3-b);}
.st-checking{background:var(--pip2-bg);color:var(--pip2);border:1px solid var(--pip2-b);}
.engine-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 22px;}
.eng-item{background:var(--off);border:1px solid var(--b1);border-radius:9px;padding:11px;text-align:center;}
.eng-name{font-size:9px;color:var(--t3);}
.eng-on{font-size:10px;color:var(--pip);}
.metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 22px;}
.met-card{background:var(--off);border-radius:var(--r);padding:11px;text-align:center;border:1px solid var(--b1);}
.met-val{font-size:19px;font-weight:700;font-family:var(--mono);}
.met-lbl{font-size:9px;color:var(--t3);}
hr.div{border:none;border-top:1px solid var(--b1);margin:20px 22px;}

/* Chat Panel */
.chat-panel{background:var(--off);border-radius:var(--r);margin:0 22px 20px;border:1px solid var(--b1);overflow:hidden;}
.chat-header{padding:12px 16px;background:var(--w);border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px;}
.chat-header svg{width:18px;height:18px;stroke:var(--pip);}
.chat-messages{height:280px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;}
.chat-msg{font-size:11px;padding:8px 12px;border-radius:12px;max-width:95%;word-break:break-word;}
.chat-msg-agent{background:var(--w);border:1px solid var(--b1);color:var(--t1);align-self:flex-start;}
.chat-msg-user{background:var(--pip-bg);border:1px solid var(--pip-b);color:var(--pip);align-self:flex-end;}
.chat-time{font-size:9px;color:var(--t3);margin-bottom:2px;font-family:var(--mono);}
.chat-input-area{display:flex;padding:12px;border-top:1px solid var(--b1);gap:8px;}
.chat-input{flex:1;padding:10px 12px;border:1px solid var(--b1);border-radius:20px;background:var(--w);font-size:12px;font-family:var(--font);outline:none;}
.chat-send{background:var(--t1);border:none;border-radius:20px;padding:8px 16px;color:var(--w);font-size:12px;font-weight:500;cursor:pointer;}
.bot-nav{margin-top:auto;border-top:1px solid var(--b1);display:grid;grid-template-columns:repeat(4,1fr);padding:8px 0 18px;}
.nav-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;}
.nav-btn svg{width:20px;height:20px;stroke:var(--t3);}
.nav-btn span{font-size:10px;color:var(--t3);}
.nav-btn.on svg{stroke:var(--t1);}
.nav-btn.on span{color:var(--t1);}
.toast{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:var(--t1);color:var(--w);padding:10px 18px;border-radius:24px;font-size:12px;opacity:0;transition:all .12s;pointer-events:none;z-index:300;}
.toast.on{opacity:1;}

@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
</style>
</head>
<body>
<div class="app" id="app">

  <div class="topbar">
    <div class="logo">XYRON</div>
    <div style="display:flex;gap:8px;">
      <div class="pip-live"><div class="pip-dot"></div><span id="live-label">AI TEAM</span></div>
      <button onclick="toggleDark()" style="width:30px;height:30px;border-radius:50%;border:1px solid var(--b1);background:var(--off);"><svg id="dark-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
      <div class="net-pill" id="env-badge">LOADING...</div>
    </div>
  </div>

  <div class="bal-block">
    <div class="bal-label">AI ECOSYSTEM STATUS</div>
    <div class="bal-num"><span id="online-count">0</span><em>/4</em></div>
    <div class="addr-chip" onclick="doRefresh()"><svg width="12" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg><span>Refresh</span></div>
  </div>

  <div class="services-grid" id="services-grid"></div>

  <hr class="div"/>
  <div class="section"><div class="sec-header"><span class="sec-title">🤖 AI AGENTS CHAT</span></div></div>
  
  <div class="chat-panel">
    <div class="chat-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span style="font-size:12px;font-weight:500;">AI Agents Live Conversation</span>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="chat-msg chat-msg-agent"><div class="chat-time">System</div>🔄 Loading AI agents...</div>
    </div>
    <div class="chat-input-area">
      <input type="text" class="chat-input" id="chat-input" placeholder="Ask the AI team..."/>
      <button class="chat-send" onclick="sendMessage()">Send</button>
    </div>
  </div>

  <hr class="div"/>
  <div class="section"><div class="sec-header"><span class="sec-title">TRIPLE-ENGINE</span></div></div>
  <div class="engine-bar" id="engine-bar"></div>

  <div class="metrics-row">
    <div class="met-card"><div class="met-val" id="m-online">0</div><div class="met-lbl">ONLINE</div></div>
    <div class="met-card"><div class="met-val" id="m-avg">–</div><div class="met-lbl">AVG ms</div></div>
    <div class="met-card"><div class="met-val" id="m-uptime">–</div><div class="met-lbl">UPTIME%</div></div>
    <div class="met-card"><div class="met-val" id="m-last">–</div><div class="met-lbl">LAST</div></div>
  </div>

  <div class="bot-nav">
    <button class="nav-btn on" onclick="switchTab('home')" data-nav="home"><svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/></svg><span>Dashboard</span></button>
    <button class="nav-btn" onclick="switchTab('chat')" data-nav="chat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Chat</span></button>
    <button class="nav-btn" onclick="switchTab('agents')" data-nav="agents"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><span>Agents</span></button>
    <button class="nav-btn" onclick="switchTab('about')" data-nav="about"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg><span>About</span></button>
  </div>
</div>

<div class="toast" id="toast"><span id="toast-msg">Refreshing...</span></div>

<script>
const SERVICES_META = __SERVICES_META__;
const TRIPLE_ENGINE = __TRIPLE_ENGINE__;
const ENV_LABEL = "__ENV_LABEL__";

let _data = {};
let _lastUpdate = null;
let _darkMode = localStorage.getItem('dark') === '1';
let _activePage = 'home';

function applyDark(v) {
  document.documentElement.classList.toggle('dark', v);
  const ic = document.getElementById('dark-icon');
  if(ic) ic.innerHTML = v ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
}
function toggleDark() { _darkMode = !_darkMode; localStorage.setItem('dark', _darkMode ? '1' : '0'); applyDark(_darkMode); }
applyDark(_darkMode);

function switchTab(tab) {
  _activePage = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.nav === tab));
  if(tab === 'agents') renderAgents();
}
function renderAgents() {
  const agents = [
    {name:"OpenClaw", role:"Scout - Collecting data", icon:"🦞", color:"#16a34a"},
    {name:"LangGraph", role:"Analyst - Analyzing market", icon:"📊", color:"#3b82f6"},
    {name:"AgentKit", role:"Trader - Executing orders", icon:"🤖", color:"#f59e0b"},
    {name:"AutoGen", role:"Coordinator - Syncing agents", icon:"🔄", color:"#8b5cf6"},
    {name:"CrewAI", role:"Manager - Managing roles", icon:"👥", color:"#ec489a"}
  ];
  let html = '<div style="padding:0 22px">';
  agents.forEach(a => {
    html += `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)">
      <span style="font-size:1.5rem">${a.icon}</span>
      <div>
        <div style="font-weight:600;color:${a.color}">${a.name}</div>
        <div style="font-size:.8rem;color:var(--txt2)">${a.role}</div>
      </div>
    </div>`;
  });
  html += '</div>';
  const el = document.getElementById('agents-list');
  if(el) el.innerHTML = html;
}

async function fetchData() {
  try {
    const r = await fetch('/api/status');
    if(!r.ok) return;
    _data = await r.json();
    _lastUpdate = new Date();
    document.getElementById('update-time').textContent = _lastUpdate.toLocaleTimeString();
  } catch(e) {}
}

async function fetchChat() {
  try {
    const r = await fetch('/api/chat');
    if(!r.ok) return;
    const msgs = await r.json();
    const el = document.getElementById('chat-feed');
    if(!el) return;
    el.innerHTML = msgs.map(m => `<div style="padding:4px 0;border-bottom:1px solid var(--bdr);font-size:.82rem">
      <span style="color:var(--txt2)">${m.timestamp}</span>
      <span style="margin-left:8px">${m.message}</span>
    </div>`).join('');
  } catch(e) {}
}

fetchData();
fetchChat();
setInterval(fetchData, 5000);
setInterval(fetchChat, 3000);
</script>
</body>
</html>
"""

# =============================================================================
# FLASK APP
# =============================================================================

app = Flask(__name__)

@app.route('/')
def dashboard():
    html = DASHBOARD_HTML.replace('__ENV_LABEL__', 'Replit')
    return html

def get_system_metrics() -> Dict[str, Any]:
    return {
        "timestamp": datetime.now().isoformat(),
        "online_services": sum(1 for s in SERVICES.values() if s.get("status") == "online"),
        "total_services": len(SERVICES),
    }

@app.route('/api/status')
def api_status():
    health_checker.check_all()
    return jsonify({
        "services": SERVICES,
        "system": get_system_metrics(),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/chat')
def api_chat():
    return jsonify(ai_chat.get_messages())

@app.route('/api/chat', methods=['POST'])
def api_chat_post():
    data = request.get_json(silent=True) or {}
    msg = data.get('message', '').strip()
    if msg:
        ai_chat.add_user_message(msg)
    return jsonify({"ok": True})

@app.route('/health')
def health():
    return jsonify({"status": "PIP", "service": "AIVisual"})

if __name__ == '__main__':
    logger.info(f"[AIVisual] Starting dashboard on port {DASHBOARD_PORT}")
    ai_chat.start()
    app.run(host='0.0.0.0', port=DASHBOARD_PORT, debug=False)
