## 2026-01-10 - Accessibility in Login Flow and Loading States
**Learning:** Adding dynamic `aria-label` to password toggles and `aria-pressed` to role selection buttons significantly improves the login experience for screen reader users without visual changes. Similarly, ensuring loading spinners have `role="status"` and visually hidden text makes async operations perceptible to assistive technology.
**Action:** Always check interactive elements (especially icon-only buttons and custom radio-like groups) for appropriate ARIA attributes. Verify loading states are announced.

## 2026-01-14 - Accessibility State Verification with Playwright
**Learning:** When verifying React components with Playwright, simply checking for an attribute update (e.g., `aria-label`) on an existing element handle can fail if the component re-renders. The element handle becomes stale.
**Action:** Always re-query the element (e.g., `page.get_by_label("New Label")`) or use a locator that is resilient to re-renders when verifying state changes that trigger UI updates.

## 2026-01-14 - Semantic Roles for Custom Widgets
**Learning:** Using `aria-pressed` on standard `<button>` elements effectively communicates "toggle" or "active" state for single-selection groups (like user roles) without needing complex `radiogroup` structures, making it a high-impact, low-complexity win for legacy codebases.
**Action:** Prefer `aria-pressed` for simple state toggles on existing buttons rather than rewriting them into complex widgets unless full keyboard navigation semantics (arrow keys) are strictly required.

## 2024-05-23 - Accessibility Improvements
**Learning:** Adding keyboard accessibility to custom drag-and-drop zones is crucial. Using `role="button"`, `tabIndex="0"`, and `onKeyDown` allows keyboard users to trigger the file dialog.
**Action:** Always check interactive `div`s for keyboard support and semantic roles.

## 2024-06-25 - Managing Focus for Hidden Elements
**Learning:** Floating action buttons that disappear visually must also be removed from the tab order. Using `tabIndex={-1}` and `pointerEvents: 'none'` ensures keyboard users don't focus on invisible controls.
**Action:** When animating opacity to 0, always couple it with accessibility state updates.

## 2026-01-26 - Smart Labels for Dynamic Tables
**Learning:** In generic table components, rows often lack inherent "names" for checkbox labels. Creating a helper like `getItemLabel` that prioritizes common identification fields (name, title, id) allows for descriptive `aria-label`s without requiring prop drilling for every table instance.
**Action:** Use smart label derivation in generic list components to ensure screen readers announce specific items (e.g., "Select Alice") instead of generic "Select row".
