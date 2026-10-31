## 2026-10-31 - MediaCard Keyboard Accessibility
**Learning:** When making wrapper elements interactive with onKeyDown for keyboard users, event bubbling guards (e.g. `if (e.target !== e.currentTarget) return;`) are crucial to prevent breaking nested child interactions.
**Action:** Always check for interactive children when adding event listeners to semantic containers and apply bubbling guards.
