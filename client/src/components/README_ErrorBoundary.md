# Error Boundary System

A comprehensive error handling solution for React applications that provides multiple layers of error protection and recovery mechanisms.

## 📋 Table of Contents

- [Overview](#overview)
- [Components](#components)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Error Boundary System consists of three main components that work together to provide comprehensive error handling:

1. **ErrorBoundary** - Class component that catches render errors
2. **withErrorBoundary** - Higher-Order Component for easy wrapping
3. **useErrorHandler** - Custom hook for runtime error handling

### Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Boundary System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Error Boundary  │    │ useErrorHandler │                │
│  │                 │    │                 │                │
│  │ • Render errors │    │ • Event errors  │                │
│  │ • Component     │    │ • Async errors  │                │
│  │   lifecycle     │    │ • API errors    │                │
│  │ • JSX errors    │    │ • Runtime       │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              withErrorBoundary HOC                      │ │
│  │  • Easy component wrapping                              │ │
│  │  • Consistent error handling                            │ │
│  │  • Reusable patterns                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Components

### 1. ErrorBoundary

A class component that catches JavaScript errors anywhere in its child component tree.

**Features:**
- Catches render errors and component lifecycle errors
- Provides fallback UI when errors occur
- Logs errors for debugging
- Supports retry mechanisms
- Responsive design with dark mode support

**When to use:**
- Wrap major sections of your application
- Protect critical user flows
- Provide graceful degradation

### 2. withErrorBoundary HOC

A higher-order component that makes it easy to wrap any component with error boundary functionality.

**Features:**
- Simple component wrapping
- Preserves original component functionality
- Configurable error boundary props
- Maintains component display names for debugging

**When to use:**
- When you want to add error boundary to existing components
- For consistent error handling patterns
- When you need reusable error boundary logic

### 3. useErrorHandler Hook

A custom hook that provides error handling for functional components.

**Features:**
- Catches runtime errors in event handlers and async operations
- Automatic error logging and recovery
- Configurable auto-clear timing
- Global error handling for unhandled promise rejections
- API error handling with detailed context

**When to use:**
- Functional components that make API calls
- Components with complex event handlers
- Async operations and promise handling
- When you need fine-grained error control

## 🚀 Usage Examples

### Basic Error Boundary Usage

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Using the HOC

```jsx
import withErrorBoundary from './components/withErrorBoundary';

const MyComponent = () => {
  // Your component logic
};

const SafeMyComponent = withErrorBoundary(MyComponent);

// Usage
<SafeMyComponent />
```

### Using the Custom Hook

```jsx
import useErrorHandler from './hooks/useErrorHandler';

const MyComponent = () => {
  const { error, handleError, withErrorHandling } = useErrorHandler({
    autoClearTime: 5000,
    onError: (errorInfo) => {
      // Custom error handling logic
      console.log('Custom error handler:', errorInfo);
    }
  });

  const handleClick = withErrorHandling(async () => {
    // This will be wrapped with error handling
    const result = await apiCall();
    return result;
  });

  const handleEvent = withEventHandlerErrorHandling((event) => {
    // Event handler with error handling
    throw new Error('Event error!');
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <button onClick={handleClick}>
      Click me
    </button>
  );
};
```

### Comprehensive Example

```jsx
import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import withErrorBoundary from './components/withErrorBoundary';
import useErrorHandler from './hooks/useErrorHandler';

// Component with runtime error handling
const DataComponent = () => {
  const { error, handleError, withErrorHandling } = useErrorHandler();

  const fetchData = withErrorHandling(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    return response.json();
  });

  const handleClick = () => {
    try {
      fetchData();
    } catch (error) {
      handleError(error, { context: 'button_click' });
    }
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <button onClick={handleClick}>Fetch Data</button>;
};

// Wrap with error boundary using HOC
const SafeDataComponent = withErrorBoundary(DataComponent);

// Main app with error boundary
const App = () => {
  return (
    <ErrorBoundary>
      <SafeDataComponent />
    </ErrorBoundary>
  );
};
```

## 📚 Best Practices

### 1. Strategic Error Boundary Placement

```jsx
// Good: Place error boundaries at strategic points
<ErrorBoundary>
  <Header />
</ErrorBoundary>

<ErrorBoundary>
  <MainContent />
</ErrorBoundary>

<ErrorBoundary>
  <Footer />
</ErrorBoundary>

// Avoid: Don't wrap everything in one error boundary
<ErrorBoundary>
  <EntireApp />
</ErrorBoundary>
```

### 2. Use Error Boundaries for Render Errors

```jsx
// Error boundaries catch these types of errors:
class BuggyComponent extends React.Component {
  render() {
    // This will be caught by error boundary
    throw new Error('Render error!');
  }
}
```

### 3. Use useErrorHandler for Runtime Errors

```jsx
// useErrorHandler catches these types of errors:
const MyComponent = () => {
  const { handleError } = useErrorHandler();

  const handleClick = () => {
    try {
      // This will be caught by useErrorHandler
      throw new Error('Event error!');
    } catch (error) {
      handleError(error);
    }
  };

  return <button onClick={handleClick}>Click</button>;
};
```

### 4. Provide Meaningful Error Messages

```jsx
// Good: User-friendly error messages
<ErrorBoundary>
  <Component />
</ErrorBoundary>

// The ErrorBoundary component provides:
// - Clear error messages
// - Recovery options
// - Error details for developers
```

### 5. Log Errors for Monitoring

```jsx
const { handleError } = useErrorHandler({
  onError: (errorInfo) => {
    // Send to error monitoring service
    sendToErrorService(errorInfo);
  }
});
```

## 🔧 API Reference

### ErrorBoundary Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Components to wrap with error boundary |
| `fallback` | Component | Default fallback | Custom fallback component |
| `onError` | Function | - | Custom error handler |

### useErrorHandler Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoClearTime` | number | 5000 | Time in ms to auto-clear errors |
| `onError` | Function | null | Custom error handler |
| `logToConsole` | boolean | true | Whether to log to console |

### useErrorHandler Return Value

| Property | Type | Description |
|----------|------|-------------|
| `error` | Object | Current error state |
| `errorId` | string | Unique error identifier |
| `hasError` | boolean | Whether an error exists |
| `clearError` | Function | Clear current error |
| `handleError` | Function | Handle new error |
| `withErrorHandling` | Function | Wrap async functions |
| `withEventHandlerErrorHandling` | Function | Wrap event handlers |
| `handleApiError` | Function | Handle API errors specifically |

## 🐛 Troubleshooting

### Common Issues

1. **Error boundary not catching errors**
   - Ensure the error occurs in the component tree below the error boundary
   - Check that the error is a render error, not an event handler error

2. **useErrorHandler not working**
   - Make sure you're calling the error handling functions
   - Check that the error is being thrown in the correct context

3. **Multiple error boundaries**
   - Only the closest error boundary will catch the error
   - Place error boundaries strategically

### Debugging Tips

1. **Check console logs**
   - Error boundaries and hooks log errors to console
   - Look for error IDs for tracking

2. **Use error details**
   - Expand the error details in the fallback UI
   - Check component stack traces

3. **Test error scenarios**
   - Use the ErrorBoundaryExample component to test different error types
   - Verify error handling behavior

### Performance Considerations

1. **Error boundary overhead**
   - Error boundaries have minimal performance impact
   - Only activate when errors occur

2. **Error logging**
   - Limit error logs to prevent storage issues
   - Use external services for production error tracking

## 📝 Examples

See `ErrorBoundaryExample.jsx` for comprehensive usage examples and testing scenarios.

## 🤝 Contributing

When adding new error handling features:

1. Follow the existing patterns
2. Add comprehensive documentation
3. Include error handling tests
4. Consider performance implications
5. Maintain backward compatibility

## 📄 License

This error boundary system is part of the LabManager application and follows the same licensing terms. 