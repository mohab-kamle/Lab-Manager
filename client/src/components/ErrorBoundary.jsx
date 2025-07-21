import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary Component
 * 
 * LOGIC EXPLANATION:
 * 
 * 1. **What is an Error Boundary?**
 *    - Error boundaries are React components that catch JavaScript errors anywhere in their child component tree
 *    - They log those errors and display a fallback UI instead of the component tree that crashed
 *    - They work like a JavaScript catch {} block, but for components
 * 
 * 2. **Why Use Error Boundaries?**
 *    - Prevent the entire app from crashing due to a single component error
 *    - Provide user-friendly error messages instead of blank screens
 *    - Log errors for debugging and monitoring
 *    - Allow graceful degradation of functionality
 * 
 * 3. **How Error Boundaries Work:**
 *    - Must be a class component (not functional component)
 *    - Must implement either getDerivedStateFromError() or componentDidCatch()
 *    - getDerivedStateFromError() is called during render phase (synchronous)
 *    - componentDidCatch() is called during commit phase (can perform side effects)
 * 
 * 4. **Error Boundary Lifecycle:**
 *    - Normal rendering: ErrorBoundary renders children normally
 *    - Error occurs: getDerivedStateFromError() is called first
 *    - State update: Updates state to show fallback UI
 *    - Side effects: componentDidCatch() is called for logging, analytics, etc.
 *    - Re-render: Component re-renders with fallback UI
 * 
 * 5. **Error Boundary Limitations:**
 *    - Only catches errors in the component tree below them
 *    - Don't catch errors in event handlers (use try-catch instead)
 *    - Don't catch errors in async code (use try-catch or .catch())
 *    - Don't catch errors in server-side rendering
 *    - Don't catch errors in the error boundary itself
 * 
 * 6. **Best Practices:**
 *    - Place error boundaries strategically around your app
 *    - Use multiple error boundaries for different sections
 *    - Provide meaningful error messages to users
 *    - Log errors for debugging and monitoring
 *    - Include recovery options when possible
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    
    // Initialize state to track if an error has occurred
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  /**
   * getDerivedStateFromError - Static method called during render phase
   * 
   * LOGIC:
   * - Called when an error is thrown in a child component
   * - Must return an object to update state (or null for no update)
   * - This method is synchronous and should not perform side effects
   * - Used to update state to show fallback UI
   * 
   * @param {Error} error - The error that was thrown
   * @returns {Object} - New state object
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * componentDidCatch - Called during commit phase (after render)
   * 
   * LOGIC:
   * - Called after an error has been thrown in a child component
   * - Can perform side effects like logging, analytics, etc.
   * - Receives both the error and error info (component stack)
   * - This is where you'd typically log errors to external services
   * 
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Additional error information including component stack
   */
  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info for display
    this.setState({
      errorInfo: errorInfo
    });

    // Log error to external service (if configured)
    this.logErrorToService(error, errorInfo);
  }

  /**
   * Log error to external service
   * 
   * LOGIC:
   * - In a real application, you'd send this to a service like Sentry, LogRocket, etc.
   * - Include relevant context like user info, app version, etc.
   * - Don't log sensitive information
   * - Consider rate limiting to avoid spam
   */
  logErrorToService = (error, errorInfo) => {
    try {
      // Example: Send to external error tracking service
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     extra: {
      //       componentStack: errorInfo.componentStack,
      //       errorId: this.state.errorId,
      //       retryCount: this.state.retryCount
      //     }
      //   });
      // }

      // For now, just log to localStorage for debugging
      const errorLog = {
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Store in localStorage (limit to last 10 errors)
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.unshift(errorLog);
      existingLogs.splice(10); // Keep only last 10 errors
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  /**
   * Handle retry attempt
   * 
   * LOGIC:
   * - Reset error state to attempt recovery
   * - Increment retry count to prevent infinite loops
   * - Limit retry attempts to avoid endless retries
   */
  handleRetry = () => {
    const maxRetries = 3;
    
    if (this.state.retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });
    } else {
      // After max retries, show a different message
      this.setState({
        hasError: true,
        error: new Error('Maximum retry attempts reached. Please refresh the page.'),
        retryCount: this.state.retryCount + 1
      });
    }
  };

  /**
   * Handle page refresh
   * 
   * LOGIC:
   * - Force a complete page reload to clear any corrupted state
   * - This is a last resort when retries don't work
   */
  handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Handle going back to home
   * 
   * LOGIC:
   * - Navigate to home page to escape the error context
   * - Useful when error is specific to current page/component
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Render method - determines what to display
   * 
   * LOGIC:
   * - If hasError is true, show fallback UI
   * - If hasError is false, render children normally
   * - Fallback UI should be informative and provide recovery options
   */
  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            
            <h1 className="error-title">
              {this.state.retryCount >= 3 ? 'Something went wrong' : 'Oops! Something went wrong'}
            </h1>
            
            <p className="error-message">
              {this.state.retryCount >= 3 
                ? 'We\'ve tried to fix this automatically, but it seems there\'s a persistent issue.'
                : 'Don\'t worry, this is usually temporary and we\'re working to fix it.'
              }
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details (for developers)</summary>
                <div className="error-details-content">
                  <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  <p><strong>Message:</strong> {this.state.error.message}</p>
                  <p><strong>Retry Count:</strong> {this.state.retryCount}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <p><strong>Stack:</strong></p>
                      <pre className="error-stack">{this.state.error.stack}</pre>
                      {this.state.errorInfo && (
                        <>
                          <p><strong>Component Stack:</strong></p>
                          <pre className="error-stack">{this.state.errorInfo.componentStack}</pre>
                        </>
                      )}
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              {this.state.retryCount < 3 && (
                <button 
                  className="error-button error-button-primary"
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
              )}
              
              <button 
                className="error-button error-button-secondary"
                onClick={this.handleGoHome}
              >
                Go to Home
              </button>
              
              <button 
                className="error-button error-button-secondary"
                onClick={this.handleRefresh}
              >
                Refresh Page
              </button>
            </div>

            <div className="error-help">
              <p>
                If this problem persists, please contact support with Error ID: <code>{this.state.errorId}</code>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary; 