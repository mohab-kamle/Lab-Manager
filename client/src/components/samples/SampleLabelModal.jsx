import React, { useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import { Printer, Download, ExternalLink } from "lucide-react";
import UniversalCode from "../pdf/UniversalCode";
import useUniversalCode from "../pdf/useUniversalCode";
import { pdf } from "@react-pdf/renderer";
import SampleLabelDocument from "../pdf/SampleLabelDocument";

/**
 * SampleLabelModal
 *
 * Renders a printable barcode label preview for a tracked sample.
 * Optimized for small thermal label printers (standard 50×25mm labels).
 *
 * The modal displays:
 *  - Barcode (CODE128) of the sample_id
 *  - Patient name
 *  - Test name
 *  - Sample type
 *  - Report ID
 *  - Created date
 *
 * Props:
 *  - show: boolean – modal visibility
 *  - onHide: () => void – close handler
 *  - sampleData: { sample_id, test_name, sample_type, patient_name, report_id, created_at }
 */
const SampleLabelModal = ({ show, onHide, sampleData }) => {
  const labelRef = useRef(null);

  // Generate barcode data URL for PDF usage
  const barcodeUrl = useUniversalCode(
    "barcode",
    sampleData?.sample_id ? String(sampleData.sample_id) : "",
    {
      width: 2,
      height: 40,
      margin: 0,
      displayValue: false,
    }
  );

  /**
   * Triggers browser print dialog using @react-pdf/renderer.
   */
  const handlePrint = async () => {
    if (!sampleData) return;

    try {
      const doc = (
        <SampleLabelDocument
          sampleData={sampleData}
          barcodeUrl={barcodeUrl}
        />
      );
      
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      // Open in new window and trigger print
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error("Failed to generate label PDF:", error);
    }
  };

  if (!sampleData) return null;

  const formattedDate = sampleData.created_at
    ? new Date(sampleData.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center fs-6">
          <Printer size={20} className="me-2 text-primary" />
          Print Sample Label
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3">
        {/* Label preview — this content is what gets printed */}
        <div
          ref={labelRef}
          className="border rounded p-3 bg-white"
          style={{
            maxWidth: "280px",
            margin: "0 auto",
            fontFamily: "'Arial', sans-serif",
          }}
        >
          {/* Barcode */}
          <div className="label-barcode text-center mb-2">
            <UniversalCode
              type="barcode"
              value={String(sampleData.sample_id)}
              format="CODE128"
              width={1.5}
              height={35}
              displayValue={false}
              margin={2}
            />
          </div>

          {/* Sample ID text (for readability below barcode) */}
          <div
            className="sample-id-text text-center mb-2"
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "10px",
              letterSpacing: "0.5px",
            }}
          >
            {sampleData.sample_id}
          </div>

          {/* Metadata */}
          <div className="label-info" style={{ fontSize: "11px" }}>
            <div className="d-flex justify-content-between mb-1">
              <span className="fw-bold">Patient:</span>
              <span className="text-truncate ms-2" style={{ maxWidth: "150px" }}>
                {sampleData.patient_name}
              </span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="fw-bold">Test:</span>
              <span className="text-truncate ms-2" style={{ maxWidth: "150px" }}>
                {sampleData.test_name}
              </span>
            </div>
            {sampleData.sample_type && (
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-bold">Type:</span>
                <span>{sampleData.sample_type}</span>
              </div>
            )}
            <div className="d-flex justify-content-between">
              <span className="fw-bold">Report:</span>
              <span>#{sampleData.report_id}</span>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <span className="fw-bold">Date:</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="d-flex align-items-center"
          onClick={handlePrint}
        >
          <Printer size={16} className="me-1" />
          Print Label
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SampleLabelModal;
