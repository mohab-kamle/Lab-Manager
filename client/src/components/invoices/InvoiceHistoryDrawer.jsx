import React, { useState, useEffect } from 'react';
import { Offcanvas, Badge, Spinner } from 'react-bootstrap';
import { formatDate } from '../../utils/dateFormatter';
import { History, PlusCircle, CircleDollarSign, Undo, CheckCheck, Clock, FlaskConical, Pencil, Wallet } from 'lucide-react';
import axios from 'axios';

const InvoiceHistoryDrawer = ({ show, onHide, invoiceId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (show && invoiceId) {
      fetchHistory();
    }
  }, [show, invoiceId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/invoices/${invoiceId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The backend returns { invoice_id, timeline }
      // Show newest events at the top
      setHistory(response.data.timeline.reverse());
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'milestone': return <CheckCheck size={18} className="text-primary" />;
      case 'Payment': return <CircleDollarSign size={18} className="text-success" />;
      case 'Due': return <Wallet size={18} className="text-warning" />;
      case 'Refund': return <Undo size={18} className="text-danger" />;
      case 'status': return <FlaskConical size={18} className="text-info" />;
      case 'edit': return <Pencil size={18} className="text-secondary" />;
      default: return <Clock size={18} className="text-secondary" />;
    }
  };

  return (
    <Offcanvas 
      show={show} 
      onHide={onHide} 
      placement="end" 
      className="w-50"
      style={{ zIndex: 1100 }}
    >
      <Offcanvas.Header closeButton className="bg-primary text-white" data-bs-theme="dark">
        <Offcanvas.Title className="d-flex align-items-center">
          <History className="me-2" />
          Invoice Audit Trail - #{invoiceId}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-0">
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading audit history...</p>
          </div>
        ) : (
          <div className="timeline-container p-4">
            {history.map((event, index) => (
              <div key={index} className="timeline-item mb-4 d-flex">
                <div className="timeline-icon-wrapper me-3 d-flex flex-column align-items-center">
                  <div className="timeline-icon bg-theme-elevated shadow-sm rounded-circle p-2 border border-muted d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', zIndex: 1 }}>
                    {getEventIcon(event.type)}
                  </div>
                   {index < history.length - 1 && <div className="timeline-line bg-theme-inset flex-grow-1" style={{ width: '2px' }}></div>}
                </div>
                <div className="timeline-content pb-4 flex-grow-1 border-bottom">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="mb-0 fw-bold text-theme">{event.event}</h6>
                    <span className="small text-muted">{formatDate(new Date(event.date))}</span>
                  </div>
                   <p className="mb-2 text-theme opacity-75">{event.description}</p>
                  
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {event.user && (
                      <Badge bg="subtle" className="text-theme border border-muted font-weight-normal">
                        By: {event.user}
                      </Badge>
                    )}
                    
                    {event.payment_method && (
                      <Badge bg="info" className="text-white border border-info font-weight-normal">
                        Method: {event.payment_method}
                      </Badge>
                    )}
                    
                    {event.authKeyName && (
                      <Badge bg="warning" className="text-theme border border-muted font-weight-normal">
                        Auth Key: {event.authKeyName}
                      </Badge>
                    )}

                    {event.test_name && (
                      <Badge bg="secondary" className="font-weight-normal">
                        Test: {event.test_name}
                      </Badge>
                    )}
                    
                    {event.amount !== undefined && (
                      <Badge bg={event.type === 'Refund' ? 'danger' : 'success'} className="font-weight-normal">
                        Amount: EGP {Math.abs(event.amount).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {history.length === 0 && (
              <div className="text-center py-5 text-muted">
                <History size={48} className="mb-3 opacity-25" />
                <p>No history records found for this invoice.</p>
              </div>
            )}
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default InvoiceHistoryDrawer;
