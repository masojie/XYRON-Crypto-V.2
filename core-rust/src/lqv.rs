// core-rust/src/lqv.rs
//! Logic-Quantum Verification (LQV)
//!
//! Implementasi tanda tangan digital menggunakan Ed25519 (Curve25519)
//! — battle-tested, cepat, aman untuk produksi skala XYRON sekarang.
//!
//! Upgrade path ke post-quantum:
//!   Ganti Ed25519Keypair dengan CRYSTALS-Dilithium dari crate `pqcrypto-dilithium`
//!   tanpa mengubah interface sign() dan verify() di bawah.

use ed25519_dalek::{
    Keypair, PublicKey, SecretKey, Signature, Signer, Verifier,
    SECRET_KEY_LENGTH, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH,
};
use rand::rngs::OsRng;
use sha2::{Sha256, Digest};

// ─── LQV ────────────────────────────────────────────────────────────────────

pub struct LQV;

impl LQV {
    pub fn new() -> Self {
        Self
    }

    /// Generate keypair baru menggunakan Ed25519
    pub fn generate_keypair(&self) -> (LQVPrivateKey, LQVPublicKey) {
        let mut csprng = OsRng;
        let keypair = Keypair::generate(&mut csprng);
        (
            LQVPrivateKey(keypair.secret.to_bytes().to_vec()),
            LQVPublicKey(keypair.public.to_bytes().to_vec()),
        )
    }

    /// Derive public key dari private key
    pub fn derive_public(&self, private: &LQVPrivateKey) -> Result<LQVPublicKey, String> {
        let secret = SecretKey::from_bytes(&private.0)
            .map_err(|_| "Invalid private key".to_string())?;
        let public: PublicKey = (&secret).into();
        Ok(LQVPublicKey(public.to_bytes().to_vec()))
    }

    /// Tanda tangani pesan dengan private key
    /// Pesan di-hash dulu dengan SHA-256 sebelum ditandatangani
    pub fn sign(&self, private_key: &LQVPrivateKey, message: &[u8]) -> Result<LQVSignature, String> {
        if private_key.0.len() != SECRET_KEY_LENGTH {
            return Err(format!(
                "Private key harus {} bytes, dapat {} bytes",
                SECRET_KEY_LENGTH,
                private_key.0.len()
            ));
        }

        let secret = SecretKey::from_bytes(&private_key.0)
            .map_err(|_| "Invalid private key".to_string())?;
        let public: PublicKey = (&secret).into();
        let keypair = Keypair { secret, public };

        // Hash pesan dulu
        let msg_hash = Self::hash_message(message);
        let signature = keypair.sign(&msg_hash);

        Ok(LQVSignature(signature.to_bytes().to_vec()))
    }

    /// Verifikasi tanda tangan dengan public key
    pub fn verify(
        &self,
        public_key: &LQVPublicKey,
        message: &[u8],
        signature: &LQVSignature,
    ) -> bool {
        if public_key.0.len() != PUBLIC_KEY_LENGTH {
            return false;
        }
        if signature.0.len() != SIGNATURE_LENGTH {
            return false;
        }

        let Ok(pub_key) = PublicKey::from_bytes(&public_key.0) else {
            return false;
        };
        let Ok(sig) = Signature::from_bytes(&signature.0) else {
            return false;
        };

        let msg_hash = Self::hash_message(message);
        pub_key.verify(&msg_hash, &sig).is_ok()
    }

    /// Hash pesan dengan SHA-256 sebelum sign/verify
    fn hash_message(message: &[u8]) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(message);
        hasher.finalize().to_vec()
    }
}

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct LQVPrivateKey(pub Vec<u8>);

#[derive(Clone, Debug)]
pub struct LQVPublicKey(pub Vec<u8>);

#[derive(Clone, Debug)]
pub struct LQVSignature(pub Vec<u8>);

impl LQVPublicKey {
    pub fn to_hex(&self) -> String {
        hex::encode(&self.0)
    }

    pub fn from_hex(s: &str) -> Result<Self, String> {
        hex::decode(s)
            .map(LQVPublicKey)
            .map_err(|_| "Invalid hex public key".to_string())
    }
}

impl LQVSignature {
    pub fn to_hex(&self) -> String {
        hex::encode(&self.0)
    }

    pub fn from_hex(s: &str) -> Result<Self, String> {
        hex::decode(s)
            .map(LQVSignature)
            .map_err(|_| "Invalid hex signature".to_string())
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_verify_valid() {
        let lqv = LQV::new();
        let (priv_key, pub_key) = lqv.generate_keypair();
        let msg = b"Transfer 10 XYR ke wallet XYRON";
        let sig = lqv.sign(&priv_key, msg).unwrap();
        assert!(lqv.verify(&pub_key, msg, &sig));
    }

    #[test]
    fn test_verify_pesan_berbeda_gagal() {
        let lqv = LQV::new();
        let (priv_key, pub_key) = lqv.generate_keypair();
        let msg = b"Transfer 10 XYR";
        let sig = lqv.sign(&priv_key, msg).unwrap();
        let msg_palsu = b"Transfer 1000 XYR"; // diubah!
        assert!(!lqv.verify(&pub_key, msg_palsu, &sig));
    }

    #[test]
    fn test_verify_pubkey_salah_gagal() {
        let lqv = LQV::new();
        let (priv_key, _) = lqv.generate_keypair();
        let (_, pub_key_lain) = lqv.generate_keypair(); // keypair berbeda
        let msg = b"hello";
        let sig = lqv.sign(&priv_key, msg).unwrap();
        assert!(!lqv.verify(&pub_key_lain, msg, &sig));
    }

    #[test]
    fn test_derive_public_konsisten() {
        let lqv = LQV::new();
        let (priv_key, pub_key) = lqv.generate_keypair();
        let derived = lqv.derive_public(&priv_key).unwrap();
        assert_eq!(pub_key.0, derived.0);
    }

    #[test]
    fn test_keypair_unik() {
        let lqv = LQV::new();
        let (priv1, pub1) = lqv.generate_keypair();
        let (priv2, pub2) = lqv.generate_keypair();
        assert_ne!(priv1.0, priv2.0);
        assert_ne!(pub1.0, pub2.0);
    }
}
