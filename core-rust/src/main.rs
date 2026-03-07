use std::os::unix::net::{UnixListener, UnixStream};
use std::io::{Read, Write};
use std::thread;

fn main() {
    println!("[CORE-RUST] XYRON Core Engine Starting...");
    
    let socket_path = "/tmp/xyron-core.sock";
    
    // Hapus socket lama kalau ada
    let _ = std::fs::remove_file(socket_path);
    
    // Buat listener
    let listener = UnixListener::bind(socket_path).unwrap();
    println!("[CORE-RUST] Listening on {}", socket_path);
    
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(|| handle_client(stream));
            }
            Err(err) => {
                println!("[CORE-RUST] Connection failed: {}", err);
            }
        }
    }
}

fn handle_client(mut stream: UnixStream) {
    let mut buffer = [0; 1024];
    match stream.read(&mut buffer) {
        Ok(size) => {
            let request = String::from_utf8_lossy(&buffer[..size]);
            println!("[CORE-RUST] Received: {}", request);
            
            let response = "PIP";
            stream.write_all(response.as_bytes()).unwrap();
        }
        Err(err) => {
            println!("[CORE-RUST] Error reading: {}", err);
        }
    }
}
