## 2024-05-16 - [Keyboard Nav in Complex Interactive Cards]
**Learning:** Adding `onKeyDown` and `tabIndex` to complex container cards (like `MediaCard`) that contain internal interactive elements (buttons, menus) can easily break nested interactions if event bubbling is not controlled.
**Action:** When implementing keyboard accessibility on wrapper elements (e.g., clickable cards), CRITICALLY ALWAYS include an event bubbling guard (`if (e.target !== e.currentTarget) return;`) at the top of the `onKeyDown` handler to prevent the parent from intercepting events intended for child buttons.
