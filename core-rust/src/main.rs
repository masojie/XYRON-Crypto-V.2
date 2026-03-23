use std::os::unix::net::{UnixListener, UnixStream};
use std::io::{Read, Write};
use std::thread;
use std::path::PathBuf;

fn main() {
    println!("[CORE-RUST] XYRON Core Engine Starting...");

    let mut socket_path = PathBuf::from(std::env::var("HOME").unwrap());
    socket_path.push("xyron-core.sock");
    let socket_path = socket_path.to_str().unwrap();

    let _ = std::fs::remove_file(socket_path);

    match UnixListener::bind(socket_path) {
        Ok(listener) => {
            println!("[CORE-RUST] Listening on {}", socket_path);
            for stream in listener.incoming() {
                match stream {
                    Ok(stream) => {
                        thread::spawn(|| handle_client(stream));
                    },
                    Err(e) => println!("Error: {}", e),
                }
            }
        }
        Err(e) => {
            println!("[CORE-RUST] Failed to bind socket: {}", e);
            println!("[CORE-RUST] Running without socket");
            loop {
                std::thread::sleep(std::time::Duration::from_secs(60));
            }
        }
    }
}

fn handle_client(mut stream: UnixStream) {
    let mut buffer = [0; 1024];
    match stream.read(&mut buffer) {
        Ok(size) => {
            let msg = String::from_utf8_lossy(&buffer[..size]);
            println!("[CORE-RUST] Received: {}", msg);
            let _ = stream.write(b"PONG");
        }
        Err(e) => println!("[CORE-RUST] Error reading: {}", e),
    }
}
