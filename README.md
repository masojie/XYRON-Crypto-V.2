# XYRON Blockchain
### X11‑Nano Dynamic Shield · Triple‑Engine Validation · AI Governance

[![Rust](https://img.shields.io/badge/rust-1.80+-orange.svg)](https://www.rust-lang.org)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![XYRON](https://img.shields.io/badge/network-XYRON-cyan)](https://xyron.io)

> **Kecepatan Rust, keamanan adaptif, dan kecerdasan AI dalam satu blockchain terdesentralisasi.**  
> XYRON menggabungkan konsensus triple‑engine (LQV + PEP + NCE) dengan X11‑Nano Dynamic Shield yang secara otomatis meningkatkan lapisan hash saat anomali terdeteksi.

---

## ✨ Fitur Unggulan

- **X11‑Nano Dynamic Shield** – 11–15 lapisan hash paralel, kompresi zstd, enkripsi AES‑256‑GCM. Lapisan bertambah saat ancaman meningkat.
- **Triple‑Engine Validation** – LQV (Ed25519 signature), PEP (konsensus real‑time), NCE (validasi komunitas) – tiga lapisan independen.
- **AI Governance** – Maksimal 21 AI Master, patroli AI Army, pewarisan memori (memory inheritance) untuk AI pengganti.
- **Tokenomics Deflasi** – Supply 6,657,700 XYR. Setiap transaksi **burn 6%** dan **lock 4%** permanen. Reward block halving hingga ~93 tahun.
- **Vault Terenkripsi** – Private key disimpan dengan X11‑Nano + AES‑256‑GCM. Address dimulai dengan huruf `X`.
- **Komunikasi IPC** – Node.js ↔ Rust via Unix socket, latensi rendah dan aman.

---

## 🏗️ Arsitektur


┌─────────────────────┐      ┌───────────────────────────────────────────┐
│   Node.js Gateway   │◄────►│          Rust Core Engine                │
│   (Express + API)   │ sock │  • X11‑Nano Dynamic Shield               │
│                     │      │  • LQV (Ed25519 / post‑quantum ready)    │
│  • REST endpoints   │      │  • PEP (Parallel Echo‑Pulse)             │
│  • Heartbeat (3 min)│      │  • NCE (Nexus Community Engine)          │
│  • Block storage    │      │  • Vault (encrypted wallet)              │
│                     │      │  • Reward Engine + Tokenomics            │
└─────────────────────┘      │  • AI Governance                         │
└───────────────────────────────────────────┘

---

## 🔧 Komponen Inti

### 1. X11‑Nano Dynamic Shield
- Layer dinamis: 11 (normal) → 13 (elevated) → 15 (critical) saat PEP mendeteksi anomali.
- Parallel hashing menggunakan rayon → multi‑core CPU.
- Smart compression: zstd sebelum memasuki pipeline.
- Enkripsi: AES‑256‑GCM dengan nonce acak untuk menyimpan private key.

### 2. Logic‑Quantum Verification (LQV)
- Implementasi Ed25519 (Curve25519) – cepat dan aman.
- Mudah di‑upgrade ke algoritma post‑quantum (CRYSTALS‑Dilithium).

### 3. Parallel Echo‑Pulse (PEP)
- Pulse: broadcast data ke semua node.
- Echo: setiap node membalas dengan hash state mereka.
- Konsensus: 67% echo identik → valid.
- Anomali: node lambat/inkonsisten ditandai → panggil callback untuk naikkan level ancaman X11‑Nano.

### 4. Nexus Community Engine (NCE)
- Digital fingerprint unik: `X11‑Nano(member_id + wallet + timestamp)`.
- Validasi komunitas: transaksi normal butuh 3 fingerprint, transaksi besar (>100 XYR) butuh 6.
- Reputasi: validasi benar menaikkan skor, salah menurunkan.
- Auto‑validate oleh AI worker saat komunitas sepi.

### 5. Vault – Wallet Aman
- Private key dienkripsi dengan X11‑Nano + AES‑256‑GCM menggunakan PIN user.
- PIN disimpan sebagai hash X11‑Nano.
- Derivation address:  
  `PublicKey → SHA256 → X11‑Nano cap → RIPEMD160 → Base58Check` → awalan `X`.
- Maksimal 21 AI worker.

### 6. Reward & Tokenomics
- Unit terkecil: nIZ (1 XYR = 1.000.000 nIZ) – hindari floating point.
- Max supply: 6.657.700 XYR (termasuk 100 XYR genesis untuk AI fund).
- Block time: 180 detik.
- Reward schedule (XYR/block):  
  6.0 → 5.0 → 4.0 → 3.0 → 2.5 → 1.25 → 0.625 → 0.3125 → halving setiap 4 tahun.
- Deflasi: setiap transaksi membakar 6% dan mengunci 4% selamanya.
- Mining pools: PC (60% reward, 11 layer), smartphone (40% reward, 5 layer).

### 7. AI Governance
- Maksimal 21 AI Master dengan aturan:  
  - Trading ≤10 XYR/tx (perlu persetujuan Army jika lebih)  
  - Maksimal 50 tx/hari  
  - Dilarang transfer keluar ekosistem, kolusi, dsb.
- Win rate menentukan tier: **Elite** (>65%), **Active** (45–65%), **Probation** (<45%), **Terminated** (dipecat).
- AI Army Patrol setiap 10 blok → peringatan atau terminasi.
- Memory inheritance: AI pengganti mewarisi total trades, win rate, pola sukses/gagal dari pendahulu.

---

## 🚀 Quick Start

### Prasyarat
- Node.js ≥18, npm
- Rust (cargo)
- Linux / macOS (Unix socket)

# XYRON Blockchain — Quick Start

## 🚀 Instalasi & Menjalankan

```bash
# 1. Clone repository
git clone https://github.com/xyron/xyron-blockchain.git
cd xyron-blockchain

# 2. Build Rust core
cd core-rust
cargo build --release
cd ..

# 3. Install dependencies Node.js
cd server-node
npm install

# 4. Jalankan Rust core (terminal 1)
cd core-rust
cargo run --release

# 5. Jalankan Node.js gateway (terminal 2)
cd server-node
node server.js


---

🌐 API Endpoints

Method Endpoint Deskripsi
GET /health Status node & blockchain
GET /tokenomics Parameter tokenomics
GET /stats Statistik lengkap (blockchain, supply, AI, PEP, NCE)
GET /blocks 10 blok terakhir
GET /blocks/:height Detail blok tertentu
POST /wallet/create Buat wallet user (user_id, pin)
GET /wallet/:address/balance Saldo dalam XYR
POST /wallet/send Kirim XYR (from_address, to_address, amount_xyr, owner_id, pin)
POST /mining/register Daftar miner (address, device_type: pc/smartphone)
POST /mining/submit Submit proof (address, proof_hash)
GET /ai/workers Daftar AI worker
GET /ai/status/:agent_id Status AI (win rate, tier, dll)
POST /ai/trade Laporkan hasil trading (agent_id, win, amount_xyr)
POST /ai/army/patrol Panggil patroli AI Army
POST /ai/replace Ganti AI yang dipecat (agent_id, new_pin)

Semua endpoint mengembalikan JSON. Contoh:
curl
  -X POST http://localhost:3000/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"user_id":"alice","pin":"1234"}'


---

🧪 Testing

```bash
cd core-rust
cargo test
```

Test mencakup:

· Reward schedule dan batas supply
· Konsistensi X11‑Nano hash
· Enkripsi/dekripsi vault
· Triple‑engine validation flow
· AI governance (win rate, terminasi, pewarisan memori)

---

🗺️ Roadmap

· Jaringan P2P – ganti komunikasi socket dengan libp2p
· Konsensus penuh – integrasi PoS + mining
· Post‑Quantum upgrade – LQV beralih ke CRYSTALS‑Dilithium
· Web Wallet & Block Explorer – UI interaktif
· Smart Contract – dukungan WASM

---

📄 Lisensi

MIT – bebas digunakan dan dimodifikasi.

---

🌐 Komunitas

· 🌍 Website
· 📄 Whitepaper
· 💬 Discord
· 🐦 Twitter

---

XYRON – The Shielded Blockchain for AI Economy
Dibangun dengan kecepatan Rust, disempurnakan oleh kecerdasan AI.

