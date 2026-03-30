#!/usr/bin/env python3
"""
🗣️ ARMY COMMUNICATION HUB
🤝 Inter-Army Coordination & Data Sharing
"""

import json
import os
from datetime import datetime
from collections import defaultdict

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    END = '\033[0m'

class ArmyCommsHub:
    def __init__(self):
        self.comms_file = "../ai-logs/army-comms.json"
        self.threat_db = {}
        self.shared_patterns = defaultdict(int)
        self.messages = []
        self.load_data()
    
    def load_data(self):
        try:
            with open(self.comms_file, 'r') as f:
                data = json.load(f)
                self.threat_db = data.get('threats', {})
                self.shared_patterns = defaultdict(int, data.get('patterns', {}))
                self.messages = data.get('messages', [])
        except:
            pass
    
    def save_data(self):
        os.makedirs('../ai-logs', exist_ok=True)
        with open(self.comms_file, 'w') as f:
            json.dump({
                'threats': self.threat_db,
                'patterns': dict(self.shared_patterns),
                'messages': self.messages[-100:],
                'last_update': datetime.now().isoformat()
            }, f, indent=2)
    
    def broadcast(self, from_army, message_type, data, priority="NORMAL"):
        msg = {
            "timestamp": datetime.now().isoformat(),
            "from": from_army,
            "type": message_type,
            "data": data,
            "priority": priority
        }
        self.messages.append(msg)
        
        if message_type == "THREAT":
            self.shared_patterns[data.get('pattern', 'unknown')] += 1
        
        self.save_data()
        print(f"{Colors.PURPLE}📢 {from_army} broadcast: {message_type}{Colors.END}")
        return msg
    
    def get_shared_intel(self):
        return {
            'total_threats': len(self.threat_db),
            'patterns': dict(self.shared_patterns),
            'recent_messages': self.messages[-5:]
        }

comm_hub = ArmyCommsHub()
