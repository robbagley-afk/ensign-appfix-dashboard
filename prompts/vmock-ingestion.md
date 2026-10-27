# Start Prompt: VMock Full Module Ingestion & Scoring Engine

**Project ID:** `vmock-ingestion`  
**Role:** Data Pipeline & ML Systems Engineer  
**Repository:** `robbagley-afk/ensign-student-readiness-hub` (local port: 5055)  
**Pillar:** Capable Disciples | **Quadrant:** Q1 (Urgent & Important)  
**Primary Contact:** Rob Bagley

---

## 1. Goal & Context
Integrate the full 6-module VMock dataset ingestion engine into the Ensign Student Readiness Hub. The pipeline ingests 7,024 student records across:
1. Core Resume Scoring
2. Aspire (LinkedIn Profile Optimization)
3. Resume Optimizer
4. Elevator Pitch
5. Smart Mock Interview
6. Career Fit Assessment

## 2. Standing Constraints
- **Strict FERPA Gate:** Student data is processed solely on-device in SQLite/DuckDB on the Mac Studio (`100.68.219.45`). Never send student scores or records to external cloud LLM APIs.
- **Port Isolation:** Ensure service runs on assigned port `5055` without colliding with Odysseus (`7001`) or LM Studio (`1234`).

## 3. Step-by-Step Execution
1. **Module Parser Ingestion:**
   - Validate `scripts/ingest_vmock_all_modules.py` against the 9.7MB production export.
   - Verify all 6 module schemas normalize to the unified readiness database schema.
2. **Unit & Regression Testing:**
   - Run the 167 automated unit tests (`pytest tests/test_vmock_pipeline.py`).
   - Confirm zero unhandled nulls, date parsing errors, or schema mismatches.
3. **Readiness Dashboard Integration:**
   - Verify real-time score calculation and cohort percentile distribution widgets on `http://localhost:5055`.
4. **Health Check & Evidence:**
   - Output an ingestion summary report showing record counts, module completion rates, and benchmark percentiles.

## 4. Done When
- 7,024 records parsed across all 6 modules with zero errors.
- 167 unit tests pass cleanly.
- Live dashboard reflects real-time scoring on port 5055.
