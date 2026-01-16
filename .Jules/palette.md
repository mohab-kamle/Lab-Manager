## 2024-05-23 - Accessibility Improvements
**Learning:** Adding keyboard accessibility to custom drag-and-drop zones is crucial. Using `role="button"`, `tabIndex="0"`, and `onKeyDown` allows keyboard users to trigger the file dialog.
**Action:** Always check interactive `div`s for keyboard support and semantic roles.

## 2024-06-25 - Managing Focus for Hidden Elements
**Learning:** Floating action buttons that disappear visually must also be removed from the tab order. Using `tabIndex={-1}` and `pointerEvents: 'none'` ensures keyboard users don't focus on invisible controls.
**Action:** When animating opacity to 0, always couple it with accessibility state updates.
