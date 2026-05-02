import React from 'react';

const VersionBadge = () => {
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  const isPre = version.includes('-'); // v1.2.0-beta.1
  const color = isPre ? 'var(--toast-error)' : 'var(--color-primary)';

  return (
    <span style={{
      backgroundColor: color,
      color: 'white',
      padding: '2px 10px',
      border: 'solid 1px rgba(255, 255, 255, 1)',
      borderRadius: '10px',
      fontSize: '0.8rem',
      zIndex: 1000
    }}>
      v{version}
    </span>
  );
};

export default VersionBadge;