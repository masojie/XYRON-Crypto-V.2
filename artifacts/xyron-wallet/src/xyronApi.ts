// ═══════════════════════════════════════════════════════════════════
// XYRON BLOCKCHAIN — REAL DATA LAYER
// API: GET /health · /tokenomics · /blocks · /blocks/:n · /stats
// POST /xyron/validate
// Node: masojie/XYRON-Crypto-V.2
// Fallback: local seed data when node is offline
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_NODE_URL = "https://xyronblockchain.replit.app";
const TIMEOUT_MS = 6000;

export interface ApiBlock {
  num: number;
  hash: string;
  txs: number;
  validators: number;
  reward: number;
  time: string;
  status: string;
  size: string;
  nonce: number;
}

export interface ApiTx {
  txId: string;
  userId: string;
  to: string;
  amount: string;
  type: "SEND" | "EXCHANGE" | "RECEIVE";
  status: "PIP" | "PIP PIP" | "FINALIZED";
  timestamp: string;
  blockRef: string;
  sms: string;
  sig: string;
}

export interface ApiStats {
  totalBlocks?: number;
  total_blocks?: number;
  circulatingSupply?: number;
  circulating_supply?: number;
  minted?: number;
  totalTxs?: number;
  total_txs?: number;
}

export interface ApiTokenomics {
  circulating_supply?: number;
  circulatingSupply?: number;
  minted?: number;
  total_blocks?: number;
  totalBlocks?: number;
  max_supply?: number;
  block_reward?: number;
  block_time?: number;
  halving_interval?: number;
}

// ── Node URL (persisted in sessionStorage) ───────────────────────
export function getNodeUrl(): string {
  try {
    return sessionStorage.getItem("xyron_node_url") || DEFAULT_NODE_URL;
  } catch {
    return DEFAULT_NODE_URL;
  }
}

export function setNodeUrl(url: string) {
  try {
    sessionStorage.setItem("xyron_node_url", url.replace(/\/$/, ""));
  } catch {}
}

// ── Low-level fetch with timeout ─────────────────────────────────
let _online: boolean | null = null;
let _lastLatency: number | null = null;

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(getNodeUrl() + path, {
      ...opts,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    _online = true;
    _lastLatency = Date.now() - t0;
    return (await res.json()) as T;
  } catch {
    clearTimeout(timer);
    _online = false;
    _lastLatency = null;
    return null;
  }
}

export const XyronAPI = {
  isOnline: () => _online === true,
  getLatency: () => _lastLatency,

  health: () => apiFetch<{ status: string }>("/health"),
  tokenomics: () => apiFetch<ApiTokenomics>("/tokenomics"),
  blocks: (n = 20) => apiFetch<unknown>("/blocks?limit=" + n),
  block: (num: number) => apiFetch<unknown>("/blocks/" + num),
  stats: () => apiFetch<ApiStats>("/stats"),

  validate: (walletId: string, message = "") =>
    apiFetch<unknown>("/xyron/validate", {
      method: "POST",
      body: JSON.stringify({ wallet_id: walletId, message }),
    }),
};

// ── Mappers: API response → internal format ───────────────────────
const BLOCK_REWARD = 36;

export function mapApiBlock(b: Record<string, unknown>): ApiBlock {
  const num = (b.number ?? b.block_number ?? b.num ?? 0) as number;
  const txArr = Array.isArray(b.transactions) ? b.transactions : [];
  const hasTx = txArr.length > 0 || ((b.transactions_count as number) ?? 0) > 0;
  return {
    num,
    hash: (b.hash as string) ?? "0x" + num.toString(16).padStart(8, "0").toUpperCase() + "…",
    txs: txArr.length || (b.transactions_count as number) || 0,
    validators: (b.validators ?? b.validator_count ?? 4) as number,
    reward: (b.reward as number) ?? (hasTx ? BLOCK_REWARD : 0),
    time: (b.timestamp ?? b.created_at ?? new Date().toISOString()) as string,
    status: (b.status as string) ?? (hasTx ? "PIP" : "PIP PIP"),
    size: (b.size as string) ?? ((Math.random() * 2 + 0.5).toFixed(2) + " KB"),
    nonce: (b.nonce as number) ?? Math.floor(Math.random() * 999999),
  };
}

export function mapApiTx(t: Record<string, unknown>, walletId: string): ApiTx {
  const type = ((t.type ?? "SEND") as string).toUpperCase() as "SEND" | "EXCHANGE" | "RECEIVE";
  const statusRaw = t.status as string;
  const status: "PIP" | "PIP PIP" | "FINALIZED" =
    statusRaw === "PIP" || statusRaw === "PIP PIP"
      ? statusRaw
      : t.finalized
      ? "FINALIZED"
      : "PIP";
  return {
    txId: ((t.tx_id ?? t.txId ?? t.signature) as string) ?? "XYR-" + Date.now().toString(36).toUpperCase(),
    userId: ((t.wallet_id ?? t.userId) as string) ?? walletId,
    to: ((t.to ?? t.recipient) as string) ?? "—",
    amount: String(parseFloat(String(t.amount ?? t.value ?? 0)).toFixed(2)),
    type,
    status,
    timestamp: ((t.timestamp ?? t.created_at) as string) ?? new Date().toISOString(),
    blockRef: ((t.block_hash ?? t.blockRef) as string) ?? "",
    sms: ((t.message ?? t.sms) as string) ?? "",
    sig:
      ((t.signature ?? t.x11_signature) as string) ??
      "X11_VAL_" + Math.random().toString(16).slice(2, 8).toUpperCase(),
  };
}

export function normalizeBlocksResponse(res: unknown): ApiBlock[] {
  if (!res) return [];
  const arr = Array.isArray(res) ? res : ((res as Record<string, unknown>).blocks ?? (res as Record<string, unknown>).data ?? []);
  if (!Array.isArray(arr)) return [];
  return (arr as Record<string, unknown>[]).map(mapApiBlock).sort((a, b) => b.num - a.num);
}
