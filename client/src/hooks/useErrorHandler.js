import { useState, useCallback, useEffect } from 'react';

/**
 * Custom Hook for Error Handling
 * 
 * LOGIC EXPLANATION:
 * 
 * 1. **What is a Custom Hook?**
 *    - A JavaScript function that starts with "use" and may call other hooks
 *    - Allows you to extract component logic into reusable functions
 *    - Follows React's rules of hooks
 * 
 * 2. **Why Use useErrorHandler?**
 *    - Provides error handling for functional components
 *    - Catches errors in event handlers and async operations
 *    - Allows for custom error handling logic
 *    - Can be combined with error boundaries for comprehensive error handling
 * 
 * 3. **How the Hook Works:**
 *    - Uses useState to track error state
 *    - Provides error handling functions for different scenarios
 *    - Can automatically clear errors after a specified time
 *    - Integrates with global error handling
 * 
 * 4. **Error Handling Scenarios:**
 *    - Event handler errors (try-catch)
 *    - Async operation errors (Promise rejection)
 *    - API call errors
 *    - Component lifecycle errors
 * 
 * 5. **Integration with Error Boundaries:**
 *    - Error boundaries catch render errors
 *    - useErrorHandler catches runtime errors
 *    - Together they provide comprehensive error coverage
 */

/**
 * useErrorHandler Hook
 * 
 * @param {Object} options - Configuration options for error handling
 * @param {number} options.autoClearTime - Time in ms to automatically clear errors (default: 5000)
 * @param {Function} options.onError - Custom error handler function
 * @param {boolean} options.logToConsole - Whether to log errors to console (default: true)
 * @returns {Object} - Error state and handler functions
 */
const useErrorHandler = (options = {}) => {
  const {
    autoClearTime = 5000,
    onError = null,
    logToConsole = true
  } = options;

  // Error state
  const [error, setError] = useState(null);
  const [errorId, setErrorId] = useState(null);

  /**
   * Generate unique error ID
   */
  const generateErrorId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setErrorId(null);
  }, []);

  /**
   * Handle error with custom logic
   */
  const handleError = useCallback((error, context = {}) => {
    const newErrorId = generateErrorId();
    
    // Create error object with additional context
    const errorInfo = {
      message: error.message || 'An error occurred',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      errorId: newErrorId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console if enabled
    if (logToConsole) {
      console.error('Error caught by useErrorHandler:', errorInfo);
    }

    // Call custom error handler if provided
    if (onError && typeof onError === 'function') {
      try {
        onError(errorInfo);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Update state
    setError(errorInfo);
    setErrorId(newErrorId);

    // Log to localStorage for debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('hookErrorLogs') || '[]');
      existingLogs.unshift(errorInfo);
      existingLogs.splice(10); // Keep only last 10 errors
      localStorage.setItem('hookErrorLogs', JSON.stringify(existingLogs));
    } catch (logError) {
      console.error('Failed to log error to localStorage:', logError);
    }

    return newErrorId;
  }, [generateErrorId, logToConsole, onError]);

  /**
   * Wrap async functions with error handling
   */
  const withErrorHandling = useCallback((asyncFunction) => {
    return async (...args) => {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        handleError(error, { functionName: asyncFunction.name, args });
        throw error; // Re-throw to allow calling code to handle if needed
      }
    };
  }, [handleError]);

  /**
   * Wrap event handlers with error handling
   */
  const withEventHandlerErrorHandling = useCallback((eventHandler) => {
    return (...args) => {
      try {
        return eventHandler(...args);
      } catch (error) {
        handleError(error, { 
          handlerName: eventHandler.name, 
          eventType: args[0]?.type,
          args 
        });
      }
    };
  }, [handleError]);

  /**
   * Handle API errors specifically
   */
  const handleApiError = useCallback((apiError, requestInfo = {}) => {
    const errorInfo = {
      message: apiError.message || 'API request failed',
      status: apiError.status || apiError.response?.status,
      statusText: apiError.statusText || apiError.response?.statusText,
      url: apiError.config?.url || requestInfo.url,
      method: apiError.config?.method || requestInfo.method,
      data: apiError.response?.data,
      stack: apiError.stack
    };

    handleError(apiError, { 
      type: 'API_ERROR',
      requestInfo: errorInfo 
    });
  }, [handleError]);

  /**
   * Auto-clear error after specified time
   */
  useEffect(() => {
    if (error && autoClearTime > 0) {
      const timer = setTimeout(() => {
        clearError();
      }, autoClearTime);

      return () => clearTimeout(timer);
    }
  }, [error, autoClearTime, clearError]);

  /**
   * Global error handler for unhandled promise rejections
   */
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      handleError(event.reason, { type: 'UNHANDLED_PROMISE_REJECTION' });
    };

    const handleGlobalError = (event) => {
      // Only handle errors that aren't already handled by error boundaries
      if (!event.error?.isHandledByErrorBoundary) {
        handleError(event.error, { type: 'GLOBAL_ERROR' });
      }
    };

    // Add global error listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [handleError]);

  return {
    // State
    error,
    errorId,
    hasError: !!error,
    
    // Actions
    clearError,
    handleError,
    withErrorHandling,
    withEventHandlerErrorHandling,
    handleApiError,
    
    // Utility
    generateErrorId
  };
};

export default useErrorHandler; 