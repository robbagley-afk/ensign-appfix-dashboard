# Start Prompt: DevOps AppFix & Continuous Bug Dispatch (appfix-cis)

**Project ID:** `appfix-dispatch`  
**Assignee:** Rodrigo Moll (@Rodrigomoll)  
**Live Kanban:** `https://ensign-appfix-dashboard.vercel.app`  
**Pillar:** Capable Disciples | **Quadrant:** Q3 (Delegate & Automate)  

---

## 1. Goal & Context
Operate the Ensign AppFix continuous bug dispatch pipeline. When coworkers or mentors report an issue via the `/appfix-cis` skill, it:
1. Creates and verifies a real GitHub issue assigned to Rodrigo Moll (@Rodrigomoll), with the required labels and a stable retry key.
2. Displays public issues and explicitly approved public tracking summaries for private-source requests. Verify the live board after Refresh Live. Keep private issue text and attachments private.
3. Hides closed requests from the active board after seven days. Closing an issue does not establish production deployment.

Use the bundled AppFix dispatcher. Legacy API or MCP memory records alone do not establish GitHub creation or dashboard publication.

## 2. Step-by-Step Execution
1. **Queue Review:**
   - Inspect active issues in the Backlog and In Progress columns on `https://ensign-appfix-dashboard.vercel.app`.
2. **Issue Triage & Reproduction:**
   - Check issue labels (`urgency:high`, `urgency:medium`, `urgency:low`).
   - Reproduce issue locally on the target application repository.
3. **Fix Implementation & Test:**
   - Create fix branch, implement change, and run test suite.
4. **Resolution & Auto-Prune:**
   - Submit PR with `Closes #<issue_number>`.
   - Verify status transitions to `Done` on the Kanban board.

## 3. Done When
- High urgency issues triaged and resolved within 48 hours.
- Live AppFix board reflects accurate GitHub state.
