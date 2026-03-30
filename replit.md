# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── xyron-wallet/       # XYRON Wallet frontend (React + Vite)
├── core-rust/              # XYRON Blockchain Core (Rust)
│   ├── Cargo.toml          # Rust dependencies (secp256k1, ed25519, sha2, aes-gcm, rayon, zstd, etc.)
│   └── src/
│       ├── main.rs         # Entry point + Unix socket server + Triple-Engine handler
│       ├── x11_nano.rs     # X11-Nano Dynamic Shield (11-15 layers, parallel hashing)
│       ├── lqv.rs          # Logic-Quantum Verification (Ed25519 signatures)
│       ├── pep.rs          # Parallel Echo-Pulse (2/3 consensus)
│       ├── nce.rs          # Nexus Community Engine (fingerprint validation)
│       ├── vault.rs        # Encrypted key vault (secp256k1 + AES-256-GCM)
│       ├── reward.rs       # Tokenomics + block reward schedule
│       └── ai_governance.rs# AI Master governance (max 21, win rate, memory inheritance)
├── server-node/            # XYRON API Gateway (Node.js + Express)
│   └── server.js           # REST API bridge → Rust core via Unix socket /tmp/xyron-go.sock
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## XYRON Blockchain Specs

- **Max Supply**: 6,657,700 XYR | 1 XYR = 1,000,000 nIZ
- **Block time**: 180 detik | **Burn**: 6% per tx | **Lock**: 4% per tx
- **X11-Nano**: 11 layer normal → 13 elevated → 15 critical (dynamic scaling)
- **Triple-Engine**: LQV (Ed25519) → PEP (2/3 consensus) → NCE (fingerprint)
- **AI Workers**: max 21 | win rate min 45% | memory inheritance saat replace
- **Unix socket**: Rust core `/tmp/xyron-core.sock` | Node.js → Rust `/tmp/xyron-go.sock`
- **GitHub**: https://github.com/masojie/XYRON-Crypto-V.2

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Artifacts

### `artifacts/xyron-wallet` — XYRON Wallet V.2 (React + Vite, port via `$PORT`)

Mobile-first crypto wallet UI for the XYRON Blockchain. Built from the original `xyron-wallet-v2-updated.html` design (DM Sans / DM Mono fonts, green/dark CSS variables).

**Pages (5 tabs in bottom nav):**
- **Wallet (Home)** — balance, Send/Exchange actions, recent transactions, dark mode toggle
- **Explorer** — block list with live heartbeat countdown, block details, search
- **Mining** — AI Nexus V3 monitor: hash rate, blocks found, rewards, efficiency, live logs. START ALL button triggers sequential system startup sequence
- **Army** — ARMY-01/02/03 guardian agent cards (expandable), PID, uptime, task count, live per-agent logs
- **Profile/Assets** — user profile, tokenomics, triple-engine status, asset list

**Key behaviors:**
- `systemStatus` state (`idle | starting | running`) is shared between Mining and Army pages
- START ALL (in Mining page) simulates `start-all.sh` order: Blockchain Core → AI Nexus V3 → ARMY-01 → ARMY-02 → ARMY-03, with toast notifications
- When `running`, Mining shows live hash rate and AI Nexus logs; Army shows agent live logs with PID/uptime
- Dark mode toggle on Home page applies `.dark` class with CSS variable overrides

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
