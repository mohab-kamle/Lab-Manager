
## 2024-05-31 - Toast Close Buttons

**Learning:** Component `ToastContext.jsx` includes close buttons that contain solely an SVG icon (`<X size={18} />`) but lacked `aria-label` or `aria-hidden` attributes, leaving them unannounced or improperly read by screen readers. The "Show/Hide Details" expander also lacked an `aria-expanded` property.

**Action:** Added `aria-label="Close notification"` to the main close `<button>`, `aria-hidden="true"` to the inner `<X />` icon, and `aria-expanded={expanded}` to the expand button. Future toast and notification components should always bind screen reader text for raw icon closures.
## 2025-02-12 - Added ARIA label to remove antibiotic button
**Learning:** Found a missing `aria-label` on the `&times;` icon-only button used for removing an antibiotic in `DynamicResultForm.jsx`.
**Action:** Applied `aria-label="Remove antibiotic"` to the `button` tag to enhance accessibility for screen readers. Kept the change small and directly targeted.
