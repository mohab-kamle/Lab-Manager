import React from 'react';
import { Modal } from 'react-bootstrap';

const AboutUs = ({ showAbout, setShowAbout }) => {
    return (
        <Modal
          show={showAbout}
          onHide={() => setShowAbout(false)}
          centered
          aria-labelledby="about-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="about-modal-title">About Us</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ whiteSpace: "pre-line" }}>
            <strong>
              LabManager is a comprehensive laboratory management system designed
              to streamline operations for modern healthcare facilities.
            </strong>
            {"\n\n"}
            <strong>Our Mission</strong>
            {"\n"}
            To empower laboratories with intuitive, efficient, and secure tools
            that enhance patient care and operational excellence.
            {"\n\n"}
            <strong>Our Vision</strong>
            {"\n"}
            To be the leading provider of laboratory management solutions,
            recognized for innovation, reliability, and exceptional support.
            {"\n\n"}
            <strong>Our Values</strong>
            {"\n"}
            <ul>
              <li>Innovation: Continuously improving our platform.</li>
              <li>Integrity: Upholding the highest ethical standards.</li>
              <li>Customer Focus: Prioritizing user needs and satisfaction.</li>
              <li>Excellence: Delivering top-quality software and service.</li>
            </ul>
            {"\n\n"}
            For more information, contact us at{" "}
            <a href="mailto:techsupport@labdoctors-laboratories.com">
              techsupport@labdoctors-laboratories.com
            </a>.
          </Modal.Body>
        </Modal>
    );
}

export default AboutUs;