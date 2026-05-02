import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { CheckCircle, X, Sparkles } from 'lucide-react';
import axios from 'axios';
import PhoneInput from '../ui/PhoneInput';

/**
 * Demo request modal.
 *
 * Owns all of its own form state, validation, and API submission logic so that
 * the parent (HomePage) only needs to control open/close via `show` / `onHide`.
 *
 * Props:
 *   - show   {boolean}  - Whether the modal is visible
 *   - onHide {function} - Callback to close the modal
 */

const EMPTY_FORM = {
  email: '',
  labName: '',
  contactPerson: '',
  phone: '',
  region: '',
  message: '',
};

const DemoRequestModal = ({ show, onHide }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;

  // Reset all internal state when the modal closes so it is clean on next open
  const handleClose = () => {
    setForm(EMPTY_FORM);
    setSuccess(false);
    setError('');
    onHide();
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic required-field guard
    if (!form.email || !form.labName || !form.contactPerson || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        phoneNumbers: [{ phone: form.phone, type: 'work', is_primary: true }],
      };
      await axios.post(`${apiUrl}/demo/request`, payload);
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit demo request.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-inset)', color: 'var(--text-primary)' };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      contentClassName="border-0 overflow-hidden"
      aria-labelledby="demo-modal-title"
    >
      {/*
        Header: solid primary background — always dark, so title and close
        button are always white regardless of light/dark mode.
      */}
      <Modal.Header
        className="d-flex align-items-center justify-content-between"
        style={{
          background: 'var(--color-primary)',
          borderBottom: 'none',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Sparkles size={18} color="rgba(255,255,255,0.85)" />
          <Modal.Title
            id="demo-modal-title"
            style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}
          >
            Request Demo Account
          </Modal.Title>
        </div>

        {/* X-in-circle close button — always white on the dark header */}
        <button
          onClick={handleClose}
          aria-label="Close demo modal"
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

      <Modal.Body style={{ padding: '1.75rem 1.5rem', backgroundColor: 'var(--bg)' }}>
        {success ? (
          /* ── Success state ── */
          <div className="text-center py-5">
            <CheckCircle size={64} className="text-success mb-3" />
            <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Request Received!</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              We'll send your demo credentials to your email shortly.
            </p>
            <Button className="btn-primary-glow px-5 mt-2" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          /* ── Form state ── */
          <Form onSubmit={handleSubmit}>

            {/* Feature pill */}
            <div
              className="d-flex align-items-center gap-2 rounded-3 mb-4 px-3 py-2"
              style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
            >
              <Sparkles size={15} />
              <span className="small fw-semibold">
                Includes 7-day full access · 500 tests · Priority Support
              </span>
            </div>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
                {error}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Email Address <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    style={inputStyle}
                    type="email"
                    name="email"
                    required
                    placeholder="you@lab.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Lab Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    style={inputStyle}
                    type="text"
                    name="labName"
                    required
                    placeholder="Your laboratory name"
                    value={form.labName}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Contact Person <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    style={inputStyle}
                    type="text"
                    name="contactPerson"
                    required
                    placeholder="Full name"
                    value={form.contactPerson}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Phone Number <span className="text-danger">*</span>
                  </Form.Label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(val) => setForm(prev => ({ ...prev, phone: val }))}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Region
                  </Form.Label>
                  <Form.Control
                    style={inputStyle}
                    type="text"
                    name="region"
                    placeholder="e.g. Cairo, Egypt"
                    value={form.region}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Message <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
                  </Form.Label>
                  <Form.Control
                    style={{ ...inputStyle, resize: 'none' }}
                    as="textarea"
                    rows={3}
                    name="message"
                    placeholder="Tell us a bit about your lab or any specific needs…"
                    value={form.message}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border-muted)', margin: '1.5rem 0 1.25rem' }} />

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="link"
                type="button"
                onClick={handleClose}
                style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
              >
                Cancel
              </Button>
              <Button className="btn-primary-glow px-4" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Request Demo'}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DemoRequestModal;
