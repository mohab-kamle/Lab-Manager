import React from 'react';
import { Modal } from 'react-bootstrap';

const RefundPolicy = ({ showRefund, setShowRefund }) => {
    return (
        <Modal
          show={showRefund}
          onHide={() => setShowRefund(false)}
          centered
          aria-labelledby="refund-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="refund-modal-title">Refund Policy</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ whiteSpace: "pre-line" }}>
            <strong>
              Our commitment is to your satisfaction. This Refund Policy details
              the conditions under which refunds are issued.
            </strong>
            {"\n\n"}
            <strong>1. Eligibility for Refund</strong>
            {"\n"}
            Refunds are considered for services not rendered or for significant
            service deficiencies, within 30 days of purchase.
            {"\n\n"}
            <strong>2. Non-Refundable Services</strong>
            {"\n"}
            Certain services, once initiated or completed, may be non-refundable.
            This will be clearly communicated at the point of sale.
            {"\n\n"}
            <strong>3. Process for Refund</strong>
            {"\n"}
            To request a refund, please contact our support team with your
            purchase details and reason for the request. All requests will be
            reviewed on a case-by-case basis.
            {"\n\n"}
            <strong>4. Refund Timeline</strong>
            {"\n"}
            Approved refunds will be processed within 7-10 business days and
            credited back to the original method of payment.
            {"\n\n"}
            <strong>5. Changes to Policy</strong>
            {"\n"}
            We reserve the right to modify this refund policy at any time.
            Changes will be effective immediately upon posting on our website.
            {"\n\n"}
            For any questions regarding our refund policy, please contact us at{" "}
            <a href="mailto:techsupport@labdoctors-laboratories.com">
              techsupport@labdoctors-laboratories.com
            </a>.
          </Modal.Body>
        </Modal>
    );
}

export default RefundPolicy;