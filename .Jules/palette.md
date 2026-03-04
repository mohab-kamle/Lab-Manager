## 2024-05-24 - Floating Button Visibility Logic
**Learning:** When implementing accessibility for floating buttons that appear/disappear (like "Back to Top"), simply animating opacity to 0 is insufficient because the element remains interactive and focusable.
**Action:** Use `pointerEvents: 'none'` and `tabIndex={-1}` dynamically when the element is hidden to ensure it's removed from the interaction and focus order, as seen in `FloatingBackToTopButton`.

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

## 2026-05-23 - Verifying Isolated UI Components
**Learning:** When core UI components (like tables) are deeply embedded in protected routes, creating a temporary public "harness" page allows for robust accessibility and visual verification with Playwright without needing complex authentication flows.
**Action:** Create temporary routes/pages to isolate and test specific UI components when backend dependencies block full integration testing.

## 2026-01-20 - Context for Generic List Components
**Learning:** Generic components like `DynamicTable` often lack the specific data context needed for accessible row selection (e.g., "Select John Doe" vs "Select Item").
**Action:** Implement helper props (like `getItemLabel`) in generic components to allow parent components to inject meaningful, accessible labels for repetitive actions.

## 2024-10-24 - Empty States in Generic Tables
**Learning:** Generic table components often map data directly, resulting in confusing empty headers when no data exists. Baking a configurable empty state message directly into the component ensures consistent feedback across the application.
**Action:** Always verify how data-driven components behave when provided with empty arrays/null data.
## 2024-05-24 - Verification of Protected Components
**Learning:** Verifying components deeply nested in protected layouts (like `LabLayout`) is difficult without full authentication context.
**Action:** Create temporary public routes ('harness pages') in `App.jsx` that render the component (or the layout) in isolation to bypass complex backend dependencies and authentication flows during testing.
