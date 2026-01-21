import React from 'react';
import PropTypes from 'prop-types';

const SkipToContent = ({ targetId = 'main-content' }) => {
  return (
    <a
      href={`#${targetId}`}
      className="visually-hidden-focusable btn btn-primary position-fixed start-0 top-0 m-3"
      style={{ zIndex: 1090 }}
      onClick={() => {
        // Optional: Smooth scroll or focus handling if native anchor jump isn't enough
        const element = document.getElementById(targetId);
        if (element) {
          element.focus();
        }
      }}
    >
      Skip to content
    </a>
  );
};

SkipToContent.propTypes = {
  targetId: PropTypes.string,
};

export default SkipToContent;
