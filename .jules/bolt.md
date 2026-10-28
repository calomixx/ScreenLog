## 2025-02-12 - Memoize Array Filtering and Sorting
**Learning:** The React app uses a global `MediaContext` that can trigger unnecessary re-renders in consumer components (like CatalogView and MyListView) on simple UI state changes (e.g., modal toggles). Unmemoized array filtering and sorting becomes a bottleneck.
**Action:** Wrap expensive operations like array filtering and sorting in `useMemo` as an established pattern to mitigate this bottleneck.
