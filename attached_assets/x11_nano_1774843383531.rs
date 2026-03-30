// core-rust/src/x11_nano.rs
//! X11-Nano Dynamic Shield v2.1
//!
//! Fitur baru:
//!   - Dynamic Layer Scaling: 11 layer normal → 15 layer saat anomali terdeteksi
//!   - Parallel-Hashing: tiap layer berjalan di CPU core berbeda (rayon)
//!   - Nano-Tech Smart Compression: zstd compress data sebelum masuk pipeline
//!   - Nonce random per enkripsi (sudah ada di v2.0)

use sha2::{Sha256, Digest as Sha2Digest};
use sha3::{Sha3_256, Keccak256, Digest as Sha3Digest};
use groestl::{Groestl256, Digest as GroestlDigest};
use ripemd::Ripemd160;
use whirlpool::{Whirlpool, Digest as WhirlpoolDigest};
use blake2::{Blake2b512, Blake2s256, Digest as Blake2Digest};
use sm3::{Sm3, Digest as Sm3Digest};
use streebog::{Streebog256, Digest as StreebogDigest};
use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};
use rayon::prelude::*;
use rand::RngCore;

// ─── Konstanta ───────────────────────────────────────────────────────────────

pub const LAYERS_NORMAL:  usize = 11;
pub const LAYERS_ANOMALY: usize = 15;

/// Threat level menentukan jumlah layer
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ThreatLevel {
    Normal,   // 11 layer
    Elevated, // 13 layer
    Critical, // 15 layer
}

impl ThreatLevel {
    pub fn layers(&self) -> usize {
        match self {
            ThreatLevel::Normal   => 11,
            ThreatLevel::Elevated => 13,
            ThreatLevel::Critical => 15,
        }
    }
}

// ─── 15 algoritma hash (11 utama + 4 ekstra untuk anomaly mode) ──────────────

fn hash_blake3(data: &[u8])     -> Vec<u8> { blake3::hash(data).as_bytes().to_vec() }
fn hash_groestl(data: &[u8])    -> Vec<u8> { let mut h = Groestl256::new(); h.update(data); h.finalize().to_vec() }
fn hash_sha3(data: &[u8])       -> Vec<u8> { let mut h = Sha3_256::new(); h.update(data); h.finalize().to_vec() }
fn hash_keccak(data: &[u8])     -> Vec<u8> { let mut h = Keccak256::new(); h.update(data); h.finalize().to_vec() }
fn hash_sha256(data: &[u8])     -> Vec<u8> { let mut h = Sha256::new(); h.update(data); h.finalize().to_vec() }
fn hash_ripemd(data: &[u8])     -> Vec<u8> { let mut h = Ripemd160::new(); h.update(data); h.finalize().to_vec() }
fn hash_whirlpool(data: &[u8])  -> Vec<u8> { let mut h = Whirlpool::new(); h.update(data); h.finalize().to_vec() }
fn hash_blake2b(data: &[u8])    -> Vec<u8> { let mut h = Blake2b512::new(); h.update(data); h.finalize().to_vec() }
fn hash_streebog(data: &[u8])   -> Vec<u8> { let mut h = Streebog256::new(); h.update(data); h.finalize().to_vec() }
fn hash_sm3(data: &[u8])        -> Vec<u8> { let mut h = Sm3::new(); h.update(data); h.finalize().to_vec() }
fn hash_blake2s(data: &[u8])    -> Vec<u8> { let mut h = Blake2s256::new(); h.update(data); h.finalize().to_vec() }

// Layer ekstra untuk mode anomali (layer 12-15)
fn hash_double_sha256(data: &[u8]) -> Vec<u8> { hash_sha256(&hash_sha256(data)) }
fn hash_blake3_groestl(data: &[u8]) -> Vec<u8> { hash_groestl(&hash_blake3(data)) }
fn hash_keccak_sm3(data: &[u8]) -> Vec<u8> { hash_sm3(&hash_keccak(data)) }
fn hash_streebog_blake2b(data: &[u8]) -> Vec<u8> { hash_blake2b(&hash_streebog(data)) }

/// Semua 15 layer dalam urutan
const ALL_LAYERS: [fn(&[u8]) -> Vec<u8>; 15] = [
    hash_blake3,        // 1
    hash_groestl,       // 2
    hash_sha3,          // 3
    hash_keccak,        // 4
    hash_sha256,        // 5
    hash_ripemd,        // 6
    hash_whirlpool,     // 7
    hash_blake2b,       // 8
    hash_streebog,      // 9
    hash_sm3,           // 10
    hash_blake2s,       // 11 — sampai sini mode normal
    hash_double_sha256, // 12 — elevated
    hash_blake3_groestl,// 13 — elevated
    hash_keccak_sm3,    // 14 — critical
    hash_streebog_blake2b, // 15 — critical
];

// ─── X11Nano ─────────────────────────────────────────────────────────────────

pub struct X11Nano {
    threat_level: std::sync::atomic::AtomicU8,
}

impl X11Nano {
    pub fn new() -> Self {
        Self {
            threat_level: std::sync::atomic::AtomicU8::new(0), // Normal
        }
    }

    /// Dynamic Layer Scaling — dipanggil oleh LQV saat deteksi anomali
    pub fn scale_threat(&self, level: ThreatLevel) {
        let val = match level {
            ThreatLevel::Normal   => 0,
            ThreatLevel::Elevated => 1,
            ThreatLevel::Critical => 2,
        };
        self.threat_level.store(val, std::sync::atomic::Ordering::Relaxed);
        println!("[X11-NANO] Threat level → {:?} ({} layers)", level, level.layers());
    }

    pub fn current_threat(&self) -> ThreatLevel {
        match self.threat_level.load(std::sync::atomic::Ordering::Relaxed) {
            1 => ThreatLevel::Elevated,
            2 => ThreatLevel::Critical,
            _ => ThreatLevel::Normal,
        }
    }

    pub fn active_layers(&self) -> usize {
        self.current_threat().layers()
    }

    // ─── Smart Compression (Nano-Tech) ───────────────────────────────────

    /// Compress data dengan zstd sebelum masuk hashing pipeline
    pub fn compress(&self, data: &[u8]) -> Vec<u8> {
        zstd::encode_all(data, 3).unwrap_or_else(|_| data.to_vec())
    }

    pub fn decompress(&self, data: &[u8]) -> Vec<u8> {
        zstd::decode_all(data).unwrap_or_else(|_| data.to_vec())
    }

    // ─── Parallel Hashing (Multi-core via rayon) ─────────────────────────

    /// Hash dengan PARALLEL multi-core — setiap layer di core berbeda
    /// Lalu hasil semua layer digabung dan di-hash sekali lagi untuk finalisasi
    pub fn hash_parallel(&self, data: &[u8]) -> Vec<u8> {
        let layers = self.active_layers();

        // Compress dulu sebelum hashing (Nano-Tech Smart Compression)
        let compressed = self.compress(data);

        // Jalankan semua layer secara PARALEL di CPU core berbeda
        let layer_results: Vec<Vec<u8>> = (0..layers)
            .into_par_iter()
            .map(|i| ALL_LAYERS[i](&compressed))
            .collect();

        // Gabungkan semua hasil layer → hash final
        let combined: Vec<u8> = layer_results.concat();
        hash_blake3(&combined)
    }

    /// Hash sekuensial (untuk kompatibilitas — PIN hashing, derive key)
    pub fn hash_sequential(&self, data: &[u8]) -> Vec<u8> {
        let layers = self.active_layers();
        let compressed = self.compress(data);
        let mut current = compressed;
        for i in 0..layers {
            current = ALL_LAYERS[i](&current);
        }
        current
    }

    /// Hash utama — pakai parallel untuk data besar, sequential untuk kecil
    pub fn hash_bytes(&self, data: &[u8]) -> Vec<u8> {
        if data.len() > 256 {
            self.hash_parallel(data)
        } else {
            self.hash_sequential(data)
        }
    }

    pub fn hash(&self, data: &[u8]) -> String {
        hex::encode(self.hash_bytes(data))
    }

    // ─── Enkripsi AES-256-GCM ────────────────────────────────────────────

    /// Enkripsi dengan PIN — nonce random setiap kali
    /// Format output: [threat_level 1 byte] + [nonce 12 byte] + [ciphertext]
    pub fn encrypt(&self, data: &[u8], pin: &[u8]) -> Vec<u8> {
        let key    = self.derive_key(pin);
        let cipher = Aes256Gcm::new_from_slice(&key).expect("key 32 bytes");

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Compress data sebelum enkripsi
        let compressed = self.compress(data);
        let ciphertext = cipher.encrypt(nonce, compressed.as_slice()).expect("encrypt failed");

        // Format: [threat_level] + [nonce 12B] + [ciphertext]
        let mut result = Vec::with_capacity(1 + 12 + ciphertext.len());
        result.push(self.threat_level.load(std::sync::atomic::Ordering::Relaxed));
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        result
    }

    pub fn decrypt(&self, encrypted: &[u8], pin: &[u8]) -> Result<Vec<u8>, String> {
        if encrypted.len() < 14 {
            return Err("Data terlalu pendek".to_string());
        }
        // Skip byte pertama (threat_level) → ambil nonce 12 byte
        let nonce      = Nonce::from_slice(&encrypted[1..13]);
        let ciphertext = &encrypted[13..];

        let key    = self.derive_key(pin);
        let cipher = Aes256Gcm::new_from_slice(&key).expect("key 32 bytes");

        let decrypted = cipher.decrypt(nonce, ciphertext)
            .map_err(|_| "Decryption failed — PIN salah atau data korup".to_string())?;

        // Decompress setelah dekripsi
        Ok(self.decompress(&decrypted))
    }

    fn derive_key(&self, pin: &[u8]) -> [u8; 32] {
        let hash = self.hash_sequential(pin);
        let mut key = [0u8; 32];
        let len = hash.len().min(32);
        key[..len].copy_from_slice(&hash[..len]);
        key
    }

    pub fn verify_pin(&self, pin: &[u8], stored_hash: &str) -> bool {
        self.hash(pin) == stored_hash
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_11_layers() {
        let x = X11Nano::new();
        assert_eq!(x.active_layers(), 11);
    }

    #[test]
    fn test_dynamic_scaling() {
        let x = X11Nano::new();
        x.scale_threat(ThreatLevel::Elevated);
        assert_eq!(x.active_layers(), 13);
        x.scale_threat(ThreatLevel::Critical);
        assert_eq!(x.active_layers(), 15);
        x.scale_threat(ThreatLevel::Normal);
        assert_eq!(x.active_layers(), 11);
    }

    #[test]
    fn test_parallel_hash_konsisten() {
        let x = X11Nano::new();
        let h1 = x.hash_parallel(b"test data xyron");
        let h2 = x.hash_parallel(b"test data xyron");
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_compression_roundtrip() {
        let x = X11Nano::new();
        let data = b"XYRON private key data yang panjang untuk test compression";
        let compressed   = x.compress(data);
        let decompressed = x.decompress(&compressed);
        assert_eq!(decompressed, data);
    }

    #[test]
    fn test_encrypt_decrypt() {
        let x = X11Nano::new();
        let data = b"private_key_rahasia_xyron";
        let enc = x.encrypt(data, b"1234");
        let dec = x.decrypt(&enc, b"1234").unwrap();
        assert_eq!(dec, data);
    }

    #[test]
    fn test_nonce_selalu_random() {
        let x = X11Nano::new();
        let e1 = x.encrypt(b"data", b"pin");
        let e2 = x.encrypt(b"data", b"pin");
        assert_ne!(e1, e2, "Nonce harus random!");
    }

    #[test]
    fn test_critical_mode_encrypt_decrypt() {
        let x = X11Nano::new();
        x.scale_threat(ThreatLevel::Critical);
        let enc = x.encrypt(b"sensitive", b"9999");
        let dec = x.decrypt(&enc, b"9999").unwrap();
        assert_eq!(dec, b"sensitive");
    }

    #[test]
    fn test_hash_beda_input() {
        let x = X11Nano::new();
        assert_ne!(x.hash(b"alice"), x.hash(b"bob"));
    }
}
