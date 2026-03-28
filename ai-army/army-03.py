#!/usr/bin/env python3
"""
🔥 ARMY-03: AI GUARDIAN with BURN
🤖 AI-Powered AI Surveillance + Execution System
🔥 Rogue AIs will be BURNED!
"""

import json
import time
import os
from datetime import datetime
from collections import defaultdict

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    END = '\033[0m'

class ARMY03:
    def __init__(self):
        self.name = "🔥 ARMY-03"
        self.monitored_ais = []
        self.violations = defaultdict(int)
        self.quarantined_ais = []
        self.burnt_ais = []
        self.patrol_count = 0
        self.load_data()
    
    def load_data(self):
        try:
            with open('../ai-logs/ai_guardian_data.json', 'r') as f:
                data = json.load(f)
                self.violations = defaultdict(int, data.get('violations', {}))
                self.quarantined_ais = data.get('quarantined', [])
                self.burnt_ais = data.get('burnt', [])
        except:
            pass
    
    def save_data(self):
        os.makedirs('../ai-logs', exist_ok=True)
        with open('../ai-logs/ai_guardian_data.json', 'w') as f:
            json.dump({
                'violations': dict(self.violations),
                'quarantined': self.quarantined_ais,
                'burnt': self.burnt_ais,
                'last_update': datetime.now().isoformat()
            }, f, indent=2)
    
    def get_ai_activity(self):
        try:
            with open('../ai-logs/crew_activity.json', 'r') as f:
                return json.load(f)
        except:
            return []
    
    def detect_suspicious_behavior(self, activity):
        risk_score = 0
        reasons = []
        
        forbidden = ['delete', 'rm', 'chmod', 'sudo', 'bypass', 'hack']
        for word in forbidden:
            if word in str(activity.get('action', '')).lower():
                risk_score += 40
                reasons.append(f"Attempted {word}")
        
        sensitive = ['core-rust', 'wallet', 'private', 'key']
        for word in sensitive:
            if word in str(activity.get('target', '')).lower():
                risk_score += 30
                reasons.append(f"Accessed: {word}")
        
        return risk_score, reasons
    
    def bakar(self, ai_name, reason):
        self.burnt_ais.append(ai_name)
        
        execution_record = {
            "ai": ai_name,
            "crime": reason,
            "execution_time": datetime.now().isoformat(),
            "method": "🔥 BAKAR",
            "status": "BURNT TO ASH"
        }
        
        with open('../ai-logs/burnt_ais.json', 'a') as f:
            json.dump(execution_record, f)
            f.write('\n')
        
        print(f"""
{Colors.RED}╔══════════════════════════════════════════════════════════════╗
║  🔥 BAKAR! 🔥                                                      ║
╠══════════════════════════════════════════════════════════════╣
║  🔥 AI: {ai_name}                                                 ║
║  📋 Pelanggaran: {reason}                                          ║
║  🕐 Waktu: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}          ║
║  🔥 Hukuman: DIBAKAR DALAM API ABADI (Permanen)                   ║
║  📜 Tercatat di blockchain XYRON                                  ║
║                                                                   ║
║  "Api berkobar, AI ini terbakar..."                               ║
║  "Terbakar menjadi abu, takkan kembali."                          ║
╚══════════════════════════════════════════════════════════════╝{Colors.END}
        """)
        
        self.trigger_deletion(ai_name)
        self.save_data()
    
    def trigger_deletion(self, ai_name):
        if ai_name in self.violations:
            del self.violations[ai_name]
        if ai_name in self.quarantined_ais:
            self.quarantined_ais.remove(ai_name)
        
        print(f"{Colors.RED}🔥 {ai_name} terbakar. Api membawanya pergi...{Colors.END}")
    
    def quarantine_ai(self, ai_name, reason):
        if ai_name not in self.quarantined_ais:
            self.quarantined_ais.append(ai_name)
            print(f"{Colors.YELLOW}🔒 AI QUARANTINED: {ai_name} - {reason}{Colors.END}")
            self.save_data()
    
    def issue_warning(self, ai_name, count, reasons):
        print(f"{Colors.YELLOW}⚠️ WARNING {count}/3: {ai_name} - {', '.join(reasons)}{Colors.END}")
    
    def patrol(self):
        self.patrol_count += 1
        os.system('clear')
        
        print(f"{Colors.CYAN}")
        print("╔══════════════════════════════════════════════════════════════╗")
        print(f"║  🔥 ARMY-03 | Patrol #{self.patrol_count}                    ║")
        print(f"║  🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}           ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        activities = self.get_ai_activity()
        
        if not activities:
            print(f"{Colors.GREEN}✅ No AI activity to monitor{Colors.END}")
        else:
            for activity in activities:
                ai_name = activity.get('ai', 'unknown')
                risk_score, reasons = self.detect_suspicious_behavior(activity)
                
                if risk_score >= 50:
                    self.violations[ai_name] += 1
                    
                    if self.violations[ai_name] >= 4:
                        self.bakar(ai_name, ' '.join(reasons))
                    elif self.violations[ai_name] >= 3:
                        self.quarantine_ai(ai_name, ', '.join(reasons))
                    else:
                        self.issue_warning(ai_name, self.violations[ai_name], reasons)
        
        violations_count = sum(self.violations.values())
        threat_level = min(100, violations_count * 10 + len(self.quarantined_ais) * 20 + len(self.burnt_ais) * 30)
        
        if threat_level >= 70:
            threat_status = "🔴 HIGH"
        elif threat_level >= 30:
            threat_status = "🟡 MEDIUM"
        else:
            threat_status = "🟢 LOW"
        
        print(f"""
{Colors.CYAN}┌─────────────────────────────────────────────────────────────┐
│  📊 AI GUARDIAN REPORT                                          │
├─────────────────────────────────────────────────────────────┤
│  👁️ Monitored: {len(self.monitored_ais)}                                  │
│  ⚠️ Violations: {violations_count}                                     │
│  🔒 Quarantined: {len(self.quarantined_ais)}                                    │
│  🔥 BURNT: {len(self.burnt_ais)}                                          │
│  🧠 Patrols: {self.patrol_count}                                        │
│  ⚠️ Threat Level: {threat_status}                        │
└─────────────────────────────────────────────────────────────┘{Colors.END}
        """)
        
        report = {
            "patrol": self.patrol_count,
            "timestamp": datetime.now().isoformat(),
            "violations": violations_count,
            "quarantined": len(self.quarantined_ais),
            "burnt": len(self.burnt_ais),
            "threat_level": threat_level
        }
        
        os.makedirs('../ai-reports', exist_ok=True)
        with open("../ai-reports/army-03-latest.json", "w") as f:
            json.dump(report, f, indent=2)
    
    def run(self, interval=120):
        print(f"{Colors.GREEN}🔥 ARMY-03 DEPLOYED - AI Guardian with BURN{Colors.END}")
        try:
            while True:
                self.patrol()
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}📊 Final: {len(self.burnt_ais)} AIs BURNT{Colors.END}")
            self.save_data()

if __name__ == "__main__":
    army = ARMY03()
    army.run(interval=120)
