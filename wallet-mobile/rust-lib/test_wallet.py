import ctypes
import os

# Path ke library yang sudah kita build
lib_path = os.path.expanduser("~/XYRON-Crypto-V.2/wallet-mobile/rust-lib/target/release/libxyron_wallet.so")

print("🔍 Memuat library XYRON Wallet...")
try:
    # Load library
    lib = ctypes.CDLL(lib_path)
    print("✅ Library berhasil dimuat!\n")
    
    # Cek fungsi-fungsi yang tersedia
    functions = [
        'generate_mnemonic',
        'derive_keypair_from_mnemonic', 
        'sign_transaction'
    ]
    
    print("📋 Daftar fungsi yang tersedia:")
    for func in functions:
        if hasattr(lib, func):
            print(f"   ✅ {func}")
        else:
            print(f"   ❌ {func} (tidak ditemukan)")
            
    print("\n✨ XYRON Wallet library siap digunakan dari Python!")
    
except Exception as e:
    print(f"❌ Gagal memuat library: {e}")
