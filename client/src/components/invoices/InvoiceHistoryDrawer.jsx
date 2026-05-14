import React, { useState, useEffect } from 'react';
import { Offcanvas, Table, Badge, Spinner } from 'react-bootstrap';
import { formatDate } from '../../utils/dateFormatter';
import { History, PlusCircle, CircleDollarSign, Undo, CheckCheck, Clock } from 'lucide-react';
import axios from 'axios';

const InvoiceHistoryDrawer = ({ show, onHide, invoiceId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && invoiceId) {
      fetchHistory();
    }
  }, [show, invoiceId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual endpoint
      // const response = await axios.get(`/api/invoices/${invoiceId}/history`);
      // setHistory(response.data);

      // Mock data based on implementation plan
      const mockHistory = [
        {
          type: 'Creation',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Invoice opened',
          user: 'Admin Sarah',
          status: 'Pending'
        },
        {
          type: 'Payment',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Paid $50.00 via Cash',
          user: 'Receptionist John',
          amount: 50.00,
          method: 'Cash',
          remaining: 100.00
        },
        {
          type: 'Payment',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Paid $100.00 via Visa',
          user: 'Receptionist John',
          amount: 100.00,
          method: 'Visa',
          remaining: 0.00
        },
        {
          type: 'StatusChange',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Moved to Fully Paid',
          user: 'System'
        },
        {
          type: 'Refund',
          date: new Date().toISOString(),
          details: 'Partial Refund of $30.00',
          user: 'Admin Sarah',
          authKeyName: 'Sarah_ManagerKey1',
          amount: 30.00,
          refundType: 'Partial'
        }
      ].reverse(); // Show newest first
      
      setHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'Creation': return <PlusCircle size={18} className="text-primary" />;
      case 'Payment': return <CircleDollarSign size={18} className="text-success" />;
      case 'Refund': return <Undo size={18} className="text-danger" />;
      case 'StatusChange': return <CheckCheck size={18} className="text-info" />;
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
                    <h6 className="mb-0 fw-bold text-theme">{event.type}</h6>
                    <span className="small text-muted">{formatDate(new Date(event.date))}</span>
                  </div>
                   <p className="mb-2 text-theme opacity-75">{event.details}</p>
                  
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                     <Badge bg="subtle" className="text-theme border border-muted font-weight-normal">
                       By: {event.user}
                     </Badge>
                    
                    {event.method && (
                      <Badge bg="info" className="text-white border border-info font-weight-normal">
                        Method: {event.method}
                      </Badge>
                    )}
                    
                    {event.authKeyName && (
                      <Badge bg="warning" className="text-theme border border-muted font-weight-normal">
                        Auth Key: {event.authKeyName}
                      </Badge>
                    )}
                    
                    {event.remaining !== undefined && (
                      <Badge bg={event.remaining === 0 ? 'success' : 'secondary'} className="font-weight-normal">
                        Due: ${event.remaining.toFixed(2)}
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
