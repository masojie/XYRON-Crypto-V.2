use secp256k1::{Secp256k1, SecretKey, PublicKey, Message};
use bip39::{Mnemonic, Language};
use sha2::{Sha256, Digest};
use rand::Rng;
use std::ptr;
use ripemd::Ripemd160;

// ========== GENERATE MNEMONIC ==========
#[no_mangle]
pub extern "C" fn generate_mnemonic(
    out_ptr: *mut u8,
    out_len: *mut usize,
    word_count: u32,
) -> bool {
    let words = if word_count == 24 { 24 } else { 12 };
    let mut entropy = vec![0u8; if words == 12 { 16 } else { 32 }];
    rand::thread_rng().fill(&mut entropy[..]);
    let mnemonic = Mnemonic::from_entropy(&entropy).unwrap();
    let phrase = mnemonic.to_string();
    let bytes = phrase.as_bytes();
    
    unsafe {
        *out_len = bytes.len();
        ptr::copy_nonoverlapping(bytes.as_ptr(), out_ptr, bytes.len());
    }
    true
}

// ========== VALIDATE MNEMONIC ==========
#[no_mangle]
pub extern "C" fn validate_mnemonic(
    mnemonic_ptr: *const u8,
    mnemonic_len: usize,
) -> bool {
    let mnemonic_str = unsafe {
        std::str::from_utf8(std::slice::from_raw_parts(mnemonic_ptr, mnemonic_len)).unwrap()
    };
    Mnemonic::parse_in_normalized(Language::English, mnemonic_str).is_ok()
}

// ========== DERIVE KEYPAIR DARI MNEMONIC ==========
#[no_mangle]
pub extern "C" fn derive_keypair(
    mnemonic_ptr: *const u8,
    mnemonic_len: usize,
    out_pubkey_ptr: *mut u8,
    out_privkey_ptr: *mut u8,
) -> bool {
    let mnemonic_str = unsafe {
        std::str::from_utf8(std::slice::from_raw_parts(mnemonic_ptr, mnemonic_len)).unwrap()
    };
    
    let mnemonic = match Mnemonic::parse_in_normalized(Language::English, mnemonic_str) {
        Ok(m) => m,
        Err(_) => return false,
    };
    
    let seed = mnemonic.to_seed("");
    
    let mut hasher = Sha256::new();
    hasher.update(&seed);
    let hash = hasher.finalize();
    
    let secp = Secp256k1::new();
    let secret_key = match SecretKey::from_slice(&hash[..32]) {
        Ok(sk) => sk,
        Err(_) => return false,
    };
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);

    let pubkey_serialized = public_key.serialize_uncompressed();
    let privkey_bytes = secret_key.secret_bytes();

    unsafe {
        ptr::copy_nonoverlapping(pubkey_serialized.as_ptr(), out_pubkey_ptr, pubkey_serialized.len());
        ptr::copy_nonoverlapping(privkey_bytes.as_ptr(), out_privkey_ptr, privkey_bytes.len());
    }
    true
}

// ========== DERIVE ADDRESS (Base58Check) ==========
#[no_mangle]
pub extern "C" fn derive_address(
    pubkey_ptr: *const u8,
    pubkey_len: usize,
    out_addr_ptr: *mut u8,
    out_addr_len: *mut usize,
) -> bool {
    let pubkey_bytes = unsafe {
        std::slice::from_raw_parts(pubkey_ptr, pubkey_len)
    };
    
    // SHA256 dari public key
    let sha256 = Sha256::digest(pubkey_bytes);
    
    // RIPEMD160 dari SHA256 pakai crate ripemd
    let mut hasher = Ripemd160::new();
    hasher.update(&sha256);
    let ripemd160 = hasher.finalize();
    
    // Tambahkan prefix (0x00 untuk mainnet)
    let mut payload = vec![0x00];
    payload.extend_from_slice(&ripemd160);
    
    // Double SHA256 untuk checksum
    let checksum = Sha256::digest(&Sha256::digest(&payload));
    let checksum_bytes = &checksum[..4];
    payload.extend_from_slice(checksum_bytes);
    
    // Base58 encode
    let address = bs58::encode(payload).into_string();
    let bytes = address.as_bytes();
    
    unsafe {
        *out_addr_len = bytes.len();
        ptr::copy_nonoverlapping(bytes.as_ptr(), out_addr_ptr, bytes.len());
    }
    true
}

// ========== SIGN TRANSACTION ==========
#[no_mangle]
pub extern "C" fn sign_transaction(
    privkey_ptr: *const u8,
    privkey_len: usize,
    message_ptr: *const u8,
    message_len: usize,
    signature_out: *mut u8,
) -> bool {
    let privkey_bytes = unsafe {
        std::slice::from_raw_parts(privkey_ptr, privkey_len)
    };
    let message_bytes = unsafe {
        std::slice::from_raw_parts(message_ptr, message_len)
    };

    let secp = Secp256k1::new();
    let secret_key = match SecretKey::from_slice(privkey_bytes) {
        Ok(sk) => sk,
        Err(_) => return false,
    };

    let mut hasher = Sha256::new();
    hasher.update(message_bytes);
    let hash = hasher.finalize();
    let msg = match Message::from_slice(&hash) {
        Ok(m) => m,
        Err(_) => return false,
    };

    let rec_sig = secp.sign_ecdsa_recoverable(&msg, &secret_key);
    let (recovery_id, signature) = rec_sig.serialize_compact();
    let mut out = vec![recovery_id.to_i32() as u8];
    out.extend_from_slice(&signature);
    unsafe {
        ptr::copy_nonoverlapping(out.as_ptr(), signature_out, out.len());
    }
    true
}
