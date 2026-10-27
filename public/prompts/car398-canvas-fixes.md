# Start Prompt: CAR 398 Canvas Course Fixes & Gradebook Sync

**Project ID:** `car398-canvas-fixes`  
**Role:** Instructional Design & LMS Automation Engineer  
**Pillar:** Capable Disciples | **Quadrant:** Q1 (Urgent & Important)  
**Primary Contact:** Rob Bagley (Associate Director, Career Services)

---

## 1. Goal & Context
You are working on the Ensign College **CAR 398 Internship** Canvas course (`https://ensign.instructure.com`). Students currently encounter broken module links, misaligned assignment rubrics, and gradebook passback sync delays.

## 2. Standing Constraints
- **FERPA Non-Negotiable:** Never log, extract, or transmit student PII, grades, or personal identifying information outside approved Ensign Canvas API contexts.
- **Local First:** All script tooling and testing runs locally. Stage any report files in local SSD.

## 3. Step-by-Step Execution
1. **Audit Course Modules & Rubrics:**
   - Scan all 7 CAR 398 internship modules for broken links, outdated syllabus references, and unlinked rubrics.
   - Verify that assignment rubrics accurately map to Ensign College Career Readiness outcomes.
2. **Gradebook Passback & Canvas API Verification:**
   - Check assignment webhook/sync endpoints for gradebook sync errors.
   - Ensure assignment submission settings allow PDF and web URL uploads for internship work evidence.
3. **Draft Student Announcement:**
   - Draft a concise, encouraging Canvas announcement informing students of the updated course navigation and submission guidelines.
4. **Verification & Delivery:**
   - Provide a verification checklist with all resolved module URLs and rubric IDs.
   - Submit the changelog to Rob Bagley for review before publishing changes to live Canvas students.

## 4. Done When
- All broken module links and rubric attachments are fixed and verified.
- Gradebook sync test completes without timeout or permission errors.
- Rob reviews and approves the Canvas announcement.
