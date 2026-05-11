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

const ToastContext = createContext(null);

const DEFAULT_POSITIONS = {
  success: "center",
  info: "center",
  error: "right",
  warning: "right",
  loading: "center",
};

const TOAST_TYPES = ["success", "error", "warning", "info", "loading"];
const MAX_ITEMS_PER_GROUP = 10;
const MAX_TOTAL_TOAST_GROUPS = 10;

const createEmptyToastGroups = () => ({
  success: [],
  error: [],
  warning: [],
  info: [],
  loading: [],
});

export const ToastProvider = ({ children }) => {
  const [toastGroups, setToastGroups] = useState(createEmptyToastGroups);
  const [expandedGroups, setExpandedGroups] = useState({});
  const toastTimeoutsRef = useRef(new Map());
  const toastTimerMetaRef = useRef(new Map());

  const clearToastTimer = useCallback((id) => {
    const timer = toastTimeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimeoutsRef.current.delete(id);
    }
  }, []);

  const removeToastById = useCallback(
    (id) => {
      clearToastTimer(id);
      toastTimerMetaRef.current.delete(id);
      setToastGroups((prev) => {
        const next = { ...prev };
        let changed = false;

        TOAST_TYPES.forEach((type) => {
          const filtered = prev[type].filter((item) => item.id !== id);
          if (filtered.length !== prev[type].length) {
            next[type] = filtered;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    },
    [clearToastTimer]
  );

  const removeGroup = useCallback(
    (type, position) => {
      setToastGroups((prev) => {
        const itemsToRemove = prev[type].filter((item) => item.position === position);
        if (!itemsToRemove.length) return prev;

        itemsToRemove.forEach((item) => {
          clearToastTimer(item.id);
          toastTimerMetaRef.current.delete(item.id);
        });

        return {
          ...prev,
          [type]: prev[type].filter((item) => item.position !== position),
        };
      });

      setExpandedGroups((prev) => {
        const key = `${position}-${type}`;
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [clearToastTimer]
  );

  const scheduleToastExpiry = useCallback(
    (id, duration) => {
      clearToastTimer(id);
      if (!duration || duration <= 0) return;

      toastTimerMetaRef.current.set(id, {
        remaining: duration,
        startedAt: Date.now(),
        paused: false,
      });

      const timer = setTimeout(() => {
        removeToastById(id);
      }, duration);

      toastTimeoutsRef.current.set(id, timer);
    },
    [clearToastTimer, removeToastById]
  );

  const pausePositionTimers = useCallback(
    (position) => {
      setToastGroups((prev) => {
        TOAST_TYPES.forEach((type) => {
          const targetItems = prev[type].filter((item) => item.position === position);
          targetItems.forEach((item) => {
            const meta = toastTimerMetaRef.current.get(item.id);
            if (!meta || meta.paused) return;

            const elapsed = Date.now() - meta.startedAt;
            const remaining = Math.max(0, meta.remaining - elapsed);

            clearToastTimer(item.id);
            toastTimerMetaRef.current.set(item.id, {
              remaining,
              startedAt: Date.now(),
              paused: true,
            });
          });
        });
        return prev;
      });
    },
    [clearToastTimer]
  );

  const resumePositionTimers = useCallback(
    (position) => {
      const expiredIds = [];
      setToastGroups((prev) => {
        TOAST_TYPES.forEach((type) => {
          const targetItems = prev[type].filter((item) => item.position === position);
          targetItems.forEach((item) => {
            const meta = toastTimerMetaRef.current.get(item.id);
            if (!meta || !meta.paused) return;

            if (meta.remaining <= 0) {
              expiredIds.push(item.id);
              return;
            }

            scheduleToastExpiry(item.id, meta.remaining);
          });
        });
        return prev;
      });
      expiredIds.forEach((id) => removeToastById(id));
    },
    [removeToastById, scheduleToastExpiry]
  );

  const hideToast = useCallback(
    (id) => {
      if (id === undefined || id === null) {
        setToastGroups((prev) => {
          TOAST_TYPES.forEach((type) => {
            prev[type].forEach((item) => clearToastTimer(item.id));
          });
          return createEmptyToastGroups();
        });
        toastTimerMetaRef.current.clear();
        setExpandedGroups({});
        return;
      }

      removeToastById(id);
    },
    [clearToastTimer, removeToastById]
  );

  const toggleGroupExpanded = useCallback((groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const showToast = useCallback(
    (message, type = "success", options = {}) => {
      const normalizedType = TOAST_TYPES.includes(type) ? type : "info";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let mappedDuration = 5000;
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

      const position = options.position || DEFAULT_POSITIONS[normalizedType] || "right";
      const showCloseBtn = options.showCloseBtn !== undefined ? options.showCloseBtn : false;
      const duration = mappedDuration;
      const clickToClose = mappedClickToClose;

      const newToast = {
        id,
        message,
        type: normalizedType,
        position,
        showCloseBtn,
        clickToClose,
        duration,
        createdAt: Date.now(),
      };

      let removedIds = [];
      setToastGroups((prev) => {
        // 1. Calculate total active groups across all types
        const allItems = TOAST_TYPES.flatMap(t => prev[t]);
        const uniqueGroups = new Set(allItems.map(item => `${item.position}-${item.type}`));

        const next = { ...prev };

        // 2. If we're at the limit of total groups, remove the oldest group that isn't the one we're adding to
        if (uniqueGroups.size >= MAX_TOTAL_TOAST_GROUPS && !uniqueGroups.has(`${position}-${normalizedType}`)) {
          // Find the oldest toast among all groups
          const oldestToast = allItems.sort((a, b) => a.createdAt - b.createdAt)[0];
          if (oldestToast) {
            next[oldestToast.type] = next[oldestToast.type].filter(item => item.id !== oldestToast.id);
            removedIds.push(oldestToast.id);
          }
        }

        // 3. Add the new toast
        const updated = [...next[normalizedType], newToast];

        if (updated.length > MAX_ITEMS_PER_GROUP) {
          const overflow = updated.slice(0, updated.length - MAX_ITEMS_PER_GROUP);
          removedIds.push(...overflow.map((item) => item.id));
        }

        next[normalizedType] = updated.slice(-MAX_ITEMS_PER_GROUP);
        return next;
      });

      if (removedIds.length) {
        removedIds.forEach((removedId) => clearToastTimer(removedId));
      }

      if (duration > 0) {
        scheduleToastExpiry(id, duration);
      } else {
        toastTimerMetaRef.current.delete(id);
      }

      return id;
    },
    [clearToastTimer, scheduleToastExpiry]
  );

  const updateToast = useCallback(
    (idOrOptions, options = {}) => {
      let targetId;
      let updateOptions;

      if (typeof idOrOptions === "string" || typeof idOrOptions === "number") {
        targetId = idOrOptions;
        updateOptions = options;
      } else {
        updateOptions = idOrOptions || {};
      }

      let targetToast = null;

      setToastGroups((prev) => {
        const findById = () => {
          if (!targetId) return null;

          for (const type of TOAST_TYPES) {
            const found = prev[type].find((item) => item.id === targetId);
            if (found) return found;
          }

          return null;
        };

        const findLatestLoading = () => {
          const loadingToasts = prev.loading;
          if (!loadingToasts.length) return null;
          return loadingToasts[loadingToasts.length - 1];
        };

        const current = findById() || findLatestLoading();
        if (!current) return prev;

        targetToast = current;

        const {
          render,
          message,
          type,
          isLoading,
          autoClose,
          duration,
          position,
          showCloseBtn,
          closeOnClick,
          clickToClose,
          ...rest
        } = updateOptions;

        const resolvedType = isLoading
          ? "loading"
          : TOAST_TYPES.includes(type)
            ? type
            : current.type;

        const resolvedDuration =
          autoClose === false
            ? 0
            : typeof autoClose === "number"
              ? autoClose
              : duration !== undefined
                ? duration
                : current.duration;

        const nextToast = {
          ...current,
          ...rest,
          message: render || message || current.message,
          type: resolvedType,
          position: position || current.position || DEFAULT_POSITIONS[resolvedType] || "right",
          showCloseBtn: showCloseBtn !== undefined ? showCloseBtn : current.showCloseBtn,
          clickToClose:
            closeOnClick !== undefined
              ? closeOnClick
              : clickToClose !== undefined
                ? clickToClose
                : current.clickToClose,
          duration: resolvedDuration,
        };

        const next = { ...prev };
        next[current.type] = prev[current.type].filter((item) => item.id !== current.id);
        next[resolvedType] = [...next[resolvedType], nextToast].slice(-MAX_ITEMS_PER_GROUP);

        return next;
      });

      if (!targetToast) return;

      const { autoClose, duration } = updateOptions || {};
      const nextDuration =
        autoClose === false
          ? 0
          : typeof autoClose === "number"
            ? autoClose
            : duration !== undefined
              ? duration
              : targetToast.duration;

      if (nextDuration > 0) {
        scheduleToastExpiry(targetToast.id, nextDuration);
      } else {
        clearToastTimer(targetToast.id);
        toastTimerMetaRef.current.delete(targetToast.id);
      }
    },
    [clearToastTimer, scheduleToastExpiry]
  );

  const toast = useMemo(
    () => ({
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
      update: updateToast,
      dismiss: hideToast,
    }),
    [showToast, updateToast, hideToast]
  );

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

  const handleCancel = useCallback(() => {
    if (confirmData.resolvePromise) {
      if (confirmData.inputField) {
        confirmData.resolvePromise({ confirmed: false });
      } else {
        confirmData.resolvePromise(false);
      }
    }

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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (confirmData.show && !confirmData.isLoading) {
          handleCancel();
        } else {
          hideToast();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmData.show, confirmData.isLoading, handleCancel, hideToast]);

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timer) => clearTimeout(timer));
      toastTimeoutsRef.current.clear();
      toastTimerMetaRef.current.clear();
    };
  }, []);

  const confirm = {
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

    warning: (title, message, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm({ title, message, type: "warning" });

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },

    info: (title, message, onConfirm) => {
      return new Promise(async (resolve) => {
        const result = await showConfirm({ title, message, type: "info" });

        if (result && onConfirm) {
          await onConfirm();
        }
        resolve(result);
      });
    },

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
        showToast,
        hideToast,
        toast,
        showConfirm,
        handleConfirm,
        handleCancel,
        confirm,
      }}
    >
      {children}

      <div
        className="toast-container-right"
        onMouseEnter={() => pausePositionTimers("right")}
        onMouseLeave={() => resumePositionTimers("right")}
      >
        <ToastGroupsByPosition
          position="right"
          toastGroups={toastGroups}
          expandedGroups={expandedGroups}
          hideToast={hideToast}
          removeGroup={removeGroup}
          toggleGroupExpanded={toggleGroupExpanded}
        />
      </div>

      <div
        className="toast-container-center"
        onMouseEnter={() => pausePositionTimers("center")}
        onMouseLeave={() => resumePositionTimers("center")}
      >
        <ToastGroupsByPosition
          position="center"
          toastGroups={toastGroups}
          expandedGroups={expandedGroups}
          hideToast={hideToast}
          removeGroup={removeGroup}
          toggleGroupExpanded={toggleGroupExpanded}
        />
      </div>

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

const getToastMeta = (type) => {
  switch (type) {
    case "success":
      return { title: "Success", icon: CheckCircle };
    case "error":
      return { title: "Error", icon: AlertCircle };
    case "warning":
      return { title: "Warning", icon: AlertTriangle };
    case "info":
      return { title: "Info", icon: Info };
    case "loading":
      return { title: "Loading", icon: null };
    default:
      return { title: "Notification", icon: CheckCircle };
  }
};

const ToastGroupsByPosition = ({
  position,
  toastGroups,
  expandedGroups,
  hideToast,
  removeGroup,
  toggleGroupExpanded,
}) => {
  const grouped = TOAST_TYPES.map((type) => ({
    type,
    items: toastGroups[type].filter((item) => item.position === position),
  })).filter((entry) => entry.items.length > 0);

  return grouped.map(({ type, items }) => {
    const groupKey = `${position}-${type}`;
    return (
      <ToastGroup
        key={groupKey}
        groupKey={groupKey}
        type={type}
        items={items}
        expanded={!!expandedGroups[groupKey]}
        hideToast={hideToast}
        removeGroup={removeGroup}
        toggleGroupExpanded={toggleGroupExpanded}
        position={position}
      />
    );
  });
};

const ToastGroup = ({
  groupKey,
  type,
  items,
  expanded,
  hideToast,
  removeGroup,
  toggleGroupExpanded,
  position,
}) => {
  const { title, icon: Icon } = getToastMeta(type);
  const collapsedMessage = items[items.length - 1]?.message || "";
  const canExpand = items.length > 1;

  const summarizedItems = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (!map.has(item.message)) {
        map.set(item.message, { message: item.message, count: 1, id: item.id });
      } else {
        const current = map.get(item.message);
        map.set(item.message, { ...current, count: current.count + 1 });
      }
    });
    return Array.from(map.values()).reverse();
  }, [items]);

  const handleMainClick = () => {
    if (canExpand) {
      toggleGroupExpanded(groupKey);
      return;
    }

    const latest = items[items.length - 1];
    if (latest?.clickToClose) {
      hideToast(latest.id);
    }
  };

  return (
    <div className={`toast-group ${expanded ? "expanded" : ""}`}>
      <div className={`toast-card-wrapper ${position} ${type}`}>
        <div
          className={`toast-card ${type}`}
          onClick={handleMainClick}
          style={{ cursor: canExpand || items[items.length - 1]?.clickToClose ? "pointer" : "default" }}
        >
          <div className="icon-box">
            {type === "loading" ? (
              <span className="toast-spinner" style={{ width: 22, height: 22, borderTopColor: "white" }}></span>
            ) : (
              Icon && <Icon size={position === "center" ? 28 : 22} />
            )}
          </div>

          <div className="toast-content">
            <h5 className="toast-title">
              {title}
              {items.length > 1 ? ` (${items.length})` : ""}
            </h5>
            <div className="toast-message">{collapsedMessage}</div>
          </div>

          {items[items.length - 1]?.duration > 0 && (
            <div className="toast-progress">
              <div
                className="toast-progress-fill"
                style={{
                  animationDuration: `${items[items.length - 1].duration}ms`,
                  animationPlayState: expanded ? 'paused' : 'running'
                }}
              />
            </div>
          )}

          <button
            type="button"
            className="toast-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              removeGroup(type, position);
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {canExpand ? (
        <button
          type="button"
          className="toast-group-toggle"
          onClick={() => toggleGroupExpanded(groupKey)}
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      ) : null}

      {canExpand && expanded ? (
        <div className="toast-group-dropdown">
          {summarizedItems.map((item) => (
            <div key={`${groupKey}-${item.id}`} className="toast-sub-item">
              <span>{item.message}</span>
              {item.count > 1 ? <span className="toast-sub-count">x{item.count}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
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
      <div className={`confirm-card ${confirmData.type}`} onClick={(e) => e.stopPropagation()}>
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

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastProvider;
