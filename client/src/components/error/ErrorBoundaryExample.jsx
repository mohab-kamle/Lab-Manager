import React, { useState } from 'react';
import ErrorBoundary from './error/ErrorBoundary';
import withErrorBoundary from './withErrorBoundary';
import useErrorHandler from '../../hooks/useErrorHandler';
import './ErrorBoundaryExample.css';

/**
 * Example Component Demonstrating Error Handling
 * 
 * This component shows different ways to use error boundaries and error handling:
 * 1. Direct ErrorBoundary usage
 * 2. Higher-Order Component (HOC) usage
 * 3. Custom hook usage for runtime errors
 * 4. Different types of errors and how they're handled
 */

// Component that can throw errors (for demonstration)
const BuggyComponent = ({ shouldThrow = false, errorType = 'render' }) => {
  const { handleError, error, clearError } = useErrorHandler({
    autoClearTime: 3000,
    onError: (errorInfo) => {
      console.log('Custom error handler called:', errorInfo);
    }
  });

  // Simulate different types of errors
  const throwRenderError = () => {
    throw new Error('This is a render error!');
  };

  const throwEventError = () => {
    throw new Error('This is an event handler error!');
  };

  const throwAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('This is an async error!');
  };

  const throwApiError = () => {
    const apiError = new Error('API request failed');
    apiError.status = 500;
    apiError.response = { data: { message: 'Internal server error' } };
    throw apiError;
  };

  // Handle button clicks with error handling
  const handleEventError = () => {
    try {
      throwEventError();
    } catch (error) {
      handleError(error, { type: 'EVENT_HANDLER' });
    }
  };

  const handleAsyncError = async () => {
    try {
      await throwAsyncError();
    } catch (error) {
      handleError(error, { type: 'ASYNC_OPERATION' });
    }
  };

  const handleApiError = () => {
    try {
      throwApiError();
    } catch (error) {
      handleError(error, { type: 'API_ERROR' });
    }
  };

  // Throw render error if requested
  if (shouldThrow && errorType === 'render') {
    throwRenderError();
  }

  return (
    <div className="buggy-component">
      <h3>Buggy Component (Error Testing)</h3>
      
      {/* Display current error if any */}
      {error && (
        <div className="error-display">
          <h4>Runtime Error Caught:</h4>
          <p><strong>Message:</strong> {error.message}</p>
          <p><strong>Error ID:</strong> {error.errorId}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}

      {/* Error simulation buttons */}
      <div className="error-buttons">
        <h4>Simulate Different Types of Errors:</h4>
        
        <button 
          className="error-button render-error"
          onClick={() => {
            // This will trigger the error boundary
            throw new Error('Render error triggered by button!');
          }}
        >
          Trigger Render Error (Error Boundary)
        </button>

        <button 
          className="error-button event-error"
          onClick={handleEventError}
        >
          Trigger Event Error (useErrorHandler)
        </button>

        <button 
          className="error-button async-error"
          onClick={handleAsyncError}
        >
          Trigger Async Error (useErrorHandler)
        </button>

        <button 
          className="error-button api-error"
          onClick={handleApiError}
        >
          Trigger API Error (useErrorHandler)
        </button>
      </div>

      <div className="info-section">
        <h4>Error Handling Information:</h4>
        <ul>
          <li><strong>Render Errors:</strong> Caught by Error Boundary</li>
          <li><strong>Event Handler Errors:</strong> Caught by useErrorHandler</li>
          <li><strong>Async Errors:</strong> Caught by useErrorHandler</li>
          <li><strong>API Errors:</strong> Caught by useErrorHandler</li>
        </ul>
      </div>
    </div>
  );
};

// Wrap the buggy component with error boundary using HOC
const SafeBuggyComponent = withErrorBoundary(BuggyComponent);

// Main example component
const ErrorBoundaryExample = () => {
  const [showErrorBoundary, setShowErrorBoundary] = useState(true);
  const [showHOCExample, setShowHOCExample] = useState(true);
  const [showHookExample, setShowHookExample] = useState(true);

  return (
    <div className="error-boundary-example">
      <h1>Error Boundary & Error Handling Examples</h1>
      
      <div className="example-section">
        <h2>1. Direct Error Boundary Usage</h2>
        <p>This example shows how to wrap components directly with ErrorBoundary:</p>
        
        <button 
          className="toggle-button"
          onClick={() => setShowErrorBoundary(!showErrorBoundary)}
        >
          {showErrorBoundary ? 'Hide' : 'Show'} Direct Error Boundary Example
        </button>

        {showErrorBoundary && (
          <ErrorBoundary>
            <BuggyComponent shouldThrow={false} />
          </ErrorBoundary>
        )}
      </div>

      <div className="example-section">
        <h2>2. Higher-Order Component (HOC) Usage</h2>
        <p>This example shows how to use the withErrorBoundary HOC:</p>
        
        <button 
          className="toggle-button"
          onClick={() => setShowHOCExample(!showHOCExample)}
        >
          {showHOCExample ? 'Hide' : 'Show'} HOC Example
        </button>

        {showHOCExample && (
          <SafeBuggyComponent />
        )}
      </div>

      <div className="example-section">
        <h2>3. Custom Hook Usage</h2>
        <p>This example shows how to use the useErrorHandler hook for runtime errors:</p>
        
        <button 
          className="toggle-button"
          onClick={() => setShowHookExample(!showHookExample)}
        >
          {showHookExample ? 'Hide' : 'Show'} Hook Example
        </button>

        {showHookExample && (
          <BuggyComponent shouldThrow={false} />
        )}
      </div>

      <div className="documentation-section">
        <h2>Error Handling Strategy</h2>
        
        <div className="strategy-grid">
          <div className="strategy-card">
            <h3>Error Boundaries</h3>
            <p><strong>Purpose:</strong> Catch render errors in component tree</p>
            <p><strong>When to use:</strong> Wrap major sections of your app</p>
            <p><strong>Limitations:</strong> Don't catch event handler or async errors</p>
          </div>

          <div className="strategy-card">
            <h3>useErrorHandler Hook</h3>
            <p><strong>Purpose:</strong> Handle runtime errors in functional components</p>
            <p><strong>When to use:</strong> Event handlers, async operations, API calls</p>
            <p><strong>Benefits:</strong> Automatic error logging and recovery</p>
          </div>

          <div className="strategy-card">
            <h3>Combined Approach</h3>
            <p><strong>Best Practice:</strong> Use both error boundaries and hooks</p>
            <p><strong>Coverage:</strong> Comprehensive error handling</p>
            <p><strong>User Experience:</strong> Graceful degradation and recovery</p>
          </div>
        </div>

        <div className="implementation-tips">
          <h3>Implementation Tips:</h3>
          <ul>
            <li>Place error boundaries at strategic points in your component tree</li>
            <li>Use useErrorHandler for components that make API calls or handle user interactions</li>
            <li>Provide meaningful error messages to users</li>
            <li>Log errors for debugging and monitoring</li>
            <li>Include recovery options when possible</li>
            <li>Test error scenarios during development</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryExample;