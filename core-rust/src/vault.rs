// core-rust/src/vault.rs
//! X11-Nano Vault – Penyimpanan private key aman untuk AI worker & user
//!
//! Fitur:
//!   - Keypair secp256k1 asli (bukan simulasi)
//!   - Private key dienkripsi X11-Nano + AES-256-GCM dengan nonce random
//!   - PIN di-hash X11-Nano (bukan plaintext)
//!   - Vault hanya di memori — tidak pernah ditulis ke disk
//!   - Maksimal 21 AI worker per vault (sesuai spec AI Master)
//!   - Thread-safe via Mutex

use std::collections::HashMap;
use std::sync::Mutex;
use secp256k1::{Secp256k1, SecretKey, PublicKey};
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;

use crate::x11_nano::X11Nano;
use crate::lqv::{LQV, LQVPrivateKey, LQVPublicKey, LQVSignature};

// ─── Konstanta ──────────────────────────────────────────────────────────────

/// Maksimal AI worker per vault
pub const MAX_AI_WORKERS: usize = 21;

/// Version byte untuk address XYRON (Base58Check)
/// Menghasilkan address yang dimulai dengan karakter unik XYRON
pub const XYRON_VERSION_BYTE: u8 = 0x4B; // → address dimulai 'X' di Base58

// ─── Wallet ─────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct Wallet {
    /// ID unik wallet
    pub id: String,
    /// Address publik XYRON (Base58Check dengan version byte XYRON)
    pub address: String,
    /// Public key dalam hex (boleh publik)
    pub public_key_hex: String,
    /// Private key dienkripsi X11-Nano + AES-256-GCM
    /// Format: [nonce 12 byte] + [ciphertext]
    pub private_key_encrypted: Vec<u8>,
    /// Balance dalam nIZ (1 XYR = 1.000.000 nIZ)
    pub balance_niz: u64,
    /// Timestamp pembuatan (Unix seconds)
    pub created_at: u64,
    /// Tipe pemilik
    pub owner_type: OwnerType,
}

#[derive(Clone, Debug, PartialEq)]
pub enum OwnerType {
    AiWorker,
    User,
}

// ─── Vault ──────────────────────────────────────────────────────────────────

pub struct Vault {
    /// address → Wallet
    wallets: Mutex<HashMap<String, Wallet>>,
    /// owner_id → PIN hash (X11-Nano)
    pin_hashes: Mutex<HashMap<String, String>>,
    x11: X11Nano,
    lqv: LQV,
    secp: Secp256k1<secp256k1::All>,
}

impl Vault {
    pub fn new() -> Self {
        Self {
            wallets: Mutex::new(HashMap::new()),
            pin_hashes: Mutex::new(HashMap::new()),
            x11: X11Nano::new(),
            lqv: LQV::new(),
            secp: Secp256k1::new(),
        }
    }

    // ─── Registrasi ───────────────────────────────────────────────────────

    /// Daftarkan AI worker baru dengan PIN 4 digit
    /// Otomatis generate wallet dan simpan di vault
    pub fn register_ai_worker(&self, ai_id: &str, pin: &str) -> Result<String, String> {
        // Cek batas 21 AI worker
        let count = self.wallets.lock().unwrap()
            .values()
            .filter(|w| w.owner_type == OwnerType::AiWorker)
            .count();
        if count >= MAX_AI_WORKERS {
            return Err(format!("Maksimal {} AI worker sudah tercapai", MAX_AI_WORKERS));
        }

        // Validasi format PIN (4 digit)
        if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
            return Err("PIN harus 4 digit angka".to_string());
        }

        // Hash PIN dengan X11-Nano dan simpan
        let pin_hash = self.x11.hash(pin.as_bytes());
        self.pin_hashes.lock().unwrap().insert(ai_id.to_string(), pin_hash);

        // Buat wallet
        let wallet = self.create_wallet_internal(ai_id, pin, OwnerType::AiWorker)?;
        let address = wallet.address.clone();

        self.wallets.lock().unwrap().insert(address.clone(), wallet);
        Ok(address)
    }

    /// Daftarkan user biasa dengan PIN
    pub fn register_user(&self, user_id: &str, pin: &str) -> Result<String, String> {
        if pin.len() < 4 {
            return Err("PIN minimal 4 karakter".to_string());
        }

        let pin_hash = self.x11.hash(pin.as_bytes());
        self.pin_hashes.lock().unwrap().insert(user_id.to_string(), pin_hash);

        let wallet = self.create_wallet_internal(user_id, pin, OwnerType::User)?;
        let address = wallet.address.clone();

        self.wallets.lock().unwrap().insert(address.clone(), wallet);
        Ok(address)
    }

    // ─── Internal wallet creation ─────────────────────────────────────────

    fn create_wallet_internal(
        &self,
        owner_id: &str,
        pin: &str,
        owner_type: OwnerType,
    ) -> Result<Wallet, String> {
        // Generate private key random
        let mut raw_key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut raw_key);

        let secret_key = SecretKey::from_slice(&raw_key)
            .map_err(|_| "Gagal generate private key".to_string())?;
        let public_key = PublicKey::from_secret_key(&self.secp, &secret_key);

        // Derive address XYRON: SHA256 → X11-Nano cap → RIPEMD160 → Base58Check
        let address = self.derive_xyron_address(&public_key);

        // Enkripsi private key dengan X11-Nano + PIN
        let private_key_encrypted = self.x11.encrypt(&raw_key, pin.as_bytes());

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(Wallet {
            id: format!("xyron_{}_{}", owner_id, now),
            address: address.clone(),
            public_key_hex: hex::encode(public_key.serialize()),
            private_key_encrypted,
            balance_niz: 0,
            created_at: now,
            owner_type,
        })
    }

    /// Derive address XYRON dari public key
    /// Alur: PublicKey → SHA256 → X11-Nano cap → RIPEMD160 → version byte → Base58Check
    fn derive_xyron_address(&self, public_key: &PublicKey) -> String {
        let pubkey_bytes = public_key.serialize(); // 33 bytes compressed

        // Layer 1: SHA256
        let sha256 = Sha256::digest(&pubkey_bytes);

        // Layer 2: X11-Nano cap (identitas XYRON — tersembunyi di dalam address)
        let x11_cap = self.x11.hash_bytes(&sha256);

        // Layer 3: RIPEMD160
        let mut ripemd = Ripemd160::new();
        ripemd.update(&x11_cap);
        let hash160 = ripemd.finalize();

        // Base58Check dengan XYRON version byte
        let mut payload = vec![XYRON_VERSION_BYTE];
        payload.extend_from_slice(&hash160);

        // Checksum: SHA256(SHA256(payload))[..4]
        let checksum = Sha256::digest(&Sha256::digest(&payload));
        payload.extend_from_slice(&checksum[..4]);

        bs58::encode(payload).into_string()
    }

    // ─── Transaksi ────────────────────────────────────────────────────────

    /// Tanda tangani transaksi — hanya jika PIN valid
    pub fn sign_transaction(
        &self,
        address: &str,
        tx_data: &[u8],
        owner_id: &str,
        pin: &str,
    ) -> Result<Vec<u8>, String> {
        // Verifikasi PIN
        if !self.verify_pin(owner_id, pin) {
            return Err("PIN salah".to_string());
        }

        let wallets = self.wallets.lock().unwrap();
        let wallet = wallets.get(address).ok_or("Wallet tidak ditemukan")?;

        // Dekripsi private key
        let private_key_bytes = self.x11
            .decrypt(&wallet.private_key_encrypted, pin.as_bytes())
            .map_err(|_| "Gagal dekripsi private key — PIN salah atau data korup")?;

        // Tanda tangani menggunakan secp256k1
        let secret_key = SecretKey::from_slice(&private_key_bytes)
            .map_err(|_| "Private key tidak valid")?;

        let msg_hash = Sha256::digest(tx_data);
        let message = secp256k1::Message::from_slice(&msg_hash)
            .map_err(|_| "Pesan tidak valid")?;

        let signature = self.secp.sign_ecdsa(&message, &secret_key);
        Ok(signature.serialize_compact().to_vec())
    }

    // ─── Query ────────────────────────────────────────────────────────────

    pub fn get_wallet(&self, address: &str) -> Option<Wallet> {
        self.wallets.lock().unwrap().get(address).cloned()
    }

    pub fn get_balance_niz(&self, address: &str) -> Option<u64> {
        self.wallets.lock().unwrap().get(address).map(|w| w.balance_niz)
    }

    pub fn update_balance(&self, address: &str, balance_niz: u64) -> Result<(), String> {
        let mut wallets = self.wallets.lock().unwrap();
        wallets.get_mut(address)
            .map(|w| w.balance_niz = balance_niz)
            .ok_or("Wallet tidak ditemukan".to_string())
    }

    pub fn ai_worker_count(&self) -> usize {
        self.wallets.lock().unwrap()
            .values()
            .filter(|w| w.owner_type == OwnerType::AiWorker)
            .count()
    }

    pub fn list_ai_wallets(&self) -> Vec<String> {
        self.wallets.lock().unwrap()
            .values()
            .filter(|w| w.owner_type == OwnerType::AiWorker)
            .map(|w| w.address.clone())
            .collect()
    }

    // ─── PIN ──────────────────────────────────────────────────────────────

    fn verify_pin(&self, owner_id: &str, pin: &str) -> bool {
        let pins = self.pin_hashes.lock().unwrap();
        match pins.get(owner_id) {
            Some(stored) => self.x11.verify_pin(pin.as_bytes(), stored),
            None => false,
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_ai_worker() {
        let vault = Vault::new();
        let address = vault.register_ai_worker("ai_001", "1234").unwrap();
        assert!(!address.is_empty());
        println!("XYRON address: {}", address);
    }

    #[test]
    fn test_address_dimulai_x() {
        let vault = Vault::new();
        let address = vault.register_ai_worker("ai_001", "1234").unwrap();
        // Address XYRON dengan version byte 0x4B seharusnya dimulai dengan 'X'
        assert!(address.starts_with('X'), "Address harus dimulai 'X', dapat: {}", address);
    }

    #[test]
    fn test_pin_salah_gagal() {
        let vault = Vault::new();
        let address = vault.register_ai_worker("ai_002", "1234").unwrap();
        let result = vault.sign_transaction(&address, b"tx data", "ai_002", "9999");
        assert!(result.is_err());
    }

    #[test]
    fn test_sign_transaction_valid() {
        let vault = Vault::new();
        let address = vault.register_ai_worker("ai_003", "5678").unwrap();
        let result = vault.sign_transaction(&address, b"kirim 10 XYR", "ai_003", "5678");
        assert!(result.is_ok());
    }

    #[test]
    fn test_max_21_ai_workers() {
        let vault = Vault::new();
        for i in 0..21 {
            vault.register_ai_worker(&format!("ai_{:03}", i), "1234").unwrap();
        }
        // Ke-22 harus gagal
        let result = vault.register_ai_worker("ai_022", "1234");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("21"));
    }

    #[test]
    fn test_pin_format_salah() {
        let vault = Vault::new();
        // PIN harus 4 digit
        assert!(vault.register_ai_worker("ai_x", "12").is_err());
        assert!(vault.register_ai_worker("ai_x", "abcd").is_err());
        assert!(vault.register_ai_worker("ai_x", "12345").is_err());
    }

    #[test]
    fn test_wallet_unik() {
        let vault = Vault::new();
        let addr1 = vault.register_ai_worker("ai_a", "1111").unwrap();
        let addr2 = vault.register_ai_worker("ai_b", "2222").unwrap();
        assert_ne!(addr1, addr2);
    }
}
