# Task Output Documentation Archive

**Purpose:** Centralized archive for all AI task output documentation, summaries, and analysis reports.

**Last Updated:** 2026-02-20

---

## Directory Structure

```
archive/prompt-docs/
├── README.md                      # This file
├── INDEX.md                       # Master index of all archived documents
├── output-summary/                # Task execution summaries and completion reports
│   ├── ARCHITECTURE_PROCESSING_SUMMARY.md
│   ├── BACKEND_REVERSE_ENGINEERING_SUMMARY.md
│   ├── DEPLOYMENT_PROCESSING_SUMMARY.md
│   ├── DOCUMENTATION_RELOCATION_SUMMARY.md
│   ├── EXTRACTION_SUMMARY.md
│   ├── GUIDE_FOLDER_CLEANUP_COMPLETE.md
│   ├── INFRASTRUCTURE_SUMMARY.md
│   ├── MCP-PROCESSING-SUMMARY.md
│   ├── OPERATIONS_EXTRACTION_SUMMARY.md
│   ├── ORGANIZATION_SUMMARY.md
│   └── RESEARCH_FOLDER_REORGANIZATION_COMPLETE.md
├── indexes/                       # Navigation and index documents
│   ├── DOCUMENTATION_INDEX.md
│   ├── FRONTEND-DOCUMENTATION-INDEX.md
│   ├── GUIDE_EXTRACTION_INDEX.md
│   ├── INDEX.md
│   └── WORKFLOWS-EVENTS-DOCUMENTATION-INDEX.md
└── analysis/                      # Analysis and research documents
    └── RESEARCH_FOLDER_ANALYSIS.md
```

---

## Folder Descriptions

### 📊 output-summary/

**Purpose:** Contains summaries of completed AI tasks, processing reports, and execution summaries.

**Contents:**
- Task completion reports (e.g., `GUIDE_FOLDER_CLEANUP_COMPLETE.md`)
- Processing summaries (e.g., `ARCHITECTURE_PROCESSING_SUMMARY.md`)
- Extraction reports (e.g., `EXTRACTION_SUMMARY.md`)
- Reorganization reports (e.g., `DOCUMENTATION_RELOCATION_SUMMARY.md`)

**When to add here:**
- After completing a major documentation task
- After processing/extracting content from existing docs
- After reorganizing project structure
- After reverse-engineering components

**Naming Convention:** `{TASK_NAME}_{TYPE}.md`
- Types: `SUMMARY`, `COMPLETE`, `REPORT`
- Example: `BACKEND_REVERSE_ENGINEERING_SUMMARY.md`

---

### 📑 indexes/

**Purpose:** Navigation documents that provide quick access to related documentation.

**Contents:**
- Master indexes (e.g., `INDEX.md`, `DOCUMENTATION_INDEX.md`)
- Domain-specific indexes (e.g., `FRONTEND-DOCUMENTATION-INDEX.md`)
- Extraction indexes (e.g., `GUIDE_EXTRACTION_INDEX.md`)

**When to add here:**
- After creating a new documentation category
- When organizing related documents
- When creating navigation aids for large doc sets

**Naming Convention:** `{SCOPE}_INDEX.md` or `{DOMAIN}-DOCUMENTATION-INDEX.md`

---

### 🔍 analysis/

**Purpose:** In-depth analysis documents, research findings, and investigation reports.

**Contents:**
- Folder analysis reports (e.g., `RESEARCH_FOLDER_ANALYSIS.md`)
- Code analysis reports
- Investigation findings
- Feasibility studies (when completed)

**When to add here:**
- After analyzing existing code or documentation
- After investigating architectural decisions
- After researching implementation approaches
- After completing feasibility studies

**Naming Convention:** `{SCOPE}_ANALYSIS.md` or `{COMPONENT}_RESEARCH_REPORT.md`

---

## Usage Guidelines

### For AI Assistants

**When creating new task output documents:**

1. **Determine Document Type:**
   - Is it a summary of completed work? → `output-summary/`
   - Is it a navigation/index document? → `indexes/`
   - Is it an analysis or investigation? → `analysis/`

2. **Use Consistent Naming:**
   ```
   output-summary/{TASK_NAME}_{SUMMARY|COMPLETE|REPORT}.md
   indexes/{SCOPE}_{INDEX|DOCUMENTATION-INDEX}.md
   analysis/{SCOPE}_{ANALYSIS|RESEARCH}.md
   ```

3. **Always Include Metadata:**
   ```markdown
   # Document Title

   **Date Created:** YYYY-MM-DD
   **Task ID:** (if applicable)
   **Status:** Complete/In Progress/Archived
   **Related Documents:** [Links to related docs]

   ---
   ```

4. **Update INDEX.md:**
   - Add entry to the master index
   - Include brief description
   - Link to full document

### For Developers

**Finding Information:**

1. **Start with `INDEX.md`** - Master index of all archived task outputs
2. **Check folder-specific indexes** - Domain-specific navigation
3. **Use search** - All documents are markdown and searchable

**Referencing These Documents:**

```markdown
See [Backend Reverse Engineering Summary](archive/prompt-docs/output-summary/BACKEND_REVERSE_ENGINEERING_SUMMARY.md)
```

---

## Document Lifecycle

### Creation
1. AI task generates output document
2. Document placed in appropriate subfolder
3. Entry added to `INDEX.md`
4. Related documents updated with cross-references

### Archival
- Documents remain in this archive indefinitely
- Outdated documents get "ARCHIVED" status but are not deleted
- Historical reference is maintained

### Retirement
- Documents are NEVER deleted
- If superseded, add notice:
  ```markdown
  # ⚠️ SUPERSEDED

  **Date Superseded:** YYYY-MM-DD
  **Superseded By:** [Link to new document]
  **Reason:** Brief explanation
  ```

---

## Maintenance

### Monthly Review (Recommended)
- [ ] Review new documents added
- [ ] Update INDEX.md
- [ ] Check for broken cross-references
- [ ] Archive outdated status reports

### Quarterly Cleanup (Recommended)
- [ ] Review all documents for accuracy
- [ ] Update superseded documents
- [ ] Consolidate duplicate information
- [ ] Update cross-references

---

## Related Documentation

- **Main Project Docs:** `../../README.md`
- **Requirements:** `../../requirements/`
- **Architecture:** `../../architecture/`
- **Tasks:** `../../tasks/`
- **Archive:** `../`

---

## Contributing

When adding new documents to this archive:

1. Choose correct subfolder based on document type
2. Follow naming conventions
3. Include complete metadata
4. Update INDEX.md
5. Add cross-references to related documents
6. Include clear section headers and TOC for long documents

---

## Questions?

For questions about this archive structure or where to place new documents:
- Review this README
- Check `INDEX.md` for examples
- Follow existing document patterns
- When in doubt, place in `output-summary/` and add proper metadata

---

**Maintained By:** AI Task Execution System
**Archive Created:** 2026-02-20
**Last Reorganization:** 2026-02-20
