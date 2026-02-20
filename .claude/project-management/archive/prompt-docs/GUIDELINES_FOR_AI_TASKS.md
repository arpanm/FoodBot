# Guidelines for AI Task Output Documentation

**Purpose:** Instructions for AI assistants on where to generate task output files
**Last Updated:** 2026-02-20
**Status:** Active

---

## Quick Reference

**📍 Default Location for ALL Task Outputs:**

```
.claude/project-management/archive/prompt-docs/output-summary/
```

---

## Document Placement Rules

### 1. Task Execution Summaries

**Type:** Summaries of completed AI tasks, processing reports, completion reports

**Location:** `archive/prompt-docs/output-summary/`

**Naming Convention:** `{TASK_NAME}_{TYPE}.md`

**Examples:**
- `BACKEND_REVERSE_ENGINEERING_SUMMARY.md`
- `ARCHITECTURE_PROCESSING_SUMMARY.md`
- `GUIDE_FOLDER_CLEANUP_COMPLETE.md`
- `MCP_PROCESSING_SUMMARY.md`

**When to use:**
- After completing a major documentation task
- After processing/extracting content from existing docs
- After reorganizing project structure
- After reverse-engineering components
- After generating comprehensive documentation

---

### 2. Navigation/Index Documents

**Type:** Master indexes, navigation aids, documentation hubs

**Location:** `archive/prompt-docs/indexes/`

**Naming Convention:** `{SCOPE}_{INDEX|DOCUMENTATION-INDEX}.md`

**Examples:**
- `DOCUMENTATION_INDEX.md`
- `FRONTEND-DOCUMENTATION-INDEX.md`
- `WORKFLOWS-EVENTS-DOCUMENTATION-INDEX.md`

**When to use:**
- After creating a new documentation category
- When organizing related documents
- When creating navigation aids for large doc sets

---

### 3. Analysis Documents

**Type:** Research reports, investigation findings, analysis results

**Location:** `archive/prompt-docs/analysis/`

**Naming Convention:** `{SCOPE}_ANALYSIS.md` or `{COMPONENT}_RESEARCH_REPORT.md`

**Examples:**
- `RESEARCH_FOLDER_ANALYSIS.md`
- `CODE_ANALYSIS_REPORT.md`
- `PERFORMANCE_ANALYSIS_REPORT.md`

**When to use:**
- After analyzing existing code or documentation
- After investigating architectural decisions
- After researching implementation approaches
- After completing feasibility studies

---

## Step-by-Step Guide for AI Assistants

### When Completing a Documentation Task

1. **Determine Document Type:**
   - Is it a summary of work completed? → `output-summary/`
   - Is it a navigation/index document? → `indexes/`
   - Is it an analysis or investigation? → `analysis/`

2. **Choose Appropriate Filename:**
   ```
   Format: {DESCRIPTIVE_NAME}_{TYPE}.md

   Types:
   - SUMMARY (for task summaries)
   - COMPLETE (for completion reports)
   - REPORT (for analysis reports)
   - INDEX (for navigation documents)
   - ANALYSIS (for investigation findings)
   ```

3. **Generate File with Metadata:**
   ```markdown
   # Document Title

   **Date Created:** 2026-02-20
   **Created By:** [AI Assistant Name/ID]
   **Task ID:** [If applicable]
   **Status:** Complete | In Progress | Archived
   **Related Documents:** [Links]

   ---

   [Content here]
   ```

4. **Update Master Index:**
   - Add entry to `archive/prompt-docs/INDEX.md`
   - Include date, description, and link
   - Categorize appropriately

5. **Cross-Reference Related Docs:**
   - Link to related requirements
   - Link to related architecture docs
   - Link to related tasks

---

## What NOT to Do

### ❌ Don't Create Files in These Locations

**Wrong locations:**
- ❌ `docs/` root - This is for user-facing documentation only
- ❌ `prompt-docs/` root - Deprecated location
- ❌ `.claude/project-management/` root - Reserved for active docs
- ❌ Component directories (e.g., `apps/*/`, `services/*/`) - Component-specific only

**Exception:** Component-specific summaries (e.g., `apps/mobile-app/IMPLEMENTATION_SUMMARY.md`) can stay with the component if they document that specific component's implementation.

---

## Required Document Metadata

Every task output document MUST include:

```markdown
# Document Title

**Date Created:** YYYY-MM-DD
**Created By:** Claude Sonnet 4.5 (or specific version)
**Task Type:** [Documentation | Reverse Engineering | Analysis | Extraction]
**Status:** ✅ Complete | ⚠️ In Progress | 📋 Draft
**Estimated Reading Time:** X minutes

**Related Documents:**
- [Link to related doc 1](path)
- [Link to related doc 2](path)

**Related Requirements:** (if applicable)
- [FR-XXX-YYY-ZZZ](../../requirements/...)

**Related Tasks:** (if applicable)
- [TASK-XXX](../../tasks/...)

---

## Table of Contents
[If document is > 200 lines]

---

## Executive Summary
[Brief 2-3 sentence summary]

---

[Document content...]
```

---

## Document Structure Standards

### For Summaries (output-summary/)

```markdown
# Task Name - Summary

## What Was Accomplished
[Bullet list of achievements]

## Key Findings
[Important discoveries]

## Files Created/Modified
[List with file counts]

## Statistics
[Metrics, counts, percentages]

## Next Steps (if applicable)
[Recommendations]
```

### For Indexes (indexes/)

```markdown
# [Scope] Documentation Index

## Quick Navigation
- [Section 1](#section-1)
- [Section 2](#section-2)

## [Category 1]
| Document | Description | Status |
|----------|-------------|--------|
| [Doc 1](link) | Brief desc | ✅ |

## [Category 2]
...
```

### For Analysis (analysis/)

```markdown
# [Scope] Analysis Report

## Executive Summary
[Key findings in 2-3 sentences]

## Analysis Methodology
[How analysis was performed]

## Findings
[Detailed findings]

## Recommendations
[Actionable recommendations]

## Appendix
[Supporting data]
```

---

## File Size Guidelines

- **Aim for:** 200-500 lines per document
- **Maximum:** 2000 lines (split if larger)
- **Minimum:** 50 lines (if shorter, consider consolidating)

**If document exceeds 2000 lines:**
1. Split into multiple focused documents
2. Create an index document linking them
3. Use clear naming: `TOPIC_PART1.md`, `TOPIC_PART2.md`

---

## Cross-Referencing Standards

### Linking to Requirements

```markdown
This implements requirement [FR-CA-UI-001](../../requirements/customer-agent/FR-CA-UI-001-chat.md)
```

### Linking to Architecture

```markdown
See [LLM Router Architecture](../../architecture/components/llm-router.md)
```

### Linking to Tasks

```markdown
Related to [TASK-050](../../tasks/completed/TASK-050-mobile-backend-integration.md)
```

### Linking to Other Archives

```markdown
Previously documented in [Old Report](../implementation-reports/OLD_REPORT.md)
```

---

## Quality Checklist

Before finalizing any task output document:

- [ ] File is in correct location (`archive/prompt-docs/{category}/`)
- [ ] Filename follows naming convention
- [ ] Metadata section is complete
- [ ] Table of contents added (if > 200 lines)
- [ ] Executive summary included
- [ ] Cross-references to related docs added
- [ ] Statistics/metrics included (if applicable)
- [ ] Document added to `INDEX.md`
- [ ] Markdown formatting validated
- [ ] No broken links
- [ ] Clear section headers with hierarchy
- [ ] Code blocks use proper syntax highlighting
- [ ] Tables formatted correctly
- [ ] Lists use consistent formatting

---

## Automation Opportunities

### Future Improvements

1. **Auto-generate metadata** from git info
2. **Auto-update INDEX.md** when new files added
3. **Validate cross-references** automatically
4. **Calculate reading time** from word count
5. **Generate statistics** from document metrics

---

## Examples

### Example 1: Task Summary

**Correct:**
```
Location: archive/prompt-docs/output-summary/DATABASE_MIGRATION_SUMMARY.md
Contains: Task summary with metadata, achievements, statistics
Links: Related requirements, tasks, architecture docs
Index: Added to INDEX.md under "Output Summaries > Database"
```

**Incorrect:**
```
Location: docs/DATABASE_MIGRATION.md (wrong location!)
Contains: Summary without metadata
Links: None
Index: Not added to INDEX.md
```

### Example 2: Navigation Index

**Correct:**
```
Location: archive/prompt-docs/indexes/BACKEND-DOCUMENTATION-INDEX.md
Contains: Navigation hub for all backend docs
Format: Table with links, descriptions, status
Index: Added to INDEX.md under "Navigation Indexes"
```

**Incorrect:**
```
Location: .claude/project-management/BACKEND_INDEX.md (wrong location!)
Contains: Just a list of files
Format: Plain bullet list
Index: Not added to master index
```

---

## Common Mistakes to Avoid

### 1. Wrong Location
❌ Creating files in `docs/` or project root
✅ Use `archive/prompt-docs/output-summary/`

### 2. Missing Metadata
❌ Starting document without metadata section
✅ Always include date, creator, status, links

### 3. No Index Update
❌ Creating document but not updating INDEX.md
✅ Always add new document to master index

### 4. Poor Naming
❌ `summary.md`, `output.md`, `temp.md`
✅ `BACKEND_REVERSE_ENGINEERING_SUMMARY.md`

### 5. No Cross-References
❌ Standalone document with no links
✅ Link to related requirements, architecture, tasks

### 6. Missing TOC
❌ 1000-line document with no navigation
✅ Add table of contents for > 200 lines

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-20 | Initial guidelines created after archive reorganization |

---

## Questions?

If you're unsure where to place a document:

1. **Check this guide first**
2. **Look at existing examples** in `archive/prompt-docs/`
3. **Review INDEX.md** for similar documents
4. **Default to `output-summary/`** if still uncertain

---

**This document is the authoritative guide for AI task output placement.**

**When in doubt: Place in `archive/prompt-docs/output-summary/` and update INDEX.md.**
