## 2024-05-14 - [Memoize expensive filtering and sorting in MyListView]
**Learning:** The React app uses a global `MediaContext` that can trigger unnecessary re-renders in consumer components (like CatalogView and MyListView) on simple UI state changes (e.g., modal toggles). Filtering and sorting the entire list on every render causes significant overhead.
**Action:** Wrap expensive operations like array filtering and sorting in `useMemo` to prevent redundant computations on non-relevant state changes, as seen in `CatalogView` and missing in `MyListView`.
