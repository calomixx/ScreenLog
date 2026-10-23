## 2024-05-19 - ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern specific to this app's components, where some modal close buttons containing only `lucide-react` icons (like `<X />`) were missing `aria-label` attributes.
**Action:** Ensure all icon-only interactive elements have descriptive `aria-label` attributes.
