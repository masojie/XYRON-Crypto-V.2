use std::collections::HashMap;
use std::sync::Mutex;
use secp256k1::{Secp256k1, SecretKey, PublicKey};
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;
use crate::x11_nano::X11Nano;
use crate::lqv::LQV;
pub const MAX_AI_WORKERS: usize = 21;
pub const XYRON_VERSION_BYTE: u8 = 0x4B;
#[derive(Clone)]
pub struct Wallet {
    pub id: String,
    pub address: String,
    pub public_key_hex: String,
    pub private_key_encrypted: Vec<u8>,
    pub balance_niz: u64,
    pub created_at: u64,
    pub owner_type: OwnerType,
}
#[derive(Clone, Debug, PartialEq)]
pub enum OwnerType { AiWorker, User }
pub struct Vault {
    wallets: Mutex<HashMap<String, Wallet>>,
    pin_hashes: Mutex<HashMap<String, String>>,
    x11: X11Nano,
    lqv: LQV,
    secp: Secp256k1<secp256k1::All>,
}
impl Vault {
    pub fn new() -> Self {
        Self { wallets: Mutex::new(HashMap::new()), pin_hashes: Mutex::new(HashMap::new()), x11: X11Nano::new(), lqv: LQV::new(), secp: Secp256k1::new() }
    }
    pub fn register_ai_worker(&self, ai_id: &str, pin: &str) -> Result<String, String> {
        let count = self.wallets.lock().unwrap().values().filter(|w| w.owner_type == OwnerType::AiWorker).count();
        if count >= MAX_AI_WORKERS { return Err(format!("Max {} AI workers reached", MAX_AI_WORKERS)); }
        if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) { return Err("PIN must be 4 digits".to_string()); }
        let pin_hash = self.x11.hash(pin.as_bytes());
        self.pin_hashes.lock().unwrap().insert(ai_id.to_string(), pin_hash);
        let wallet = self.create_wallet_internal(ai_id, pin, OwnerType::AiWorker)?;
        let address = wallet.address.clone();
        self.wallets.lock().unwrap().insert(address.clone(), wallet);
        Ok(address)
    }
    pub fn register_user(&self, user_id: &str, pin: &str) -> Result<String, String> {
        if pin.len() < 4 { return Err("PIN min 4 chars".to_string()); }
        let pin_hash = self.x11.hash(pin.as_bytes());
        self.pin_hashes.lock().unwrap().insert(user_id.to_string(), pin_hash);
        let wallet = self.create_wallet_internal(user_id, pin, OwnerType::User)?;
        let address = wallet.address.clone();
        self.wallets.lock().unwrap().insert(address.clone(), wallet);
        Ok(address)
    }
    fn create_wallet_internal(&self, owner_id: &str, pin: &str, owner_type: OwnerType) -> Result<Wallet, String> {
        let mut raw_key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut raw_key);
        let secret_key = SecretKey::from_slice(&raw_key).map_err(|_| "Failed to generate key".to_string())?;
        let public_key = PublicKey::from_secret_key(&self.secp, &secret_key);
        let address = self.derive_xyron_address(&public_key);
        let private_key_encrypted = self.x11.encrypt(&raw_key, pin.as_bytes());
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
        Ok(Wallet { id: format!("xyron_{}_{}", owner_id, now), address: address.clone(), public_key_hex: hex::encode(public_key.serialize()), private_key_encrypted, balance_niz: 0, created_at: now, owner_type })
    }
    fn derive_xyron_address(&self, public_key: &PublicKey) -> String {
        let pubkey_bytes = public_key.serialize();
        let sha256 = Sha256::digest(&pubkey_bytes);
        let x11_cap = self.x11.hash_bytes(&sha256);
        let mut ripemd = Ripemd160::new();
        ripemd.update(&x11_cap);
        let hash160 = ripemd.finalize();
        let mut payload = vec![XYRON_VERSION_BYTE];
        payload.extend_from_slice(&hash160);
        let checksum = Sha256::digest(&Sha256::digest(&payload));
        payload.extend_from_slice(&checksum[..4]);
        bs58::encode(payload).into_string()
    }
    pub fn sign_transaction(&self, address: &str, tx_data: &[u8], owner_id: &str, pin: &str) -> Result<Vec<u8>, String> {
        if !self.verify_pin(owner_id, pin) { return Err("Invalid PIN".to_string()); }
        let wallets = self.wallets.lock().unwrap();
        let wallet = wallets.get(address).ok_or("Wallet not found")?;
        let private_key_bytes = self.x11.decrypt(&wallet.private_key_encrypted, pin.as_bytes()).map_err(|_| "Decrypt failed")?;
        let secret_key = SecretKey::from_slice(&private_key_bytes).map_err(|_| "Invalid key")?;
        let msg_hash = Sha256::digest(tx_data);
        let message = secp256k1::Message::from_slice(&msg_hash).map_err(|_| "Invalid message")?;
        let signature = self.secp.sign_ecdsa(&message, &secret_key);
        Ok(signature.serialize_compact().to_vec())
    }
    pub fn get_wallet(&self, address: &str) -> Option<Wallet> { self.wallets.lock().unwrap().get(address).cloned() }
    pub fn get_balance_niz(&self, address: &str) -> Option<u64> { self.wallets.lock().unwrap().get(address).map(|w| w.balance_niz) }
    pub fn update_balance(&self, address: &str, balance_niz: u64) -> Result<(), String> { let mut w = self.wallets.lock().unwrap(); w.get_mut(address).map(|w| w.balance_niz = balance_niz).ok_or("Not found".to_string()) }
    pub fn ai_worker_count(&self) -> usize { self.wallets.lock().unwrap().values().filter(|w| w.owner_type == OwnerType::AiWorker).count() }
    pub fn list_ai_wallets(&self) -> Vec<String> { self.wallets.lock().unwrap().values().filter(|w| w.owner_type == OwnerType::AiWorker).map(|w| w.address.clone()).collect() }
    fn verify_pin(&self, owner_id: &str, pin: &str) -> bool { let pins = self.pin_hashes.lock().unwrap(); pins.get(owner_id).map(|s| self.x11.verify_pin(pin.as_bytes(), s)).unwrap_or(false) }
}
