---
name: API typecheck memory
description: Environment constraint affecting TypeScript checks for the API server
---

The full TypeScript check for the API artifact exceeded the available Node heap even after removing unrelated project references and increasing the heap. The production bundle and focused runtime tests remain usable verification paths.

**Why:** The workspace combines a large generated TypeScript surface with Mongoose's type graph, and the compiler exhausted the container memory before reporting diagnostics.

**How to apply:** Prefer the API bundle plus focused `tsx --test` checks for delivery; revisit the compiler configuration separately if a full static check becomes a requirement.