---
title: Meeting Notes — Product Review
date: 2025-01-20
author: Dave
tags: [meeting, product, review]
---

# Product Review — Jan 20, 2025

**Attendees:** Dave, Sarah, Mike

## Agenda

1. Q4 feature recap
2. Roadmap for Q1
3. Open issues

## Discussion

### Q4 Recap

We shipped the <mark>core editor with commenting</mark><sup>[c1]</sup>, file tree, and multi-tab support. The three-file comment model is working well in practice.

Key metrics:
- Editor load time: **< 200ms**
- File save round-trip: **< 50ms**
- <mark>Comment persistence</mark><sup>[c2]</sup>: 100% fidelity in round-trip tests

### Q1 Roadmap

Priorities for the next quarter:

1. **Collaboration** — Real-time sync via CRDTs
2. **Mobile** — Read-only companion app
3. **Plugins** — Extension API for custom blocks
4. **Search** — Full-text search across workspace

> Sarah raised a good point about plugin sandboxing. We should research WASM-based isolation.

### Open Issues

- [ ] Fix paste handling for complex HTML tables
- [ ] Improve mermaid diagram error messages
- [x] Add find & replace (shipped!)
- [x] Add version history (shipped!)
- [ ] Consider adding collaborative cursors

## Action Items

| Owner | Task | Due |
| --- | --- | --- |
| Dave | Draft plugin API spec | Feb 1 |
| Sarah | Research CRDT options | Jan 30 |
| Mike | Mobile prototype | Feb 15 |

## Next Meeting

Follow-up on Feb 3. See [[Research Notes]] for Sarah's CRDT findings.

---

*Notes taken in Gutter. See [[Welcome]] for editor shortcuts.*
