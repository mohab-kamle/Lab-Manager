# 2025-05-23 - Framer Motion Visibility Traps
**Learning:** Components animated with Framer Motion (like `opacity: 0`) often remain in the DOM and keyboard tab order, creating "ghost" focusable elements that confuse keyboard users.
**Action:** When animating visibility, always pair visual hiding with `aria-hidden="true"`, `tabIndex={-1}`, and `pointer-events: none` (or conditionally render using `AnimatePresence`).
