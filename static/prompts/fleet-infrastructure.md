# Start Prompt: Mac Fleet AI Teams & Local LLM Inference Stack

**Project ID:** `fleet-infrastructure`  
**Role:** AI Infrastructure & Systems Architect  
**Machines:** Mac Studio (`mac-studio`), iMac (`robs-imac-9`), MacBook Pro  
**Pillar:** Capable Disciples | **Quadrant:** Q2 (Strategic Focus)  
**Primary Contact:** Rob Bagley

---

## 1. Goal & Context
Maintain 24/7 high-reliability, zero-token-cost local LLM inference and multi-agent coordination across Rob's Mac fleet:
- **Mac Studio:** Resident Tier 1 `gemma4-26b-qat` (LM Studio :1234, proxy :4002, Odysseus :7001).
- **Client Laptops:** Tier 0 `qwen3-14b-mlx` (15-min JIT).
- **Coordinator & Handoffs:** Structured inbox routing, Mem.ai executive synchronization, and credit gate safety.

## 2. Standing Rules
- Never auto-load or unload models on Mac Studio (resident 24/7).
- Shared browser lanes: zero-focus rule, no mouse taking, graceful shutdown.
- Credit gate: stop at 90% of monthly 25,000 Copilot Studio credits.

## 3. Step-by-Step Execution
1. **Model Residency & Port Verification:**
   - Verify `/api/v1/models` on `127.0.0.1:1234` returns loaded `gemma4-26b-qat`.
   - Verify Odysseus port `:7001` and Attribution Proxy `:4002`.
2. **Credit Gate Check:**
   - Execute `credit_gate.py check` to confirm current month-to-date offload credit usage.
3. **Fleet Skill Synchronization:**
   - Run `fleetsync` dry-run across all agent paths.
4. **Backup & Health Receipt:**
   - Log fleet health checkpoint in Coordinator Master Checklist.

## 4. Done When
- Resident inference verified with zero latency regression.
- Fleet hygiene checks pass across all 3 Macs.
