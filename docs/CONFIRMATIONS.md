# 🔒 XYRON Transaction Confirmations Guide

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** PIP (Active)

---

## 1. Overview

In blockchain, **confirmations** are the number of blocks added after your transaction. Each new block makes the transaction harder to reverse.

XYRON uses **3-minute block time** with multiple confirmation levels.

---

## 2. Confirmation Levels

| Level | Blocks | Time | Risk | Use Case |
|-------|--------|------|------|----------|
| **Micro** | 1 | 3 min | 0.1% | Small tips, micro-transactions |
| **Standard** | 3 | 9 min | 0.001% | Regular transfers, payments |
| **Exchange** | 6 | 18 min | 0.000001% | Exchange withdrawals |
| **Institutional** | 12 | 36 min | <0.0000001% | Large settlements |

---

## 3. Risk Calculation

Risk = (0.1)^(confirmations)

Examples:

· 1 confirmation: 0.1% (1 in 1,000)
· 3 confirmations: 0.001% (1 in 100,000)
· 6 confirmations: 0.000001% (1 in 100,000,000)
· 12 confirmations: <0.0000001% (practically zero)

```

---

## 4. Confirmation States

| Status | Icon | Description |
|--------|------|-------------|
| Pending | ⏳ | 0 confirmations |
| Micro-confirmed | ⚡ | 1 confirmation |
| Verifying | 🔵 | 2-5 confirmations |
| Confirmed | ✅ | 3+ confirmations (standard) |
| Exchange-safe | 🏛️ | 6+ confirmations |
| Institutional-safe | 🏦 | 12+ confirmations |

---

## 5. Recommendations by Amount

| Amount | Recommended | Wait Time |
|--------|-------------|-----------|
| < 10 XYR | 1 block | 3 minutes |
| 10 - 100 XYR | 3 blocks | 9 minutes |
| 100 - 1000 XYR | 6 blocks | 18 minutes |
| > 1000 XYR | 12 blocks | 36 minutes |

---

## 6. API Endpoints

### Check Transaction Confirmations
```

GET /api/confirmations/:txHash

```

### Get Recommendation by Amount
```

GET /api/confirmations/recommend/:amount

```

### Example Response
```json
{
  "status": "PIP",
  "data": {
    "confirmations": 4,
    "target": 6,
    "timeRemaining": "6 minutes",
    "risk": "0.0001%",
    "isSafe": false
  }
}
```

---

7. Best Practices

For Users

· Small transfers (<10 XYR): 1 confirmation OK
· Regular transfers: Wait 3 confirmations
· Exchange withdrawals: Wait 6 confirmations
· Large amounts: Wait 12+ confirmations

For Merchants

· Physical goods: 1 confirmation for small items
· Digital goods: 3 confirmations
· High-value: 6 confirmations

For Exchanges

· Deposits <100 XYR: 3 confirmations
· Deposits 100-1000 XYR: 6 confirmations
· Deposits >1000 XYR: 12 confirmations
· All withdrawals: 6 confirmations minimum

---

8. FAQ

Q: Why 3 minutes block time?
A: Balance between speed (faster than Bitcoin) and stability.

Q: Can I trust 1 confirmation?
A: For small amounts (<10 XYR), yes. Risk is only 0.1%.

Q: What's the difference from Bitcoin?
A: Bitcoin 3 conf = 30 min, XYRON 3 conf = 9 min (3x faster).

---

© 2026 XYRON Technology. All rights reserved.

`
