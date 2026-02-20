# Research Folder Analysis & Recommendations

**Analysis Date:** 2026-02-20
**Analyst:** Claude Code Agent
**Status:** Complete

---

## Executive Summary

The `docs/research/` folder contains **10 files** that have been misclassified. Only **1 file** (ONDC_RESEARCH_REPORT.md) is actually "research" - the rest are implementation plans, code reviews, test reports, and summaries that belong elsewhere in the project structure.

### Key Findings

| Classification | Count | Action |
|----------------|-------|--------|
| **TRUE RESEARCH** | 1 | Keep in docs/research/ |
| **IMPLEMENTATION PLANS** | 5 | Move to archive, extract requirements/tasks |
| **CODE REVIEWS & TEST REPORTS** | 2 | Move to archive/quality-reports/ |
| **SUMMARIES & STATUS REPORTS** | 2 | Move to archive/status-reports/ |

---

## Detailed File Analysis

### ✅ TRUE RESEARCH (Keep in docs/research/)

#### 1. ONDC_RESEARCH_REPORT.md (1,500+ lines)
- **Classification:** Research
- **Content:** Feasibility study, market analysis, technology evaluation
- **Recommendation:** **KEEP** in `docs/research/`
- **Reason:** This is actual research with market analysis, coverage assessment, strategic recommendations
- **Update needed:** Add disclaimer that implementation may have evolved since research

---

### ⚠️ IMPLEMENTATION PLANS (Move to Archive)

#### 2. ONDC_API_SPECIFICATION.md (800+ lines)
- **Classification:** API Specification / Technical Reference
- **Current Location:** `docs/research/ONDC_API_SPECIFICATION.md`
- **Recommended Location:** `docs/api-specifications/ONDC_API_SPEC.md`
- **Reason:** This is a technical specification, not research
- **Actions:**
  1. Move to `docs/api-specifications/ONDC_API_SPEC.md`
  2. Cross-reference from ONDC integration docs
  3. Update if actual ONDC implementation exists

#### 3. ONDC_INTEGRATION_PLAN.md (500+ lines)
- **Classification:** Implementation Plan / Requirements
- **Current Location:** `docs/research/ONDC_INTEGRATION_PLAN.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/implementation-plans/ONDC_INTEGRATION_PLAN.md`
  2. **Extract Requirements** → Create `.claude/project-management/requirements/integrations/ondc-requirements.md`
  3. **Extract Tasks** → Create tasks in `.claude/project-management/tasks/`
  4. **Check Implementation Status:**
     - Search codebase for ONDC implementation
     - If implemented: Document in `docs/integrations/ONDC_INTEGRATION.md`
     - If not implemented: Mark as "Future Enhancement"

#### 4. ONDC_DELIVERABLES_SUMMARY.md (400+ lines)
- **Classification:** Status Report / Summary
- **Current Location:** `docs/research/ONDC_DELIVERABLES_SUMMARY.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/status-reports/ONDC_PHASE_SUMMARY.md`
  2. **Check**: Verify if deliverables were actually created (search for ONDCClient.ts, types.ts)
  3. **Update**: Document actual implementation status vs. planned status

#### 5. REST_API_INTEGRATION_PLAN.md (900+ lines)
- **Classification:** Implementation Plan (SUPERSEDED)
- **Current Location:** `docs/research/REST_API_INTEGRATION_PLAN.md`
- **Recommended Actions:**
  1. **Archive** to `.claude/project-management/archive/deprecated-plans/REST_API_INTEGRATION_PLAN.md`
  2. **Add Deprecation Notice:**
     ```markdown
     # ⚠️ DEPRECATED PLAN
     This plan was superseded by:
     - Chrome Plugin Integration Plan (browser automation)
     - Internal Provider implementation (mock data)

     **Reason:** Swiggy/Zomato do not provide public REST APIs
     **Date Deprecated:** 2026-02-19
     **Replaced By:** CHROME_PLUGIN_INTEGRATION_PLAN.md
     ```
  3. **Status:** Swiggy/Zomato APIs not accessible - plan is obsolete

#### 6. CHROME_PLUGIN_INTEGRATION_PLAN.md (1,400+ lines)
- **Classification:** Implementation Plan (ACTIVE or PLANNED)
- **Current Location:** `docs/research/CHROME_PLUGIN_INTEGRATION_PLAN.md`
- **Recommended Actions:**
  1. **Check Implementation Status:**
     - Search for `chrome-extension/` directory
     - Check if extension is implemented
  2. **If Implemented:**
     - Move to `docs/integrations/CHROME_EXTENSION.md`
     - Document actual implementation details
     - Archive plan to `.claude/project-management/archive/implementation-plans/CHROME_PLUGIN_INTEGRATION_PLAN.md`
  3. **If Not Implemented:**
     - Move to `.claude/project-management/requirements/integrations/chrome-extension-requirements.md`
     - Extract tasks to `.claude/project-management/tasks/future/`

---

### 📊 CODE REVIEWS & TEST REPORTS (Move to Archive)

#### 7. MCP_CODE_REVIEW.md (1,400+ lines)
- **Classification:** Code Review Report
- **Current Location:** `docs/research/MCP_CODE_REVIEW.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/quality-reports/MCP_CODE_REVIEW_2026-02-19.md`
  2. **Extract Action Items:**
     - Create issues for high-priority items (cart workflow complexity, OAuth duplication)
     - Track in `.claude/project-management/tasks/technical-debt/`
  3. **Update:** Check if identified issues have been resolved
  4. **Archive:** This is a point-in-time snapshot, not living documentation

#### 8. MCP_TEST_REPORT.md (700+ lines)
- **Classification:** Test Execution Report
- **Current Location:** `docs/research/MCP_TEST_REPORT.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/quality-reports/MCP_TEST_REPORT_2026-02-19.md`
  2. **Replace** with automated test reporting:
     - Configure CI/CD to generate test reports
     - Store in `test-results/` directory (already exists: test-results.json, test-results-e2e.json)
  3. **Extract:**
     - Create tasks for failing tests (cart workflow, Zomato support)
     - Document in `.claude/project-management/tasks/bug-fixes/`

---

### 📝 SUMMARIES & STATUS REPORTS (Move to Archive)

#### 9. MOBILE_APP_PHASE1_SUMMARY.md (380+ lines)
- **Classification:** Status Report / Summary
- **Current Location:** `docs/research/MOBILE_APP_PHASE1_SUMMARY.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/status-reports/MOBILE_APP_PHASE1_COMPLETE.md`
  2. **Create Living Documentation:**
     - `docs/mobile-app/SETUP.md` (if app exists)
     - `docs/mobile-app/ARCHITECTURE.md` (if app exists)
  3. **Verify:** Check if `apps/mobile-app/` directory exists with actual code
  4. **Update:** If mobile app is implemented, document current status vs. Phase 1 plan

#### 10. PRODUCTION_READINESS_SUMMARY.md (665+ lines)
- **Classification:** Status Report / Summary
- **Current Location:** `docs/research/PRODUCTION_READINESS_SUMMARY.md`
- **Recommended Actions:**
  1. **Move** to `.claude/project-management/archive/status-reports/PRODUCTION_READINESS_2026-02-19.md`
  2. **Create Living Documentation:**
     - `docs/operations/DEPLOYMENT.md`
     - `docs/operations/MONITORING.md`
     - `docs/operations/RUNBOOK.md`
  3. **Update:** Document actual production setup vs. planned setup
  4. **Track:** Convert checklist items to ongoing tasks

---

## Recommended Folder Structure

```
/Users/arpan1.mukherjee/code/FoodBot/

docs/
├── research/                          # TRUE RESEARCH ONLY
│   └── ONDC_RESEARCH_REPORT.md       ✅ Keep
│
├── api-specifications/                # NEW: Technical specs
│   └── ONDC_API_SPEC.md              ← Move from research
│
├── integrations/                      # NEW: Integration docs
│   ├── SWIGGY_INTEGRATION.md         ← Create if implemented
│   ├── ZOMATO_INTEGRATION.md         ← Create if implemented
│   ├── ONDC_INTEGRATION.md           ← Create if implemented
│   └── CHROME_EXTENSION.md           ← Move from research if implemented
│
├── operations/                        # NEW: Ops documentation
│   ├── DEPLOYMENT.md                 ← Extract from production summary
│   ├── MONITORING.md                 ← Extract from production summary
│   └── RUNBOOK.md                    ← Extract from production summary
│
└── mobile-app/                        # NEW: Mobile app docs
    ├── SETUP.md                      ← Create if app exists
    └── ARCHITECTURE.md               ← Create if app exists

.claude/project-management/
├── requirements/
│   └── integrations/
│       ├── ondc-requirements.md      ← Extract from integration plan
│       └── chrome-extension-requirements.md  ← Extract if not implemented
│
├── tasks/
│   ├── technical-debt/
│   │   ├── refactor-cart-workflow.md     ← From code review
│   │   └── extract-oauth-service.md      ← From code review
│   ├── bug-fixes/
│   │   ├── fix-cart-workflow-tests.md    ← From test report
│   │   └── fix-zomato-support.md         ← From test report
│   └── future/
│       └── chrome-extension-tasks/       ← If not implemented
│
└── archive/
    ├── implementation-plans/
    │   ├── ONDC_INTEGRATION_PLAN.md
    │   └── CHROME_PLUGIN_INTEGRATION_PLAN.md
    ├── deprecated-plans/
    │   └── REST_API_INTEGRATION_PLAN.md  ← Deprecated
    ├── quality-reports/
    │   ├── MCP_CODE_REVIEW_2026-02-19.md
    │   └── MCP_TEST_REPORT_2026-02-19.md
    └── status-reports/
        ├── ONDC_PHASE_SUMMARY.md
        ├── MOBILE_APP_PHASE1_COMPLETE.md
        └── PRODUCTION_READINESS_2026-02-19.md
```

---

## Implementation Steps

### Step 1: Create New Directory Structure

```bash
cd /Users/arpan1.mukherjee/code/FoodBot

# Create new directories
mkdir -p docs/api-specifications
mkdir -p docs/integrations
mkdir -p docs/operations
mkdir -p docs/mobile-app
mkdir -p .claude/project-management/requirements/integrations
mkdir -p .claude/project-management/tasks/technical-debt
mkdir -p .claude/project-management/tasks/bug-fixes
mkdir -p .claude/project-management/tasks/future
mkdir -p .claude/project-management/archive/implementation-plans
mkdir -p .claude/project-management/archive/deprecated-plans
mkdir -p .claude/project-management/archive/quality-reports
mkdir -p .claude/project-management/archive/status-reports
```

### Step 2: Move Files to Archive

```bash
cd /Users/arpan1.mukherjee/code/FoodBot

# Move implementation plans
mv docs/research/ONDC_INTEGRATION_PLAN.md \
   .claude/project-management/archive/implementation-plans/

mv docs/research/CHROME_PLUGIN_INTEGRATION_PLAN.md \
   .claude/project-management/archive/implementation-plans/

# Move deprecated plans
mv docs/research/REST_API_INTEGRATION_PLAN.md \
   .claude/project-management/archive/deprecated-plans/

# Move quality reports
mv docs/research/MCP_CODE_REVIEW.md \
   .claude/project-management/archive/quality-reports/MCP_CODE_REVIEW_2026-02-19.md

mv docs/research/MCP_TEST_REPORT.md \
   .claude/project-management/archive/quality-reports/MCP_TEST_REPORT_2026-02-19.md

# Move status reports
mv docs/research/ONDC_DELIVERABLES_SUMMARY.md \
   .claude/project-management/archive/status-reports/ONDC_PHASE_SUMMARY.md

mv docs/research/MOBILE_APP_PHASE1_SUMMARY.md \
   .claude/project-management/archive/status-reports/MOBILE_APP_PHASE1_COMPLETE.md

mv docs/research/PRODUCTION_READINESS_SUMMARY.md \
   .claude/project-management/archive/status-reports/PRODUCTION_READINESS_2026-02-19.md

# Move API specification
mv docs/research/ONDC_API_SPECIFICATION.md \
   docs/api-specifications/ONDC_API_SPEC.md
```

### Step 3: Check Implementation Status

```bash
# Check if ONDC implementation exists
find . -name "*ONDC*" -type f | grep -E "\.(ts|js)$"

# Check if Chrome extension exists
ls -la chrome-extension/ 2>/dev/null || echo "Chrome extension not found"

# Check if mobile app exists
ls -la apps/mobile-app/ 2>/dev/null || echo "Mobile app not found"
```

### Step 4: Extract Requirements & Tasks

Create new requirement docs based on implementation status:

1. If **NOT implemented** → Create requirements doc
2. If **IMPLEMENTED** → Create integration doc with actual implementation details
3. Extract **TODO items** → Create task files

---

## Verification Checklist

After completing the reorganization:

- [ ] `docs/research/` contains ONLY the ONDC research report
- [ ] All implementation plans moved to archive
- [ ] Code reviews and test reports in quality-reports archive
- [ ] Status reports in status-reports archive
- [ ] API specifications in docs/api-specifications/
- [ ] Requirements extracted for unimplemented features
- [ ] Tasks created for identified issues
- [ ] Living documentation created for implemented features
- [ ] Deprecation notices added to obsolete plans
- [ ] Cross-references updated in active documentation

---

## Key Insights

### What We Learned

1. **"Research" folder became a dumping ground** for all planning documents
2. **Point-in-time reports** (code reviews, test reports) are mixed with living docs
3. **Implementation plans** are archived as "research" even after completion/deprecation
4. **Actual implementation status** is unclear from documentation alone

### Best Practices Going Forward

1. **Research = Feasibility Studies Only**
   - Market analysis
   - Technology evaluation
   - Comparative studies
   - Strategic recommendations

2. **Implementation Plans → Archive After Completion**
   - Move to archive when work begins
   - Replace with living documentation of actual implementation

3. **Point-in-Time Reports → Archive Immediately**
   - Code reviews
   - Test reports
   - Status summaries
   - Keep only in archive with date stamps

4. **Requirements → Living Documents**
   - Keep requirements separate from implementation plans
   - Update as features evolve
   - Link to actual implementation docs

5. **Automated Reporting > Manual Reports**
   - Use CI/CD for test reports
   - Generate code coverage automatically
   - Automated quality metrics

---

## Summary of Actions

| File | Current Location | Action | New Location |
|------|-----------------|--------|--------------|
| ONDC_RESEARCH_REPORT.md | docs/research/ | **KEEP** | docs/research/ (no change) |
| ONDC_API_SPECIFICATION.md | docs/research/ | **MOVE** | docs/api-specifications/ |
| ONDC_INTEGRATION_PLAN.md | docs/research/ | **ARCHIVE + EXTRACT** | archive/implementation-plans/ |
| ONDC_DELIVERABLES_SUMMARY.md | docs/research/ | **ARCHIVE** | archive/status-reports/ |
| REST_API_INTEGRATION_PLAN.md | docs/research/ | **ARCHIVE + DEPRECATE** | archive/deprecated-plans/ |
| CHROME_PLUGIN_INTEGRATION_PLAN.md | docs/research/ | **CHECK + ARCHIVE/DOCUMENT** | TBD based on implementation status |
| MCP_CODE_REVIEW.md | docs/research/ | **ARCHIVE + EXTRACT TASKS** | archive/quality-reports/ |
| MCP_TEST_REPORT.md | docs/research/ | **ARCHIVE + EXTRACT TASKS** | archive/quality-reports/ |
| MOBILE_APP_PHASE1_SUMMARY.md | docs/research/ | **ARCHIVE + CREATE DOCS** | archive/status-reports/ |
| PRODUCTION_READINESS_SUMMARY.md | docs/research/ | **ARCHIVE + EXTRACT DOCS** | archive/status-reports/ |

---

## Estimated Effort

| Task | Time Estimate |
|------|---------------|
| Create directory structure | 5 minutes |
| Move files to archive | 10 minutes |
| Check implementation status | 30 minutes |
| Extract requirements (ONDC) | 2 hours |
| Extract requirements (Chrome Extension) | 2 hours |
| Extract tasks from code review | 1 hour |
| Extract tasks from test report | 1 hour |
| Create living documentation | 3 hours |
| Add deprecation notices | 30 minutes |
| Update cross-references | 1 hour |
| **Total** | **~11 hours** |

---

## Next Steps

1. **Review this analysis** with the team
2. **Approve the reorganization plan**
3. **Execute Step 1-4** (file moves and checks)
4. **Create requirements docs** for unimplemented features
5. **Create living documentation** for implemented features
6. **Extract and track tasks** from reviews and reports
7. **Update README** to reflect new structure
8. **Communicate changes** to team

---

## Conclusion

The `docs/research/` folder currently contains **9 out of 10 files that don't belong there**. By reorganizing these documents into appropriate locations (archive, api-specifications, integrations, operations), we can:

- ✅ Clarify what is research vs. implementation
- ✅ Separate point-in-time reports from living documentation
- ✅ Make it easier to find relevant documentation
- ✅ Track requirements and tasks properly
- ✅ Maintain accurate implementation status

**Recommendation:** **Proceed with reorganization** following the steps outlined above.

---

**Analysis Complete**
**Next Action:** Execute reorganization plan
