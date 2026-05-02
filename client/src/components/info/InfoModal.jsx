import React from 'react';
import { Modal } from 'react-bootstrap';
import { X } from 'lucide-react';
import modalContent from './modalContent.jsx';

/**
 * Generic informational modal component.
 *
 * All content is driven by `modalContent.jsx` — this component only handles
 * rendering. To add a new modal type, add a new key to modalContent.jsx only.
 *
 * Props:
 *   - modalKey {string}   - Key matching an entry in modalContent (e.g. "terms", "privacy")
 *   - show     {boolean}  - Whether the modal is visible
 *   - onHide   {function} - Callback to close the modal
 */
const InfoModal = ({ modalKey, show, onHide }) => {
  // Guard: if the key is invalid or not yet provided, render nothing
  const entry = modalKey ? modalContent[modalKey] : null;
  if (!entry) return null;

  const { title, ariaId, content } = entry;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      contentClassName="border-0 overflow-hidden"
      aria-labelledby={ariaId}
    >
      {/*
        Header: solid primary background — always dark regardless of theme,
        so title and close button are always white for guaranteed contrast.
        Left accent border adds depth without extra visual noise.
      */}
      <Modal.Header
        className="d-flex align-items-center justify-content-between"
        style={{
          background: 'var(--color-primary)',
          borderBottom: 'none',
          borderLeft: '4px solid rgba(255,255,255,0.25)',
          padding: '1rem 1.25rem',
        }}
      >
        <Modal.Title
          id={ariaId}
          style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          {title}
        </Modal.Title>

        {/* X-in-circle close button — always white on the dark header */}
        <button
          onClick={onHide}
          aria-label="Close modal"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.7)',
            background: 'transparent',
            color: '#ffffff',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = '#ffffff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
          }}
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </Modal.Header>

      <Modal.Body style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)', padding: '1.5rem' }}>
        {content}
      </Modal.Body>
    </Modal>
  );
};

export default InfoModal;
