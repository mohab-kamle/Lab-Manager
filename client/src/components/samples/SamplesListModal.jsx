import React, { useState, useEffect } from "react";
import { Modal, Button, Badge, Accordion, ListGroup, Dropdown } from "react-bootstrap";
import { TestTube, Plus, Activity, AlertCircle } from "lucide-react";
import AddSampleModal from "./AddSampleModal";
import PortalDropdownMenu from "./PortalDropdownMenu";
import { useNavigate } from "react-router-dom";

const SamplesListModal = ({ show, onHide, report }) => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [reportSamples, setReportSamples] = useState([]);

  useEffect(() => {
    if (show && report) {
      // Fetch or read mock samples for this report
      const localData = localStorage.getItem("mock_samples_kanban");
      if (localData) {
        const allSamples = JSON.parse(localData);
        setReportSamples(allSamples.filter(s => s.medical_report_id.toString() === report.id.toString()));
      } else {
        setReportSamples([]);
      }
    }
  }, [show, report]);

  const handleAddSample = (newSample) => {
    // Add to local state
    setReportSamples(prev => [...prev, newSample]);
    
    // Update global mock state
    const localData = localStorage.getItem("mock_samples_kanban");
    if (localData) {
      const allSamples = JSON.parse(localData);
      allSamples.push(newSample);
      localStorage.setItem("mock_samples_kanban", JSON.stringify(allSamples));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Collection": return "warning";
      case "Collected": return "info";
      case "Dispatched": return "primary";
      case "In Process": return "secondary";
      case "Completed": return "success";
      case "Rejected": return "danger";
      default: return "dark";
    }
  };

  const handleUpdateStatus = (id, newStatus) => {
    const timestampKey = newStatus.toLowerCase().replace(" ", "_") + "_at";
    
    // Update local state
    setReportSamples(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: newStatus,
          status_history: {
            ...s.status_history,
            [timestampKey]: new Date().toISOString()
          }
        };
      }
      return s;
    }));
    
    // Update global mock state
    const localData = localStorage.getItem("mock_samples_kanban");
    if (localData) {
      const allSamples = JSON.parse(localData);
      const updatedSamples = allSamples.map(s => {
        if (s.id === id) {
          return {
            ...s,
            status: newStatus,
            status_history: {
              ...s.status_history,
              [timestampKey]: new Date().toISOString()
            }
          };
        }
        return s;
      });
      localStorage.setItem("mock_samples_kanban", JSON.stringify(updatedSamples));
    }
  };

  const navigateToKanban = () => {
    navigate(`/admin/samples-kanban?report_id=${report.id}`);
  };

  if (!report) return null;

  const tests = report.tests || [];

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center text-primary">
            <TestTube size={24} className="me-2" />
            Samples for Report #{report.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 text-muted">Tests ordered for this report:</h6>
            <Button variant="outline-primary" size="sm" onClick={navigateToKanban}>
              View in Kanban Board
            </Button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center p-5 bg-white rounded shadow-sm">
              <AlertCircle size={48} className="text-muted mb-3" />
              <p className="text-muted">No tests found for this report.</p>
            </div>
          ) : (
            <Accordion defaultActiveKey="0">
              {tests.map((test, index) => {
                const testSamples = reportSamples.filter(s => s.test_id.toString() === test.id.toString());
                
                return (
                  <Accordion.Item eventKey={index.toString()} key={test.id} className="mb-3 border-0 shadow-sm rounded">
                    <Accordion.Header>
                      <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span className="fw-bold d-flex align-items-center">
                          <Activity size={18} className="me-2 text-primary" />
                          {test.test_name || `Test #${test.id}`}
                        </span>
                        <Badge bg={testSamples.length > 0 ? "primary" : "secondary"} pill>
                          {testSamples.length} Samples
                        </Badge>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body className="bg-white">
                      {testSamples.length > 0 ? (
                        <ListGroup variant="flush">
                          {testSamples.map(sample => (
                            <ListGroup.Item 
                              key={sample.id} 
                              className="d-flex justify-content-between align-items-center px-0 py-3 border-bottom-dashed"
                            >
                              <div onClick={navigateToKanban} style={{ cursor: "pointer" }}>
                                <h6 className="mb-1 text-dark d-flex align-items-center">
                                  Sample ID: #{sample.id}
                                  {sample.sample_type && (
                                    <Badge bg="info" className="ms-2 text-dark bg-opacity-25 border border-info">
                                      {sample.sample_type}
                                    </Badge>
                                  )}
                                </h6>
                                <small className="text-muted">
                                  Created: {new Date(sample.created_at).toLocaleString()}
                                </small>
                              </div>
                              <Dropdown>
                                <Dropdown.Toggle 
                                  variant={getStatusBadge(sample.status)} 
                                  size="sm" 
                                  id={`slm-dd-${sample.id}`}
                                  className="rounded-pill shadow-sm px-3"
                                >
                                  {sample.status}
                                </Dropdown.Toggle>
                                <Dropdown.Menu as={PortalDropdownMenu} align="end">
                                  {[
                                    "Pending Collection",
                                    "Collected",
                                    "Dispatched",
                                    "In Process",
                                    "Completed",
                                    "Rejected"
                                  ].map(statusOption => (
                                    <Dropdown.Item 
                                      key={statusOption}
                                      disabled={statusOption === sample.status}
                                      onClick={() => handleUpdateStatus(sample.id, statusOption)}
                                    >
                                      {statusOption}
                                    </Dropdown.Item>
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      ) : (
                        <p className="text-muted mb-3">No samples tracked for this test yet.</p>
                      )}
                      
                      <div className="mt-3 text-end">
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="d-flex align-items-center ms-auto border text-primary"
                          onClick={() => {
                            setSelectedTestId(test.id.toString());
                            setShowAddModal(true);
                          }}
                        >
                          <Plus size={16} className="me-1" /> Add Sample
                        </Button>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </Modal.Body>
      </Modal>

      <AddSampleModal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)}
        onAdd={handleAddSample}
        initialReportId={report?.id?.toString() || ""}
        initialInvoiceId={report?.bill_id?.toString() || ""}
        initialTestId={selectedTestId}
      />
    </>
  );
};

export default SamplesListModal;
