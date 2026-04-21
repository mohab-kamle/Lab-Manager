import React, { useMemo, useRef } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  PDFViewer,
  Font,
  pdf,
} from "@react-pdf/renderer";
import axios from "axios";
import { toast } from "react-toastify";
import LabIcon from "../../assets/LabIcon.png";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import ReactDOM from "react-dom";
import QRCodeSVG from "qrcode-svg";
import { usePDF } from "@react-pdf/renderer";
import CairoFont from "../../assets/fonts/Cairo.ttf";
import { FileText } from "lucide-react";
import RichTextPdfRenderer, { htmlToPlainText } from "./HtmlToPdfRenderer";

// Register Cairo font for Arabic support
Font.register({
  family: "Cairo",
  fonts: [
    {
      src: CairoFont,
      fontWeight: "normal",
      fontStyle: "normal",
    },
    {
      src: CairoFont,
      fontWeight: "bold",
      fontStyle: "normal",
    },
    {
      src: CairoFont,
      fontWeight: "normal",
      fontStyle: "italic",
    },
    {
      src: CairoFont,
      fontWeight: "bold",
      fontStyle: "italic",
    },
  ],
});

// Register Roboto font - using Google Fonts CDN for better compatibility
try {
  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/roboto/v16/zN7GBFwfMP4uA6AR0HCoLQ.ttf",
        fontWeight: "normal",
      },
    ],
  });
} catch (error) {
  console.warn(
    "Failed to register Roboto font, falling back to default:",
    error
  );
  // Fallback to default fonts if registration fails
}

// Note: @react-pdf/renderer has better built-in support for Arabic text
// than jsPDF, so we'll use the default font handling

// Helper function to render test comments
const renderTestComments = (testId, comments) => {
  const testComments = comments?.tests?.[testId];
  if (!testComments || testComments.length === 0) return null;

  return (
    <View style={styles.commentSection}>
      <Text style={styles.commentSectionTitle}>Test Comments:</Text>
      {testComments.map((comment, index) => (
        <View key={comment.id || index} style={styles.commentItem}>
          <Text style={styles.commentText}>{comment.comment_text}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
          {comment.images && comment.images.length > 0 ? (
            <View style={styles.commentImages}>
              <Text style={styles.commentImagesLabel}>Attached Images: {comment.images.length}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};



// Helper function to render medical report images
const renderMedicalReportImages = (comments) => {
  const reportImages = comments?.reportImages;
  if (!reportImages || reportImages.length === 0) return null;

  return (
    <View style={styles.commentSection}>
      <Text style={styles.commentSectionTitle}>Medical Report Images:</Text>
      <View style={styles.commentImages}>
        <Text style={styles.commentImagesLabel}>Attached Images: {reportImages.length}</Text>
        {reportImages.map((image, index) => (
          <Text key={image.id || index} style={styles.commentText}>
            • {image.image_name || `Image ${index + 1}`}
          </Text>
        ))}
      </View>
    </View>
  );
};

// Helper to determine result color
function getResultColor(result, normalRange, status) {
  if (status && status.toLowerCase() === "normal") return "#2ecc40"; // green
  if (status && status.toLowerCase() === "n") return "#2ecc40"; // green
  if (status && status.toLowerCase() === "abnormal") return "#ff4136"; // red
  if (status && status.toLowerCase() === "a") return "#ff4136"; // red
  if (typeof result === "number" && normalRange) {
    // Try to parse normal range like '0.22 - 5.1'
    const match = /([\d.]+)\s*-\s*([\d.]+)/.exec(normalRange);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max)) {
        if (result < min || result > max) return "#ff4136";
        return "#2ecc40";
      }
    }
  }
  if (
    (status && status.toLowerCase() === "critical high") ||
    (status && status.toLowerCase() === "critical low")
  )
    return "#ff4136";

  return "#e9ecef"; // light grey
}

const styles = StyleSheet.create({
  tableContainer: {
    marginBottom: 5,
    marginHorizontal: 12,
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    overflow: "visible",
    pageBreakInside: "avoid", // Prevent breaking inside table
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  tableTitle: {
    backgroundColor: "#fff",
    paddingVertical: 4,
    fontWeight: "bold",
    borderBottom: "2px solid #e0e0e0",
    textAlign: "center",
    fontSize: 10,
    color: "#2d3e8b",
    letterSpacing: 0.5,
    pageBreakAfter: "avoid", // Prevent page break immediately after title
    orphans: 3, // Ensure at least 3 lines follow the title
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2d3e8b",
    color: "white",
    padding: "4px 12px",
    position: "relative",
    zIndex: 1,
  },
  tableHeaderFixed: {
    flexDirection: "row",
    backgroundColor: "#2d3e8b",
    color: "white",
    position: "relative",
    zIndex: 1,
    minHeight: 20, // Reduced header height
    alignItems: "center",
    pageBreakAfter: "avoid", // Prevent page break immediately after header
  },
  headerCell: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 7, // Slightly smaller font
    textAlign: "center",
    padding: "4px 3px", // Reduced padding
    minHeight: 12, // Reduced minimum height
    alignItems: "center",
    justifyContent: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #f0f0f0",
    padding: "1px 2px", // Reduced padding for smaller rows
    minHeight: 8, // Reduced minimum row height
    alignItems: "center",
    pageBreakInside: "avoid", // Prevent row breaking
    orphans: 2, // Minimum lines at bottom of page
    widows: 2, // Minimum lines at top of page
  },
  evenRow: {
    backgroundColor: "#f9f9f9",
  },
  cell: {
    flex: 1,
    fontSize: 6,
    padding: "3px 4px", // Reduced padding for smaller cells
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 4, // Reduced minimum height
    lineHeight: 1.0, // Tighter line height
  },
  componentCell: {
    justifyContent: "flex-center",
    alignItems: "flex-center",
  },
  page: {
    fontFamily: "Cairo", // Use Cairo for Arabic support
    fontSize: 10,
    padding: 0,
    backgroundColor: "#fff",
    paddingBottom: 85,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "column",
    alignItems: "stretch",
    padding: 5,
    backgroundColor: "#fff",
    borderBottom: "1pt solid #e6e6e6",
  },
  headerRow: {
    border: "1pt solid #e6e6e6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginBottom: 12,
  },
  logo: {
    width: 30,
    height: 35,
    marginRight: 10,
  },
  labName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2d3e8b",
  },
  subtitle: {
    fontSize: 8,
    color: "#2d3e8b",
    marginBottom: 2,
  },
  accreditations: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  accPlaceholder: {
    width: 60,
    height: 30,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    marginRight: 6,
  },
  infoGridWrapper: {
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 600,
    width: "90%",
    marginHorizontal: "auto",
    paddingBottom: 5,
    marginBottom: 5,
    borderBottom: "1pt solid #e6e6e6",
  },
  infoCard: {
    borderRadius: 6,
    border: "1pt solid #e6e6e6",
    padding: 8,
    flex: 1,
    marginRight: 8,
    minHeight: 48,
  },
  infoCardLast: {
    marginRight: 0,
  },
  infoTitle: {
    fontWeight: "bold",
    color: "#5d6481",
    borderRadius: 4,
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    marginBottom: 2,
    fontSize: 9,
    backgroundColor: "#dedfeb",
  },
  infoText: {
    color: "#333",
    fontSize: 10,
    lineHeight: 1.3,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  statusItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginHorizontal: 2,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 6,
    borderRadius: 4,
    color: "#5d6481",
    fontWeight: "bold",
    marginBottom: 2,
    backgroundColor: "#dedfeb",
    padding: 2,
  },
  statusValue: {
    fontSize: 6,
    fontWeight: "bold",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2d3e8b",
    marginTop: 5,
    textAlign: "center",
  },
  testCard: {
    backgroundColor: "#fff",
    borderRadius: 1,
    borderLeft: "1pt solid #303d85",
    marginBottom: 12,
    marginHorizontal: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
  },
  testName: {
    fontWeight: "bold",
    color: "#2d3e8b",
    fontSize: 12,
    marginBottom: 2,
  },
  testResultBox: {
    minWidth: 80,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
  },
  testUnit: {
    fontSize: 10,
    color: "#333",
    marginLeft: 4,
  },
  testRefRange: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  testStatusBadge: {
    marginLeft: 10,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#2ecc40",
  },
  abnormalBadge: {
    backgroundColor: "#ff4136",
  },
  normalBadge: {
    backgroundColor: "#2ecc40",
  },
  otherBadge: {
    backgroundColor: "#adb5bd",
  },
  testCardCol: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    borderTop: "1pt solid #e6e6e6",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: 6,
    color: "#666",
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    textAlign: "right",
  },
  pageNum: {
    position: "absolute",
    bottom: 10,
    right: 25,
    fontSize: 6,
    color: "#212529",
  },
  commentBox: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 12,
    border: "1pt solid #e6e6e6",
    borderRadius: 6,
  },
  commentLabel: {
    fontWeight: "bold",
    color: "#2d3e8b",
    fontSize: 12,
    marginRight: 4,
  },
  commentSection: {
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 20,
    padding: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 3,
    border: "0.5pt solid #dee2e6",
  },
  commentSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 4,
  },
  commentItem: {
    marginBottom: 4,
    paddingBottom: 4,
    borderBottom: "0.5pt solid #e9ecef",
  },
  commentText: {
    fontSize: 8,
    color: "#333",
    marginBottom: 2,
    lineHeight: 1.3,
  },
  commentDate: {
    fontSize: 7,
    color: "#6c757d",
    fontStyle: "italic",
  },
  commentImages: {
    marginTop: 2,
  },
  commentImagesLabel: {
    fontSize: 7,
    color: "#6c757d",
    fontStyle: "italic",
  },
  signLabel: {
    fontWeight: "bold",
    color: "#2d3e8b",
    fontSize: 12,
    marginRight: 4,
  },
  signText: {
    fontSize: 12,
    color: "#333",
  },
  // Additional styles for enhanced test groups rendering
  categoryText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2d3e8b",
    textAlign: "center",
  },
  componentText: {
    fontSize: 8,
    color: "#333",
    fontWeight: "bold",
    textAlign: "left",
    lineHeight: 1.3,
    wordWrap: "break-word",
    maxWidth: "100%",
  },
  referenceText: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  unitText: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  cellText: {
    fontSize: 8,
    color: "#333",
    textAlign: "center",
    lineHeight: 1.1,
  },
  rangeText: {
    fontSize: 6,
    color: "#999",
    textAlign: "center",
    marginTop: 1,
  },
  resultCell: {
    fontWeight: "bold",
    fontSize: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    padding: "6px 8px",
  },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  // New styles for better page break handling
  categoryContainer: {
    pageBreakInside: "avoid", // Prevent category sections from breaking
    marginBottom: 1, // Reduced margin for compactness
    minHeight: 30, // Reduced minimum height
    orphans: 2, // Minimum lines at bottom of page
    widows: 2, // Minimum lines at top of page
  },
  categoryHeader: {
    backgroundColor: "#f8f9fa",
    border: "2pt solid #2d3e8b",
    display: "flex",
    paddingBottom: 3, // Reduced padding
    flexDirection: "row",
    textAlign: "center",
    minHeight: 30, // Reduced height
    justifyContent: "center",
    alignItems: "center",
    pageBreakAfter: "avoid", // Prevent page break immediately after header
    orphans: 3, // Ensure at least 3 lines follow the header
  },
  tableSection: {
    pageBreakInside: "avoid", // Keep table sections together
    marginBottom: 2, // Reduced margin
    minHeight: 25, // Reduced minimum height
    orphans: 2, // Minimum lines at bottom of page
    widows: 2, // Minimum lines at top of page
  },
  // Small header row under category names
  categorySubHeader: {
    flexDirection: "row",
    backgroundColor: "#e8f0fe",
    borderBottom: "1px solid #d0d7de",
    minHeight: 14, // Reduced height for compactness
    alignItems: "center",
    marginBottom: 0.5, // Reduced margin
  },
  categorySubHeaderCell: {
    flex: 1,
    fontSize: 6,
    fontWeight: "bold",
    color: "#5d6481",
    textAlign: "center",
    padding: "2px 3px",
    minHeight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Add styles for group and component cards
const groupCardStyle = (resultColor = "#303d85") => ({
  backgroundColor: "#f8f9fa",
  borderRadius: 8,
  border: "1pt solid #e6e6e6",
  borderLeft: `3pt solid ${resultColor}`,
  marginBottom: 18,
  marginHorizontal: 20,
  padding: 14,
});
const groupTitleStyle = {
  fontWeight: "bold",
  color: "#2d3e8b",
  fontSize: 12,
  marginBottom: 8,
};
const componentCardStyle = (resultColor = "#303d85") => ({
  backgroundColor: "#fff",
  borderRadius: 6,
  border: "1pt solid #ddd",
  borderLeft: `3pt solid ${resultColor}`,
  marginBottom: 10,
  padding: 10,
  marginLeft: 10,
});
const componentNameStyle = {
  fontWeight: "bold",
  color: "#333",
  fontSize: 11,
  marginBottom: 4,
};
const fieldRowStyle = {
  flexDirection: "row",
  marginBottom: 2,
};
const fieldLabelStyle = {
  fontWeight: "bold",
  color: "#666",
  fontSize: 10,
  width: 80,
};
const fieldValueStyle = {
  textAlign: "center",
  color: "#333",
  fontSize: 10,
  flex: 1,
};

function calculateAge(birthdate) {
  if (!birthdate) return "-";
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper to generate barcode as data URL
function useBarcode(value) {
  return useMemo(() => {
    if (!value) return null;
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, value, {
        format: "CODE128",
        displayValue: false,
        width: 2,
        height: 40,
        margin: 0,
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [value]);
}

// Helper: generate PNG QR code as data URL
function useQrPngDataUrl(value) {
  const [qrUrl, setQrUrl] = React.useState(null);
  React.useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { width: 80, margin: 0 }, (err, url) => {
      if (!err) setQrUrl(url);
    });
  }, [value]);
  return qrUrl;
}

// Add a usePageNumber hook to get the current page number in the Page content
function usePageNumber() {
  const pdfContext = usePDF();
  return pdfContext.pageNumber || 1;
}

// Header component for every page
const PDFHeader = ({ patient, report, barcodeUrl, lab }) => (
  <View style={styles.header} fixed>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image src={LabIcon} style={styles.logo} />
        <View>
          <Text style={styles.labName}>{lab?.name || "Laboratory"}</Text>
          <Text style={styles.subtitle}>Medical Laboratories</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", justifyContent: "flex-start" }}>
        {!!barcodeUrl && (
          <Image src={barcodeUrl} style={{ width: 60, height: 20 }} />
        )}
      </View>
    </View>
    {/* <View style={styles.accreditations}>
      <View style={styles.accPlaceholder} />
      <View style={styles.accPlaceholder} />
      <View style={styles.accPlaceholder} />
    </View> */}
  </View>
);

// Footer component for every page
const PDFFooter = ({ qrUrl, signatory, lab }) => (
  <View style={styles.footer} fixed>
    <View style={styles.footerLeft}>
      <Text>
        www.labdoctors-laboratories.com |
        techsupport@labdoctors-laboratories.com | License No: 2600032113
      </Text>
      <Text>
        Validated By: {signatory || "N/A"} | Approved By: {signatory || "N/A"}
      </Text>
    </View>
    <View style={styles.footerRight}>
      {!!qrUrl && <Image src={qrUrl} style={{ width: 35, height: 35 }} />}
    </View>
  </View>
);

// InfoGrid component for every page
const PDFInfoGrid = ({ patient, report, lab }) => (
  <View style={styles.infoGridWrapper} fixed>
    <View style={styles.infoGrid}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Patient</Text>
        <Text style={styles.infoText}>
          <Text>{patient?.name || "N/A"}</Text>
          {"\n"}
          {patient?.gender ? patient.gender : "N/A"} -{" "}
          {patient?.birth_date ? calculateAge(patient.birth_date) : "N/A"}
          {"\n"}
          Code: {patient?.patientcode || "N/A"}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Order</Text>
        <Text style={styles.infoText}>
          Report ID: {report?.id || "N/A"}
          {"\n"}
          Branch: {report?.branch_name || "Main Lab"}
          {"\n"}
          Priority: {report?.priority || "Routine"}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Test</Text>
        <Text style={styles.infoText}>
          Tests: {report?.tests?.length || report?.tests_count || 0}
        </Text>
      </View>
      <View style={[styles.infoCard, styles.infoCardLast]}>
        <Text style={styles.infoTitle}>Referral</Text>
        <Text style={styles.infoText}>
          Doctor: {patient?.referral?.doctor_name || "N/A"}
          {"\n"}
          Specialization: {patient?.referral?.specialization || "N/A"}
          {"\n"}
          Status:{" "}
          {report?.done === 1
            ? "Completed"
            : report?.pending === 1
            ? "Pending"
            : "Unsigned"}
        </Text>
      </View>
    </View>
  </View>
);

// Add StatusBarFirstPage component
function StatusBarFirstPage({ report }) {
  const pdfContext = usePDF();
  const pageNumber = pdfContext.pageNumber || 1;
  if (pageNumber !== 1) return null;

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", "");
  };

  const statusData = [
    { label: "Registered At", date: report?.registered_at },
    { label: "Collected At", date: report?.collected_at },
    { label: "Received At", date: report?.received_at },
    { label: "Reported At", date: report?.reported_at },
  ];

  return (
    <View style={styles.statusBar} fixed>
      {statusData.map((item, index) => (
        <View style={styles.statusItem} key={item.label}>
          <Text style={styles.statusLabel}>{item.label}</Text>
          <Text style={styles.statusValue}>{formatDate(item.date)}</Text>
        </View>
      ))}
    </View>
  );
}

// Professional PDF Document Component
const ProfessionalPDFDocument = ({ patient, report, qrUrl, lab, comments }) => {
  // Use report id as barcode, and a URL as QR code (e.g., report view link)
  const barcodeUrl = useBarcode(report?.id ? String(report.id) : "0");
  // const qrUrl = useQRCodeDataUrl(`https://doctorslab.com/patient?patientcode=${patient?.patientcode || ''}`); // This line is now passed as a prop

  // Comments and signatory
  const doctorComment = report?.comment;
  const signatory = report?.signatory_name;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Page number bottom left */}
        <Text
          style={{
            position: "absolute",
            left: 30,
            bottom: 10,
            fontSize: 9,
            color: "#adb5bd",
          }}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
        {/* Header, InfoGrid, Footer on every page */}
        <PDFHeader
          patient={patient}
          report={report}
          barcodeUrl={barcodeUrl}
          lab={lab}
        />
        <PDFInfoGrid patient={patient} report={report} />
        {/* Status bar only on first page */}
        <StatusBarFirstPage report={report} />
        {/* Tests Section */}
        {report?.tests_count > 0 ||
        (report?.tests && report.tests.length > 0) ? (
          <>
            <Text style={styles.sectionTitle}>Tests</Text>
            {report.tests?.map((test, testIndex) => {
              // Get result color for single-value tests or fallback test card
              const getFlagColor = (flag) => {
                switch (flag?.toLowerCase()) {
                  case "normal": return "#2ecc40"; // Green
                  case "high": return "#ff851b";   // Orange
                  case "low": return "#ff851b";    // Orange
                  case "panic_high": return "#ff4136"; // Red
                  case "panic_low": return "#ff4136";  // Red
                  default: return "#2ecc40";       // Default to green if missing
                }
              };

              // Header for each test
              return (
                <View key={testIndex} style={{ marginBottom: 10 }}>
                  <View style={styles.testCard} wrap={false}>
                    <View style={styles.testCardCol}>
                      <Text style={styles.testName}>
                        {test.name || "Unknown Test"}
                      </Text>
                      {/* For single-result tests without structure */}
                      {!test.has_component_results && (
                        <Text style={styles.testRefRange}>
                          Result: {test.result || "N/A"}
                        </Text>
                      )}
                    </View>
                    
                    {/* Status Badge */}
                    {!!test.status && (
                      <Text
                        style={[
                          styles.testStatusBadge,
                          test.status.toLowerCase() === "done" ||
                          test.status.toLowerCase() === "d"
                            ? styles.normalBadge
                            : test.status.toLowerCase() === "pending" ||
                              test.status.toLowerCase() === "p"
                            ? styles.abnormalBadge
                            : styles.otherBadge,
                        ]}
                      >
                        {test.status}
                      </Text>
                    )}
                  </View>

                  {/* Component Results Table */}
                  {test.has_component_results && test.component_results.length > 0 ? (
                    <View style={styles.tableContainer}>
                      {/* Header */}
                      <View style={styles.tableHeaderFixed}>
                        <View style={[styles.headerCell, styles.componentCell]}>
                          <Text>Component</Text>
                        </View>
                        <View style={styles.headerCell}>
                          <Text>Result</Text>
                        </View>
                        <View style={styles.headerCell}>
                          <Text>Unit</Text>
                        </View>
                        <View style={styles.headerCell}>
                          <Text>Normal Range</Text>
                        </View>
                        <View style={styles.headerCell}>
                          <Text>Status</Text>
                        </View>
                      </View>

                      {/* Rows for each component/field in structure_config */}
                      {test.component_results.map(
                        (field, compIndex) => {
                          const flagColor = getFlagColor(field.clinical_flag);
                          const isEven = compIndex % 2 === 0;

                          if (field.type === "culture_panel") {
                            let cultureData = {};
                            try {
                              // Handle both wrapped string JSON and direct object results
                              // Depending on backend fetch (GET /id vs GET /id/results-data), 
                              // it might be parsed or still a string.
                              cultureData = typeof field.result === 'string' 
                                ? JSON.parse(field.result) 
                                : (field.result || {});
                                
                              // Some results might be double-wrapped like { result: { organism: ... } }
                              if (cultureData && cultureData.result && typeof cultureData.result === 'object') {
                                cultureData = cultureData.result;
                              }
                            } catch (e) {
                              cultureData = {};
                            }
                            const antibiotics = cultureData.antibiotics || {};
                            const abKeys = Object.keys(antibiotics);

                            return (
                              <View key={compIndex} style={{ marginTop: 15, marginBottom: 15, paddingHorizontal: 5 }} wrap={false}>
                                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#2d3e8b", marginBottom: 6 }}>
                                  {field.name}
                                </Text>
                                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                                  <Text style={{ fontSize: 9, fontWeight: "bold", marginRight: 5 }}>Isolated Organism:</Text>
                                  <Text style={{ fontSize: 9, marginRight: 15, color: "#333" }}>{cultureData.organism || "No growth / N/A"}</Text>
                                  
                                  <Text style={{ fontSize: 9, fontWeight: "bold", marginRight: 5 }}>Colony Count:</Text>
                                  <Text style={{ fontSize: 9, color: "#333" }}>{cultureData.colony_count || "N/A"}</Text>
                                </View>

                                {abKeys.length > 0 && (
                                  <View style={{ border: "1pt solid #e6e6e6", borderRadius: 4, padding: 8, backgroundColor: "#fafafa" }}>
                                    <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5, color: "#2d3e8b" }}>
                                      Antibiotic Susceptibility Testing:
                                    </Text>
                                    <View style={{ flexDirection: "row", borderBottom: "1pt solid #e6e6e6", paddingBottom: 4, marginBottom: 4 }}>
                                      <Text style={{ fontSize: 9, fontWeight: "bold", flex: 3, color: "#2d3e8b" }}>Antibiotic</Text>
                                      <Text style={{ fontSize: 9, fontWeight: "bold", flex: 2, color: "#2d3e8b", textAlign: "center" }}>Sensitivity</Text>
                                      <Text style={{ fontSize: 9, fontWeight: "bold", flex: 2, color: "#2d3e8b", textAlign: "center" }}>MIC</Text>
                                    </View>
                                    {abKeys.map((abName, abIndex) => {
                                      const abData = antibiotics[abName] || {};
                                      const sensitivity = typeof abData === 'string' ? abData : (abData.sensitivity || '-');
                                      const mic = typeof abData === 'object' ? (abData.mic || '') : '';
                                      
                                      let sensColor = "#333";
                                      if (sensitivity === 'S') sensColor = "#16a34a"; // green
                                      if (sensitivity === 'R') sensColor = "#ef4444"; // red
                                      if (sensitivity === 'I') sensColor = "#eab308"; // yellow

                                      return (
                                        <View key={abIndex} style={{ flexDirection: "row", paddingVertical: 3, borderBottom: abIndex < abKeys.length - 1 ? "1pt solid #f0f0f0" : "none" }}>
                                          <Text style={{ fontSize: 8, flex: 3, color: "#444" }}>{abName}</Text>
                                          <Text style={{ fontSize: 8, flex: 2, color: sensColor, textAlign: "center", fontWeight: "bold" }}>
                                            {sensitivity === 'S' ? 'Sensitive (S)' : sensitivity === 'R' ? 'Resistant (R)' : sensitivity === 'I' ? 'Intermediate (I)' : '-'}
                                          </Text>
                                          <Text style={{ fontSize: 8, flex: 2, color: "#444", textAlign: "center" }}>{mic}</Text>
                                        </View>
                                      );
                                    })}

                                  </View>
                                )}
                              </View>
                            );
                          }

                          return (
                            <View
                              key={compIndex}
                              style={[
                                styles.tableRow,
                                isEven ? styles.evenRow : {},
                                { minHeight: 12 },
                              ]}
                              wrap={false}
                            >
                              <View
                                style={[styles.cell, styles.componentCell]}
                              >
                                <Text
                                  style={{
                                    fontWeight: "bold",
                                    color: "#2d3e8b",
                                  }}
                                >
                                  {field.name}
                                </Text>
                              </View>
                              <View style={styles.cell}>
                                <Text style={{ fontWeight: "bold" }}>
                                  {field.type === "boolean" 
                                    ? (field.result === "true" || field.result === true ? "Positive" : field.result === "false" || field.result === false ? "Negative" : field.result || "N/A")
                                    : (field.type === "text" && typeof field.result === "string" ? field.result : typeof field.result === "object" ? JSON.stringify(field.result) : field.result || "N/A")}
                                </Text>
                              </View>
                              <View style={styles.cell}>
                                <Text style={{ color: "#666" }}>
                                  {field.unit || "N/A"}
                                </Text>
                              </View>
                              <View style={styles.cell}>
                                <Text style={{ color: "#444" }}>
                                  {field.type === "boolean" ? "N/A" : (field.reference_range || "N/A")}
                                </Text>
                              </View>
                              <View style={styles.cell}>
                                <View
                                  style={{
                                    backgroundColor: field.type === "boolean" ? "#2ecc40" : flagColor,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 3,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: "#fff",
                                      fontSize: 6,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {field.type === "boolean" 
                                      ? "N/A" 
                                      : (field.clinical_flag ? field.clinical_flag.replace('_', ' ').toUpperCase() : "NORMAL")}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        }
                      )}
                    </View>
                  ) : null}
                  
                  {/* Test Comments Rendered Below The Table */}
                  {renderTestComments(test.id, comments)}
                </View>
              );
            })}
          </>
        ) : null}

        {/* Doctor's Comment */}
        {!!doctorComment && (
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>Comment : </Text>
            <RichTextPdfRenderer 
              html={doctorComment}
              baseStyle={styles.infoText}
              containerStyle={{ marginTop: 2 }}
            />
          </View>
        )}
        
        {/* Medical Report Images */}
        {renderMedicalReportImages(comments)}
        
        <PDFFooter qrUrl={qrUrl} signatory={signatory} fixed />
      </Page>
    </Document>
  );
};

// Main PrintPDF Component
const PrintPDF = ({ patient, report, lab, comments }) => {
  // Safety check for valid props
  if (!patient || !report) {
    return <span style={styles.btn}>Invalid Data</span>;
  }

  const qrUrl = useQrPngDataUrl(
    `https://doctorslab.com/patient?patientcode=${patient?.patientcode || ""}`
  );

  if (!qrUrl) {
    return <span style={styles.btn}>Generating QR...</span>;
  }

  // Defensive check for required data - support both old and new API structure
  const hasValidData =
    patient &&
    report &&
    (report.tests?.length > 0 ||
      report.reportTests?.length > 0);

  if (!hasValidData) {
    return <span style={styles.btn}>No Data Available</span>;
  }

  // Mobile detection function
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  };

  const isMobile = isMobileDevice();

  // Transform the report data for PDF rendering
  const transformedReport = transformReportForPDF(report, patient);

  // === LIVE PDF PREVIEW WITH MOBILE COMPATIBILITY ===
  return (
    <div>
      {isMobile ? (
        // Mobile-friendly fallback
        <div
          style={{
            height: "300px",
            border: "1px solid #ccc",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <FileText size={48} color="#6c757d" />
          </div>
          <h5 style={{ color: "#495057", marginBottom: "10px" }}>
            PDF Preview Not Available
          </h5>
          <p
            style={{ color: "#6c757d", marginBottom: "20px", fontSize: "14px" }}
          >
            PDF preview is not supported on mobile devices. Please download the
            PDF to view it.
          </p>
          <PDFDownloadLink
            document={
              <ProfessionalPDFDocument
                patient={patient}
                report={transformedReport}
                qrUrl={qrUrl}
                lab={lab}
                comments={comments}
              />
            }
            fileName={`Medical_Report_${patient.name || "Report"}.pdf`}
          >
            {({ loading, error }) => {
              if (error) {
                return (
                  <button
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      fontSize: "14px",
                    }}
                  >
                    PDF Error
                  </button>
                );
              }

              return (
                <button
                  style={{
                    padding: "10px 20px",
                    backgroundColor: loading ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    fontSize: "14px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  disabled={loading}
                >
                  {loading ? "Generating PDF..." : "Download PDF"}
                </button>
              );
            }}
          </PDFDownloadLink>
        </div>
      ) : (
        // Desktop PDF viewer
        <div
          style={{ height: "90vh", border: "1px solid #ccc", marginBottom: 16 }}
        >
          <PDFViewer width="100%" height="100%">
            <ProfessionalPDFDocument
              patient={patient}
              report={transformedReport}
              qrUrl={qrUrl}
              lab={lab}
              comments={comments}
            />
          </PDFViewer>
        </div>
      )}

      {/* Download button for desktop */}
      {!isMobile ? (
        <PDFDownloadLink
          document={
            <ProfessionalPDFDocument
              patient={patient}
              report={transformedReport}
              qrUrl={qrUrl}
              lab={lab}
              comments={comments}
            />
          }
          fileName={`Medical_Report_${patient.name || "Report"}.pdf`}
        >
          {({ loading, error }) => {
            if (error) {
              return (
                <span style={{ ...styles.btn, ...styles.btnLoading }}>
                  PDF Error
                </span>
              );
            }

            return (
              <span
                style={{
                  ...styles.btn,
                  ...(loading ? styles.btnLoading : {}),
                }}
              >
                {loading ? "Generating PDF..." : "Download PDF"}
              </span>
            );
          }}
        </PDFDownloadLink>
      ) : null}
    </div>
  );
};

// Helper function to transform report data for PDF
function transformReportForPDF(report, patient) {
  // Ensure patient data exists
  if (!patient) {
    throw new Error("Patient data is required for PDF generation");
  }

  // Safely access patient properties with fallbacks
  const patientAge = patient.birth_date
    ? calculateAge(patient.birth_date)
    : null;
  // Map patient gender from database format to frontend format for consistent comparison
  const patientGender = patient.gender || "N/A";

  // Handle both old and new API structure for tests
  const tests = (report.tests || []).map((test) => {
    const structureConfig = test.structure_config || [];

    // New architecture: results are in report.test_component_results[testId]
    // as an array of { test_component_id: parameterKey, result, status }
    const testResultsRaw = report.test_component_results?.[test.id] || [];
    
    // Build a dict by parameter_key for easy lookup
    const resultsByKey = {};
    if (Array.isArray(testResultsRaw)) {
      // Array form from results-data endpoint: [{ test_component_id, result, status }]
      testResultsRaw.forEach((res) => {
        const key = res.test_component_id || res.parameter_key;
        if (key) resultsByKey[key] = res;
      });
    } else if (typeof testResultsRaw === 'object') {
      // Object form: { parameterKey: { result, status } }
      Object.entries(testResultsRaw).forEach(([key, data]) => {
        resultsByKey[key] = data;
      });
    }

    // Process the structure config into our standard format for rendering
    let hasComponentResults = false;
    let componentResults = [];

    if (Array.isArray(structureConfig) && structureConfig.length > 0) {
      hasComponentResults = true;

      // Filter structure_config by patient demographics (same logic as DynamicResultForm)
      const gender = patientGender !== 'N/A' ? patientGender : null;
      const age = patientAge;
      const filteredConfig = (!gender && age == null)
        ? structureConfig
        : structureConfig.filter(field => {
            if (!Array.isArray(field.reference_ranges) || field.reference_ranges.length === 0) return true;
            return field.reference_ranges.some(r => {
              const genderMatch = !r.gender || !gender || r.gender.toLowerCase() === gender.toLowerCase();
              const ageMatch =
                (r.age_min == null || age == null || age >= r.age_min) &&
                (r.age_max == null || age == null || age <= r.age_max);
              return genderMatch && ageMatch;
            });
          });

      // Map over filtered structure_config and merge the matching saved result
      componentResults = filteredConfig.map((field) => {
        const matchingResult = resultsByKey[field.key] || {};
        
        let derivedRange = matchingResult.reference_string || field.reference_range || "";
        
        // Derive from reference_ranges array if still empty
        if (!derivedRange && Array.isArray(field.reference_ranges) && field.reference_ranges.length > 0) {
           let matchingRange = field.reference_ranges.find(r => !r.gender || r.gender.toLowerCase() === (gender || '').toLowerCase());
           if (!matchingRange) matchingRange = field.reference_ranges[0];
           if (matchingRange?.min != null && matchingRange?.max != null) {
               derivedRange = `${matchingRange.min} - ${matchingRange.max}`;
           }
        } else if (!derivedRange && (field.normal_from !== undefined || field.normal_to !== undefined)) {
           // Fallback to legacy ranges
           if (field.normal_from != null && field.normal_to != null) {
               derivedRange = `${field.normal_from} - ${field.normal_to}`;
           } else if (field.normal_from != null) {
               derivedRange = `>= ${field.normal_from}`;
           } else if (field.normal_to != null) {
               derivedRange = `<= ${field.normal_to}`;
           }
        }

        // Result value: try both forms
        const resultVal = matchingResult.result ?? matchingResult.result_value ?? "";
        
        return {
          id: field.key,
          name: field.label || field.name || field.key,
          unit: field.unit || "",
          reference_range: derivedRange,
          type: field.type || "text",
          result: resultVal,
          clinical_flag: matchingResult.status || matchingResult.clinical_flag || "normal",
          raw_field: field
        };
      });
    }

    const testStatus = test.medical_report_has_test?.status ?? test.status ?? "pending";
    const testResult = test.medical_report_has_test?.result ?? test.result ?? "";

    return {
      ...test,
      status: testStatus,
      result: testResult,
      has_component_results: hasComponentResults,
      component_results: componentResults,
    };
  });

  // Handle cultures - removed as culture data is now stored in test.structure_config
  const culturesData = [];
  const cultures = [];
  const culture_results = [];

  return {
    ...report,
    tests,
    cultures,
    culture_results,
    doctor_name: report.signatory_name || "",
  };
}

// Direct PDF Download Component - fetches data and downloads in one step
const DirectPDFDownload = ({ reportId, patient, apiUrl }) => {
  const [loading, setLoading] = React.useState(false);
  const downloadTriggeredRef = useRef(false);

  const qrUrl = useQrPngDataUrl(
    `https://doctorslab.com/patient?patientcode=${patient?.patientcode || ""}`
  );

  if (!qrUrl) {
    return (
      <button
        disabled
        style={{
          display: "inline-block",
          padding: "4px 12px",
          border: "1px solid #1d498e",
          borderRadius: 4,
          backgroundColor: "#e9ecef",
          color: "#1d498e",
          fontSize: 10,
          fontWeight: "bold",
          cursor: "not-allowed",
          margin: "0 2px",
          textDecoration: "none",
          minWidth: 110,
          textAlign: "center",
        }}
      >
        Generating QR...
      </button>
    );
  }

  const handleDownload = async () => {
    setLoading(true);
    downloadTriggeredRef.current = false;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      // Fetch the complete report with all details using optimized PDF endpoint
      const response = await axios.get(
        `${apiUrl}/medical-reports/${reportId}?pdf=true`,
        { headers }
      );
      const responseData = response.data;
      console.log("Full response data received:", responseData);

      // Also fetch the results-data endpoint to get saved component results (new architecture)
      let resultsData = null;
      try {
        const resultsResponse = await axios.get(
          `${apiUrl}/medical-reports/${reportId}/results-data`,
          { headers }
        );
        resultsData = resultsResponse.data;
      } catch (e) {
        console.warn("Could not fetch results-data for PDF, results may be missing:", e.message);
      }

      // Extract data from the API response structure
      // Prefer tests from results-data because they include structure_config + saved results
      const fullReportData = {
        ...responseData,
        tests: (resultsData?.tests || responseData.tests || []),
        test_component_results: resultsData?.test_component_results || {},
        testComponentResults: responseData.testComponentResults || {},
        testComponents: responseData.testComponents || {},
      };
      
      // Extract comments data from the API response
      const comments = {
        tests: responseData.testComments || {},
        reportImages: responseData.reportImages || []
      };

      console.log("Extracted report data:", fullReportData);
      console.log(
        "Test component results:",
        responseData.test_component_results
      );
      console.log("Full report data:", fullReportData.test_component_results);
      console.log("Patient data:", fullReportData.patient);

      // Ensure patient data exists
      if (!fullReportData.patient) {
        throw new Error("Patient data not found in the response");
      }

      // Transform the full report data for PDF
      const transformedReport = transformReportForPDF(
        fullReportData,
        fullReportData.patient
      );
      // Create a temporary div to render the PDF component
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      document.body.appendChild(tempDiv);
      // Create a temporary React component that will trigger the download
      const doc = (
        <ProfessionalPDFDocument
          patient={transformedReport.patient}
          report={transformedReport}
          qrUrl={qrUrl}
          lab={fullReportData.lab}
          comments={comments}
        />
      );
      const pdfInstance = pdf(doc);
      const blob = await pdfInstance.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Medical_Report_${
        transformedReport.patient.name || "Report"
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clean up temporary div (though not strictly needed with usePDF, good practice)
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => {
        downloadTriggeredRef.current = false;
        handleDownload();
      }}
      disabled={loading}
      style={{
        display: "inline-block",
        padding: "4px 12px",
        border: "1px solid #1d498e",
        borderRadius: 4,
        backgroundColor: loading ? "#e9ecef" : "#ececec",
        color: loading ? "#888" : "#1d498e",
        fontSize: 10,
        fontWeight: "bold",
        cursor: loading ? "not-allowed" : "pointer",
        margin: "0 2px",
        textDecoration: "none",
        minWidth: 110,
        textAlign: "center",
      }}
    >
      {loading ? "Generating..." : "Download PDF"}
    </button>
  );
};

export default PrintPDF;
export { DirectPDFDownload };

