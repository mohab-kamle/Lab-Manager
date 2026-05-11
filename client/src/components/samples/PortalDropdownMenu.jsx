import React, { useState, useLayoutEffect, useRef } from "react";
import ReactDOM from "react-dom";

/**
 * A custom dropdown menu component that renders via a React Portal
 * to escape parent containers with overflow: hidden/auto.
 *
 * This solves the clipping issue where Bootstrap dropdown menus
 * are cut off inside scrollable or overflow-hidden ancestors
 * (e.g., Kanban columns, Accordion items, Modals).
 *
 * Usage:
 *   <Dropdown>
 *     <Dropdown.Toggle ... />
 *     <PortalDropdownMenu toggleRef={toggleRef}>
 *       <Dropdown.Item>...</Dropdown.Item>
 *     </PortalDropdownMenu>
 *   </Dropdown>
 */
const PortalDropdownMenu = React.forwardRef(
  ({ children, style, className, "aria-labelledby": labeledBy, show, align, ...props }, ref) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);

    // Merge external ref with our internal ref
    const setRefs = (el) => {
      menuRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    // Recalculate position when the menu becomes visible
    useLayoutEffect(() => {
      if (show && labeledBy) {
        // Find the toggle button that opened this menu
        const toggle = document.getElementById(labeledBy);
        if (toggle) {
          const rect = toggle.getBoundingClientRect();
          const menuHeight = menuRef.current?.offsetHeight || 250;
          const viewportHeight = window.innerHeight;

          // Decide whether to open upward or downward
          const spaceBelow = viewportHeight - rect.bottom;
          const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow;

          setPosition({
            top: openUpward ? rect.top - menuHeight : rect.bottom + 4,
            left: align === "end" ? rect.right : rect.left,
          });
        }
      }
    }, [show, labeledBy, align]);

    // Don't render if not visible
    if (!show) return null;

    const menuStyle = {
      position: "fixed",
      top: `${position.top}px`,
      left: align === "end" ? "auto" : `${position.left}px`,
      right: align === "end" ? `${window.innerWidth - position.left}px` : "auto",
      zIndex: 99999,
      minWidth: "180px",
    };

    return ReactDOM.createPortal(
      <div
        ref={setRefs}
        style={menuStyle}
        className={`dropdown-menu show shadow ${className || ""}`}
        aria-labelledby={labeledBy}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);

PortalDropdownMenu.displayName = "PortalDropdownMenu";

export default PortalDropdownMenu;
