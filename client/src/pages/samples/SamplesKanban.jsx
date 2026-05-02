import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Dropdown } from "react-bootstrap";
import { useToast } from "../../components/ui/ToastContext";
import { Plus, Trash2, MoreVertical, Search, Filter } from "lucide-react";
import AddSampleModal from "../../components/samples/AddSampleModal";
import PortalDropdownMenu from "../../components/samples/PortalDropdownMenu";
import { useNavigate, useLocation } from "react-router-dom";

// Valid states
const KANBAN_STATES = [
  "Pending Collection",
  "Collected",
  "Dispatched",
  "In Process",
  "Completed",
  "Rejected"
];

// Mock data generator
const generateMockSamples = () => {
  const mock = [];
  for (let i = 1; i <= 15; i++) {
    mock.push({
      id: i,
      medical_report_id: 100 + (i % 5),
      invoice_id: `INV-${1000 + (i % 5)}`,
      test_id: i % 10 || 1,
      test_name: `Test Array ${i}`,
      sample_type_id: (i % 3) + 1,
      sample_type: ["Blood", "Urine", "Swab"][i % 3],
      status: KANBAN_STATES[i % KANBAN_STATES.length],
      status_history: {
        pending_collection_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        collected_at: i % KANBAN_STATES.length >= 1 ? new Date(Date.now() - Math.random() * 5000000000).toISOString() : null,
        dispatched_at: i % KANBAN_STATES.length >= 2 ? new Date().toISOString() : null,
        in_process_at: i % KANBAN_STATES.length >= 3 ? new Date().toISOString() : null,
        completed_at: i % KANBAN_STATES.length >= 4 ? new Date().toISOString() : null,
        rejected_at: i % KANBAN_STATES.length === 5 ? new Date().toISOString() : null
      },
      created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    });
  }
  return mock;
};

const SamplesKanban = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came with a filter
  const queryParams = new URLSearchParams(location.search);
  const initialReportIdFilter = queryParams.get("report_id") || "";

  const [samples, setSamples] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportIdFilter, setReportIdFilter] = useState(initialReportIdFilter);
  
  // Drag and Drop state
  const [draggedSampleId, setDraggedSampleId] = useState(null);

  useEffect(() => {
    // TODO: Replace with actual API call: api.get('/samples')
    // If we have a backend:
    // api.get('/samples').then(res => setSamples(res.data))
    
    // Using mock data for now
    const localData = localStorage.getItem("mock_samples_kanban");
    if (localData) {
      setSamples(JSON.parse(localData));
    } else {
      const initial = generateMockSamples();
      setSamples(initial);
      localStorage.setItem("mock_samples_kanban", JSON.stringify(initial));
    }
  }, []);

  // Update local storage when samples change (for mock persistence)
  useEffect(() => {
    if (samples.length > 0) {
      localStorage.setItem("mock_samples_kanban", JSON.stringify(samples));
    }
  }, [samples]);

  const handleAddSample = (newSample) => {
    setSamples(prev => [...prev, newSample]);
    toast.success("Sample added successfully");
  };

  const handleDeleteSample = (e, id) => {
    e.stopPropagation(); // Prevent card click
    const confirmation = window.prompt("Type 'confirm delete' to delete this sample:");
    if (confirmation && confirmation.toLowerCase() === "confirm delete") {
      // TODO: Replace with actual API call: api.delete(`/tracked-samples/${id}`)
      setSamples(prev => prev.filter(s => s.id !== id));
      toast.success("Sample deleted successfully");
    } else if (confirmation !== null) {
      toast.error("Deletion cancelled. Text did not match.");
    }
  };

  const handleUpdateStatus = (id, newStatus) => {
    // TODO: Replace with actual API call: api.put(`/tracked-samples/${id}/status`, { status: newStatus })
    const timestampKey = newStatus.toLowerCase().replace(" ", "_") + "_at";
    
    setSamples(prev => prev.map(s => {
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
    toast.success(`Sample moved to ${newStatus}`);
  };

  const navigateToReport = (reportId) => {
    navigate(`/admin/medical-reports/${reportId}`);
  };

  // Drag and Drop handlers
  const onDragStart = (e, id) => {
    setDraggedSampleId(id);
    e.dataTransfer.effectAllowed = "move";
    // For visual styling
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const onDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedSampleId(null);
  };

  const onDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e, targetStatus) => {
    e.preventDefault();
    if (draggedSampleId) {
      handleUpdateStatus(draggedSampleId, targetStatus);
    }
  };

  // Group samples by state
  const filteredSamples = samples.filter(s => 
    !reportIdFilter || s.medical_report_id.toString() === reportIdFilter
  );

  const getColumns = () => {
    const cols = {};
    KANBAN_STATES.forEach(state => {
      cols[state] = filteredSamples.filter(s => s.status === state);
    });
    return cols;
  };

  const columns = getColumns();

  const getBadgeColor = (status) => {
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

  return (
    <Container fluid className="py-4 h-100" style={{ minHeight: "calc(100vh - 70px)" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 text-primary">Sample Tracking Board</h2>
          <p className="text-muted mb-0">Track and manage sample lifecycles across the laboratory.</p>
        </div>
        <div className="d-flex gap-3">
          <div className="input-group" style={{ width: "250px" }}>
            <span className="input-group-text bg-white"><Filter size={18} /></span>
            <input 
              type="text" 
              className="form-control border-start-0" 
              placeholder="Filter by Report ID..."
              value={reportIdFilter}
              onChange={(e) => setReportIdFilter(e.target.value)}
            />
            {reportIdFilter && (
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => setReportIdFilter("")}
              >
                Clear
              </button>
            )}
          </div>
          <Button variant="primary" className="d-flex align-items-center" onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="me-2" />
            Add Sample
          </Button>
        </div>
      </div>

      <div className="d-flex overflow-auto h-100 pb-3 kanban-container" style={{ gap: "1rem" }}>
        {KANBAN_STATES.map(state => (
          <div 
            key={state} 
            className="kanban-column bg-light rounded shadow-sm d-flex flex-column"
            style={{ minWidth: "300px", width: "300px", maxHeight: "calc(100vh - 180px)" }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, state)}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white rounded-top">
              <h6 className="mb-0 fw-bold text-dark">{state}</h6>
              <Badge bg={getBadgeColor(state)} pill>{columns[state].length}</Badge>
            </div>
            
            <div className="p-2 flex-grow-1 overflow-auto kanban-column-body">
              {columns[state].length === 0 ? (
                <div className="text-center text-muted p-4 small">
                  No samples in this stage
                </div>
              ) : (
                columns[state].map(sample => (
                  <Card 
                    key={sample.id} 
                    className="mb-2 shadow-sm border-0 sample-card cursor-pointer"
                    draggable
                    onDragStart={(e) => onDragStart(e, sample.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => navigateToReport(sample.medical_report_id)}
                    style={{ cursor: "pointer", transition: "transform 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg="light" text="dark" className="border">
                          #{sample.id}
                        </Badge>
                        <Dropdown onClick={(e) => e.stopPropagation()}>
                          <Dropdown.Toggle as="div" id={`kanban-dd-${sample.id}`} className="cursor-pointer text-muted px-1">
                            <MoreVertical size={16} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu as={PortalDropdownMenu} align="end">
                            <Dropdown.Header>Move to...</Dropdown.Header>
                            {KANBAN_STATES.map(targetState => (
                              <Dropdown.Item 
                                key={targetState}
                                disabled={targetState === state}
                                onClick={() => handleUpdateStatus(sample.id, targetState)}
                              >
                                {targetState}
                              </Dropdown.Item>
                            ))}
                            <Dropdown.Divider />
                            <Dropdown.Item className="text-danger" onClick={(e) => handleDeleteSample(e, sample.id)}>
                              <Trash2 size={16} className="me-2" /> Delete Sample
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                      
                      <h6 className="mb-1 text-truncate" title={sample.test_name}>{sample.test_name}</h6>
                      <Badge bg="info" className="mb-2 text-dark bg-opacity-25 border border-info">{sample.sample_type}</Badge>
                      
                      <div className="d-flex flex-column gap-1 small text-muted mt-1">
                        <div className="d-flex justify-content-between">
                          <span>Report:</span>
                          <span className="fw-semibold">#{sample.medical_report_id}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Invoice:</span>
                          <span className="fw-semibold">{sample.invoice_id}</span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <AddSampleModal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)} 
        onAdd={handleAddSample}
      />
    </Container>
  );
};

export default SamplesKanban;
