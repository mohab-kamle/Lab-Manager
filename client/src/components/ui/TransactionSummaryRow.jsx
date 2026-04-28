import React, { useState } from 'react';
import { Button, Collapse } from 'react-bootstrap';
import { ChevronDown, ChevronUp, Person, Receipt, Building } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import TransactionStatusBadge from './TransactionStatusBadge';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDate } from '../../utils/dateFormatter';

/**
 * TransactionSummaryRow component to display a transaction row that can be expanded.
 */
const TransactionSummaryRow = ({ transaction, isAdmin = false, onPatientClick, onInvoiceClick }) => {
  const [open, setOpen] = useState(false);

  const handleRowClick = (e) => {
    // Prevent expansion if clicking on a link or button
    if (e.target.closest('button') || e.target.closest('a')) return;
    setOpen(!open);
  };

  return (
    <>
      <tr 
        onClick={handleRowClick} 
        style={{ cursor: 'pointer' }}
        className={transaction.processType?.toLowerCase() === 'refund' ? 'table-warning-subtle' : ''}
      >
        <td>
            <span className="text-monospace text-muted small">{transaction.transactionId}</span>
        </td>
        <td>{formatDate(transaction.date)}</td>
        <td>
            <TransactionStatusBadge processType={transaction.processType} />
        </td>
        <td>{transaction.paidWith || '-'}</td>
        <td className={`fw-bold ${transaction.processType?.toLowerCase() === 'refund' ? 'text-danger' : 'text-success'}`}>
            {transaction.processType?.toLowerCase() === 'refund' ? '-' : ''}
            {formatCurrency(transaction.amount)}
        </td>
        {isAdmin && (
            <td>
                {transaction.patientId ? (
                    <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 text-decoration-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPatientClick && onPatientClick(transaction.patientId);
                        }}
                    >
                        <Person className="me-1" />
                        {transaction.patientId}
                    </Button>
                ) : '-'}
            </td>
        )}
        <td>{transaction.branchName}</td>
        <td className="text-truncate" style={{ maxWidth: '200px' }}>
            {transaction.summary || '-'}
        </td>
        <td className="text-end">
           <Button variant="link" size="sm" className="p-0 text-muted">
             {open ? <ChevronUp /> : <ChevronDown />}
           </Button>
        </td>
      </tr>
      <tr>
        <td colSpan={isAdmin ? 9 : 8} className="p-0 border-0">
          <Collapse in={open}>
            <div className="p-3 bg-light border-bottom border-top">
               <div className="row g-3">
                  {isAdmin && transaction.processedBy && (
                    <div className="col-md-3">
                        <div className="d-flex align-items-center mb-2">
                            <Person className="me-2 text-primary" />
                            <h6 className="mb-0">Processed By</h6>
                        </div>
                        <p className="mb-1 ps-4 small"><strong>Name:</strong> {transaction.processedBy.name}</p>
                        <p className="mb-0 ps-4 small"><strong>Role:</strong> {transaction.processedBy.role}</p>
                    </div>
                  )}
                  
                  <div className="col-md-3">
                      <div className="d-flex align-items-center mb-2">
                          <Receipt className="me-2 text-primary" />
                          <h6 className="mb-0">References</h6>
                      </div>
                      <div className="ps-4">
                        {transaction.invoiceId ? (
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="mb-1 d-block"
                                onClick={() => onInvoiceClick && onInvoiceClick(transaction.invoiceId)}
                            >
                                Invoice: {transaction.invoiceId}
                            </Button>
                        ) : <span className="small text-muted italic">No linked invoice</span>}
                      </div>
                  </div>

                  <div className="col-md-3">
                      <div className="d-flex align-items-center mb-2">
                          <Building className="me-2 text-primary" />
                          <h6 className="mb-0">Location</h6>
                      </div>
                      <p className="mb-0 ps-4 small">{transaction.branchName}</p>
                  </div>

                  <div className="col-md-3">
                      <div className="d-flex align-items-center mb-2">
                          <Receipt className="me-2 text-primary" />
                          <h6 className="mb-0">Full Summary</h6>
                      </div>
                      <p className="mb-0 ps-4 small text-wrap text-break">{transaction.summary || 'No details provided'}</p>
                  </div>
               </div>
            </div>
          </Collapse>
        </td>
      </tr>
    </>
  );
};

TransactionSummaryRow.propTypes = {
  transaction: PropTypes.shape({
    transactionId: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    processType: PropTypes.string.isRequired,
    paidWith: PropTypes.string,
    processedBy: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      role: PropTypes.string,
    }),
    patientId: PropTypes.string,
    invoiceId: PropTypes.string,
    branchName: PropTypes.string.isRequired,
    summary: PropTypes.string,
  }).isRequired,
  isAdmin: PropTypes.bool,
  onPatientClick: PropTypes.func,
  onInvoiceClick: PropTypes.func,
};

export default TransactionSummaryRow;
