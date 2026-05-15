import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { TestTube, FileText, FlaskConical } from "lucide-react";
import axios from "axios";
import { useToast } from "../../components/ui/ToastContext";

/**
 * AddSampleModal
 *
 * Allows staff to add a tracked sample for a specific test within a medical report.
 * When a Report ID is provided (or entered), the modal fetches the report's tests
 * and sample types from the backend, enabling dropdown selection instead of
 * error-prone manual ID entry.
 *
 * Props:
 *  - show: boolean – modal visibility
 *  - onHide: () => void – close handler
 *  - onAdd: (sample) => void – callback after successful creation
 *  - initialReportId: string – pre-filled report ID (from parent context)
 *  - initialTestId: string – optional pre-selected test
 */
const AddSampleModal = ({
  show,
  onHide,
  onAdd,
  initialReportId = "",
  initialTestId = ""
}) => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Form state
  const [reportId, setReportId] = useState(initialReportId);
  const [selectedTestId, setSelectedTestId] = useState(initialTestId);
  const [selectedSampleTypeId, setSelectedSampleTypeId] = useState("");

  // Data fetched from backend
  const [reportTests, setReportTests] = useState([]); // tests associated with the report
  const [sampleTypes, setSampleTypes] = useState([]);
  const [reportInfo, setReportInfo] = useState(null); // { id, bill_id, patient_name }

  // UI state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Reset form when modal opens or initial values change
  useEffect(() => {
    if (show) {
      setReportId(initialReportId);
      setSelectedTestId(initialTestId);
      setSelectedSampleTypeId("");
      setError("");
      setReportTests([]);
      setReportInfo(null);

      // Fetch sample types (always needed)
      fetchSampleTypes();

      // If we already have a report ID, fetch its details immediately
      if (initialReportId) {
        fetchReportDetails(initialReportId);
      }
    }
  }, [show, initialReportId, initialTestId]);

  /**
   * Fetches the list of available sample types for the lab.
   */
  const fetchSampleTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/samples`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSampleTypes(response.data);
    } catch (err) {
      console.error("Failed to fetch sample types", err);
      toast.error("Failed to load sample types.");
    }
  };

  /**
   * Fetches the medical report details including its tests.
   * This populates the test dropdown with the actual tests on the report.
   */
  const fetchReportDetails = async (id) => {
    if (!id || !id.trim()) return;
    setIsLoadingReport(true);
    setError("");
    setReportTests([]);
    setReportInfo(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/medical-reports/${id.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const report = response.data;
      setReportInfo({
        id: report.id,
        bill_id: report.bill_id,
        patient_name: report.patient_name || report.patient?.name || "Unknown"
      });
      setReportTests(report.tests || []);

      // If an initialTestId was provided, keep it selected
      if (initialTestId && report.tests?.some(t => t.id.toString() === initialTestId)) {
        setSelectedTestId(initialTestId);
      }
    } catch (err) {
      const msg = err.response?.status === 404
        ? "Medical report not found. Please check the ID."
        : "Failed to load report details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingReport(false);
    }
  };

  /**
   * When the user finishes typing a Report ID and blurs the input,
   * fetch the report data if it changed from what we already have.
   */
  const handleReportIdBlur = () => {
    if (reportId && reportId !== reportInfo?.id?.toString()) {
      fetchReportDetails(reportId);
    }
  };

  /**
   * Auto-fill sample type from the selected test's definition,
   * but still allow the user to override.
   */
  const handleTestChange = (testId) => {
    setSelectedTestId(testId);
    // Try to auto-select the sample type from the test record
    const testRecord = reportTests.find(t => t.id.toString() === testId);
    if (testRecord?.sample_type_id) {
      setSelectedSampleTypeId(testRecord.sample_type_id.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reportId || !selectedTestId) {
      setError("Please select a report and a test.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${apiUrl}/tracked-samples`, {
        medical_report_id: reportId,
        test_id: selectedTestId,
        sample_type_id: selectedSampleTypeId || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onAdd(response.data);
      toast.success("Sample added successfully.");
      onHide();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to add sample. Please check the details and try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center text-primary">
          <TestTube size={24} className="me-2" />
          Add New Sample
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Report ID — manual entry with auto-lookup */}
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <FileText size={16} className="me-2" />
              Medical Report ID
            </Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                onBlur={handleReportIdBlur}
                placeholder="e.g. 101"
                readOnly={!!initialReportId}
                required
              />
              {!initialReportId && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  disabled={!reportId || isLoadingReport}
                  onClick={() => fetchReportDetails(reportId)}
                >
                  {isLoadingReport ? <Spinner size="sm" /> : "Load"}
                </Button>
              )}
            </div>
            {/* Show report context info when loaded */}
            {reportInfo && (
              <div className="mt-2 small text-muted bg-body-tertiary rounded p-2">
                <strong>Patient:</strong> {reportInfo.patient_name}
                {reportInfo.bill_id && (
                  <span className="ms-3"><strong>Invoice:</strong> #{reportInfo.bill_id}</span>
                )}
              </div>
            )}
          </Form.Group>

          {/* Test selection — dropdown populated from report */}
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <TestTube size={16} className="me-2" />
              Test
            </Form.Label>
            {isLoadingReport ? (
              <div className="d-flex align-items-center text-muted p-2">
                <Spinner size="sm" className="me-2" /> Loading tests...
              </div>
            ) : reportTests.length > 0 ? (
              <Form.Select
                value={selectedTestId}
                onChange={(e) => handleTestChange(e.target.value)}
                required
              >
                <option value="">Select a test...</option>
                {reportTests.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.test_name || t.name || `Test #${t.id}`}
                  </option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                placeholder={reportId ? "No tests found — enter Report ID first" : "Enter Report ID above first"}
                disabled
              />
            )}
          </Form.Group>

          {/* Sample Type override — optional, auto-filled from test */}
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <FlaskConical size={16} className="me-2" />
              Sample Type <span className="text-muted ms-1 small">(optional override)</span>
            </Form.Label>
            <Form.Select
              value={selectedSampleTypeId}
              onChange={(e) => setSelectedSampleTypeId(e.target.value)}
            >
              <option value="">Auto-detect from test</option>
              {sampleTypes.map(st => (
                <option key={st.id} value={st.id}>{st.type}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting || !selectedTestId}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              "Add Sample"
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddSampleModal;
