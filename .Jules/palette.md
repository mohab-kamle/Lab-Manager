## 2024-05-24 - Floating Button Visibility Logic
**Learning:** When implementing accessibility for floating buttons that appear/disappear (like "Back to Top"), simply animating opacity to 0 is insufficient because the element remains interactive and focusable.
**Action:** Use `pointerEvents: 'none'` and `tabIndex={-1}` dynamically when the element is hidden to ensure it's removed from the interaction and focus order, as seen in `FloatingBackToTopButton`.

## 2024-05-24 - Verification of Protected Components
**Learning:** Verifying components deeply nested in protected layouts (like `LabLayout`) is difficult without full authentication context.
**Action:** Create temporary public routes ('harness pages') in `App.jsx` that render the component (or the layout) in isolation to bypass complex backend dependencies and authentication flows during testing.
