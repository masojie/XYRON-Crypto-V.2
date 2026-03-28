#!/usr/bin/env python3
import json
import time
import os
from datetime import datetime

while True:
    try:
        with open('../ai-logs/army-comms.json', 'r') as f:
            data = json.load(f)
        
        os.system('clear')
        print("📡 ARMY COMMUNICATIONS MONITOR")
        print("="*50)
        print(f"🕐 {datetime.now().strftime('%H:%M:%S')}")
        print("-"*50)
        
        patterns = data.get('patterns', {})
        print(f"🧠 Shared Patterns: {len(patterns)}")
        
        messages = data.get('messages', [])[-5:]
        print("\n💬 Recent:")
        for msg in messages[::-1]:
            print(f"   {msg['timestamp'][11:19]} | {msg['from']} | {msg['type']}")
        
        print("-"*50)
        time.sleep(3)
    except:
        time.sleep(3)
