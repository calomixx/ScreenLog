## 2024-05-24 - Accessibility Keyboard Navigation in Interactive Cards
**Learning:** Custom interactive elements like MediaCard (using `<div onClick={...}>`) lack native keyboard accessibility, making them unreachable via Tab and un-activatable via Enter/Space for screen reader and keyboard users.
**Action:** Always add `tabIndex={0}`, an explicit `role="button"`, and an `onKeyDown` handler that supports 'Enter' and 'Space' (while preventing default scrolling and event bubbling) to ensure custom components are fully accessible.
