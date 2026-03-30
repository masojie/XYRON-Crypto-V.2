XYRON Blockchain – X11-Nano Dynamic Shield & Triple-Engine Validation

XYRON adalah blockchain generasi baru dengan kecepatan tinggi, keamanan adaptif, dan AI‑powered governance. Dibangun dengan Rust untuk core engine dan Node.js untuk API gateway, XYRON memperkenalkan Triple‑Engine Validation (LQV + PEP + NCE) dan X11‑Nano Dynamic Shield yang meningkatkan lapisan hash secara otomatis saat anomali terdeteksi.

---

📌 Fitur Utama

Fitur Deskripsi
X11‑Nano Dynamic Shield 11–15 lapisan hash paralel, kompresi pintar (zstd), enkripsi AES‑256‑GCM. Lapisan bertambah saat ancaman naik.
Triple‑Engine Validation Tiga mekanisme independen: LQV (tanda tangan Ed25519), PEP (konsensus real‑time), NCE (validasi komunitas).
AI Governance Maksimal 21 AI Master dengan aturan trading, patroli AI Army, dan pewarisan memori ke AI pengganti.
Tokenomics Deflasi Supply 6,657,700 XYR. Setiap transaksi burn 6% dan lock 4%. Reward block halving hingga ~93 tahun.
Vault Terenkripsi Private key disimpan dengan X11‑Nano + AES‑256‑GCM, PIN di‑hash. Address dimulai dengan huruf 'X'.

---

🏗️ Arsitektur

```
┌─────────────────┐         ┌──────────────────────────────────┐
│   Node.js API   │ ◄─────► │        Rust Core Engine         │
│   Gateway       │  socket │  (X11‑Nano, LQV, PEP, NCE, Vault)│
│   (express)     │         │                                  │
└─────────────────┘         └──────────────────────────────────┘
```

· Node.js Gateway – REST API, distribusi reward tiap 3 menit, penyimpanan blok JSON.
· Rust Core – semua kriptografi, konsensus, wallet, dan AI governance, berjalan sebagai daemon.

Komunikasi melalui Unix socket /tmp/xyron-core.sock.

---

🔧 Komponen Inti

1. X11‑Nano Dynamic Shield

· 11 layer normal → 13 (Elevated) → 15 (Critical) saat anomali.
· Parallel hashing dengan rayon, kompresi zstd, enkripsi AES‑256‑GCM dengan nonce acak.

2. Logic‑Quantum Verification (LQV)

· Tanda tangan digital Ed25519 (cepat, aman). Siap di‑upgrade ke post‑quantum (CRYSTALS‑Dilithium) tanpa mengubah interface.

3. Parallel Echo‑Pulse (PEP)

· Konsensus kecepatan: semua node mengirim pulse → balas echo → mayoritas echo sama → valid.
· Deteksi anomali (node lambat/inkonsisten) → memicu scale up X11‑Nano.

4. Nexus Community Engine (NCE)

· Setiap member punya digital fingerprint unik (X11‑Nano hash dari member ID + wallet + timestamp).
· Transaksi perlu 3 fingerprint (6 untuk >100 XYR) untuk valid.
· Reputasi naik/turun berdasarkan kebenaran validasi. AI bisa jadi validator otomatis.

5. Vault – Wallet Aman

· Private key dienkripsi dengan X11‑Nano + AES‑256‑GCM menggunakan PIN user.
· Address: PublicKey → SHA256 → X11‑Nano cap → RIPEMD160 → Base58Check → awalan 'X'.
· Maksimal 21 AI worker.

6. Reward & Tokenomics

· 1 XYR = 1.000.000 nIZ (tanpa floating point).
· Max supply: 6.657.700 XYR (termasuk 100 XYR genesis AI fund).
· Block time: 180 detik.
· Reward schedule (XYR/block): 6 → 5 → 4 → 3 → 2.5 → 1.25 → 0.625 → 0.3125 → halving tiap 4 tahun.
· Burn & Lock: setiap transaksi 6% burn permanen, 4% lock.
· Mining pools: PC (60% reward, 11 layer), smartphone (40% reward, 5 layer).

7. AI Governance

· Maksimal 21 AI Master. Aturan: ≤10 XYR/tx, ≤50 tx/hari, dilarang transfer keluar ekosistem.
· Win rate menentukan tier: Elite (>65%), Active (45–65%), Probation (<45%), Terminated (dipecat).
· AI Army Patrol setiap 10 blok → peringatan atau terminasi.
· Memory inheritance: AI pengganti mewarisi total trades, win rate, pola dari pendahulu.

---

🚀 Instalasi & Menjalankan

Prasyarat

· Node.js 18+, npm
· Rust (cargo)
· Linux/macOS (Unix socket)

```bash
# 1. Clone repositori
git clone https://github.com/xyron/xyron-blockchain.git
cd xyron-blockchain

# 2. Build Rust core
cd core-rust
cargo build --release
cd ..

# 3. Install dependencies Node.js
cd server-node
npm install

# 4. Jalankan Rust core (terminal terpisah)
cd core-rust
cargo run --release
# Socket akan dibuat di /tmp/xyron-core.sock

# 5. Jalankan Node.js gateway
cd server-node
node server.js
# Gateway berjalan di http://localhost:3000
```

---

🌐 API Endpoints (Node.js Gateway)

Method Endpoint Deskripsi
GET /health Status node & blockchain
GET /tokenomics Parameter tokenomics
GET /stats Statistik lengkap (blockchain, supply, AI)
GET /blocks 10 blok terakhir
GET /blocks/:height Detail blok tertentu
POST /wallet/create Buat wallet user (body: user_id, pin)
GET /wallet/:address/balance Saldo dalam XYR
POST /wallet/send Kirim XYR (body: from_address, to_address, amount_xyr, owner_id, pin)
POST /mining/register Daftar miner (address, device_type: pc/smartphone)
POST /mining/submit Submit proof (address, proof_hash)
GET /ai/workers Daftar AI worker
GET /ai/status/:agent_id Status AI
POST /ai/trade Laporkan hasil trading (agent_id, win, amount_xyr)
POST /ai/army/patrol Panggil patroli AI Army
POST /ai/replace Ganti AI yang dipecat (agent_id, new_pin)

Semua endpoint mengembalikan JSON.

---

🧪 Testing

```bash
cd core-rust
cargo test
```

Test mencakup reward schedule, X11‑Nano, vault enkripsi, triple‑engine, dan AI governance.

---

🗺️ Roadmap

· Jaringan P2P (libp2p)
· Konsensus penuh PoS + mining
· Upgrade LQV ke post‑quantum (Dilithium)
· Web Wallet & Block Explorer
· Smart Contract WASM

---

📄 Lisensi

MIT – bebas digunakan dan dimodifikasi.

---

XYRON – The Shielded Blockchain for AI Economy
🌐 Website | 📄 Whitepaper | 💬 Discord

Dibangun dengan kecepatan Rust, disempurnakan oleh kecerdasan AI.
