import React from 'react';

/**
 * Single source of truth for all informational modal content.
 *
 * Each key maps to an object with:
 *   - title:   The modal header title string
 *   - ariaId:  A unique ID for the Modal's aria-labelledby attribute
 *   - content: The JSX body content to render inside Modal.Body
 *
 * To add or update any policy, only edit this file.
 */
const SUPPORT_EMAIL = 'techsupport@labdoctors-laboratories.com';

const modalContent = {
  terms: {
    title: 'Terms & Conditions',
    ariaId: 'terms-modal-title',
    content: (
      <>
        <strong>
          These Terms and Conditions ("Terms") govern your use of our website and
          services. By accessing or using any part of the site, you agree to be
          bound by these Terms.
        </strong>

        {'\n\n'}
        <strong>1. Use of Website</strong>
        {'\n'}
        You agree to use our site for lawful purposes only and not to violate any
        laws or regulations.

        {'\n\n'}
        <strong>2. Intellectual Property</strong>
        {'\n'}
        All content, trademarks, and data on this website are the property of Lab
        Doctors Laboratories and are protected by applicable intellectual property
        laws.

        {'\n\n'}
        <strong>3. User Accounts</strong>
        {'\n'}
        You are responsible for maintaining the confidentiality of your account and
        password.

        {'\n\n'}
        <strong>4. Termination</strong>
        {'\n'}
        We reserve the right to suspend or terminate access to our services at any
        time without notice.

        {'\n\n'}
        <strong>5. Modifications</strong>
        {'\n'}
        We may revise these Terms from time to time. Continued use of the site
        means you accept any changes.

        {'\n\n'}
        Contact us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{' '}
        with any questions about these Terms.
      </>
    ),
  },

  privacy: {
    title: 'Privacy Policy',
    ariaId: 'privacy-modal-title',
    content: (
      <>
        <strong>
          Your privacy is important to us. This Privacy Policy outlines how we
          collect, use, and protect your information.
        </strong>

        {'\n\n'}
        <strong>1. Data We Collect</strong>
        {'\n'}
        We collect personal data such as name, email, and medical records only
        when you voluntarily provide it.

        {'\n\n'}
        <strong>2. How We Use Your Data</strong>
        {'\n'}
        We use your data to deliver services, improve our website, and communicate
        with you securely.

        {'\n\n'}
        <strong>3. Data Security</strong>
        {'\n'}
        We implement robust security measures to protect your data from unauthorized
        access or disclosure.

        {'\n\n'}
        <strong>4. Third-Party Disclosure</strong>
        {'\n'}
        We do not sell or share your personal data with third parties without your
        explicit consent, except as required by law.

        {'\n\n'}
        <strong>5. Your Rights</strong>
        {'\n'}
        You have the right to access, correct, or delete your personal data at any
        time. Contact us for assistance.

        {'\n\n'}
        <strong>6. Changes to Policy</strong>
        {'\n'}
        We may update this policy periodically. Continued use of our services
        implies acceptance of the revised policy.

        {'\n\n'}
        Contact us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{' '}
        with any questions about our Privacy Policy.
      </>
    ),
  },

  refund: {
    title: 'Refund Policy',
    ariaId: 'refund-modal-title',
    content: (
      <>
        <strong>
          Our commitment is to your satisfaction. This Refund Policy details the
          conditions under which refunds are issued.
        </strong>

        {'\n\n'}
        <strong>1. Eligibility for Refund</strong>
        {'\n'}
        Refunds are considered for services not rendered or for significant service
        deficiencies, within 30 days of purchase.

        {'\n\n'}
        <strong>2. Non-Refundable Services</strong>
        {'\n'}
        Certain services, once initiated or completed, may be non-refundable. This
        will be clearly communicated at the point of sale.

        {'\n\n'}
        <strong>3. Process for Refund</strong>
        {'\n'}
        To request a refund, please contact our support team with your purchase
        details and reason for the request. All requests will be reviewed on a
        case-by-case basis.

        {'\n\n'}
        <strong>4. Refund Timeline</strong>
        {'\n'}
        Approved refunds will be processed within 7–10 business days and credited
        back to the original method of payment.

        {'\n\n'}
        <strong>5. Changes to Policy</strong>
        {'\n'}
        We reserve the right to modify this refund policy at any time. Changes will
        be effective immediately upon posting on our website.

        {'\n\n'}
        For any questions regarding our refund policy, please contact us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </>
    ),
  },

  about: {
    title: 'About Us',
    ariaId: 'about-modal-title',
    content: (
      <>
        <strong>
          LabManager is a comprehensive laboratory management system designed to
          streamline operations for modern healthcare facilities.
        </strong>

        {'\n\n'}
        <strong>Our Mission</strong>
        {'\n'}
        To empower laboratories with intuitive, efficient, and secure tools that
        enhance patient care and operational excellence.

        {'\n\n'}
        <strong>Our Vision</strong>
        {'\n'}
        To be the leading provider of laboratory management solutions, recognized
        for innovation, reliability, and exceptional support.

        {'\n\n'}
        <strong>Our Values</strong>
        {'\n'}
        <ul>
          <li>Innovation: Continuously improving our platform.</li>
          <li>Integrity: Upholding the highest ethical standards.</li>
          <li>Customer Focus: Prioritizing user needs and satisfaction.</li>
          <li>Excellence: Delivering top-quality software and service.</li>
        </ul>

        {'\n\n'}
        For more information, contact us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </>
    ),
  },
};

export default modalContent;
