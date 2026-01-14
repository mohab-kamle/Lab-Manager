## 2026-01-14 - Accessibility State Verification with Playwright
**Learning:** When verifying React components with Playwright, simply checking for an attribute update (e.g., `aria-label`) on an existing element handle can fail if the component re-renders. The element handle becomes stale.
**Action:** Always re-query the element (e.g., `page.get_by_label("New Label")`) or use a locator that is resilient to re-renders when verifying state changes that trigger UI updates.

## 2026-01-14 - Semantic Roles for Custom Widgets
**Learning:** Using `aria-pressed` on standard `<button>` elements effectively communicates "toggle" or "active" state for single-selection groups (like user roles) without needing complex `radiogroup` structures, making it a high-impact, low-complexity win for legacy codebases.
**Action:** Prefer `aria-pressed` for simple state toggles on existing buttons rather than rewriting them into complex widgets unless full keyboard navigation semantics (arrow keys) are strictly required.
