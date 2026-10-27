# Start Prompt: Ensign Career Apps Design System Restyle

**Project ID:** `career-ui-suite`  
**Repository:** `robbagley-afk/ensign-design-system`  
**Assignee:** Rob Bagley / DevOps Team  
**Pillar:** Capable Disciples | **Quadrant:** Q2 (Strategic Focus)  

---

## 1. Goal & Context
Standardize all 10 Ensign Career Services portfolio web applications to the official Ensign Career Coach Design System (Montserrat headings, Inter body, Ensign Forest `#004731`, Gold `#F59E0B`, WCAG AA accessibility, 56px touch targets, local LM Studio inference).

## 2. In-Scope Applications
1. ENS 101 Guide (port 5050)
2. Student Readiness Hub (port 5055)
3. Mentor Explorer (port 5046)
4. Career Fair Coach (port 5048)
5. Resume Tutor (port 5045)
6. Major Career Explorer (port 5052)
7. Interview Coach (port 5053)
8. Ensign AppFix Dashboard
9. Ensign Key Projects Dashboard
10. Academic Advising Bridge

## 3. Step-by-Step Execution
1. **Design System Token Audit:**
   - Verify shared CSS tokens (`tokens.json`, `ensign-coach.css`) across all apps.
2. **Decommission Cloud LLM Fallbacks:**
   - Ensure all apps route inference strictly to local LM Studio resident models on Mac Studio (:1234 / proxy :4002).
3. **Accessibility & Responsive Pass:**
   - Verify color contrast (minimum 4.5:1 text, 3:1 UI components).
   - Test mobile touch targets (minimum 48-56px).
4. **Automated Verification:**
   - Run the design system audit script `scripts/audit_portfolio_ui.py`.

## 4. Done When
- All 10 apps pass design token compliance.
- No hardcoded inline styles or mismatched font imports.
- Verification report logged with zero WCAG AA violations.
