// ============================================================================
// XYRON HEARTBEAT - 180 DETIK PRESISI
// Memicu mintBlock setiap 3 menit
// Status: PIP jika ada transaksi, PIP PIP jika idle
// ============================================================================

const EventEmitter = require('events');

class Heartbeat extends EventEmitter {
    constructor(intervalMs = 180000) {
        super();
        this.intervalMs = intervalMs; // 180000 ms = 3 menit
        this.timer = null;
        this.running = false;
        this.beatCount = 0;
        this.lastBeat = null;
    }
    
    start() {
        this.running = true;
        this.timer = setInterval(() => {
            this.beatCount++;
            this.lastBeat = new Date().toISOString();
            this.emit('beat', {
                beat: this.beatCount,
                timestamp: this.lastBeat,
                interval: this.intervalMs
            });
        }, this.intervalMs);
        
        console.log(`[HEARTBEAT] Started: ${this.intervalMs/1000}s cycle. Status: PIP`);
    }
    
    stop() {
        this.running = false;
        clearInterval(this.timer);
        console.log(`[HEARTBEAT] Stopped. Status: PIP PIP`);
    }
    
    getStatus() {
        return {
            running: this.running,
            interval: this.intervalMs,
            beatCount: this.beatCount,
            lastBeat: this.lastBeat
        };
    }
}

module.exports = Heartbeat;
