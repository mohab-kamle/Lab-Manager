import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Dropdown, Spinner } from "react-bootstrap";
import axios from "axios";
import { useToast } from "../../components/ui/ToastContext";
import { Plus, Trash2, MoreVertical, Search, Filter, Printer } from "lucide-react";
import AddSampleModal from "../../components/samples/AddSampleModal";
import SampleLabelModal from "../../components/samples/SampleLabelModal";
import PortalDropdownMenu from "../../components/samples/PortalDropdownMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Valid states
const KANBAN_STATES = [
  "Pending Collection",
  "Collected",
  "Dispatched",
  "In Process",
  "Completed",
  "Rejected"
];

const SamplesKanban = () => {
  const { toast, confirm } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Check if we came with a filter
  const queryParams = new URLSearchParams(location.search);
  const initialReportIdFilter = queryParams.get("report_id") || "";

  const [samples, setSamples] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportIdFilter, setReportIdFilter] = useState(initialReportIdFilter);
  const [loading, setLoading] = useState(true);
  
  // Drag and Drop state
  const [draggedSampleId, setDraggedSampleId] = useState(null);

  // Label printing state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelSampleData, setLabelSampleData] = useState(null);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/tracked-samples`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSamples(response.data);
    } catch (err) {
      console.error("Failed to load samples", err);
      toast.error("Failed to load samples from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  const handleAddSample = (newSample) => {
    fetchSamples();
    toast.success("Sample added successfully");
  };

  const handleDeleteSample = async (e, id) => {
    e.stopPropagation(); // Prevent card click
    
    confirm.custom({
      title: "Delete Sample?",
      message: (
        <div>
          <p className="text-danger">
            Warning: This action cannot be undone.
          </p>
          <p>Please type <strong>confirm delete</strong> to proceed:</p>
        </div>
      ),
      confirmText: "Delete Sample",
      requireMatch: "confirm delete",
      type: "danger"
    }, async () => {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${apiUrl}/tracked-samples/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSamples(prev => prev.filter(s => s.id !== id));
        toast.success("Sample deleted successfully");
      } catch (err) {
        toast.error("Failed to delete sample.");
      }
    });
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${apiUrl}/tracked-samples/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const navigateToReport = (reportId) => {
    const role = user?.role || "admin";
    navigate(`/${role}/medical-reports/${reportId}`);
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
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
          <h2 className="mb-1 text-primary fw-bold">Sample Tracking Board</h2>
          <p className="text-muted-theme mb-0">Track and manage individual sample lifecycles.</p>
        </div>
        <div className="d-flex gap-3">
          <div className="input-group" style={{ width: "280px" }}>
            <span className="input-group-text bg-theme-surface border-end-0 shadow-sm text-theme"><Filter size={18} /></span>
            <input 
              type="text" 
              className="form-control border-start-0 bg-theme-surface shadow-sm text-theme" 
              placeholder="Filter by Report ID..."
              value={reportIdFilter}
              onChange={(e) => setReportIdFilter(e.target.value)}
            />
            {reportIdFilter && (
              <button 
                className="btn btn-outline-secondary border-start-0" 
                onClick={() => setReportIdFilter("")}
              >
                Clear
              </button>
            )}
          </div>
          <Button variant="primary" className="d-flex align-items-center shadow-sm btn-gradient-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="me-2" />
            Add Sample
          </Button>
        </div>
      </div>

      <div className="d-flex overflow-auto h-100 pb-3 kanban-container" style={{ gap: "1.25rem", paddingLeft: "0.5rem" }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center w-100 py-5">
            <Spinner animation="border" variant="primary" />
            <span className="ms-3">Loading samples...</span>
          </div>
        ) : KANBAN_STATES.map(state => (
          <div 
            key={state} 
            className="kanban-column bg-theme-inset rounded shadow-sm d-flex flex-column"
            style={{ minWidth: "320px", width: "320px", maxHeight: "calc(100vh - 180px)", border: "1px solid var(--border-muted)" }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, state)}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-theme-surface rounded-top">
              <h6 className="mb-0 fw-bold text-theme">{state}</h6>
              <Badge bg={getBadgeColor(state)} pill className="shadow-sm">{columns[state].length}</Badge>
            </div>
            
            <div className="p-3 flex-grow-1 overflow-auto kanban-column-body">
              {columns[state].length === 0 ? (
                <div className="text-center text-muted-theme p-4 small italic">
                  No samples in this stage
                </div>
              ) : (
                columns[state].map(sample => (
                  <Card 
                    key={sample.id} 
                    className="mb-3 shadow-sm border-0 sample-card overflow-hidden bg-theme-surface"
                    draggable
                    onDragStart={(e) => onDragStart(e, sample.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => navigateToReport(sample.medical_report_id)}
                    style={{ 
                      cursor: "grab", 
                      transition: "all 0.2s ease",
                      borderLeft: `5px solid ${sample.tube_color || "#dee2e6"}`
                    }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <div className="flex-grow-1 min-width-0">
                          <h6 className="mb-0 text-truncate fw-bold text-theme" title={sample.test_name || "Unknown Test"}>
                            {sample.test_name || <span className="text-danger italic">No Test Name</span>}
                          </h6>
                          <div className="text-muted-theme extra-small d-flex align-items-center gap-1 mt-1">
                            <span className="fw-semibold text-primary">{sample.sample_id || `#${sample.id}`}</span>
                            <span>•</span>
                            <span className="badge bg-theme-elevated text-theme border border-muted extra-small">{sample.sample_type || "N/A"}</span>
                          </div>
                        </div>
                        <Dropdown onClick={(e) => e.stopPropagation()} align="end">
                          <Dropdown.Toggle as="div" id={`kanban-dd-${sample.id}`} className="cursor-pointer text-muted-theme p-1 hover-bg rounded">
                            <MoreVertical size={18} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu as={PortalDropdownMenu}>
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
                            <Dropdown.Item onClick={() => {
                              setLabelSampleData({
                                sample_id: sample.sample_id || sample.id,
                                test_name: sample.test_name,
                                sample_type: sample.sample_type,
                                patient_name: sample.patient_name,
                                report_id: sample.medical_report_id,
                                created_at: sample.created_at,
                              });
                              setShowLabelModal(true);
                            }}>
                              <Printer size={16} className="me-2" /> Print Label
                            </Dropdown.Item>
                            <Dropdown.Item className="text-danger" onClick={(e) => handleDeleteSample(e, sample.id)}>
                              <Trash2 size={16} className="me-2" /> Delete Sample
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                      
                      <div className="mt-3 pt-2 border-top border-muted">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small fw-semibold text-theme text-truncate" style={{ maxWidth: "70%" }}>
                            {sample.patient_name}
                          </span>
                          <span className="extra-small text-muted-theme fw-bold">
                            #{sample.medical_report_id}
                          </span>
                        </div>
                        <div className="extra-small text-muted-theme mt-1">
                          {sample.invoice_id}
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

      <SampleLabelModal
        show={showLabelModal}
        onHide={() => setShowLabelModal(false)}
        sampleData={labelSampleData}
      />
    </Container>
  );
};

export default SamplesKanban;
