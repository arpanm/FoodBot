Architectural Decision Memory (ADM)

This file records WHY decisions were made.
Agents must consult this before suggesting alternatives.

---

Decision 001 — Temporal for Execution

Why: Needed durable orchestration, retries, compensation.

Rejected Alternatives: Direct service choreography (too fragile).

---

Decision 002 — LLMs Used Only for Planning

Why: Prevent non-deterministic system behavior.

Rule: LLM outputs must always be validated and executed by services.

---

Decision 003 — MCP Abstraction Layer

Why: Avoid vendor lock-in (Swiggy/Zomato/etc.).

Impact: All providers normalized through MCP adapters.

---

Decision 004 — Graph-Based Personalization

Why: Preferences are contextual (time, day, cuisine).

Relational storage insufficient for reasoning needs.

---

Decision 005 — Vector Cache Before LLM Calls

Why: Reduce cost + latency of repeat reasoning.

---

Decision 006 — Monorepo with Domain Isolation

Why: Enables shared schemas while keeping bounded contexts clean.

---

How to Add New Decisions

Format:

Decision ###
Context:
Decision:
Reason:
Alternatives Considered:
Impact:

Agents must append — never rewrite history.
