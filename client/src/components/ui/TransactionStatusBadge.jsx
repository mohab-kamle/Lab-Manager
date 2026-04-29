import React from 'react';
import { Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * TransactionStatusBadge component to display the process type of a transaction.
 * 
 * - Payment: Green/Success
 * - Refund: Orange/Warning
 * - Due: Red/Danger
 * - Credit: Blue/Info
 * - Due Settlement: Cyan/Info
 */
const TransactionStatusBadge = ({ processType }) => {
  const getBadgeConfig = (type) => {
    switch (type?.toLowerCase()) {
      case 'payment':
        return { bg: 'success', text: 'Payment' };
      case 'refund':
        return { bg: 'warning', text: 'Refund' };
      case 'due':
        return { bg: 'danger', text: 'Due' };
      case 'credit':
        return { bg: 'info', text: 'Credit' };
      case 'due settlement':
        return { bg: 'info', text: 'Due Settlement' };
      default:
        return { bg: 'secondary', text: type || 'Unknown' };
    }
  };

  const { bg, text } = getBadgeConfig(processType);

  return (
    <Badge bg={bg} className="text-capitalize px-2 py-1">
      {text}
    </Badge>
  );
};

TransactionStatusBadge.propTypes = {
  processType: PropTypes.string.isRequired,
};

export default TransactionStatusBadge;
