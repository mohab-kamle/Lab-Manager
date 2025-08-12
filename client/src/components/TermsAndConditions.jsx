import React from 'react';

import { Modal } from 'react-bootstrap';

const TermsAndConditions = ({ showTerms, setShowTerms }) => {
    
    return (
        <Modal
          show={showTerms}
          onHide={() => setShowTerms(false)}
          centered
          aria-labelledby="terms-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="terms-modal-title">Terms & Conditions</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ whiteSpace: "pre-line" }}>
            <strong>
              These Terms and Conditions ("Terms") govern your use of our
              website and services. By accessing or using any part of the site,
              you agree to be bound by these Terms.
            </strong>
            {"\n\n"}
            <strong>1. Use of Website</strong>
            {"\n"}
            You agree to use our site for lawful purposes only and not to
            violate any laws or regulations.
            {"\n\n"}
            <strong>2. Intellectual Property</strong>
            {"\n"}
            All content, trademarks, and data on this website are the property
            of Lab Doctors Laboratories and are protected by applicable
            intellectual property laws.
            {"\n\n"}
            <strong>3. User Accounts</strong>
            {"\n"}
            You are responsible for maintaining the confidentiality of your
            account and password.
            {"\n\n"}
            <strong>4. Termination</strong>
            {"\n"}
            We reserve the right to suspend or terminate access to our services
            at any time without notice.
            {"\n\n"}
            <strong>5. Modifications</strong>
            {"\n"}
            We may revise these Terms from time to time. Continued use of the
            site means you accept any changes.
            {"\n\n"}
            Contact us at{" "}
            <a href="mailto:techsupport@labdoctors-laboratories.com">
              techsupport@labdoctors-laboratories.com
            </a>{" "}
            with any questions about these Terms.
          </Modal.Body>
        </Modal>
    );
}

export default TermsAndConditions;
