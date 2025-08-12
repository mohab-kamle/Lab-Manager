import React from 'react';
import { Modal } from 'react-bootstrap';

const PrivacyPolicy = ({ showPrivacy, setShowPrivacy }) => {
    return (
        <Modal
          show={showPrivacy}
          onHide={() => setShowPrivacy(false)}
          centered
          aria-labelledby="privacy-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="privacy-modal-title">Privacy Policy</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ whiteSpace: "pre-line" }}>
            <strong>
              Your privacy is important to us. This Privacy Policy outlines how
              we collect, use, and protect your information.
            </strong>
            {"\n\n"}
            <strong>1. Data We Collect</strong>
            {"\n"}
            We collect personal data such as name, email, and medical records
            only when you voluntarily provide it.
            {"\n\n"}
            <strong>2. How We Use Your Data</strong>
            {"\n"}
            We use your data to deliver services, improve our website, and
            communicate with you securely.
            {"\n\n"}
            <strong>3. Data Security</strong>
            {"\n"}
            We implement robust security measures to protect your data from
            unauthorized access or disclosure.
            {"\n\n"}
            <strong>4. Third-Party Disclosure</strong>
            {"\n"}
            We do not sell or share your personal data with third parties
            without your explicit consent, except as required by law.
            {"\n\n"}
            <strong>5. Your Rights</strong>
            {"\n"}
            You have the right to access, correct, or delete your personal data
            at any time. Contact us for assistance.
            {"\n\n"}
            <strong>6. Changes to Policy</strong>
            {"\n"}
            We may update this policy periodically. Continued use of our
            services implies acceptance of the revised policy.
            {"\n\n"}
            Contact us at{" "}
            <a href="mailto:techsupport@labdoctors-laboratories.com">
              techsupport@labdoctors-laboratories.com
            </a>{" "}
            with any questions about our Privacy Policy.
          </Modal.Body>
        </Modal>
    );
}

export default PrivacyPolicy;