import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Table, Button } from "react-bootstrap";
import { useToast } from "../../components/ui/ToastContext";
import { Activity, FlaskConical, FileText, User, Calendar, Receipt, Search, Plus, Printer } from "lucide-react";
import axios from "axios";
import { formatDateTime } from "../../utils/dateFormatter";
import SampleQuickInfoModal from "../../components/samples/SampleQuickInfoModal";
import AddSampleModal from "../../components/samples/AddSampleModal";
import SampleLabelModal from "../../components/samples/SampleLabelModal";

const MedicalReportDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [samples, setSamples] = useState([]);

  // SampleQuickInfoModal state
  const [showScanModal, setShowScanModal] = useState(false);
  const [lookupSampleId, setLookupSampleId] = useState("");

  // AddSampleModal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSampleTestId, setAddSampleTestId] = useState("");

  // SampleLabelModal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelSampleData, setLabelSampleData] = useState(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const apiUrl = import.meta.env.VITE_API_URL;
        
        // Fetch the report
        const response = await axios.get(`${apiUrl}/medical-reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReport(response.data);

        // Fetch real samples related to this report
        const samplesResponse = await axios.get(`${apiUrl}/tracked-samples?report_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSamples(samplesResponse.data);

      } catch (err) {
        console.error("Error fetching report details:", err);
        setError("Failed to load report details.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetails();
  }, [id]);

  /**
   * Re-fetches the samples list after a new sample is added.
   */
  const handleSampleAdded = async () => {
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      const samplesResponse = await axios.get(`${apiUrl}/tracked-samples?report_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSamples(samplesResponse.data);
      toast.success("Sample added successfully.");
    } catch (err) {
      console.error("Error refreshing samples:", err);
    }
  };

  /**
   * Opens the label printing modal with the selected sample's data.
   */
  const handlePrintLabel = (sample) => {
    setLabelSampleData({
      sample_id: sample.sample_id || sample.id,
      test_name: sample.test_name,
      sample_type: sample.sample_type,
      patient_name: report?.patient?.name || report?.patient_name || "Unknown",
      report_id: report?.id,
      created_at: sample.created_at,
    });
    setShowLabelModal(true);
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

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container className="mt-5 text-center">
        <h4 className="text-danger">{error || "Report not found."}</h4>
        <Link to="/admin/medical-reports" className="btn btn-primary mt-3">Back to Reports</Link>
      </Container>
    );
  }

  return (
    <>
    {/* Sample Quick Info Lookup Modal */}
    <SampleQuickInfoModal 
      show={showScanModal} 
      onHide={() => setShowScanModal(false)} 
      initialBarcode={lookupSampleId} 
    />

    {/* Add Sample Modal */}
    <AddSampleModal
      show={showAddModal}
      onHide={() => setShowAddModal(false)}
      onAdd={handleSampleAdded}
      initialReportId={report?.id?.toString() || ""}
      initialTestId={addSampleTestId}
    />

    {/* Label Printing Modal */}
    <SampleLabelModal
      show={showLabelModal}
      onHide={() => setShowLabelModal(false)}
      sampleData={labelSampleData}
    />

    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 text-primary d-flex align-items-center">
            <FileText className="me-2" size={28} />
            Medical Report #{report.id}
          </h2>
          <p className="text-muted mb-0">Detailed view of the medical report and its associated samples.</p>
        </div>
        <Link to={`/admin/samples-kanban?report_id=${report.id}`} className="btn btn-outline-primary">
          <Activity size={18} className="me-2" />
          View in Kanban
        </Link>
      </div>

      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-3 d-flex align-items-center">
                <User size={16} className="me-2" /> Patient Details
              </h6>
              {report.patient ? (
                <>
                  <h5 className="mb-1">{report.patient.name}</h5>
                  <div className="mb-2 text-muted small">
                    <Link to={`/admin/patients/${report.patient.id}`} className="text-decoration-none">
                      ID: #{report.patient.id}
                    </Link>
                    <span className="mx-2">•</span>
                    {report.patient.gender}
                  </div>
                  <div className="small">
                    <strong>Phone:</strong> {report.patient.phone || "N/A"}
                  </div>
                </>
              ) : (
                <div className="text-muted">No patient data available.</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-3 d-flex align-items-center">
                <Receipt size={16} className="me-2" /> Report Status
              </h6>
              <div className="mb-2">
                <strong>Status:</strong>{" "}
                {report.done === 1 ? (
                  <Badge bg="success">Done</Badge>
                ) : report.pending === 1 ? (
                  <Badge bg="warning">Pending</Badge>
                ) : (
                  <Badge bg="secondary">Unsigned</Badge>
                )}
              </div>
              <div className="mb-2">
                <strong>Invoice:</strong> #{report.bill_id || "N/A"}
              </div>
              <div className="small text-muted mt-3">
                <strong>Signatory:</strong> {report.signatory_name || "None"}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={12} lg={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-3 d-flex align-items-center">
                <Calendar size={16} className="me-2" /> Timestamps
              </h6>
              <Row>
                <Col sm={6}>
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2"><strong>Registered:</strong> {formatDateTime(report.registered_at)}</li>
                    <li className="mb-2"><strong>Collected:</strong> {formatDateTime(report.collected_at)}</li>
                  </ul>
                </Col>
                <Col sm={6}>
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2"><strong>Received:</strong> {formatDateTime(report.received_at)}</li>
                    <li className="mb-2"><strong>Reported:</strong> {formatDateTime(report.reported_at)}</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-primary d-flex align-items-center">
                <Activity size={20} className="me-2" /> Ordered Tests & Samples
              </h5>
              {/* Global "Add Sample" button for the report */}
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center"
                onClick={() => {
                  setAddSampleTestId("");
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} className="me-1" /> Add Sample
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-body-tertiary">
                  <tr>
                    <th className="border-0 px-4 py-3 text-secondary font-weight-normal">Test Name</th>
                    <th className="border-0 py-3 text-secondary font-weight-normal">Samples Tracked</th>
                    <th className="border-0 py-3 text-secondary font-weight-normal">Sample Types</th>
                    <th className="border-0 py-3 text-secondary font-weight-normal">Current Status</th>
                    <th className="border-0 py-3 text-secondary font-weight-normal text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(!report.tests || report.tests.length === 0) ? (
                    <tr>
                      <td colSpan="5" className="text-center p-4 text-muted">
                        No tests ordered for this report.
                      </td>
                    </tr>
                  ) : (
                    report.tests.map((test) => {
                      const testSamples = samples.filter(s => s.test_id.toString() === test.id.toString());
                      
                      return (
                        <tr key={test.id}>
                          <td className="px-4 py-3 align-middle">
                            <span className="fw-medium">{test.test_name || `Test #${test.id}`}</span>
                          </td>
                          <td className="py-3 align-middle">
                            <Badge bg={testSamples.length > 0 ? "primary" : "secondary"} pill>
                              {testSamples.length} Samples
                            </Badge>
                          </td>
                          <td className="py-3 align-middle">
                            {testSamples.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {Array.from(new Set(testSamples.map(s => s.sample_type))).map(type => (
                                  <Badge key={type} bg="info" className="text-info bg-opacity-10 border border-info border-opacity-25">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td className="py-3 align-middle">
                            {testSamples.length > 0 ? (
                              <div className="d-flex flex-column gap-1">
                                {testSamples.map(sample => (
                                  <div key={sample.id} className="d-flex align-items-center gap-2">
                                    <span className="small text-muted">
                                      #{sample.id}
                                    </span>
                                    <Badge bg={getStatusBadge(sample.status)} className="rounded-pill px-2">
                                      {sample.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted small">No samples</span>
                            )}
                          </td>
                          <td className="py-3 align-middle text-end pe-4">
                            <div className="d-flex justify-content-end gap-1">
                              {/* Print Label for each sample */}
                              {testSamples.map(sample => (
                                <Button
                                  key={`print-${sample.id}`}
                                  variant="outline-secondary"
                                  size="sm"
                                  title={`Print label for Sample #${sample.id}`}
                                  onClick={() => handlePrintLabel(sample)}
                                >
                                  <Printer size={14} />
                                </Button>
                              ))}
                              {/* Lookup / Quick Info */}
                              {testSamples.map(sample => (
                                <Button
                                  key={`lookup-${sample.id}`}
                                  variant="link"
                                  className="p-0 ms-1 text-primary"
                                  title="Lookup Sample"
                                  onClick={() => {
                                    setLookupSampleId(sample.sample_id || sample.id);
                                    setShowScanModal(true);
                                  }}
                                >
                                  <Search size={14} />
                                </Button>
                              ))}
                              {/* Add a sample for this specific test */}
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="Add sample for this test"
                                onClick={() => {
                                  setAddSampleTestId(test.id.toString());
                                  setShowAddModal(true);
                                }}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </>
  );
};

export default MedicalReportDetails;
