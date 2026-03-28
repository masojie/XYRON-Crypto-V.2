import { useState, useEffect, useRef, useCallback } from "react";
import { XyronAPI, normalizeBlocksResponse, mapApiTx, getNodeUrl, setNodeUrl } from "./xyronApi";

// ── Types ─────────────────────────────────────────────────────────────────────
type Page = "home" | "history" | "assets" | "profile" | "send" | "exchange" | "detail" | "mining" | "army";
type TxStatus = "PIP" | "PIP PIP" | "FINALIZED";
type TxType = "SEND" | "EXCHANGE" | "RECEIVE";
type SystemStatus = "idle" | "starting" | "running" | "stopped";
type AgentStatus = "ONLINE" | "OFFLINE" | "STARTING" | "ERROR";

interface Tx {
  txId: string;
  userId: string;
  to: string;
  amount: string;
  type: TxType;
  status: TxStatus;
  timestamp: string;
  blockRef: string;
  sms: string;
  sig: string;
}

interface Block {
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

interface MiningStats {
  hashRate: string;
  blocksFound: number;
  totalReward: number;
  efficiency: number;
  uptime: string;
  aiStatus: AgentStatus;
  logs: string[];
}

interface ArmyAgent {
  id: "ARMY-01" | "ARMY-02" | "ARMY-03";
  name: string;
  role: string;
  status: AgentStatus;
  pid: number | null;
  uptime: string;
  tasks: number;
  logs: string[];
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_TXS: Tx[] = [
  { txId: "XYR-LJT2X-K8P", userId: "0xA3F7...9d2C", to: "0xB9C2...3aF1", amount: "120.00", type: "SEND", status: "PIP", timestamp: "2025-03-22T08:14:00Z", blockRef: "", sms: "", sig: "X11_VAL_8F2A9C" },
  { txId: "XYR-LJQ8Y-R3F", userId: "0xA3F7...9d2C", to: "USDT", amount: "350.50", type: "EXCHANGE", status: "FINALIZED", timestamp: "2025-03-21T17:33:00Z", blockRef: "0xBLK9A2F3E1", sms: "", sig: "X11_VAL_CC13D7" },
  { txId: "XYR-LJN4Z-W7T", userId: "0xA3F7...9d2C", to: "0xA3F7...9d2C", amount: "60.00", type: "RECEIVE", status: "FINALIZED", timestamp: "2025-03-20T12:01:00Z", blockRef: "0xBLK8E1A99F", sms: "Hello XYRON!", sig: "X11_VAL_AA72B9" },
];

const SEED_BLOCKS: Block[] = [
  { num: 59, hash: "0x9F3A2...E1B", txs: 3, validators: 5, reward: 36, time: "2025-03-22T08:15:00Z", status: "PIP", size: "1.82 KB", nonce: 412938 },
  { num: 58, hash: "0x7C1D8...3FA", txs: 2, validators: 4, reward: 36, time: "2025-03-22T08:12:00Z", status: "PIP", size: "1.54 KB", nonce: 892011 },
  { num: 57, hash: "0x4B9E6...C2D", txs: 0, validators: 3, reward: 0, time: "2025-03-22T08:09:00Z", status: "PIP PIP", size: "0.72 KB", nonce: 110293 },
  { num: 56, hash: "0x2A7F1...9EA", txs: 5, validators: 6, reward: 36, time: "2025-03-22T08:06:00Z", status: "PIP", size: "2.14 KB", nonce: 550129 },
  { num: 55, hash: "0x1D4C3...7FB", txs: 1, validators: 4, reward: 36, time: "2025-03-22T08:03:00Z", status: "PIP", size: "1.11 KB", nonce: 78203 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTs(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

function cap(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function statusClass(s: TxStatus): string {
  if (s === "PIP") return "st-pip";
  if (s === "PIP PIP") return "st-buf";
  return "st-fin";
}

function TxIcon({ type }: { type: TxType }) {
  const color = type === "RECEIVE" ? "var(--pip)" : "var(--t2)";
  if (type === "SEND") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
  if (type === "EXCHANGE") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, show }: { msg: string; show: boolean }) {
  return (
    <div className={`toast ${show ? "on" : ""}`}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--pip)", flexShrink: 0 }} />
      <span>{msg}</span>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────
function BottomNav({ tab, onSwitch }: { tab: Page; onSwitch: (p: Page) => void }) {
  return (
    <nav className="bot-nav" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
      <button className={`nav-btn ${tab === "home" ? "on" : ""}`} onClick={() => onSwitch("home")}>
        <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9" /><path d="M9 21V9h6v12" /></svg>
        <span>Wallet</span>
      </button>
      <button className={`nav-btn ${tab === "history" ? "on" : ""}`} onClick={() => onSwitch("history")}>
        <svg viewBox="0 0 24 24"><rect x="2" y="3" width="8" height="8" rx="1" /><rect x="14" y="3" width="8" height="8" rx="1" /><rect x="2" y="13" width="8" height="8" rx="1" /><rect x="14" y="13" width="8" height="8" rx="1" /></svg>
        <span>Explorer</span>
      </button>
      <button className={`nav-btn ${tab === "mining" ? "on" : ""}`} onClick={() => onSwitch("mining")}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
        <span>Mining</span>
      </button>
      <button className={`nav-btn ${tab === "army" ? "on" : ""}`} onClick={() => onSwitch("army")}>
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        <span>Army</span>
      </button>
      <button className={`nav-btn ${tab === "profile" || tab === "assets" ? "on" : ""}`} onClick={() => onSwitch("assets")}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        <span>Profile</span>
      </button>
    </nav>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ txs, onNav, dark, onToggleDark, onShowTx, nodeStatus, onOpenNodeConfig }: {
  txs: Tx[];
  onNav: (p: Page) => void;
  dark: boolean;
  onToggleDark: () => void;
  onShowTx: (tx: Tx) => void;
  nodeStatus: "live" | "offline" | "connecting";
  onOpenNodeConfig: () => void;
}) {
  const statusTxt = nodeStatus === "live" ? "LIVE" : nodeStatus === "offline" ? "LOCAL" : "SYNC…";
  const statusColor = nodeStatus === "live" ? "var(--pip)" : nodeStatus === "offline" ? "var(--pip2)" : "var(--t3)";

  return (
    <div className="page active" style={{ paddingBottom: 0 }}>
      <div className="topbar">
        <div className="logo">XYRON</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="pip-live">
            <div className="pip-dot" style={{ background: statusColor }} />
            <span style={{ color: statusColor }}>{statusTxt}</span>
          </div>
          <button onClick={onToggleDark} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--b1)", background: "var(--off)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {dark
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            }
          </button>
          <button onClick={onOpenNodeConfig} title="Node settings" style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--b1)", background: "var(--off)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </button>
          <div className="net-pill">MAINNET · V.2</div>
        </div>
      </div>

      <div className="bal-block">
        <div className="bal-label">TOTAL BALANCE</div>
        <div className="bal-num">4,821.50<em>XYR</em></div>
        <div className="bal-usd">≈ $12,437.20 USD</div>
        <div className="bal-change">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15" /></svg>
          +2.4% today
        </div>
        <div className="addr-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" style={{ width: 12, height: 12 }}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          <span>0xA3F7...9d2C</span>
        </div>
      </div>

      <div className="actions">
        <button className="act-btn primary" onClick={() => onNav("send")}>
          <div className="act-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--w)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <span className="act-label">Send</span>
        </button>
        <button className="act-btn" onClick={() => onNav("exchange")}>
          <div className="act-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
              <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <span className="act-label">Exchange</span>
        </button>
      </div>

      <hr className="div" />
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="sec-header">
          <span className="sec-title">RECENT TRANSACTIONS</span>
          <span className="sec-link" onClick={() => onNav("history")}>Explorer →</span>
        </div>
      </div>
      <div className="section" style={{ paddingTop: 0, flex: 1 }}>
        <div className="tx-list">
          {txs.slice(0, 4).map(tx => (
            <div className="tx-item" key={tx.txId} onClick={() => onShowTx(tx)}>
              <div className="tx-l">
                <div className="tx-ico"><TxIcon type={tx.type} /></div>
                <div>
                  <div className="tx-name">{cap(tx.type)}</div>
                  <div className="tx-meta">{fmtTs(tx.timestamp)}</div>
                </div>
              </div>
              <div className="tx-r">
                <div className="tx-amt" style={tx.type === "RECEIVE" ? { color: "var(--pip)" } : {}}>
                  {tx.type !== "RECEIVE" ? "-" : "+"}{parseFloat(tx.amount).toFixed(2)} XYR
                </div>
                <div className={`tx-st ${statusClass(tx.status)}`}>{tx.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Explorer Page ─────────────────────────────────────────────────────────────
function ExplorerPage({ blocks, txs }: { blocks: Block[]; txs: Tx[] }) {
  const [search, setSearch] = useState("");
  const [heartbeat, setHeartbeat] = useState(180);

  useEffect(() => {
    const t = setInterval(() => setHeartbeat(h => h <= 0 ? 180 : h - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = search
    ? blocks.filter(b => b.num.toString().includes(search) || b.hash.toLowerCase().includes(search.toLowerCase()))
    : blocks;

  return (
    <div className="page active" style={{ paddingBottom: 0 }}>
      <div className="topbar">
        <div className="logo">XYRON</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="pip-live"><div className="pip-dot" />PIP</div>
          <div className="net-pill">EXPLORER</div>
        </div>
      </div>

      <div style={{ padding: "12px 22px 0", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <input className="finput mono" type="text" placeholder="Search block # or hash…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40, fontSize: 12, height: 40, paddingTop: 0, paddingBottom: 0 }} />
          <div style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, margin: "10px 22px 0", flexShrink: 0 }}>
        {[
          { label: "BLOCKS", val: blocks[0]?.num ?? "—", color: "var(--t1)" },
          { label: "TXs", val: txs.length, color: "var(--t1)" },
          { label: "MINTED", val: blocks.reduce((s, b) => s + b.reward, 0).toLocaleString(), color: "var(--t1)" },
          { label: "NEXT", val: `${heartbeat}s`, color: "var(--pip2)" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "var(--off)", border: "1px solid var(--b1)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 8, letterSpacing: ".06em", color: "var(--t3)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 22px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", color: "var(--t3)" }}>LATEST BLOCKS</div>
        <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>⏱ 180s cycle</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 16px" }}>
        {filtered.map(b => {
          const sc = b.status === "PIP" ? "sc-pip" : "sc-buf";
          const dotC = b.status === "PIP" ? "scd-pip" : "scd-buf";
          return (
            <div key={b.num} className="block-card fade-in">
              <div className="block-head">
                <div className="block-num">Block #{b.num}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`status-chip ${sc}`} style={{ fontSize: 10, padding: "3px 8px" }}>
                    <span className={`sc-dot ${dotC}`} />{b.status}
                  </span>
                  <div className="block-time">{fmtTs(b.time)}</div>
                </div>
              </div>
              <div className="block-rows">
                <div className="dr"><span className="dr-k">Hash</span><span className="dr-v">{b.hash}</span></div>
                <div className="dr"><span className="dr-k">Transactions</span><span className="dr-v">{b.txs}</span></div>
                <div className="dr"><span className="dr-k">Validators</span><span className="dr-v">{b.validators}</span></div>
                <div className="dr"><span className="dr-k">Reward</span><span className="dr-v">{b.reward} XYR</span></div>
                <div className="dr"><span className="dr-k">Size</span><span className="dr-v">{b.size}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Send Page ─────────────────────────────────────────────────────────────────
function SendPage({ onBack, onToast, onValidate }: { onBack: () => void; onToast: (m: string) => void; onValidate: (w: string, sms?: string) => Promise<Tx | null> }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    if (!to || !amount) { onToast("Isi semua field"); return; }
    setBusy(true);
    const live = await onValidate(to, msg || undefined);
    setBusy(false);
    if (live) {
      onToast("PIP — TX terkirim via node XYRON (" + live.txId + ")");
    } else {
      onToast("PIP — Transaction buffered (offline)");
    }
    onBack();
  }

  return (
    <div className="page active" style={{ paddingBottom: 0 }}>
      <div className="ph">
        <button className="back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="ph-title">Send XYR</span>
        <span className="ph-sub">XYRON MAINNET</span>
      </div>
      <div className="form-body">
        <div className="fld">
          <div className="flabel">RECIPIENT ADDRESS</div>
          <input className="finput mono" placeholder="0x... or XYR-..." value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="fld">
          <div className="flabel">AMOUNT</div>
          <div style={{ position: "relative" }}>
            <input className="finput" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ paddingRight: 52 }} />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 500, color: "var(--t3)", fontFamily: "var(--mono)", pointerEvents: "none" }}>XYR</span>
          </div>
        </div>
        <div className="fld">
          <div className="flabel">SMS MESSAGE (optional)</div>
          <input className="finput" placeholder="Inscribe a message on-chain..." value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
        <div className="info-row">
          <span className="info-l">Fee estimate</span>
          <span className="info-r">0.0012 XYR</span>
        </div>
        <div className="info-row">
          <span className="info-l">Confirmations</span>
          <span className="info-r">6 blocks required</span>
        </div>
        <button className="submit-btn" disabled={busy} onClick={handleSend}>
          {busy ? "Broadcasting…" : "Send XYR"}
        </button>
      </div>
    </div>
  );
}

// ── Exchange Page ─────────────────────────────────────────────────────────────
function ExchangePage({ onBack, onToast, onValidate }: { onBack: () => void; onToast: (m: string) => void; onValidate: (w: string, sms?: string) => Promise<Tx | null> }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [fromToken, setFromToken] = useState("XYR");
  const [toToken, setToToken] = useState("USDT");

  function handleSwap() {
    setFromToken(t => t === "XYR" ? "USDT" : "XYR");
    setToToken(t => t === "XYR" ? "USDT" : "XYR");
  }

  async function handleExchange() {
    if (!amount) { onToast("Masukkan jumlah"); return; }
    setBusy(true);
    const live = await onValidate("EXCHANGE_" + fromToken + "_TO_" + toToken);
    setBusy(false);
    if (live) {
      onToast("PIP — Exchange dikonfirmasi via node XYRON");
    } else {
      onToast("PIP — Exchange buffered (offline)");
    }
    onBack();
  }

  return (
    <div className="page active" style={{ paddingBottom: 0 }}>
      <div className="ph">
        <button className="back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="ph-title">Exchange</span>
        <span className="ph-sub">XYRON DEX</span>
      </div>
      <div className="form-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", gap: 8, alignItems: "center" }}>
          <div className="token-box">{fromToken}</div>
          <button onClick={handleSwap} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--b1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s", background: "var(--w)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--t1)" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
          </button>
          <div className="token-box">{toToken}</div>
        </div>
        <div className="fld">
          <div className="flabel">AMOUNT ({fromToken})</div>
          <div style={{ position: "relative" }}>
            <input className="finput" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ paddingRight: 52 }} />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 500, color: "var(--t3)", fontFamily: "var(--mono)", pointerEvents: "none" }}>{fromToken}</span>
          </div>
        </div>
        <div className="info-row">
          <span className="info-l">Rate</span>
          <span className="info-r">1 XYR = $2.578</span>
        </div>
        <div className="info-row">
          <span className="info-l">Fee</span>
          <span className="info-r">0.0012 XYR</span>
        </div>
        <div className="info-row">
          <span className="info-l">Confirmations</span>
          <span className="info-r">9 blocks (high-value)</span>
        </div>
        <button className="submit-btn" disabled={busy} onClick={handleExchange}>
          {busy ? "Exchanging…" : `Exchange ${fromToken} → ${toToken}`}
        </button>
      </div>
    </div>
  );
}

// ── Detail Page ───────────────────────────────────────────────────────────────
function DetailPage({ tx, onBack }: { tx: Tx; onBack: () => void }) {
  const [confs, setConfs] = useState(tx.status === "FINALIZED" ? 6 : 1);
  const confTier = { RECEIVE: 3, SEND: 6, EXCHANGE: 9 };
  const confRequired = confTier[tx.type] || 6;

  useEffect(() => {
    if (tx.status !== "PIP") return;
    let c = 1;
    const t = setInterval(() => {
      c++;
      setConfs(c);
      if (c >= confRequired) clearInterval(t);
    }, 600);
    return () => clearInterval(t);
  }, [tx.txId]);

  const confColor = confs >= confRequired ? "var(--pip)" : confs > 0 ? "var(--pip2)" : "var(--b2)";
  const statusCls = tx.status === "PIP" ? "sc-pip" : tx.status === "PIP PIP" ? "sc-buf" : "sc-fin";
  const dotCls = tx.status === "PIP" ? "scd-pip" : tx.status === "PIP PIP" ? "scd-buf" : "scd-fin";

  return (
    <div className="page active" style={{ paddingBottom: 0 }}>
      <div className="ph">
        <button className="back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="ph-title">Transaction</span>
      </div>

      <div style={{ padding: "28px 22px 20px", textAlign: "center", borderBottom: "1px solid var(--b1)" }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--t3)", fontWeight: 500, marginBottom: 8 }}>{tx.type}</div>
        <div style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-.02em", fontFamily: "var(--mono)" }}>
          {parseFloat(tx.amount).toFixed(2)}<em style={{ fontStyle: "normal", fontSize: 18, color: "var(--t3)", marginLeft: 4 }}>XYR</em>
        </div>
        <div style={{ marginTop: 10 }}>
          <span className={`status-chip ${statusCls}`}>
            <span className={`sc-dot ${dotCls}`} />{tx.status}
          </span>
        </div>
      </div>

      <div style={{ padding: "0 22px" }}>
        {[
          ["TX ID", tx.txId],
          ["Date", new Date(tx.timestamp).toLocaleString()],
          ["To / Recipient", tx.type === "EXCHANGE" ? "USDT (Exchange)" : tx.to],
          ["Block Reference", tx.blockRef || "Pending Triple-Engine validation…"],
          ["X11 Signature", tx.sig || "X11_VAL_—"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "13px 0", borderBottom: "1px solid var(--b1)", gap: 16 }}>
            <div style={{ fontSize: 11, color: "var(--t3)", letterSpacing: ".05em", flexShrink: 0, paddingTop: 2, fontWeight: 500 }}>{k}</div>
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", textAlign: "right", wordBreak: "break-all", fontWeight: 500 }}>{v}</div>
          </div>
        ))}
        <div style={{ padding: "13px 0" }}>
          <div style={{ fontSize: 11, color: "var(--t3)", letterSpacing: ".05em", fontWeight: 500, marginBottom: 8 }}>CONFIRMATIONS</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: confColor }}>{confs}/{confRequired}</span>
            <span style={{ fontSize: 10, color: "var(--t3)" }}>{tx.type === "RECEIVE" ? "Standard (3 req)" : tx.type === "EXCHANGE" ? "High-value (9 req)" : "Wallet-to-wallet (6 req)"}</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: confRequired }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < confs ? confColor : "var(--b1)", transition: "background .3s" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assets Page ───────────────────────────────────────────────────────────────
function AssetsPage({ tokenomics }: { tokenomics: { circulatingSupply: string; totalBlocks: string; maxSupply: string; blockReward: string; blockTime: string; halvingInterval: string } }) {
  const circNum = parseFloat(tokenomics.circulatingSupply.replace(/,/g, "")) || 2140000;
  const maxNum = parseFloat(tokenomics.maxSupply.replace(/,/g, "")) || 12614400;
  const circulatingPct = ((circNum / maxNum) * 100).toFixed(2);

  return (
    <div className="page active" style={{ paddingBottom: 80 }}>
      <div className="topbar"><div className="logo">XYRON</div><div className="net-pill">ASSETS</div></div>

      <div style={{ padding: "28px 22px 20px", textAlign: "center", borderBottom: "1px solid var(--b1)" }}>
        <div className="bal-label">PORTFOLIO VALUE</div>
        <div className="bal-num">12,437.20<em>USD</em></div>
        <div style={{ fontSize: 12, color: "var(--pip)", marginTop: 6, fontFamily: "var(--mono)" }}>▲ +2.4% (24h)</div>
      </div>

      <div className="section" style={{ paddingBottom: 12 }}>
        <div className="sec-header"><span className="sec-title">XYR TOKENOMICS</span></div>
      </div>

      <div style={{ margin: "0 22px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "MAX SUPPLY", val: tokenomics.maxSupply, sub: "XYR — hard cap" },
          { label: "CIRCULATING", val: tokenomics.circulatingSupply, sub: `XYR · ${circulatingPct}%` },
          { label: "BLOCK REWARD", val: tokenomics.blockReward + " XYR", sub: "per validator/block" },
          { label: "BLOCK TIME", val: tokenomics.blockTime + " sec", sub: "heartbeat interval" },
          { label: "HALVING CYCLE", val: tokenomics.halvingInterval, sub: "blocks ≈ 1 year" },
          { label: "CONFIRMATIONS", val: "6 req", sub: "blocks to finalize" },
        ].map(({ label, val, sub }) => (
          <div key={label} className="tok-card">
            <div className="tok-label">{label}</div>
            <div className="tok-val">{val}</div>
            <div className="tok-sub">{sub} <span style={{ color: "var(--pip)", fontSize: 9 }}>↗</span></div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 22px 10px", border: "1px solid var(--b1)", borderRadius: "var(--r)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "var(--off)", borderBottom: "1px solid var(--b1)" }}>
          <div className="tok-label" style={{ margin: 0 }}>TRIPLE-ENGINE VALIDATION STATUS</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {[
            { name: "NLV · RUST", latency: "342 µs" },
            { name: "PEP · GO", latency: "412 µs" },
            { name: "NCE · NODE", latency: "856 µs" },
          ].map((e, i) => (
            <div key={e.name} style={{ padding: "14px 12px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--b1)" : "none" }}>
              <div style={{ fontSize: 9, letterSpacing: ".07em", color: "var(--t3)", fontWeight: 500, marginBottom: 6 }}>{e.name}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 500, color: "var(--pip)" }}>● ONLINE</div>
              <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4 }}>{e.latency}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="div" />
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="sec-header"><span className="sec-title">MY ASSETS</span></div>
      </div>
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="asset-item" style={{ cursor: "pointer" }}>
          <div className="asset-l">
            <div className="asset-ico xyr">XYR</div>
            <div><div className="asset-name">XYRON</div><div className="asset-sub">Native token · Hybrid chain</div></div>
          </div>
          <div className="asset-r">
            <div className="asset-bal">4,821.50 XYR</div>
            <div className="asset-usd">$12,437.20</div>
          </div>
        </div>
        <div className="asset-item" style={{ cursor: "pointer" }}>
          <div className="asset-l">
            <div className="asset-ico usdt">USD</div>
            <div><div className="asset-name">Tether</div><div className="asset-sub">USDT · Stablecoin</div></div>
          </div>
          <div className="asset-r">
            <div className="asset-bal">243.10 USDT</div>
            <div className="asset-usd">$243.10</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mining Monitor Page ───────────────────────────────────────────────────────
function MiningPage({ systemStatus, onStartAll }: { systemStatus: SystemStatus; onStartAll: () => void }) {
  const [stats, setStats] = useState<MiningStats>({
    hashRate: "0 H/s",
    blocksFound: 0,
    totalReward: 0,
    efficiency: 0,
    uptime: "00:00:00",
    aiStatus: "OFFLINE",
    logs: [],
  });

  const uptimeRef = useRef(0);

  useEffect(() => {
    if (systemStatus !== "running") {
      setStats(s => ({ ...s, aiStatus: systemStatus === "starting" ? "STARTING" : "OFFLINE", hashRate: "0 H/s", efficiency: 0 }));
      return;
    }
    // Simulate mining stats when running
    setStats(s => ({ ...s, aiStatus: "ONLINE", hashRate: "2,847 H/s", efficiency: 98.4, blocksFound: 3, totalReward: 108 }));
    const t = setInterval(() => {
      uptimeRef.current++;
      const h = Math.floor(uptimeRef.current / 3600);
      const m = Math.floor((uptimeRef.current % 3600) / 60);
      const sec = uptimeRef.current % 60;
      const uptime = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

      const hr = (2800 + Math.floor(Math.random() * 200)).toLocaleString() + " H/s";
      const newLog = `[${new Date().toLocaleTimeString()}] ⚡ AI Nexus: hash=${hr} | block_check OK | reward_pool active`;

      setStats(s => ({
        ...s,
        hashRate: hr,
        uptime,
        logs: [...s.logs.slice(-49), newLog],
      }));
    }, 3000);
    return () => clearInterval(t);
  }, [systemStatus]);

  const statusColor = stats.aiStatus === "ONLINE" ? "var(--pip)" : stats.aiStatus === "STARTING" ? "var(--pip2)" : "var(--pip3)";

  return (
    <div className="page active" style={{ paddingBottom: 80 }}>
      <div className="topbar">
        <div className="logo">XYRON</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="pip-live" style={{ color: statusColor }}>
            <div className="pip-dot" style={{ background: statusColor }} />
            {stats.aiStatus}
          </div>
          <div className="net-pill">AI MINING</div>
        </div>
      </div>

      <div style={{ padding: "20px 22px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--t3)", fontWeight: 500, marginBottom: 12 }}>AI NEXUS V3 — MINING MONITOR</div>
      </div>

      {/* Start All button */}
      <div style={{ padding: "0 22px 16px" }}>
        <button
          className={`start-all-btn ${systemStatus === "running" ? "running" : systemStatus === "starting" ? "starting" : ""}`}
          onClick={onStartAll}
          disabled={systemStatus === "starting"}
        >
          {systemStatus === "idle" && (
            <><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ width: 18, height: 18 }}><polygon points="5 3 19 12 5 21 5 3" /></svg> START ALL SYSTEMS</>
          )}
          {systemStatus === "starting" && (
            <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> STARTING…</>
          )}
          {systemStatus === "running" && (
            <><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ width: 18, height: 18 }}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> STOP ALL SYSTEMS</>
          )}
        </button>
      </div>

      {/* AI Nexus Stats */}
      <div style={{ margin: "0 22px 12px" }}>
        <div style={{ border: "1px solid var(--b1)", borderRadius: "var(--r)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "var(--off)", borderBottom: "1px solid var(--b1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", color: "var(--t3)" }}>🧠 AI NEXUS V3</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "var(--mono)", color: statusColor }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, animation: "pulse 2s infinite" }} />
              {stats.aiStatus}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {[
              { label: "HASH RATE", val: stats.hashRate, color: "var(--pip)" },
              { label: "BLOCKS FOUND", val: stats.blocksFound.toString(), color: "var(--t1)" },
              { label: "TOTAL REWARD", val: `${stats.totalReward} XYR`, color: "var(--pip)" },
              { label: "EFFICIENCY", val: `${stats.efficiency}%`, color: stats.efficiency > 90 ? "var(--pip)" : "var(--pip2)" },
              { label: "UPTIME", val: stats.uptime, color: "var(--t1)" },
              { label: "AI MODEL", val: "GPT-4 MODE", color: "var(--blue)" },
            ].map(({ label, val, color }, i) => (
              <div key={label} style={{ padding: "12px 16px", borderBottom: i < 4 ? "1px solid var(--b1)" : "none", borderRight: i % 2 === 0 ? "1px solid var(--b1)" : "none" }}>
                <div style={{ fontSize: 9, letterSpacing: ".06em", color: "var(--t3)", fontWeight: 500, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 600, color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mining pipeline */}
      <div style={{ margin: "0 22px 12px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".07em", color: "var(--t3)", fontWeight: 500, marginBottom: 8 }}>BLOCKCHAIN CORE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { name: "BLOCKCHAIN", sub: "Rust + Go + Node", icon: "🟢" },
            { name: "AI NEXUS", sub: "Mining Helper", icon: "🧠" },
            { name: "AI VISUAL", sub: "Dashboard", icon: "🎨" },
          ].map(({ name, sub, icon }) => (
            <div key={name} className="eng-item">
              <div className="eng-name">{icon} {name}</div>
              <div className={`eng-status ${systemStatus === "running" ? "eng-on" : systemStatus === "starting" ? "eng-buf" : "eng-off"}`}>
                {systemStatus === "running" ? "● ONLINE" : systemStatus === "starting" ? "⟳ STARTING" : "○ OFFLINE"}
              </div>
              <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3, fontFamily: "var(--mono)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Log */}
      <div style={{ margin: "0 22px 16px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".07em", color: "var(--t3)", fontWeight: 500, marginBottom: 8 }}>LIVE LOG — AI NEXUS</div>
        <div className="log-area">
          {stats.logs.length === 0
            ? <span style={{ color: "var(--t3)" }}>Waiting for AI Nexus to start…</span>
            : stats.logs.map((l, i) => <div key={i} className="log-line-ok">{l}</div>)
          }
        </div>
      </div>
    </div>
  );
}

// ── Army Monitor Page ─────────────────────────────────────────────────────────
function ArmyPage({ systemStatus }: { systemStatus: SystemStatus }) {
  const [agents, setAgents] = useState<ArmyAgent[]>([
    { id: "ARMY-01", name: "Network Guardian", role: "🛡️ Network monitoring & protection", status: "OFFLINE", pid: null, uptime: "—", tasks: 0, logs: [] },
    { id: "ARMY-02", name: "Transaction Guardian", role: "🔍 TX validation & anomaly detection", status: "OFFLINE", pid: null, uptime: "—", tasks: 0, logs: [] },
    { id: "ARMY-03", name: "AI Guardian", role: "🤖 AI oversight & integrity check", status: "OFFLINE", pid: null, uptime: "—", tasks: 0, logs: [] },
  ]);

  const uptimeRefs = useRef([0, 0, 0]);

  useEffect(() => {
    if (systemStatus !== "running") {
      setAgents(a => a.map(ag => ({ ...ag, status: systemStatus === "starting" ? "STARTING" : "OFFLINE", pid: null, uptime: "—", tasks: 0 })));
      return;
    }

    setAgents(a => a.map((ag, i) => ({
      ...ag,
      status: "ONLINE",
      pid: 10000 + i * 1000 + Math.floor(Math.random() * 999),
      tasks: Math.floor(Math.random() * 10) + 1,
    })));

    const t = setInterval(() => {
      setAgents(a => a.map((ag, i) => {
        if (ag.status !== "ONLINE") return ag;
        uptimeRefs.current[i]++;
        const total = uptimeRefs.current[i];
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const uptime = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

        const logMsgs: Record<string, string[]> = {
          "ARMY-01": [
            `[NET] Peers: ${10 + Math.floor(Math.random()*5)} active | latency: ${20 + Math.floor(Math.random()*30)}ms`,
            `[NET] Block propagation: OK | sync: ${99 + Math.floor(Math.random()*2)}%`,
            `[NET] Firewall: ${Math.floor(Math.random()*3)} threats blocked`,
          ],
          "ARMY-02": [
            `[TX] Queue: ${Math.floor(Math.random()*20)} pending | validated: OK`,
            `[TX] Anomaly scan: CLEAR | signature check: PASSED`,
            `[TX] Block ref assigned: 0xBLK${Math.random().toString(16).slice(2,6).toUpperCase()}`,
          ],
          "ARMY-03": [
            `[AI] Model integrity: OK | weights: VERIFIED`,
            `[AI] Nexus health: GOOD | inference: ${Math.floor(Math.random()*50+50)}ms`,
            `[AI] Audit log: CLEAN | no tampering detected`,
          ],
        };

        const msgs = logMsgs[ag.id] || [];
        const newLog = msgs[Math.floor(Math.random() * msgs.length)];
        const newTasks = ag.tasks + (Math.random() > 0.7 ? 1 : 0);

        return {
          ...ag,
          uptime,
          tasks: newTasks,
          logs: [...ag.logs.slice(-29), `[${new Date().toLocaleTimeString()}] ${newLog}`],
        };
      }));
    }, 2000);

    return () => clearInterval(t);
  }, [systemStatus]);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="page active" style={{ paddingBottom: 80 }}>
      <div className="topbar">
        <div className="logo">XYRON</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="pip-live">
            <div className="pip-dot" style={{ background: systemStatus === "running" ? "var(--pip)" : "var(--pip2)" }} />
            <span style={{ color: systemStatus === "running" ? "var(--pip)" : "var(--pip2)" }}>
              {systemStatus === "running" ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
          <div className="net-pill">ARMY</div>
        </div>
      </div>

      <div style={{ padding: "20px 22px 12px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--t3)", fontWeight: 500, marginBottom: 4 }}>⚔️ XYRON ARMY — GUARDIAN MONITOR</div>
        <div style={{ fontSize: 12, color: "var(--t2)" }}>3 AI Guardian agents protecting the XYRON network</div>
      </div>

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "0 22px 16px" }}>
        {[
          { label: "ONLINE", val: agents.filter(a => a.status === "ONLINE").length.toString(), color: "var(--pip)" },
          { label: "TASKS", val: agents.reduce((s, a) => s + a.tasks, 0).toString(), color: "var(--t1)" },
          { label: "THREATS", val: "0", color: "var(--pip3)" },
        ].map(({ label, val, color }) => (
          <div key={label} className="tok-card" style={{ textAlign: "center" }}>
            <div className="tok-label" style={{ textAlign: "center" }}>{label}</div>
            <div className="tok-val" style={{ textAlign: "center", color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Army agents */}
      {agents.map((ag) => {
        const statusColor = ag.status === "ONLINE" ? "var(--pip)" : ag.status === "STARTING" ? "var(--pip2)" : "var(--pip3)";
        const isExpanded = expanded === ag.id;

        return (
          <div key={ag.id} className="army-card">
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--off)", borderBottom: isExpanded ? "1px solid var(--b1)" : "none", cursor: "pointer" }}
              onClick={() => setExpanded(isExpanded ? null : ag.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--w)", border: "1px solid var(--b1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {ag.id === "ARMY-01" ? "🛡️" : ag.id === "ARMY-02" ? "🔍" : "🤖"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--mono)" }}>{ag.id}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{ag.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: statusColor, fontWeight: 600 }}>
                    {ag.status === "ONLINE" ? "● ONLINE" : ag.status === "STARTING" ? "⟳ STARTING" : "○ OFFLINE"}
                  </div>
                  {ag.pid && <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>PID: {ag.pid}</div>}
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" style={{ width: 14, height: 14, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s" }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 10 }}>{ag.role}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "UPTIME", val: ag.uptime },
                    { label: "TASKS", val: ag.tasks.toString() },
                    { label: "STATUS", val: ag.status },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: "var(--off)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--b1)" }}>
                      <div style={{ fontSize: 9, letterSpacing: ".06em", color: "var(--t3)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--t1)" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, letterSpacing: ".06em", color: "var(--t3)", fontWeight: 500, marginBottom: 6 }}>LIVE LOG</div>
                <div className="log-area">
                  {ag.logs.length === 0
                    ? <span style={{ color: "var(--t3)" }}>Waiting for agent to start…</span>
                    : ag.logs.map((l, i) => <div key={i} className="log-line-ok">{l}</div>)
                  }
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────
function ProfilePage({ txs, onNav }: { txs: Tx[]; onNav: (p: Page) => void }) {
  return (
    <div className="page active" style={{ paddingBottom: 80 }}>
      <div className="topbar"><div className="logo">XYRON</div><div className="net-pill">PROFILE</div></div>
      <div className="profile-hero">
        <div className="avatar">MF</div>
        <div className="profile-name">M Fauzi Nizam</div>
        <div className="profile-addr">0xA3F7b29c4E8D...9d2C</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <div style={{ background: "var(--pip-bg)", color: "#15803d", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--pip-b)" }}>● VALIDATOR</div>
          <div style={{ background: "var(--off)", color: "var(--t2)", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--b1)" }}>X11-NANO</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "0 22px 20px" }}>
        {[
          { label: "TXs", val: txs.length },
          { label: "BLOCKS", val: 59 },
          { label: "REWARDS", val: "2,124" },
        ].map(({ label, val }) => (
          <div key={label} className="tok-card" style={{ textAlign: "center" }}>
            <div className="tok-label" style={{ textAlign: "center" }}>{label}</div>
            <div className="tok-val" style={{ textAlign: "center" }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="menu-list">
        {[
          { icon: <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>, name: "Assets & Tokenomics", sub: "Portfolio · XYR Tokenomics", page: "assets" as Page },
          { icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>, name: "Mining Monitor", sub: "AI Nexus V3 · Hash rate · Rewards", page: "mining" as Page },
          { icon: <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, name: "Army Monitor", sub: "ARMY-01 · ARMY-02 · ARMY-03", page: "army" as Page },
          { icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>, name: "Block Explorer", sub: "View all blocks & transactions", page: "history" as Page },
        ].map(({ icon, name, sub, page }) => (
          <div key={name} className="menu-item" onClick={() => onNav(page)}>
            <div className="menu-l">
              <div className="menu-ico">{icon}</div>
              <div><div className="menu-name">{name}</div><div className="menu-sub">{sub}</div></div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Node URL Modal ────────────────────────────────────────────────────────────
function NodeConfigModal({ onClose, onSave }: { onClose: () => void; onSave: (url: string) => void }) {
  const [url, setUrl] = useState(getNodeUrl());
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 500, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: "var(--w)", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 22px 36px" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Node URL</div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 16 }}>URL XYRON node (GitHub Codespaces / Replit deployment)</div>
        <input className="finput mono" value={url} onChange={e => setUrl(e.target.value)} style={{ fontSize: 11, marginBottom: 12 }} />
        <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 16 }}>Format: https://[nama-codespace]-3000.app.github.dev</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, border: "1px solid var(--b1)", borderRadius: "var(--r)", fontSize: 13, background: "var(--w)", color: "var(--t2)", cursor: "pointer" }}>Batal</button>
          <button onClick={() => { onSave(url); onClose(); }} style={{ flex: 1, padding: 13, border: "none", borderRadius: "var(--r)", fontSize: 13, fontWeight: 600, background: "var(--t1)", color: "var(--w)", cursor: "pointer" }}>Simpan</button>
        </div>
      </div>
    </div>
  );
}

// ── Tokenomics state (populated from live API) ────────────────────────────────
interface TokenomicsState {
  circulatingSupply: string;
  totalBlocks: string;
  maxSupply: string;
  blockReward: string;
  blockTime: string;
  halvingInterval: string;
}

const DEFAULT_TOKENOMICS: TokenomicsState = {
  circulatingSupply: "2,140,000",
  totalBlocks: "—",
  maxSupply: "12,614,400",
  blockReward: "6",
  blockTime: "180",
  halvingInterval: "175,200",
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [activeTx, setActiveTx] = useState<Tx | null>(null);
  const [toast, setToast] = useState({ msg: "", show: false });
  const [txs, setTxs] = useState<Tx[]>(SEED_TXS);
  const [blocks, setBlocks] = useState<Block[]>(SEED_BLOCKS);
  const [nodeStatus, setNodeStatus] = useState<"live" | "offline" | "connecting">("connecting");
  const [tokenomics, setTokenomics] = useState<TokenomicsState>(DEFAULT_TOKENOMICS);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("idle");
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  // ── Boot: connect to real XYRON node ─────────────────────────────
  useEffect(() => {
    async function boot() {
      setNodeStatus("connecting");

      // 1. Health check
      const health = await XyronAPI.health();
      if (!health) {
        setNodeStatus("offline");
        return;
      }

      setNodeStatus("live");
      const ms = XyronAPI.getLatency() ?? 0;
      showToast(`PIP — Connected to XYRON node (${ms}ms)`);

      // 2. Tokenomics
      const tok = await XyronAPI.tokenomics();
      if (tok) {
        setTokenomics(prev => ({
          ...prev,
          circulatingSupply: tok.circulating_supply != null
            ? Number(tok.circulating_supply).toLocaleString()
            : tok.circulatingSupply != null
            ? Number(tok.circulatingSupply).toLocaleString()
            : tok.minted != null
            ? Number(tok.minted).toLocaleString()
            : prev.circulatingSupply,
          totalBlocks: tok.total_blocks != null
            ? Number(tok.total_blocks).toLocaleString()
            : tok.totalBlocks != null
            ? Number(tok.totalBlocks).toLocaleString()
            : prev.totalBlocks,
          blockReward: tok.block_reward != null ? String(tok.block_reward) : prev.blockReward,
          blockTime: tok.block_time != null ? String(tok.block_time) : prev.blockTime,
        }));
      }

      // 3. Blocks — replace seed with live data
      const blocksRes = await XyronAPI.blocks(20);
      if (blocksRes) {
        const live = normalizeBlocksResponse(blocksRes);
        if (live.length > 0) {
          setBlocks(live.map(b => ({
            num: b.num,
            hash: b.hash,
            txs: b.txs,
            validators: b.validators,
            reward: b.reward,
            time: b.time,
            status: b.status,
            size: b.size,
            nonce: b.nonce,
          })));
        }
      }
    }

    boot();

    // Live block polling every 30s
    const poll = setInterval(async () => {
      if (!XyronAPI.isOnline()) return;
      const res = await XyronAPI.blocks(20);
      if (!res) return;
      const live = normalizeBlocksResponse(res);
      if (live.length > 0) {
        setBlocks(live.map(b => ({
          num: b.num, hash: b.hash, txs: b.txs,
          validators: b.validators, reward: b.reward,
          time: b.time, status: b.status, size: b.size, nonce: b.nonce,
        })));
      }
    }, 30000);

    return () => clearInterval(poll);
  }, []);

  const handleSaveNodeUrl = (url: string) => {
    setNodeUrl(url);
    setNodeStatus("connecting");
    showToast("⟳ Reconnecting to node…");
    // Re-boot
    XyronAPI.health().then(h => {
      if (h) {
        setNodeStatus("live");
        showToast("PIP — Connected to XYRON node");
      } else {
        setNodeStatus("offline");
        showToast("⚠️ Node offline — using local data");
      }
    });
  };

  // ── Send / Exchange with real validate API ────────────────────────
  const handleValidate = useCallback(async (walletId: string, smsMsg?: string): Promise<Tx | null> => {
    if (!XyronAPI.isOnline()) return null;
    const res = await XyronAPI.validate(walletId, smsMsg ?? "");
    if (!res) return null;
    const mapped = mapApiTx(res as Record<string, unknown>, walletId);
    setTxs(prev => [mapped, ...prev]);
    return mapped;
  }, []);

  const handleStartAll = useCallback(() => {
    if (systemStatus === "running") {
      setSystemStatus("idle");
      showToast("⛔ All systems stopped");
      return;
    }
    setSystemStatus("starting");
    showToast("⚔️ XYRON — Starting all systems…");
    setTimeout(() => showToast("🟢 Blockchain Core started"), 1500);
    setTimeout(() => showToast("🧠 AI Nexus V3 started"), 3000);
    setTimeout(() => showToast("🛡️ ARMY-01 started"), 4500);
    setTimeout(() => showToast("🔍 ARMY-02 started"), 6000);
    setTimeout(() => showToast("🤖 ARMY-03 started"), 7500);
    setTimeout(() => {
      setSystemStatus("running");
      showToast("✅ ALL SYSTEMS OPERATIONAL — PIP");
    }, 9000);
  }, [systemStatus, showToast]);

  const navTo = (p: Page) => setPage(p);

  const showTx = (tx: Tx) => {
    setActiveTx(tx);
    setPage("detail");
  };

  const goBack = () => {
    setPage("home");
    setActiveTx(null);
  };

  const hasNav = !["send", "exchange", "detail"].includes(page);

  return (
    <div className={dark ? "dark" : ""} style={{ height: "100%", background: dark ? "#0f0f0e" : "#e8e8e6" }}>
      <div className="app">
        <div style={{ position: "relative", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Pages */}
          {page === "home" && (
            <HomePage txs={txs} onNav={navTo} dark={dark} onToggleDark={() => setDark(d => !d)} onShowTx={showTx} nodeStatus={nodeStatus} onOpenNodeConfig={() => setShowNodeConfig(true)} />
          )}
          {page === "history" && <ExplorerPage blocks={blocks} txs={txs} />}
          {page === "send" && <SendPage onBack={goBack} onToast={showToast} onValidate={handleValidate} />}
          {page === "exchange" && <ExchangePage onBack={goBack} onToast={showToast} onValidate={handleValidate} />}
          {page === "detail" && activeTx && <DetailPage tx={activeTx} onBack={goBack} />}
          {page === "assets" && <AssetsPage tokenomics={tokenomics} />}
          {page === "mining" && <MiningPage systemStatus={systemStatus} onStartAll={handleStartAll} />}
          {page === "army" && <ArmyPage systemStatus={systemStatus} />}
          {page === "profile" && <ProfilePage txs={txs} onNav={navTo} />}
        </div>

        {hasNav && <BottomNav tab={page} onSwitch={navTo} />}

        <Toast msg={toast.msg} show={toast.show} />

        {showNodeConfig && (
          <NodeConfigModal onClose={() => setShowNodeConfig(false)} onSave={handleSaveNodeUrl} />
        )}
      </div>
    </div>
  );
}
