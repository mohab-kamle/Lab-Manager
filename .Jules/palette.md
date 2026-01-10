## 2026-01-10 - Accessibility in Login Flow and Loading States
**Learning:** Adding dynamic `aria-label` to password toggles and `aria-pressed` to role selection buttons significantly improves the login experience for screen reader users without visual changes. Similarly, ensuring loading spinners have `role="status"` and visually hidden text makes async operations perceptible to assistive technology.
**Action:** Always check interactive elements (especially icon-only buttons and custom radio-like groups) for appropriate ARIA attributes. Verify loading states are announced.
