## 2024-05-24 - Unnecessary recalculations in CatalogView and MyListView
**Learning:** The React app's global `MediaContext` triggers frequent re-renders in consumer components (like `CatalogView` and `MyListView`) on simple UI state changes like modal toggles. Leaving expensive operations like array filtering and sorting unmemoized causes a performance bottleneck on every re-render.
**Action:** Always wrap expensive list transformations (filtering, sorting) in `useMemo` when components consume context state that updates frequently.
