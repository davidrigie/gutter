---
title: Research Notes — CRDTs & Collaboration
author: Sarah
date: 2025-01-25
tags: [research, crdt, collaboration]
---
# CRDTs & Collaboration Research

Research notes for adding real-time collaboration to Gutter. See [[Meeting Notes]] for context.

## Background

CRDTs (Conflict-free Replicated Data Types) allow <mark>multiple users to edit simultaneously</mark><sup>[c1]</sup> without a central server coordinating changes. This fits Gutter's local-first philosophy.

## Options Evaluated

### Yjs

- Most mature CRDT library for text editing
- Built-in TipTap binding (`y-tiptap`)
- Supports awareness (cursors, selections)
- MIT licensed

```typescript
import * as Y from 'yjs';
import { TiptapTransformer } from 'y-tiptap';

const ydoc = new Y.Doc();
const type = ydoc.getXmlFragment('prosemirror');
```

### Automerge

- Rust-native CRDT library
- Better fit for Tauri's Rust backend
- Newer, less battle-tested with ProseMirror
- Supports rich text via Peritext algorithm

### Diamond Types

- Extremely fast Rust CRDT
- Smaller community
- Would need custom ProseMirror integration

## Comparison

| Criteria | Yjs | Automerge | Diamond Types |
| --- | --- | --- | --- |
| Maturity | High | Medium | Low |
| TipTap support | Native | Manual | Manual |
| Rust integration | Via WASM | Native | Native |
| Performance | Good | Good | Excellent |
| Community | Large | Growing | Small |

## Recommendation

Start with **Yjs** for fastest time-to-ship, with a plan to evaluate Automerge for the Rust backend once their ProseMirror bindings mature.

$$
\text{Merge}(A, B) = A \cup B \setminus (A \cap B)_{\text{conflicts}}
$$

## Related

- [[Meeting Notes]] — Original discussion
- [[Code and Math]] — Technical demo of code blocks
- [[Welcome]] — Project overview

## Open Questions

1. How do we handle <mark>comment sync</mark><sup>[c2]</sup> across peers?
2. What's the latency budget for real-time cursors?
3. Should we use WebRTC for peer-to-peer or a relay server?


