use secp256k1::{Secp256k1, SecretKey, PublicKey, Message};
use bip39::{Mnemonic, Language};
use sha2::{Sha256, Digest};
use rand::Rng;
use std::ptr;
use ripemd::Ripemd160;
use std::ffi::CStr;
use std::os::raw::c_char;

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
    
    let sha256 = Sha256::digest(pubkey_bytes);
    let mut hasher = Ripemd160::new();
    hasher.update(&sha256);
    let ripemd160 = hasher.finalize();
    
    let mut payload = vec![0x00];
    payload.extend_from_slice(&ripemd160);
    let checksum = Sha256::digest(&Sha256::digest(&payload));
    payload.extend_from_slice(&checksum[..4]);
    let address = bs58::encode(payload).into_string();
    let bytes = address.as_bytes();
    
    unsafe {
        *out_addr_len = bytes.len();
        ptr::copy_nonoverlapping(bytes.as_ptr(), out_addr_ptr, bytes.len());
    }
    true
}

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

#[no_mangle]
pub extern "C" fn save_wallet_to_file(
    mnemonic_ptr: *const u8,
    mnemonic_len: usize,
    pin_ptr: *const u8,
    pin_len: usize,
    file_path_ptr: *const c_char,
) -> bool {
    use std::fs::File;
    use std::io::Write;
    use hex;
    
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
    let pubkey_bytes = public_key.serialize_uncompressed();
    let privkey_bytes = secret_key.secret_bytes();
    
    let pin_bytes = unsafe {
        std::slice::from_raw_parts(pin_ptr, pin_len)
    };
    
    let mut salt = [0u8; 16];
    rand::thread_rng().fill(&mut salt);
    
    let mut derived_key = [0u8; 32];
    let _ = pbkdf2::pbkdf2::<hmac::Hmac<Sha256>>(pin_bytes, &salt, 10000, &mut derived_key);
    
    let mut encrypted_privkey = privkey_bytes.to_vec();
    for i in 0..encrypted_privkey.len() {
        encrypted_privkey[i] ^= derived_key[i % derived_key.len()];
    }
    
    let file_path = unsafe {
        CStr::from_ptr(file_path_ptr).to_str().unwrap()
    };
    
    let data = format!(
        "XYRON_WALLET_V1\n{}\n{}\n{}\n{}\n",
        hex::encode(&salt),
        hex::encode(&encrypted_privkey),
        hex::encode(&pubkey_bytes),
        hex::encode(mnemonic_str.as_bytes())
    );
    
    let mut file = match File::create(file_path) {
        Ok(f) => f,
        Err(_) => return false,
    };
    
    match file.write_all(data.as_bytes()) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[no_mangle]
pub extern "C" fn load_wallet_from_file(
    file_path_ptr: *const c_char,
    pin_ptr: *const u8,
    pin_len: usize,
    out_mnemonic_ptr: *mut u8,
    out_mnemonic_len: *mut usize,
) -> bool {
    use std::fs;
    use hex;
    
    let file_path = unsafe {
        CStr::from_ptr(file_path_ptr).to_str().unwrap()
    };
    
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return false,
    };
    
    let lines: Vec<&str> = content.lines().collect();
    if lines.len() < 5 {
        return false;
    }
    
    let salt = match hex::decode(lines[1]) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let encrypted_privkey = match hex::decode(lines[2]) {
        Ok(e) => e,
        Err(_) => return false,
    };
    let stored_pubkey = match hex::decode(lines[3]) {
        Ok(p) => p,
        Err(_) => return false,
    };
    let stored_mnemonic = match hex::decode(lines[4]) {
        Ok(m) => m,
        Err(_) => return false,
    };
    
    let pin_bytes = unsafe {
        std::slice::from_raw_parts(pin_ptr, pin_len)
    };
    
    let mut derived_key = [0u8; 32];
    let _ = pbkdf2::pbkdf2::<hmac::Hmac<Sha256>>(pin_bytes, &salt, 10000, &mut derived_key);
    
    let mut decrypted_privkey = encrypted_privkey.clone();
    for i in 0..decrypted_privkey.len() {
        decrypted_privkey[i] ^= derived_key[i % derived_key.len()];
    }
    
    let secp = Secp256k1::new();
    let secret_key = match SecretKey::from_slice(&decrypted_privkey) {
        Ok(sk) => sk,
        Err(_) => return false,
    };
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);
    let pubkey_bytes = public_key.serialize_uncompressed();
    
    if pubkey_bytes != stored_pubkey.as_slice() {
        return false;
    }
    
    unsafe {
        *out_mnemonic_len = stored_mnemonic.len();
        ptr::copy_nonoverlapping(stored_mnemonic.as_ptr(), out_mnemonic_ptr, stored_mnemonic.len());
    }
    true
        }
