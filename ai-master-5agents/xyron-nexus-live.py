#!/usr/bin/env python3
"""
🔗 XYRON-NEXUS AI BRAIN V3 - FULL INTEGRATION
✅ Mining | Smart Trader | X11-Nano Vault | Jaringan Stabil
✅ Private key AMAN di vault | PIN transaksi | Cache & Retry
"""

import json
import time
import threading
import requests
import os
import random
import hashlib
import socket
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ==================== WIB TIMEZONE ====================
WIB = timezone(timedelta(hours=7))

def get_wib_time():
    return datetime.now(WIB)

def get_wib_str():
    return get_wib_time().strftime('%H:%M:%S')

def get_wib_full():
    return get_wib_time().strftime('%Y-%m-%d %H:%M:%S')

def get_wib_date():
    return get_wib_time().strftime('%d %B %Y')

def get_wib_day():
    days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    return days[get_wib_time().weekday()]

# ==================== STABILISASI JARINGAN ====================
session = requests.Session()
retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
session.mount('http://', adapter)
session.mount('https://', adapter)

bitcoin_cache = {"hashrate": 850, "last_update": 0}

def get_bitcoin_hashrate():
    """Ambil data Bitcoin dengan cache 5 menit"""
    global bitcoin_cache
    now = time.time()
    if now - bitcoin_cache["last_update"] < 300:
        return bitcoin_cache["hashrate"]
    try:
        r = session.get("https://blockchain.info/q/hashrate", timeout=5)
        if r.status_code == 200:
            bitcoin_cache["hashrate"] = int(r.text) / 1e12
            bitcoin_cache["last_update"] = now
    except:
        pass
    return bitcoin_cache["hashrate"]

# ==================== KONEKSI KE X11-NANO VAULT ====================
VAULT_SOCKET = "/tmp/xyron-core.sock"

def request_vault(action, data=None, pin=None):
    """Kirim request ke X11-Nano Vault via socket (Unix Socket, latensi <1ms)"""
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect(VAULT_SOCKET)
        msg = {"action": action}
        if data:
            msg["data"] = data
        if pin:
            msg["pin"] = pin
        sock.send(json.dumps(msg).encode())
        response = sock.recv(4096).decode()
        sock.close()
        return json.loads(response)
    except Exception as e:
        return {"status": "error", "message": str(e)}

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    PURPLE = '\033[95m'
    BLUE = '\033[94m'
    GOLD = '\033[93m'
    WHITE = '\033[97m'
    END = '\033[0m'
    BOLD = '\033[1m'

class SmartTraderV3:
    def __init__(self, name, initial_balance=25, wallet_id=None):
        self.name = name
        self.wallet_id = wallet_id or f"ai_{name.lower()}_{random.randint(1000,9999)}"
        self.pin = None
        self.balance = initial_balance
        self.portfolio = []
        self.memory = []
        self.trades = []
        self.wins = 0
        self.losses = 0
        self.total_profit = 0
        self.last_price = 1.0
        self.mood = "neutral"
        self.confidence = 50
        self.daily_trades = 0
        self.data_path = "/home/runner/workspace/ai-logs"
        
        os.makedirs(self.data_path, exist_ok=True)
        self.load_memory()
        self.register_to_vault()
    
    def register_to_vault(self):
        if not self.pin:
            self.pin = str(random.randint(1000, 9999))
        result = request_vault("register_ai", {"ai_id": self.wallet_id}, self.pin)
        if result.get("status") == "success":
            print(f"{Colors.GREEN}✅ Registered to Vault | PIN: {self.pin}{Colors.END}")
        else:
            print(f"{Colors.YELLOW}⚠️ Vault not ready, using simulation{Colors.END}")
    
    def sync_balance(self):
        result = request_vault("get_balance", {"wallet_id": self.wallet_id})
        if result.get("status") == "success":
            self.balance = result.get("balance", self.balance)
        return self.balance
    
    def load_memory(self):
        try:
            with open(f"{self.data_path}/trader-memory-v3.json", 'r') as f:
                data = json.load(f)
                self.memory = data.get('memory', [])
                self.trades = data.get('trades', [])
                self.wins = data.get('wins', 0)
                self.losses = data.get('losses', 0)
                self.total_profit = data.get('total_profit', 0)
        except:
            pass
    
    def save_memory(self):
        with open(f"{self.data_path}/trader-memory-v3.json", 'w') as f:
            json.dump({
                'memory': self.memory[-10000:],
                'trades': self.trades[-5000:],
                'wins': self.wins,
                'losses': self.losses,
                'total_profit': self.total_profit,
                'wallet_id': self.wallet_id,
                'last_update': get_wib_full()
            }, f, indent=2)
    
    def analyze_market(self, price, price_history, btc_trend=0):
        if len(price_history) >= 5:
            trend = (price_history[-1] - price_history[-5]) / price_history[-5] * 100
        else:
            trend = 0
        
        similar_trades = [t for t in self.memory if abs(t.get('price', 0) - price) / price < 0.05]
        
        if similar_trades:
            win_rate = sum(1 for t in similar_trades if t.get('result') == 'win') / len(similar_trades)
            self.confidence = win_rate * 100
        else:
            self.confidence = 50 + trend + (btc_trend * 0.5)
        
        if trend > 1.5:
            self.mood = "bullish"
        elif trend < -1.5:
            self.mood = "bearish"
        else:
            self.mood = "neutral"
        
        randomness = random.uniform(-12, 12)
        final_confidence = max(0, min(100, self.confidence + randomness))
        
        return {
            'trend': trend,
            'mood': self.mood,
            'confidence': round(final_confidence, 1),
            'similar_trades': len(similar_trades)
        }
    
    def decide_action(self, price, price_history, btc_trend=0):
        analysis = self.analyze_market(price, price_history, btc_trend)
        
        action = "HOLD"
        amount = 0
        reason = ""
        
        if analysis['mood'] == 'bullish' and analysis['confidence'] > 60:
            action = "BUY"
            amount = min(3.0, self.balance * 0.4)
            reason = f"Bullish +{analysis['trend']:.1f}%"
        elif analysis['mood'] == 'bearish' and analysis['confidence'] > 60:
            action = "SELL"
            amount = random.uniform(0.8, 2.5)
            reason = f"Bearish {analysis['trend']:.1f}%"
        elif analysis['similar_trades'] > 2 and random.random() < 0.35:
            successful = [t for t in self.memory if t.get('result') == 'win' and t.get('action') in ['BUY', 'SELL']]
            if successful:
                last_action = random.choice(successful).get('action')
                action = last_action
                amount = 0.8
                reason = f"Learning from memory"
        
        return action, amount, reason, analysis
    
    def execute_trade(self, price, price_history, btc_trend=0):
        self.sync_balance()
        
        action, amount, reason, analysis = self.decide_action(price, price_history, btc_trend)
        
        trade_record = {
            'id': hashlib.md5(f"{time.time()}{random.random()}".encode()).hexdigest()[:8],
            'timestamp': get_wib_full(),
            'time_str': get_wib_str(),
            'price': round(price, 6),
            'action': action,
            'amount': round(amount, 4),
            'reason': reason,
            'trend': round(analysis['trend'], 2),
            'mood': analysis['mood'],
            'confidence': analysis['confidence']
        }
        
        profit = 0
        
        if action == "BUY" and self.balance >= amount:
            self.balance -= amount
            self.portfolio.append({'price': price, 'amount': amount})
            trade_record['status'] = 'success'
            trade_record['new_balance'] = round(self.balance, 4)
            self.daily_trades += 1
            
        elif action == "SELL" and self.portfolio:
            sold = self.portfolio.pop(0)
            profit = (price - sold['price']) * sold['amount']
            self.balance += sold['amount'] * price
            self.total_profit += profit
            self.daily_trades += 1
            
            if profit > 0:
                self.wins += 1
                trade_record['result'] = 'win'
            else:
                self.losses += 1
                trade_record['result'] = 'loss'
            
            trade_record['profit'] = round(profit, 6)
            trade_record['new_balance'] = round(self.balance, 4)
        else:
            trade_record['status'] = 'skipped'
        
        self.memory.append(trade_record)
        if trade_record['action'] != 'HOLD':
            self.trades.append(trade_record)
        
        self.save_memory()
        return trade_record, profit
    
    def get_summary(self):
        win_rate = (self.wins / (self.wins + self.losses) * 100) if (self.wins + self.losses) > 0 else 0
        return {
            'balance': round(self.balance, 4),
            'total_profit': round(self.total_profit, 6),
            'wins': self.wins,
            'losses': self.losses,
            'win_rate': round(win_rate, 1),
            'total_trades': len(self.trades),
            'memory_size': len(self.memory),
            'mood': self.mood,
            'confidence': round(self.confidence, 1),
            'daily_trades': self.daily_trades,
            'wallet_id': self.wallet_id
        }

class XYRON_NEXUS:
    def __init__(self):
        self.name = "🔗 XYRON-NEXUS AI BRAIN V3"
        self.web_path = "/home/runner/workspace/xyron-explorer"
        self.data_path = "/home/runner/workspace/ai-logs"
        
        self.mining_count = 0
        self.total_reward = 0
        self.reward_history = []
        self.hashrate = random.randint(1200, 1800)
        self.uptime_start = get_wib_time()
        self.chat_messages = []
        self.bitcoin_data = {}
        
        self.trader = SmartTraderV3("XYRON-TRADER-V3", initial_balance=25)
        self.price_history = [1.0]
        self.current_price = 1.0
        self.trade_history = []
        self.terminal_lines = []
        
        os.makedirs(self.web_path, exist_ok=True)
        os.makedirs(self.data_path, exist_ok=True)
        
        self.load_history()
        self.add_chat_message(f"🔗 XYRON-NEXUS AI BRAIN V3 AKTIF! ({get_wib_day()}, {get_wib_date()})", "system")
        self.add_chat_message(f"🔐 Wallet ID: {self.trader.wallet_id} | PIN: {self.trader.pin}", "system")
        self.add_chat_message(f"🌐 Jaringan: Stabil (cache 5 menit, retry otomatis)", "system")
        self.add_terminal_line(f"🧠 AI Brain V3 started | Wallet: {self.trader.wallet_id}", "success")
        self.print_banner()
    
    def print_banner(self):
        print(f"""
{Colors.GOLD}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════╗
║  🔗 XYRON-NEXUS AI BRAIN V3 - FULL INTEGRATION               ║
║  🔐 Private key AMAN di vault | PIN transaksi                ║
║  🌐 Jaringan Stabil (cache + retry) | Mining tetap jalan     ║
║  🕐 {get_wib_str()} WIB | 📅 {get_wib_day()}, {get_wib_date()}                    ║
║  💳 Wallet ID: {self.trader.wallet_id}                                   ║
╚══════════════════════════════════════════════════════════════╝
{Colors.END}
        """)
    
    def speak(self, msg, end='\n'):
        timestamp = get_wib_str()
        print(f"{Colors.CYAN}[{timestamp} WIB]{Colors.END} {Colors.GOLD}{self.name}{Colors.END} {msg}", end=end)
        self.add_terminal_line(msg, "info")
    
    def add_chat_message(self, message, sender="ai"):
        self.chat_messages.append({
            'sender': sender,
            'message': message,
            'timestamp': get_wib_full(),
            'time_str': get_wib_str()
        })
        self.chat_messages = self.chat_messages[-100:]
    
    def add_terminal_line(self, line, level="info"):
        icons = {"info": "ℹ️", "success": "✅", "error": "❌", "warning": "⚠️", "mining": "⛏️", "trade": "💰"}
        self.terminal_lines.append({
            'text': line,
            'level': level,
            'icon': icons.get(level, "📌"),
            'timestamp': get_wib_str()
        })
        self.terminal_lines = self.terminal_lines[-100:]
    
    def load_history(self):
        try:
            with open(f"{self.data_path}/xyron-nexus-v3-history.json", 'r') as f:
                data = json.load(f)
                self.mining_count = data.get('count', 0)
                self.total_reward = data.get('reward', 0)
                self.reward_history = data.get('history', [])
                self.price_history = data.get('price_history', [1.0])
        except:
            pass
    
    def save_history(self):
        with open(f"{self.data_path}/xyron-nexus-v3-history.json", 'w') as f:
            json.dump({
                'count': self.mining_count,
                'reward': self.total_reward,
                'history': self.reward_history[-500:],
                'price_history': self.price_history[-200:],
                'last_update': get_wib_full()
            }, f, indent=2)
    
    def update_price(self):
        change = random.uniform(-0.02, 0.02)
        self.current_price *= (1 + change)
        self.current_price = max(0.08, min(12, self.current_price))
        self.price_history.append(self.current_price)
        if len(self.price_history) > 200:
            self.price_history.pop(0)
        self.trader.last_price = self.current_price
        return self.current_price
    
    def learn_from_bitcoin(self):
        btc_hash = get_bitcoin_hashrate()
        self.bitcoin_data['hashrate'] = btc_hash
        return True
    
    def mine_block(self):
        self.mining_count += 1
        reward = random.randint(5, 9)
        self.total_reward += reward
        
        self.reward_history.append({
            'block': self.mining_count,
            'reward': reward,
            'time_str': get_wib_str(),
            'cumulative': self.total_reward
        })
        
        self.add_chat_message(f"✅ BLOCK #{self.mining_count} MINED! +{reward} XYR", "system")
        self.add_terminal_line(f"Block #{self.mining_count} mined | +{reward} XYR", "mining")
        self.save_history()
        return True
    
    def trade_loop(self):
        trade_interval = 0
        learn_counter = 0
        while True:
            price = self.update_price()
            
            learn_counter += 1
            if learn_counter >= 45:
                self.learn_from_bitcoin()
                learn_counter = 0
            
            if trade_interval <= 0:
                trade, profit = self.trader.execute_trade(price, self.price_history, self.bitcoin_data.get('trend', 0))
                
                if trade['action'] != 'HOLD' and trade['status'] == 'success':
                    self.trade_history.append(trade)
                    self.add_chat_message(f"💰 {trade['action']} {trade['amount']} XYR @ {trade['price']:.4f}", "trader")
                    if trade.get('profit'):
                        self.add_chat_message(f"{'✅' if trade['profit']>0 else '❌'} Profit: {abs(trade['profit']):.4f} XYR", "system")
                
                trade_interval = random.randint(8, 25)
            else:
                trade_interval -= 1
            
            time.sleep(1)
    
    def mining_loop(self):
        countdown = 0
        while True:
            if countdown <= 0:
                self.speak(f"⛏️ Mining block...", end='')
                success = self.mine_block()
                if success:
                    print(f" {Colors.GREEN}✓ BLOCK #{self.mining_count}{Colors.END}")
                else:
                    print(f" {Colors.RED}✗ Failed{Colors.END}")
                countdown = random.randint(110, 210)
            else:
                if countdown % 30 == 0:
                    self.speak(f"⏱️ Next block: {countdown//60}m {countdown%60}s")
                countdown -= 1
                time.sleep(1)
    
    def generate_html(self):
        trader = self.trader.get_summary()
        return f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta http-equiv="refresh" content="5"><title>XYRON-NEXUS AI BRAIN V3</title>
<style>
body {{ background: #0a0f0a; color: #0f0; font-family: monospace; padding: 20px; }}
.card {{ background: #111; border: 1px solid #0f0; padding: 15px; margin: 10px 0; border-radius: 10px; }}
h1 {{ color: #ff0; }}
</style>
</head>
<body>
<h1>🔗 XYRON-NEXUS AI BRAIN V3</h1>
<div class="card"><h2>⛏️ MINING</h2><p>Blocks: {self.mining_count} | Reward: {self.total_reward:.2f} XYR</p></div>
<div class="card"><h2>💰 TRADER</h2><p>Balance: {trader['balance']:.4f} XYR | Profit: {trader['total_profit']:.6f}</p><p>Win Rate: {trader['win_rate']}% | Wallet: {trader['wallet_id']}</p></div>
<div class="card"><h2>🌐 JARINGAN</h2><p>BTC Hashrate: {self.bitcoin_data.get('hashrate', 0):.2f} TH/s (cache)</p></div>
<div class="card"><h2>🕐 WIB</h2><p>{get_wib_str()} | {get_wib_day()}, {get_wib_date()}</p></div>
</body>
</html>'''
    
    def start_web_server(self):
        port = 3002
        def update_loop():
            while True:
                try:
                    with open(f"{self.web_path}/index.html", 'w') as f:
                        f.write(self.generate_html())
                except:
                    pass
                time.sleep(3)
        threading.Thread(target=update_loop, daemon=True).start()
        os.chdir(self.web_path)
        HTTPServer(('', port), SimpleHTTPRequestHandler).serve_forever()
    
    def run(self):
        threading.Thread(target=self.start_web_server, daemon=True).start()
        threading.Thread(target=self.trade_loop, daemon=True).start()
        
        self.speak("🌐 Dashboard: http://localhost:3002")
        self.speak("🔐 Terintegrasi dengan X11-Nano Vault (Unix Socket)")
        self.speak("🌐 Jaringan: Cache 5 menit + Retry otomatis")
        self.speak(f"💳 Wallet ID: {self.trader.wallet_id}")
        self.speak(f"🔑 PIN: {self.trader.pin} (simpan untuk transaksi)")
        self.speak("")
        
        try:
            self.mining_loop()
        except KeyboardInterrupt:
            self.speak("\n🛑 Shutting down...")
            self.save_history()

if __name__ == "__main__":
    XYRON_NEXUS().run()
