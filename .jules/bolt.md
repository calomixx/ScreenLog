
## 2026-10-27 - Memoize List Transformations
**Learning:** The React app uses a global `MediaContext` that can trigger unnecessary re-renders in consumer components (like CatalogView and MyListView) on simple UI state changes. This causes expensive operations like array filtering and sorting to recalculate unnecessarily.
**Action:** Wrapping expensive operations like array filtering and sorting in `useMemo` is the established pattern to mitigate this bottleneck.
