import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import "../../styles/Toast.css";

// Create Context
const ToastContext = createContext(null);

// Default positions by type
const DEFAULT_POSITIONS = {
  success: "center",
  info: "center",
  error: "right",
  warning: "right",
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  // ============================================
  // TOAST STATE & FUNCTIONS (Singleton Design)
  // ============================================
  const [toastData, setToastData] = useState({
    show: false,
    message: "",
    type: "success",
    position: "center",
    isHiding: false,
    showCloseBtn: false,
    clickToClose: true,
    duration: 3000,
  });

  const hideTimeoutRef = useRef(null);
  const autoCloseRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Hide Toast Function
  const hideToast = useCallback(() => {
    clearAllTimers();

    setToastData((prev) => {
      if (!prev.show || prev.isHiding) return prev;
      return { ...prev, isHiding: true };
    });

    hideTimeoutRef.current = setTimeout(() => {
      setToastData({
        show: false,
        message: "",
        type: "success",
        position: "center",
        isHiding: false,
        showCloseBtn: false,
        clickToClose: true,
        duration: 3000,
      });
      hideTimeoutRef.current = null;
    }, 300);
  }, [clearAllTimers]);

  // Show Toast Function
  const showToast = useCallback(
    (message, type = "success", options = {}) => {
      clearAllTimers();

      // Legacy option mapping
      let mappedDuration = 3000;
      if (options.autoClose === false) {
        mappedDuration = 0;
      } else if (typeof options.autoClose === "number") {
        mappedDuration = options.autoClose;
      } else if (options.duration !== undefined) {
        mappedDuration = options.duration;
      }

      let mappedClickToClose = true;
      if (options.closeOnClick !== undefined) {
        mappedClickToClose = options.closeOnClick;
      } else if (options.clickToClose !== undefined) {
        mappedClickToClose = options.clickToClose;
      }

      const position = options.position || DEFAULT_POSITIONS[type] || "right";
      const showCloseBtn = options.showCloseBtn !== undefined ? options.showCloseBtn : false;
      const duration = mappedDuration;
      const clickToClose = mappedClickToClose;

      setToastData({
        show: true,
        message,
        type,
        position,
        isHiding: false,
        showCloseBtn,
        clickToClose,
        duration,
      });

      if (duration > 0) {
        autoCloseRef.current = setTimeout(() => {
          autoCloseRef.current = null;
          hideToast();
        }, duration);
      }
    },
    [clearAllTimers, hideToast]
  );

  // Shorthand toast functions
  const toast = useMemo(() => ({
    success: (message, options = {}) =>
      showToast(message, "success", { position: "center", ...options }),
    error: (message, options = {}) =>
      showToast(message, "error", { position: "right", ...options }),
    warning: (message, options = {}) =>
      showToast(message, "warning", { position: "right", ...options }),
    info: (message, options = {}) =>
      showToast(message, "info", { position: "center", ...options }),
    loading: (message, options = {}) =>
      showToast(message, "loading", {
        position: "center",
        duration: 0,
        clickToClose: false,
        ...options,
      }),
    update: (options = {}) => {
      const { render, message, type, ...rest } = options;
      showToast(render || message, type || "success", {
        clickToClose: true,
        ...rest,
      });
    },
  }), [showToast]);
  // ============================================
  // CONFIRM STATE & FUNCTIONS
  // ============================================
  const [confirmData, setConfirmData] = useState({
    show: false,
    title: "",
    message: "",
    type: "danger",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isLoading: false,
    resolvePromise: null,
  });

  // Show Confirm Function (Promise-based)
  const showConfirm = useCallback(
    ({
      title,
      message,
      type = "danger",
      confirmText,
      cancelText = "Cancel",
      requireMatch = null,
      inputField = null,
    }) => {
      // Default confirm text based on type
      const defaultConfirmText = {
        danger: "Yes, Delete",
        warning: "Continue",
        info: "OK",
      };

      return new Promise((resolve) => {
        setConfirmData({
          show: true,
          title,
          message,
          type,
          confirmText: confirmText || defaultConfirmText[type] || "Confirm",
          cancelText,
          isLoading: false,
          resolvePromise: resolve,
          requireMatch,
          inputField,
          matchValue: "",
          inputValue: "",
        });
      });
    },
    []
  );

  // Handle Confirm Click
  const handleConfirm = useCallback(
    async (asyncCallback) => {
      // If requireMatch is set, check if matchValue matches
      if (confirmData.requireMatch && confirmData.matchValue !== confirmData.requireMatch) {
        return;
      }
      
      // If inputField is set and required, we could check here too, but we'll let the user decide.
      // We pass the inputValue back in the resolve.

      if (asyncCallback && typeof asyncCallback === "function") {
        setConfirmData((prev) => ({ ...prev, isLoading: true }));
        try {
          await asyncCallback();
        } catch (error) {
          console.error("Confirm callback error:", error);
        }
      }

      // Resolve promise with true or data
      if (confirmData.resolvePromise) {
        if (confirmData.inputField) {
          confirmData.resolvePromise({ confirmed: true, inputValue: confirmData.inputValue });
        } else {
          confirmData.resolvePromise(true);
        }
      }

      // Close dialog
      setConfirmData({
        show: false,
        title: "",
        message: "",
        type: "danger",
        confirmText: "Confirm",
        cancelText: "Cancel",
        isLoading: false,
        resolvePromise: null,
        requireMatch: null,
        inputField: null,
      });
    },
    [confirmData.resolvePromise, confirmData.requireMatch, confirmData.matchValue, confirmData.inputField, confirmData.inputValue]
  );

  // Handle Cancel Click
  const handleCancel = useCallback(() => {
    // Resolve promise with false
    if (confirmData.resolvePromise) {
      if (confirmData.inputField) {
        confirmData.resolvePromise({ confirmed: false });
      } else {
        confirmData.resolvePromise(false);
      }
    }

    // Close dialog
    setConfirmData({
      show: false,
      title: "",
      message: "",
      type: "danger",
      confirmText: "Confirm",
      cancelText: "Cancel",
      isLoading: false,
      resolvePromise: null,
      requireMatch: null,
      inputField: null,
    });
  }, [confirmData.resolvePromise, confirmData.inputField]);

  // Handle Input Changes
  const handleMatchChange = useCallback((e) => {
    const value = e.target.value;
    setConfirmData(prev => ({ ...prev, matchValue: value }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setConfirmData(prev => ({ ...prev, inputValue: value }));
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (confirmData.show && !confirmData.isLoading) {
          handleCancel();
        } else if (toastData.show) {
          hideToast();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [
    confirmData.show,
    confirmData.isLoading,
    toastData.show,
    handleCancel,
    hideToast,
  ]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Shorthand confirm functions
  const confirm = {
    // Delete confirmation
    delete: (itemName, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm({
          title: "Delete Item?",
          message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
          type: "danger",
        });

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },

    // Warning confirmation
    warning: (title, message, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm({
          title,
          message,
          type: "warning",
        });

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },

    // Info confirmation
    info: (title, message, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm({
          title,
          message,
          type: "info",
        });

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },

    // Custom confirmation
    custom: (options, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm(options);

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },
  };

  return (
    <ToastContext.Provider
      value={{
        // Toast
        showToast,
        hideToast,
        toast,
        // Confirm
        showConfirm,
        handleConfirm,
        handleCancel,
        confirm,
      }}
    >
      {children}

      {/* Toast Component */}
      <ToastComponent toastData={toastData} hideToast={hideToast} />

      {/* Confirm Component */}
      <ConfirmComponent
        confirmData={confirmData}
        handleConfirm={handleConfirm}
        handleCancel={handleCancel}
        handleMatchChange={handleMatchChange}
        handleInputChange={handleInputChange}
      />
    </ToastContext.Provider>
  );
};

// ============================================
// TOAST UI COMPONENT
// ============================================
const ToastComponent = ({ toastData, hideToast }) => {
  if (!toastData.show) return null;

  const getIcon = () => {
    const size = toastData.position === "center" ? 28 : 22;
    switch (toastData.type) {
      case "success":
        return <CheckCircle size={size} />;
      case "error":
        return <AlertCircle size={size} />;
      case "warning":
        return <AlertTriangle size={size} />;
      case "info":
        return <Info size={size} />;
      case "loading":
        return <span className="toast-spinner" style={{ width: size, height: size, borderTopColor: 'white' }}></span>;
      default:
        return <CheckCircle size={size} />;
    }
  };

  const getTitle = () => {
    switch (toastData.type) {
      case "success":
        return "Success!";
      case "error":
        return "Error!";
      case "warning":
        return "Warning!";
      case "info":
        return "Info";
      case "loading":
        return "Loading...";
      default:
        return "Notification";
    }
  };

  const handleClick = () => {
    if (toastData.clickToClose) {
      hideToast();
    }
  };

  return (
    <div
      className={`
        toast-container-${toastData.position}
        ${toastData.isHiding ? "hiding" : ""}
      `}
      onClick={handleClick}
      style={{ cursor: toastData.clickToClose ? "pointer" : "default" }}
    >
      <div className={`toast-card ${toastData.type}`}>
        <div className="icon-box">{getIcon()}</div>

        <div className="toast-content">
          <h5 className="toast-title">{getTitle()}</h5>
          <div className="toast-message">{toastData.message}</div>
        </div>

        {toastData.showCloseBtn && (
          <button
            className="toast-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              hideToast();
            }}
          >
            <X size={18} />
          </button>
        )}

        <div
          className="toast-progress"
          style={{
            animationDuration: `${toastData.duration}ms`,
          }}
        />
      </div>
    </div>
  );
};

// ============================================
// CONFIRM UI COMPONENT
// ============================================
const ConfirmComponent = ({ confirmData, handleConfirm, handleCancel, handleMatchChange, handleInputChange }) => {
  if (!confirmData.show) return null;

  const getIcon = () => {
    switch (confirmData.type) {
      case "danger":
        return <AlertCircle size={40} />;
      case "warning":
        return <AlertTriangle size={40} />;
      case "info":
        return <Info size={40} />;
      default:
        return <AlertCircle size={40} />;
    }
  };

  const isConfirmDisabled = 
    (confirmData.requireMatch && confirmData.matchValue !== confirmData.requireMatch) || 
    (confirmData.inputField && !confirmData.inputValue?.trim()) ||
    confirmData.isLoading;

  return (
    <div
      className="confirm-overlay"
      onClick={() => {
        if (!confirmData.isLoading) {
          handleCancel();
        }
      }}
    >
      <div
        className={`confirm-card ${confirmData.type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon ${confirmData.type}`}>{getIcon()}</div>

        <h3 className="confirm-title">{confirmData.title}</h3>
        <div className="confirm-message">{confirmData.message}</div>

        {confirmData.requireMatch && (
          <div className="confirm-input-group mt-3">
            <label className="small text-muted mb-1 text-start d-block">
              Type <strong>{confirmData.requireMatch}</strong> to confirm:
            </label>
            <input
              type="text"
              className="confirm-input form-control"
              value={confirmData.matchValue}
              onChange={handleMatchChange}
              placeholder={confirmData.requireMatch}
              autoFocus
            />
          </div>
        )}

        {confirmData.inputField && (
          <div className="confirm-input-group mt-3">
            <label className="small text-muted mb-1 text-start d-block">
              {confirmData.inputField.label || 'Authorization Key'}:
            </label>
            <input
              type={confirmData.inputField.type || 'text'}
              className="confirm-input form-control"
              value={confirmData.inputValue}
              onChange={handleInputChange}
              placeholder={confirmData.inputField.placeholder || ''}
              autoFocus={!confirmData.requireMatch}
            />
          </div>
        )}

        <div className="confirm-buttons mt-4">
          <button
            className="confirm-btn cancel"
            onClick={handleCancel}
            disabled={confirmData.isLoading}
          >
            {confirmData.cancelText}
          </button>
          <button
            className={`confirm-btn ${confirmData.type}`}
            onClick={() => handleConfirm()}
            disabled={isConfirmDisabled}
          >
            {confirmData.isLoading ? (
              <span className="confirm-loading">
                <span className="toast-spinner"></span>
                Loading...
              </span>
            ) : (
              confirmData.confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CUSTOM HOOK
// ============================================
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastProvider;
