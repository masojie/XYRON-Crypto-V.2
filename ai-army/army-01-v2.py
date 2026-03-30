#!/usr/bin/env python3
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""
╔══════════════════════════════════════════════════════════════╗
║  ⚔️ ARMY-01 v2.0: X11-NANO GUARDIAN with AI Comms          ║
║  🧠 AI-Powered Network Defense + Inter-Army Coordination    ║
╚══════════════════════════════════════════════════════════════╝
"""

import requests
import json
import time
import hashlib
import os
from datetime import datetime
from collections import defaultdict
from army_comms import comm_hub

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'

class ARMY01_V2:
    def __init__(self):
        self.name = "⚔️ ARMY-01"
        self.xyron_api = "http://localhost:5000"
        self.shield_layers = 11
        self.threat_level = 0
        self.blocked_nodes = []
        self.patrol_count = 0
        self.attack_patterns = defaultdict(int)
        
    def share_intel(self, threat_data):
        comm_hub.broadcast(self.name, "THREAT", threat_data, "HIGH")
        print(f"📤 {self.name} shared intel")
    
    def get_shared_intel(self):
        intel = comm_hub.get_shared_intel()
        self.attack_patterns.update(intel['patterns'])
        if intel['patterns']:
            print(f"🧠 {self.name} learned {len(intel['patterns'])} patterns")
        return intel
    
    def check_health(self):
        try:
            r = requests.get(f"{self.xyron_api}/health", timeout=5)
            return r.status_code == 200
        except:
            return False
    
    def patrol(self):
        self.patrol_count += 1
        os.system('clear')
        print(f"{Colors.CYAN}")
        print("╔══════════════════════════════════════════════════════════════╗")
        print(f"║  {self.name} | Patrol #{self.patrol_count}                 ║")
        print(f"║  🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}           ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        # Get shared intel
        self.get_shared_intel()
        
        health = self.check_health()
        if health:
            print(f"{Colors.GREEN}✅ XYRON NETWORK: ONLINE{Colors.END}")
        else:
            print(f"{Colors.RED}❌ XYRON NETWORK: OFFLINE{Colors.END}")
            self.threat_level += 50
        
        # Simulasi deteksi ancaman
        threats_detected = self.patrol_count % 5 == 0
        if threats_detected:
            threat_data = {
                'type': 'network_threat',
                'pattern': f'attack_{self.patrol_count}',
                'severity': self.threat_level + 20
            }
            self.share_intel(threat_data)
            self.threat_level = min(100, self.threat_level + 20)
        
        self.threat_level = max(0, self.threat_level - 10)
        
        print(f"{Colors.GREEN}🛡️ Shield: {self.shield_layers}/15 | Threat: {self.threat_level}%{Colors.END}")
        print(f"{Colors.CYAN}{'='*50}{Colors.END}")
        
        return {"threat": self.threat_level, "patrol": self.patrol_count}
    
    def run(self, interval=30):
        print(f"{Colors.GREEN}⚔️ {self.name} DEPLOYED with Inter-Army Comms{Colors.END}")
        try:
            while True:
                self.patrol()
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}📊 Final: {len(self.attack_patterns)} patterns learned{Colors.END}")

if __name__ == "__main__":
    army = ARMY01_V2()
    army.run(interval=30)
