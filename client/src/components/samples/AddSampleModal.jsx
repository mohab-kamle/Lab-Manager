import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { TestTube, Receipt, FileText, FlaskConical } from "lucide-react";
import axios from "axios";

const AddSampleModal = ({
  show,
  onHide,
  onAdd,
  initialReportId = "",
  initialInvoiceId = "",
  initialTestId = ""
}) => {
  const [formData, setFormData] = useState({
    medical_report_id: initialReportId,
    invoice_id: initialInvoiceId,
    test_id: initialTestId,
    sample_type_id: ""
  });
  const [sampleTypes, setSampleTypes] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData({
        medical_report_id: initialReportId,
        invoice_id: initialInvoiceId,
        test_id: initialTestId,
        sample_type_id: ""
      });
      setError("");
      
      // Fetch sample types
      const fetchSampleTypes = async () => {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await axios.get(`${apiUrl}/samples`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSampleTypes(response.data);
        } catch (err) {
          console.error("Failed to fetch sample types", err);
        }
      };
      fetchSampleTypes();
    }
  }, [show, initialReportId, initialInvoiceId, initialTestId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.medical_report_id || !formData.invoice_id || !formData.test_id || !formData.sample_type_id) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API call once implemented
      // Example: await api.post('/samples', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const selectedType = sampleTypes.find(st => st.id.toString() === formData.sample_type_id);
      
      onAdd({
        ...formData,
        id: Date.now(), // Mock ID
        status: "Pending Collection",
        test_name: `Test #${formData.test_id}`, // Mock test name
        sample_type: selectedType ? selectedType.type : "Unknown",
        status_history: {
          pending_collection_at: new Date().toISOString(),
          collected_at: null,
          dispatched_at: null,
          in_process_at: null,
          completed_at: null,
          rejected_at: null
        },
        created_at: new Date().toISOString()
      });
      
      onHide();
    } catch (err) {
      setError("Failed to verify details. Please check the IDs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="d-flex align-items-center text-primary">
          <TestTube size={24} className="me-2" />
          Add New Sample
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p className="text-muted mb-4">
            Please enter the Medical Report ID, Invoice ID, and Test ID to verify and add a new sample.
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <FileText size={16} className="me-2" />
              Medical Report ID
            </Form.Label>
            <Form.Control
              type="text"
              name="medical_report_id"
              value={formData.medical_report_id}
              onChange={handleChange}
              placeholder="e.g. 101"
              readOnly={!!initialReportId}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <Receipt size={16} className="me-2" />
              Invoice ID
            </Form.Label>
            <Form.Control
              type="text"
              name="invoice_id"
              value={formData.invoice_id}
              onChange={handleChange}
              placeholder="e.g. INV-1001"
              readOnly={!!initialInvoiceId}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <TestTube size={16} className="me-2" />
              Test ID
            </Form.Label>
            <Form.Control
              type="text"
              name="test_id"
              value={formData.test_id}
              onChange={handleChange}
              placeholder="e.g. 5"
              readOnly={!!initialTestId}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <FlaskConical size={16} className="me-2" />
              Sample Type
            </Form.Label>
            <Form.Select
              name="sample_type_id"
              value={formData.sample_type_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Sample Type...</option>
              {sampleTypes.map(st => (
                <option key={st.id} value={st.id}>{st.type}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Add Sample"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddSampleModal;
