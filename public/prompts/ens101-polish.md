# Start Prompt: ENS 101 Guide Mentor Desk & Completion Glow

**Project ID:** `ens101-polish`  
**Issue:** `robbagley-afk/ENS-101-Guide/issues/28`  
**Assignee:** Rodrigo Moll (@Rodrigomoll) / Rob Bagley  
**Pillar:** Capable Disciples | **Quadrant:** Q1 (Urgent & Important)  

---

## 1. Goal & Context
Refactor and polish the **ENS 101 Guide** mentor desk application. Specifically implement Issue #28:
- Update the **Next Step** button to Amazon orange (`#FF9900`).
- Add an animated **Completion Glow** that lights up when all tasks/checklists on each page of the ENS 101 app are completed.
- Maintain the two-screen layout optimized for mentor workstations on port `5050`.

## 2. Design System Guidelines
- Follow the Ensign Career Coach Design System (Inter + Montserrat, WCAG AA contrast, 56px minimum touch targets).
- Glow animation: smooth CSS transition (`box-shadow: 0 0 15px rgba(255, 153, 0, 0.6)`), non-distracting, accessible with `prefers-reduced-motion`.

## 3. Step-by-Step Execution
1. **Branch & Workspace:**
   - Check out `robbagley-afk/ENS-101-Guide` on branch `feature/issue-28-completion-glow`.
2. **Button & Lighting Implementation:**
   - Update primary action button styling to `#FF9900` with hover state `#E68A00`.
   - Implement state tracking for page checklist completion: when `completedCount === totalCount`, toggle class `.btn-next-step-complete`.
   - Add subtle pulsating completion glow in CSS.
3. **Local Testing:**
   - Verify on local dev server (`http://localhost:5050`) on both desktop and tablet viewports.
   - Verify that incomplete checklists do not trigger the completion glow.
4. **PR & AppFix Kanban:**
   - Commit changes referencing Issue #28.
   - Open Pull Request and notify Rodrigo Moll for review.

## 4. Done When
- Next Step button is Amazon orange (`#FF9900`).
- Completion glow activates dynamically only when 100% of checklist items on the screen are finished.
- Issue #28 is closed with PR merged and deployed.
