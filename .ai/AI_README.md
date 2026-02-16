## AI Operating Instructions

This repository is governed by Spec-Driven Development.

Primary machine-readable context lives in:

```
.ai/context/
.ai/orchestration/
```

All development agents must load these before making changes.

```
Load config.yaml → hydrate context → initialize skills → begin task graph.
```
