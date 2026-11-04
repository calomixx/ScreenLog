
## 2024-11-04 - [Global Context Re-renders & Array Operations]
**Learning:** The application's architecture heavily utilizes a global `MediaContext`, which is tied to various UI interactions (like opening modals via `setIsAddModalOpen`). Any state change triggers re-renders across all consuming components (e.g., `CatalogView` and `MyListView`). Performing complex array operations (like filtering and sorting hundreds of media items) natively on every render acts as a severe performance bottleneck.
**Action:** Always wrap heavy computations (array `.filter()` and `.sort()`) with `useMemo` when working inside components that consume high-frequency global context to prevent unnecessary recalculations on unrelated state updates.
