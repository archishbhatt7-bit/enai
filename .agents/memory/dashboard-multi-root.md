---
name: Dashboard JSX multi-root
description: When Dashboard.tsx needs to render a fixed-position overlay modal alongside the main layout, the return must use a React Fragment.
---

The Dashboard `return` must use `<>...</>` fragment when adding modals outside the main `<div className="min-h-screen">` wrapper — otherwise Babel throws "Unexpected token" at the `{condition && <Modal>}` line.

**Why:** The main layout div closes before the modal, so without a fragment there are multiple JSX root elements.

**How to apply:** Pattern is `return (<><div className="min-h-screen">...</div>{modal}</>)` — all fixed/overlay modals go after the main layout div but inside the Fragment.
