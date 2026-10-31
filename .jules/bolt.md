## 2026-10-31 - [Context Re-renders bottleneck]
**Learning:** The React app uses a global MediaContext that triggers unnecessary re-renders in consumer components (like CatalogView and MyListView) on simple UI state changes.
**Action:** Wrap expensive array filtering and sorting operations in useMemo to mitigate this bottleneck.
