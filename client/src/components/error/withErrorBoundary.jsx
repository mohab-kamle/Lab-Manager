import React from 'react';
import ErrorBoundary from './error/ErrorBoundary';

/**
 * Higher-Order Component (HOC) for Error Boundaries
 * 
 * LOGIC EXPLANATION:
 * 
 * 1. **What is a Higher-Order Component?**
 *    - A function that takes a component and returns a new component
 *    - Allows you to add functionality to components without modifying their code
 *    - Follows the composition pattern in React
 * 
 * 2. **Why Use withErrorBoundary HOC?**
 *    - Makes it easy to wrap any component with error boundary functionality
 *    - Keeps the error boundary logic separate from component logic
 *    - Allows for consistent error handling across the application
 *    - Can be easily applied to multiple components
 * 
 * 3. **How the HOC Works:**
 *    - Takes a component as an argument
 *    - Returns a new component that wraps the original with ErrorBoundary
 *    - Can accept additional props for customizing error boundary behavior
 *    - Preserves all original component props and functionality
 * 
 * 4. **Usage Examples:**
 *    - const SafeComponent = withErrorBoundary(MyComponent);
 *    - const SafeComponent = withErrorBoundary(MyComponent, { fallback: CustomFallback });
 * 
 * 5. **Benefits:**
 *    - Reusable error boundary logic
 *    - Clean component code (no error boundary boilerplate)
 *    - Consistent error handling patterns
 *    - Easy to test and maintain
 */

/**
 * withErrorBoundary HOC
 * 
 * @param {React.Component} WrappedComponent - The component to wrap with error boundary
 * @param {Object} errorBoundaryProps - Additional props for the ErrorBoundary component
 * @returns {React.Component} - New component wrapped with ErrorBoundary
 */
const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  // Create a display name for the wrapped component (useful for debugging)
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  // Create the wrapped component
  const WithErrorBoundaryComponent = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
  
  // Set display name for debugging
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${displayName})`;
  
  // Copy static methods from the original component
  if (WrappedComponent.getDerivedStateFromProps) {
    WithErrorBoundaryComponent.getDerivedStateFromProps = WrappedComponent.getDerivedStateFromProps;
  }
  
  if (WrappedComponent.getDerivedStateFromError) {
    WithErrorBoundaryComponent.getDerivedStateFromError = WrappedComponent.getDerivedStateFromError;
  }
  
  if (WrappedComponent.componentDidCatch) {
    WithErrorBoundaryComponent.componentDidCatch = WrappedComponent.componentDidCatch;
  }
  
  return WithErrorBoundaryComponent;
};

export default withErrorBoundary;