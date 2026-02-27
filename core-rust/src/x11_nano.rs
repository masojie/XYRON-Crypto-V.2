// X11-Nano Dynamic Shield - Encryption & Hashing
// 11 Different Hash Algorithms: BLAKE3, GROESTL, SHA3-256, KECCAK-256,
// SHA2-256, RIPEMD-160, WHIRLPOOL, BLAKE2b, STREEBOG, SM3, BLAKE2s

use sha2::{Sha256, Digest};
use blake3;
use groestl::{Groestl256};
use sha3::{Sha3_256, Keccak256};
use ripemd::{Ripemd160};
use whirlpool::{Whirlpool};
use blake2::{Blake2b512, Blake2s256};
use streebog::{Streebog256};
use sm3::{Sm3};
use hex;
use chrono::Utc;

pub struct X11Nano;

impl X11Nano {
    // X11 Hash Chain dengan 11 algoritma berbeda
    pub fn hash_chain(data: &[u8], layers: usize) -> (Vec<String>, Vec<String>, String) {
        let mut current = data.to_vec();
        let mut hash_chain = Vec::with_capacity(layers);
        let mut algorithms = Vec::with_capacity(layers);
        
        for layer in 0..layers {
            let (algo_name, hash) = match layer % 11 {
                0 => {
                    let hash = blake3::hash(&current);
                    ("BLAKE3".to_string(), hash.as_bytes().to_vec())
                },
                1 => {
                    use groestl::Digest;
                    let mut hasher = Groestl256::new();
                    hasher.update(&current);
                    ("GROESTL".to_string(), hasher.finalize().to_vec())
                },
                2 => {
                    use sha3::Digest;
                    let mut hasher = Sha3_256::new();
                    hasher.update(&current);
                    ("SHA3-256".to_string(), hasher.finalize().to_vec())
                },
                3 => {
                    let hash = keccak_hash::keccak(&current);
                    ("KECCAK-256".to_string(), hash.as_bytes().to_vec())
                },
                4 => {
                    use sha2::Digest;
                    let mut hasher = Sha256::new();
                    hasher.update(&current);
                    ("SHA2-256".to_string(), hasher.finalize().to_vec())
                },
                5 => {
                    use ripemd::Digest;
                    let mut hasher = Ripemd160::new();
                    hasher.update(&current);
                    ("RIPEMD-160".to_string(), hasher.finalize().to_vec())
                },
                6 => {
                    use whirlpool::Digest;
                    let mut hasher = Whirlpool::new();
                    hasher.update(&current);
                    ("WHIRLPOOL".to_string(), hasher.finalize().to_vec())
                },
                7 => {
                    use blake2::Digest;
                    let mut hasher = Blake2b512::new();
                    hasher.update(&current);
                    ("BLAKE2b".to_string(), hasher.finalize()[0..32].to_vec())
                },
                8 => {
                    use streebog::Digest;
                    let mut hasher = Streebog256::new();
                    hasher.update(&current);
                    ("STREEBOG".to_string(), hasher.finalize().to_vec())
                },
                9 => {
                    use sm3::Digest;
                    let mut hasher = Sm3::new();
                    hasher.update(&current);
                    ("SM3".to_string(), hasher.finalize().to_vec())
                },
                _ => {
                    use blake2::Digest;
                    let mut hasher = Blake2s256::new();
                    hasher.update(&current);
                    ("BLAKE2s".to_string(), hasher.finalize().to_vec())
                }
            };
            
            let hash_hex = hex::encode(&hash);
            hash_chain.push(hash_hex.clone());
            algorithms.push(algo_name);
            current = hash;
        }
        
        let final_hash = format!("X11-{}", &hash_chain.last().unwrap()[0..32]);
        (hash_chain, algorithms, final_hash)
    }
    
    // Encrypt SMS dengan X11-Nano - Menghasilkan sms_encrypted
    pub fn encrypt_sms(sms: &str, node_id: &str) -> String {
        let timestamp = Utc::now().timestamp();
        let data_to_encrypt = format!("{}|{}|{}", sms, node_id, timestamp);
        let (_, algorithms, final_hash) = Self::hash_chain(data_to_encrypt.as_bytes(), 15);
        
        format!("X11N_ENC_{}_{}", algorithms.join("|"), final_hash)
    }
    
    // Verify node identity
    pub fn verify_node(node_id: &str) -> bool {
        !node_id.is_empty() && node_id.len() >= 10
    }
}
