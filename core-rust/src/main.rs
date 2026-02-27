use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::os::unix::net::{UnixListener, UnixStream};
use std::io::{Read, Write};
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};
use chrono::Utc;

mod x11_nano;
mod security;

#[cfg(feature = "jemalloc")]
#[global_allocator]
static ALLOC: jemallocator::Jemalloc = jemallocator::Jemalloc;

// ============================================================================
// CONSTANTS
// ============================================================================
const SOCKET_PATH: &str = "/tmp/xyron-core.sock"; // Socket untuk komunikasi dengan Go
const X11_BASE_LAYERS: usize = 11;
const X11_MAX_LAYERS: usize = 15;
const BUFFER_SIZE: usize = 65536;

// ============================================================================
// DATA STRUCTURES - SINKRON DENGAN GO & NODE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRequest {
    pub request_id: String,
    pub node_id: String,
    pub sms: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub request_id: String,
    pub node_id: String,
    pub sms_encrypted: Option<String>, // SINKRON dengan Go & Node
    pub verified: bool,                 // SINKRON dengan Go & Node
    pub signature: String,              // SINKRON dengan Go & Node
    pub layers_used: usize,
    pub processing_time: u128,
    pub status: String,
    pub timestamp: u64,
}

// ============================================================================
// CORE ENGINE
// ============================================================================

pub struct XyronCore {
    alert_mode: AtomicBool,
    stats: Arc<CoreStats>,
    socket_path: String,
}

struct CoreStats {
    processed: AtomicU64,
    errors: AtomicU64,
    total_time: AtomicU64,
    active_layers: AtomicU64,
}

impl XyronCore {
    pub fn new(socket_path: &str) -> Arc<Self> {
        env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
            .format(|buf, record| {
                use std::io::Write;
                writeln!(buf, "[CORE-RUST] [{}] {}", record.level(), record.args())
            })
            .init();
        
        info!("╔════════════════════════════════════════════════════════════╗");
        info!("║         XYRON CORE RUST - X11-NANO ENGINE                 ║");
        info!("║         Socket: {}                     ║", socket_path);
        info!("║         Status: PIP                                        ║");
        info!("╚════════════════════════════════════════════════════════════╝");
        
        let engine = Arc::new(XyronCore {
            alert_mode: AtomicBool::new(false),
            stats: Arc::new(CoreStats {
                processed: AtomicU64::new(0),
                errors: AtomicU64::new(0),
                total_time: AtomicU64::new(0),
                active_layers: AtomicU64::new(X11_BASE_LAYERS as u64),
            }),
            socket_path: socket_path.to_string(),
        });
        
        // Start metrics reporter
        let stats_clone = engine.stats.clone();
        thread::spawn(move || {
            Self::metrics_reporter(stats_clone);
        });
        
        engine
    }
    
    // Process validation request from Go
    fn process_validation(&self, request: ValidationRequest) -> ValidationResponse {
        let start = Instant::now();
        let layers = X11_BASE_LAYERS;
        
        self.stats.active_layers.store(layers as u64, Ordering::Relaxed);
        
        debug!("Processing validation for node: {}", request.node_id);
        
        // Encrypt SMS if provided
        let sms_encrypted = request.sms.as_ref().map(|sms| {
            x11_nano::X11Nano::encrypt_sms(sms, &request.node_id)
        });
        
        // Generate signature untuk tokenomics
        let has_sms = request.sms.is_some();
        let signature = security::LQV::generate_signature(&request.node_id, has_sms);
        
        let elapsed = start.elapsed().as_micros();
        
        self.stats.processed.fetch_add(1, Ordering::Relaxed);
        self.stats.total_time.fetch_add(elapsed as u64, Ordering::Relaxed);
        
        info!("Node {} processed | Time: {}μs | Signature: {} | SMS: {} | Status: PIP",
            request.node_id, elapsed, &signature[0..20], 
            if sms_encrypted.is_some() { "YES" } else { "NO" });
        
        ValidationResponse {
            request_id: request.request_id,
            node_id: request.node_id,
            sms_encrypted,
            verified: true,
            signature,
            layers_used: layers,
            processing_time: elapsed,
            status: "PIP".to_string(),
            timestamp: Utc::now().timestamp() as u64,
        }
    }
    
    // Handle Unix socket client
    fn handle_client(&self, mut stream: UnixStream) {
        let mut buffer = vec![0u8; BUFFER_SIZE];
        
        match stream.read(&mut buffer) {
            Ok(size) if size > 0 => {
                buffer.truncate(size);
                
                match serde_json::from_slice::<ValidationRequest>(&buffer) {
                    Ok(request) => {
                        debug!("Received request: {}", request.request_id);
                        let response = self.process_validation(request);
                        
                        match serde_json::to_vec(&response) {
                            Ok(data) => {
                                if let Err(e) = stream.write_all(&data) {
                                    error!("Failed to send response: {}", e);
                                    self.stats.errors.fetch_add(1, Ordering::Relaxed);
                                } else {
                                    debug!("Response sent successfully | Latency: {}μs", response.processing_time);
                                }
                            },
                            Err(e) => {
                                error!("Failed to serialize response: {}", e);
                                self.stats.errors.fetch_add(1, Ordering::Relaxed);
                            }
                        }
                    },
                    Err(e) => {
                        error!("Failed to parse request: {}", e);
                        self.stats.errors.fetch_add(1, Ordering::Relaxed);
                    }
                }
            },
            _ => {}
        }
    }
    
    // Start Unix socket server
    pub fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let _ = std::fs::remove_file(&self.socket_path);
        
        let listener = UnixListener::bind(&self.socket_path)?;
        info!("🚀 Unix socket listening at {}", self.socket_path);
        info!("📡 Ready to accept connections from Go | PIP");
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&self.socket_path, std::fs::Permissions::from_mode(0o777))?;
        }
        
        let engine = self.clone();
        
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let engine_clone = engine.clone();
                    thread::spawn(move || {
                        engine_clone.handle_client(stream);
                    });
                },
                Err(e) => {
                    error!("Connection failed: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    // Metrics reporter
    fn metrics_reporter(stats: Arc<CoreStats>) {
        let mut interval = tokio::time::interval(Duration::from_secs(10));
        
        loop {
            interval.tick();
            
            let processed = stats.processed.load(Ordering::Relaxed);
            let errors = stats.errors.load(Ordering::Relaxed);
            let total_time = stats.total_time.load(Ordering::Relaxed);
            let layers = stats.active_layers.load(Ordering::Relaxed);
            
            let avg_time = if processed > 0 { total_time / processed } else { 0 };
            
            let status = if errors > processed / 10 { "PIP PIP" } else { "PIP" };
            
            info!("📊 METRICS:");
            info!("   Processed: {} validations", processed);
            info!("   Errors: {} ({}%)", errors, 
                if processed > 0 { errors * 100 / processed } else { 0 });
            info!("   Avg time: {}μs", avg_time);
            info!("   Active layers: {}", layers);
            info!("   Status: {}", status);
        }
    }
}

impl Clone for XyronCore {
    fn clone(&self) -> Self {
        XyronCore {
            alert_mode: AtomicBool::new(self.alert_mode.load(Ordering::Relaxed)),
            stats: self.stats.clone(),
            socket_path: self.socket_path.clone(),
        }
    }
}

// ============================================================================
// MAIN
// ============================================================================

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let engine = XyronCore::new(SOCKET_PATH);
    engine.start()
}
