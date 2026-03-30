// core-rust/src/lqv.rs
use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature, Signer, Verifier, SECRET_KEY_LENGTH, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH};
use rand::rngs::OsRng;
use sha2::{Sha256, Digest};
pub struct LQV;
impl LQV {
    pub fn new() -> Self { Self }
    pub fn generate_keypair(&self) -> (LQVPrivateKey, LQVPublicKey) {
        let mut csprng = OsRng;
        let keypair = Keypair::generate(&mut csprng);
        (LQVPrivateKey(keypair.secret.to_bytes().to_vec()), LQVPublicKey(keypair.public.to_bytes().to_vec()))
    }
    pub fn sign(&self, private_key: &LQVPrivateKey, message: &[u8]) -> Result<LQVSignature, String> {
        let secret = SecretKey::from_bytes(&private_key.0).map_err(|_| "Invalid key".to_string())?;
        let public: PublicKey = (&secret).into();
        let keypair = Keypair { secret, public };
        let hash = Sha256::digest(message);
        Ok(LQVSignature(keypair.sign(&hash).to_bytes().to_vec()))
    }
    pub fn verify(&self, public_key: &LQVPublicKey, message: &[u8], signature: &LQVSignature) -> bool {
        let Ok(pub_key) = PublicKey::from_bytes(&public_key.0) else { return false; };
        let Ok(sig) = Signature::from_bytes(&signature.0) else { return false; };
        let hash = Sha256::digest(message);
        pub_key.verify(&hash, &sig).is_ok()
    }
}
#[derive(Clone)] pub struct LQVPrivateKey(pub Vec<u8>);
#[derive(Clone, Debug)] pub struct LQVPublicKey(pub Vec<u8>);
#[derive(Clone, Debug)] pub struct LQVSignature(pub Vec<u8>);
