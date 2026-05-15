import React, { useState, useEffect } from 'react';
import { Offcanvas, Table, Badge, Spinner } from 'react-bootstrap';
import { formatDate } from '../../utils/dateFormatter';
import { History, PlusCircle, CircleDollarSign, Undo, CheckCheck, Clock, Activity } from 'lucide-react';
import api from '../../utils/api';
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
      const response = await api.get(`/invoices/${invoiceId}/history`);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'created': return <PlusCircle size={18} className="text-primary" />;
      case 'payment': return <CircleDollarSign size={18} className="text-success" />;
      case 'refund': return <Undo size={18} className="text-danger" />;
      case 'status_change': return <CheckCheck size={18} className="text-info" />;
      case 'activity': return <Activity size={18} className="text-warning" />;
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
                    <h6 className="mb-0 fw-bold text-theme text-capitalize">{event.type.replace('_', ' ')}</h6>
                    <span className="small text-muted">{formatDate(new Date(event.date))}</span>
                  </div>
                   <p className="mb-2 text-theme opacity-75">{event.summary}</p>
                  
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                     {event.user && (
                       <Badge bg="subtle" className="text-theme border border-muted font-weight-normal">
                         By: {event.user}
                       </Badge>
                     )}
                    
                    {event.method && (
                      <Badge bg="info" className="text-white border border-info font-weight-normal">
                        Method: {event.method}
                      </Badge>
                    )}
                    
                    {event.authorized_by && (
                      <Badge bg="warning" className="text-theme border border-muted font-weight-normal">
                        Auth Key: {event.authorized_by}
                      </Badge>
                    )}
                    
                    {event.amount !== undefined && (
                      <Badge bg={event.type === 'refund' ? 'danger' : 'success'} className="font-weight-normal">
                        Amount: ${parseFloat(event.amount).toFixed(2)}
                      </Badge>
                    )}

                    {event.type === 'status_change' && (
                      <Badge bg="secondary" className="font-weight-normal">
                        {event.from} &rarr; {event.to}
                      </Badge>
                    )}
                  </div>

                  {event.type === 'activity' && event.details && event.details.diff && (
                    <div className="mt-2 p-2 bg-theme-inset rounded small border border-muted">
                      <div className="fw-bold mb-1 opacity-75">Changes:</div>
                      {Object.entries(event.details.diff).map(([key, changes]) => (
                        <div key={key} className="d-flex align-items-center gap-2">
                          <span className="text-muted text-capitalize">{key}:</span>
                          <span className="text-danger text-decoration-line-through">{JSON.stringify(changes.old)}</span>
                          <span>&rarr;</span>
                          <span className="text-success">{JSON.stringify(changes.new)}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
