## 2026-10-24 - Unnecessary Re-renders from Global MediaContext
**Learning:** The React app uses a global `MediaContext` that can trigger unnecessary re-renders in consumer components (like CatalogView and MyListView) on simple UI state changes (e.g., modal toggles). Wrapping expensive operations like array filtering and sorting in `useMemo` is the established pattern to mitigate this bottleneck.
**Action:** Always wrap heavy list filtering/sorting in `useMemo` when components consume state from a broad context like `MediaContext`.
