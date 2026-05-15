import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Badge,
  Accordion,
  ListGroup,
  Dropdown,
} from "react-bootstrap";
import { TestTube, Plus, Activity, AlertCircle, Printer } from "lucide-react";
import AddSampleModal from "./AddSampleModal";
import SampleLabelModal from "./SampleLabelModal";
import PortalDropdownMenu from "./PortalDropdownMenu";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../../utils/dateFormatter";
import { useToast } from "../../components/ui/ToastContext";

import axios from "axios";

const SamplesListModal = ({ show, onHide, report }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [reportSamples, setReportSamples] = useState([]);
  const [loading, setLoading] = useState(false);

  // Label printing state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelSampleData, setLabelSampleData] = useState(null);

  const fetchReportSamples = async () => {
    if (!report?.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.get(
        `${apiUrl}/tracked-samples?report_id=${report.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setReportSamples(response.data);
    } catch (err) {
      console.error("Failed to fetch report samples", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show && report) {
      fetchReportSamples();
    }
  }, [show, report]);

  const handleAddSample = (newSample) => {
    // Refetch to get fresh state from server
    fetchReportSamples();
    toast.success("Sample added successfully.");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Collection":
        return "warning";
      case "Collected":
        return "info";
      case "Dispatched":
        return "primary";
      case "In Process":
        return "secondary";
      case "Completed":
        return "success";
      case "Rejected":
        return "danger";
      default:
        return "dark";
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.put(
        `${apiUrl}/tracked-samples/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const timestampKey = newStatus.toLowerCase().replace(" ", "_") + "_at";

      // Update local state
      setReportSamples((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            return {
              ...s,
              status: newStatus,
              status_history: {
                ...s.status_history,
                [timestampKey]: new Date().toISOString(),
              },
            };
          }
          return s;
        }),
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update sample status.");
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
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center text-primary">
            <TestTube size={24} className="me-2" />
            Samples for Report #{report.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 text-muted">Tests ordered for this report:</h6>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={navigateToKanban}
            >
              View in Kanban Board
            </Button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center p-5 bg-body rounded shadow-sm">
              <AlertCircle size={48} className="text-muted mb-3" />
              <p className="text-muted">No tests found for this report.</p>
            </div>
          ) : (
            <Accordion defaultActiveKey="0">
              {tests.map((test, index) => {
                const testSamples = reportSamples.filter(
                  (s) => s.test_id.toString() === test.id.toString(),
                );

                return (
                  <Accordion.Item
                    eventKey={index.toString()}
                    key={test.id}
                    className="mb-3 border-0 shadow-sm rounded"
                  >
                    <Accordion.Header>
                      <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span className="fw-bold d-flex align-items-center">
                          <Activity size={18} className="me-2 text-primary" />
                          {test.test_name || `Test #${test.id}`}
                        </span>
                        <Badge
                          bg={testSamples.length > 0 ? "primary" : "secondary"}
                          pill
                        >
                          {testSamples.length} Samples
                        </Badge>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body className="bg-body">
                      {testSamples.length > 0 ? (
                        <ListGroup variant="flush">
                          {testSamples.map((sample) => (
                            <ListGroup.Item
                              key={sample.id}
                              className="d-flex justify-content-between align-items-center px-0 py-3 border-bottom-dashed"
                            >
                              <div
                                onClick={navigateToKanban}
                                style={{ cursor: "pointer" }}
                              >
                                <h6 className="mb-1 d-flex align-items-center">
                                  ID: {sample.sample_id || `#${sample.id}`}
                                  {sample.sample_type && (
                                    <Badge
                                      bg="info"
                                      className="ms-2 text-info bg-opacity-10 border border-info border-opacity-25"
                                    >
                                      {sample.sample_type}
                                    </Badge>
                                  )}
                                </h6>
                                <small className="text-muted">
                                  Created: {formatDateTime(sample.created_at)}
                                </small>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {/* Print Label button */}
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  title={`Print label for Sample #${sample.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLabelSampleData({
                                      sample_id: sample.sample_id || sample.id,
                                      test_name:
                                        sample.test_name ||
                                        test.test_name ||
                                        test.name,
                                      sample_type: sample.sample_type,
                                      patient_name:
                                        report?.patient_name ||
                                        report?.patient?.name ||
                                        "Patient",
                                      report_id: report?.id,
                                      created_at: sample.created_at,
                                    });
                                    setShowLabelModal(true);
                                  }}
                                >
                                  <Printer size={14} />
                                </Button>
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
                                <Dropdown.Menu
                                  as={PortalDropdownMenu}
                                  align="end"
                                >
                                  {[
                                    "Pending Collection",
                                    "Collected",
                                    "Dispatched",
                                    "In Process",
                                    "Completed",
                                    "Rejected",
                                  ].map((statusOption) => (
                                    <Dropdown.Item
                                      key={statusOption}
                                      disabled={statusOption === sample.status}
                                      onClick={() =>
                                        handleUpdateStatus(
                                          sample.id,
                                          statusOption,
                                        )
                                      }
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
                        <p className="text-muted mb-3">
                          No samples tracked for this test yet.
                        </p>
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
        initialTestId={selectedTestId}
      />

      <SampleLabelModal
        show={showLabelModal}
        onHide={() => setShowLabelModal(false)}
        sampleData={labelSampleData}
      />
    </>
  );
};

export default SamplesListModal;
