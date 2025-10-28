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
          {comment.images && comment.images.length > 0 && (
            <View style={styles.commentImages}>
              <Text style={styles.commentImagesLabel}>Attached Images: {comment.images.length}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

// Helper function to render test group comments
const renderTestGroupComments = (testGroupId, comments) => {
  const testGroupComments = comments?.testGroup?.[testGroupId];
  if (!testGroupComments || testGroupComments.length === 0) return null;

  return (
    <View style={styles.commentSection}>
      <Text style={styles.commentSectionTitle}>Test Group Comments:</Text>
      {testGroupComments.map((comment, index) => (
        <View key={comment.id || index} style={styles.commentItem}>
          <Text style={styles.commentText}>{comment.comment_text}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
          {comment.images && comment.images.length > 0 && (
            <View style={styles.commentImages}>
              <Text style={styles.commentImagesLabel}>Attached Images: {comment.images.length}</Text>
            </View>
          )}
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
        {barcodeUrl && (
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
      {qrUrl && <Image src={qrUrl} style={{ width: 35, height: 35 }} />}
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
          {"\n"}
          Cultures: {report?.cultures?.length || report?.cultures_count || 0}
          {"\n"}
          Groups:{" "}
          {report?.test_groups?.length ||
            report?.test_group_results?.length ||
            report?.test_groups_count ||
            0}
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
              // Check if we have component-level results to display
              if (test.has_component_results) {
                // Display test with individual component results
                return (
                  <View key={testIndex} wrap={false}>
                    {/* Test Header */}
                    <View
                      style={[
                        styles.testCard,
                        {
                          minHeight: 30,
                          backgroundColor: "#f8f9fa",
                          borderLeft: "3pt solid #2d3e8b",
                        },
                      ]}
                      wrap={false}
                    >
                      <View style={styles.testCardCol}>
                        <Text style={styles.testName}>
                          {test.name || "Unknown Test"}
                        </Text>
                        {/* <Text
                          style={[
                            styles.testRefRange,
                            { color: "#2d3e8b", fontWeight: "bold" },
                          ]}
                        >
                          Multi-Component Test Results
                        </Text> */}
                        {/* <Text style={styles.testRefRange}>
                          Overall Status: {test.status || "Pending"}
                        </Text> */}
                      </View>
                      {test.status && (
                        <Text
                          style={[
                            styles.testStatusBadge,
                            test.status.toLowerCase() === "normal" ||
                              test.status.toLowerCase() === "n" ||
                              test.component_results.length > 0
                              ? styles.normalBadge
                              : test.status.toLowerCase() === "abnormal" ||
                                test.status.toLowerCase() === "a"
                              ? styles.abnormalBadge
                              : styles.otherBadge,
                          ]}
                        >
                          {test.component_results.length > 0
                            ? "Done"
                            : test.status}
                        </Text>
                      )}
                    </View>

                    {/* Component Results Table */}
                    <View
                      style={{
                        marginHorizontal: 20,
                        marginBottom: 12,
                        backgroundColor: "#fff",
                        borderRadius: 4,
                        border: "1pt solid #dee2e6",
                      }}
                    >
                      {/* Table Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#2d3e8b",
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#fff",
                            flex: 2,
                            textAlign: "center",
                            padding: 2,
                          }}
                        >
                          Test name
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#fff",
                            flex: 1.5,
                            textAlign: "center",
                            padding: 2,
                          }}
                        >
                          Result
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#fff",
                            flex: 1,
                            textAlign: "center",
                            padding: 2,
                          }}
                        >
                          Unit
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#fff",
                            flex: 2,
                            textAlign: "center",
                            padding: 2,
                          }}
                        >
                          Normal Range
                        </Text>
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#fff",
                            flex: 1,
                            textAlign: "center",
                            padding: 2,
                          }}
                        >
                          Status
                        </Text>
                      </View>

                      {/* Component Rows */}
                      {test.component_results.map(
                        (componentResult, compIndex) => {
                          const component = componentResult.test_component;
                          const normalRange =
                            component?.normal_from && component?.normal_to
                              ? `${component.normal_from} - ${component.normal_to}`
                              : component?.reference_range || "N/A";
                          const resultColor = getResultColor(
                            componentResult.result,
                            normalRange,
                            componentResult.status
                          );

                          return (
                            <View
                              key={compIndex}
                              style={{
                                flexDirection: "row",
                                paddingVertical: 4,
                                borderBottom:
                                  compIndex < test.component_results.length - 1
                                    ? "1pt solid #e9ecef"
                                    : "none",
                                backgroundColor:
                                  compIndex % 2 === 0 ? "#f8f9fa" : "#fff",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 8,
                                  color: "#333",
                                  flex: 2,
                                  textAlign: "center",
                                  padding: 2,
                                }}
                              >
                                {component?.name || "Component"}
                              </Text>
                              <View
                                style={{
                                  flex: 1.5,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <View
                                  style={[
                                    {
                                      borderRadius: 4,
                                      paddingVertical: 2,
                                      paddingHorizontal: 6,
                                      minWidth: 40,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 8,
                                      fontWeight: "bold",
                                      color: "#000",
                                      textAlign: "center",
                                    }}
                                  >
                                    {componentResult.result || "N/A"}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={{
                                  fontSize: 8,
                                  color: "#666",
                                  flex: 1,
                                  textAlign: "center",
                                  padding: 2,
                                }}
                              >
                                {component?.unit || "N/A"}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 8,
                                  color: "#333",
                                  flex: 2,
                                  textAlign: "center",
                                  padding: 2,
                                }}
                              >
                                {normalRange}
                              </Text>
                              <Text
                                style={[
                                  {
                                    fontSize: 7,
                                    fontWeight: "bold",
                                    flex: 1,
                                    textAlign: "center",
                                    padding: 2,
                                    color: resultColor,
                                  },
                                ]}
                              >
                                {componentResult.status || "Pending"}
                              </Text>
                            </View>
                          );
                        }
                      )}
                    </View>
                  </View>
                );
              } else {
                // Display traditional single-component test result
                const normalRange =
                  test.normal_from && test.normal_to
                    ? `${test.normal_from} - ${test.normal_to}`
                    : test.normal_range;
                const resultColor = getResultColor(
                  test.result,
                  normalRange,
                  test.status
                );

                // Check if we have multiple components to display for manual determination
                const hasMultipleComponents =
                  test.all_components && test.all_components.length > 1;
                const showAllComponents =
                  hasMultipleComponents &&
                  (!test.normal_from ||
                    !test.normal_to ||
                    test.normal_from === "N/A" ||
                    test.normal_to === "N/A");

                return (
                  <View key={testIndex}>
                    <View style={styles.testCard} wrap={false}>
                      <View style={styles.testCardCol}>
                        <Text style={styles.testName}>
                          {test.name || "Unknown Test"}
                        </Text>
                        {/* Display component name if available */}
                        {test.component_name && (
                          <Text
                            style={[
                              styles.testRefRange,
                              { color: "#2d3e8b", fontWeight: "bold" },
                            ]}
                          >
                            Component: {test.component_name}
                          </Text>
                        )}
                        {test.result_type === "boolean" ? (
                          <Text style={styles.testRefRange}>
                            Result Type: Boolean
                          </Text>
                        ) : (
                          <Text style={styles.testRefRange}>
                            {test.normal_from &&
                            test.normal_to &&
                            test.normal_from !== "N/A" &&
                            test.normal_to !== "N/A"
                              ? `Ref. Range: ${test.normal_from} - ${test.normal_to}`
                              : test.normal_range
                              ? `Ref. Range: ${test.normal_range}`
                              : "N/A"}
                            {test.unit ? ` ${test.unit}` : ""}
                            {test.reference_range
                              ? ` | Ref. Range: ${test.reference_range}`
                              : ""}
                          </Text>
                        )}
                        {/* Display critical values if available */}
                        {(test.c_low !== null || test.c_high !== null) &&
                          test.result_type !== "boolean" && (
                            <Text
                              style={[
                                styles.testRefRange,
                                { color: "#dc3545", fontWeight: "bold" },
                              ]}
                            >
                              Critical:{" "}
                              {test.c_low !== null ? `Low < ${test.c_low}` : ""}
                              {test.c_low !== null && test.c_high !== null
                                ? " | "
                                : ""}
                              {test.c_high !== null
                                ? `High > ${test.c_high}`
                                : ""}
                              {test.unit ? ` ${test.unit}` : ""}
                            </Text>
                          )}
                        {showAllComponents && (
                          <Text
                            style={[
                              styles.testRefRange,
                              { color: "#ff6b35", fontWeight: "bold" },
                            ]}
                          >
                            Multiple components available - Manual determination
                            required
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.testResultBox,
                          { borderColor: resultColor, borderWidth: 1 },
                        ]}
                      >
                        <Text style={styles.testResultText}>
                          {test.result_type === "boolean"
                            ? test.result === "positive"
                              ? "Positive"
                              : test.result === "negative"
                              ? "Negative"
                              : test.result || "N/A"
                            : `${test.result || "N/A"}${
                                test.unit ? ` ${test.unit}` : ""
                              }`}
                        </Text>
                      </View>
                      {test.status && (
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

                    {/* Display all components when manual determination is needed */}
                    {showAllComponents && (
                      <View
                        style={{
                          marginHorizontal: 20,
                          marginBottom: 12,
                          padding: 10,
                          backgroundColor: "#f8f9fa",
                          borderRadius: 4,
                          border: "1pt solid #dee2e6",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: "#2d3e8b",
                            marginBottom: 8,
                            textAlign: "center",
                          }}
                        >
                          Available Components for Manual Selection:
                        </Text>
                        {/* Header for component table */}
                        <View
                          style={{
                            flexDirection: "row",
                            backgroundColor: "#e8f0fe",
                            paddingVertical: 3,
                            borderBottom: "1pt solid #d0d7de",
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 2,
                              textAlign: "center",
                            }}
                          >
                            Component
                          </Text>
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 1,
                              textAlign: "center",
                            }}
                          >
                            Gender
                          </Text>
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 1,
                              textAlign: "center",
                            }}
                          >
                            Age
                          </Text>
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 1,
                              textAlign: "center",
                            }}
                          >
                            Type
                          </Text>
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 2,
                              textAlign: "center",
                            }}
                          >
                            Normal Range
                          </Text>
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "bold",
                              color: "#2d3e8b",
                              flex: 2,
                              textAlign: "center",
                            }}
                          >
                            Critical Values
                          </Text>
                        </View>
                        {test.all_components.map((component, compIndex) => (
                          <View
                            key={compIndex}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 4,
                              borderBottom:
                                compIndex < test.all_components.length - 1
                                  ? "1pt solid #e9ecef"
                                  : "none",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#333",
                                flex: 2,
                                textAlign: "center",
                              }}
                            >
                              {component.name || "Component"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#666",
                                flex: 1,
                                textAlign: "center",
                              }}
                            >
                              {component.gender ? component.gender : "Any"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#666",
                                flex: 1,
                                textAlign: "center",
                              }}
                            >
                              {component.age_start || "Any"}-
                              {component.age_end || "Any"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#666",
                                flex: 1,
                                textAlign: "center",
                              }}
                            >
                              {component.result_type || "range"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#333",
                                flex: 2,
                                textAlign: "center",
                              }}
                            >
                              {component.result_type === "boolean"
                                ? "Boolean"
                                : component.normal_from && component.normal_to
                                ? `${component.normal_from}-${
                                    component.normal_to
                                  }${
                                    component.unit ? ` ${component.unit}` : ""
                                  }`
                                : component.reference_range || "N/A"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                color: "#dc3545",
                                flex: 2,
                                textAlign: "center",
                              }}
                            >
                              {component.result_type === "boolean"
                                ? "N/A"
                                : component.c_low !== null ||
                                  component.c_high !== null
                                ? `${
                                    component.c_low !== null
                                      ? `L<${component.c_low}`
                                      : ""
                                  }${
                                    component.c_low !== null &&
                                    component.c_high !== null
                                      ? " | "
                                      : ""
                                  }${
                                    component.c_high !== null
                                      ? `H>${component.c_high}`
                                      : ""
                                  }`
                                : "None"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Render test comments */}
                    {renderTestComments(test.id, comments)}
                  </View>
                );
              }
            })}
          </>
        ) : null}

        {/* Cultures Section */}
        {report?.cultures_count > 0 ||
        (report?.medical_report_has_cultures &&
          report.medical_report_has_cultures.length > 0) ? (
          <>
            <Text style={styles.sectionTitle}>Cultures</Text>
            {report.medical_report_has_cultures?.map(
              (culture, cultureIndex) => {
                const normalRange =
                  culture.culture?.normal_from && culture.culture?.normal_to
                    ? `${culture.culture.normal_from} - ${culture.culture.normal_to}`
                    : culture.culture?.normal_range;
                const resultColor = getResultColor(
                  culture.result,
                  normalRange,
                  culture.status
                );
                const cultureAntibiotics = culture.culture_antibiotics || [];

                return (
                  <View key={cultureIndex}>
                    {/* Culture Header Card */}
                    <View
                      style={[styles.testCard, { minHeight: 30 }]}
                      wrap={false}
                    >
                      <View style={styles.testCardCol}>
                        <Text style={styles.testName}>
                          {culture.culture?.name || "Unknown Culture"}
                        </Text>
                      </View>
                      {/* {culture.status && (
                      <Text style={[
                        styles.testStatusBadge,
                        culture.status.toLowerCase() === 'normal' || culture.status.toLowerCase() === 'n' ? styles.normalBadge :
                        culture.status.toLowerCase() === 'abnormal' || culture.status.toLowerCase() === 'a' ? styles.abnormalBadge :
                        styles.otherBadge
                      ]}>
                        {culture.status}
                      </Text>
                    )} */}
                    </View>
                    {/* Culture Options and Results */}
                    {culture.culture_results &&
                      culture.culture_results.length > 0 && (
                        <View
                          style={{
                            marginTop: 8,
                            marginHorizontal: 20,
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "bold",
                              marginBottom: 5,
                              color: "#2d3e8b",
                            }}
                          >
                            Culture Results:
                          </Text>
                          <View
                            style={{
                              border: "1pt solid #e6e6e6",
                              borderRadius: 4,
                              padding: 8,
                              backgroundColor: "#fafafa",
                            }}
                          >
                            {culture.culture_results.map(
                              (result, resultIndex) => (
                                <View
                                  key={resultIndex}
                                  style={{
                                    marginBottom:
                                      resultIndex <
                                      culture.culture_results.length - 1
                                        ? 8
                                        : 0,
                                    paddingBottom:
                                      resultIndex <
                                      culture.culture_results.length - 1
                                        ? 8
                                        : 0,
                                    borderBottom:
                                      resultIndex <
                                      culture.culture_results.length - 1
                                        ? "1pt solid #f0f0f0"
                                        : "none",
                                  }}
                                >
                                  {result.result_type === "option" ||
                                  result.result_type === "sub_option" ? (
                                    <View>
                                      <Text
                                        style={{
                                          fontSize: 9,
                                          fontWeight: "bold",
                                          color: "#2d3e8b",
                                          marginBottom: 2,
                                        }}
                                      >
                                        {result.culture_option_name}
                                      </Text>
                                      {result.culture_sub_option_name && (
                                        <Text
                                          style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 10,
                                          }}
                                        >
                                          • {result.culture_sub_option_name}
                                        </Text>
                                      )}
                                      {result.custom_result && (
                                        <Text
                                          style={{
                                            fontSize: 9,
                                            color: "#333",
                                            marginLeft: 10,
                                            marginTop: 2,
                                          }}
                                        >
                                          Notes: {result.custom_result}
                                        </Text>
                                      )}
                                    </View>
                                  ) : (
                                    <View>
                                      <Text
                                        style={{
                                          fontSize: 9,
                                          fontWeight: "bold",
                                          color: "#2d3e8b",
                                          marginBottom: 2,
                                        }}
                                      >
                                        Custom Result:
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 9,
                                          color: "#333",
                                          marginLeft: 10,
                                        }}
                                      >
                                        {result.custom_result}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )
                            )}
                          </View>
                        </View>
                      )}

                    {/* Antibiotic Sensitivity Table - Directly under culture */}
                    {cultureAntibiotics.length > 0 && (
                      <View
                        style={{
                          marginTop: 8,
                          marginHorizontal: 20,
                          marginBottom: 12,
                        }}
                        wrap={false}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            marginBottom: 5,
                            color: "#2d3e8b",
                          }}
                        >
                          Antibiotic Sensitivity Testing:
                        </Text>
                        <View
                          style={{
                            border: "1pt solid #e6e6e6",
                            borderRadius: 4,
                            padding: 8,
                            backgroundColor: "#fafafa",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              borderBottom: "1pt solid #e6e6e6",
                              paddingBottom: 4,
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                flex: 2,
                                color: "#2d3e8b",
                              }}
                            >
                              Antibiotic
                            </Text>
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                flex: 1,
                                color: "#2d3e8b",
                                textAlign: "center",
                              }}
                            >
                              Sensitivity
                            </Text>
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                flex: 1,
                                color: "#2d3e8b",
                                textAlign: "center",
                              }}
                            >
                              Zone (mm)
                            </Text>
                          </View>
                          {cultureAntibiotics.map((ca, abIndex) => {
                            const sensitivityColor =
                              ca.sensitivity === "sensitive"
                                ? "#2ecc40"
                                : ca.sensitivity === "moderate"
                                ? "#ff9500"
                                : "#ff4136";
                            const sensitivityText =
                              ca.sensitivity === "sensitive"
                                ? "Sensitive"
                                : ca.sensitivity === "moderate"
                                ? "Intermediate"
                                : "Resistant";
                            return (
                              <View
                                key={abIndex}
                                style={{
                                  flexDirection: "row",
                                  paddingVertical: 2,
                                  borderBottom:
                                    abIndex < cultureAntibiotics.length - 1
                                      ? "1pt solid #f0f0f0"
                                      : "none",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: "#333",
                                    flex: 2,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {ca.antibiotic?.name || ca.antibiotic_name}
                                  {ca.antibiotic?.shortcut && (
                                    <Text
                                      style={{
                                        fontSize: 8,
                                        color: "#666",
                                        fontWeight: "normal",
                                      }}
                                    >
                                      {" "}
                                      ({ca.antibiotic.shortcut})
                                    </Text>
                                  )}
                                </Text>
                                <View
                                  style={{
                                    flex: 1,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <View
                                    style={{
                                      backgroundColor: sensitivityColor,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 4,
                                      minWidth: 60,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 8,
                                        color: "#fff",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {sensitivityText}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: "#333",
                                    flex: 1,
                                    textAlign: "center",
                                    fontWeight: ca.zone_size
                                      ? "bold"
                                      : "normal",
                                  }}
                                >
                                  {ca.zone_size ? `${ca.zone_size} mm` : "-"}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              }
            )}
          </>
        ) : null}

        {/* Test Groups Section - Enhanced with Category Grouping */}
        {report?.test_groups && report.test_groups.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Test Groups</Text>
            {report.test_groups.map((group, groupIndex) => {
              // Get all unique fields across all components
              const allFields = [
                { id: "component", name: "Component", width: 3 },
                ...(group.tg_fields || []).map((f) => ({ ...f, width: 1.2 })),
              ];

              // Organize components by category for better rendering
              const directComponents = (group.direct_components || []).map(
                (c) => ({
                  ...c,
                  category: null,
                  type: "direct",
                })
              );

              // Group categorized components by category
              const categorizedGroups = {};
              (group.categories || []).forEach((cat) => {
                if (cat.components && cat.components.length > 0) {
                  categorizedGroups[cat.name] = cat.components.map((comp) => ({
                    ...comp,
                    category: cat.name,
                    type: "categorized",
                  }));
                }
              });

              // Helper function to render component rows
              const renderComponentRow = (component, compIndex, isEven) => {
                const componentNormalRange =
                  component.normal_from && component.normal_to
                    ? `${component.normal_from} - ${component.normal_to}`
                    : component.normal_range;

                return (
                  <View
                    key={`comp-${component.id}-${compIndex}`}
                    style={[
                      styles.tableRow,
                      isEven && styles.evenRow,
                      component.result && styles.resultRow,
                      {
                        pageBreakInside: "avoid", // Prevent component row from breaking
                        orphans: 2, // Minimum lines at bottom of page
                        widows: 2, // Minimum lines at top of page
                      },
                    ]}
                  >
                    {allFields.map((field, fieldIdx) => {
                      // Component Name Cell
                      if (field.id === "component") {
                        return (
                          <View
                            key={fieldIdx}
                            style={[
                              styles.cell,
                              { flex: field.width },
                              styles.componentCell,
                            ]}
                          >
                            <Text style={styles.componentText}>
                              {component.name}
                            </Text>
                          </View>
                        );
                      }

                      // Reference Range Cell
                      if (field.id === "reference") {
                        return (
                          <View
                            key={fieldIdx}
                            style={[
                              styles.cell,
                              {
                                flex: field.width,
                                minWidth: 80,
                                padding: "4px 2px",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.referenceText,
                                { fontSize: 7, lineHeight: 1.2 },
                              ]}
                            >
                              {componentNormalRange || "N/A"}
                            </Text>
                          </View>
                        );
                      }

                      // Unit Cell
                      if (field.id === "unit") {
                        return (
                          <View
                            key={fieldIdx}
                            style={[
                              styles.cell,
                              { flex: field.width, minWidth: 40 },
                            ]}
                          >
                            <Text style={[styles.unitText, { fontSize: 8 }]}>
                              {component.unit || "-"}
                            </Text>
                          </View>
                        );
                      }

                      // Regular Field Cell
                      let fieldValue = "N/A";

                      // Get value from the new results structure
                      if (
                        component.results &&
                        component.results[field.name] !== undefined &&
                        component.results[field.name] !== ""
                      ) {
                        fieldValue = String(component.results[field.name]);
                      }
                      // Try alternative field name formats
                      else if (component.results) {
                        const fieldKey = field.name
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        if (
                          component.results[fieldKey] !== undefined &&
                          component.results[fieldKey] !== ""
                        ) {
                          fieldValue = String(component.results[fieldKey]);
                        }
                      }
                      // Try field ID as key in component results
                      else if (
                        component.results &&
                        component.results[field.id] !== undefined &&
                        component.results[field.id] !== ""
                      ) {
                        fieldValue = String(component.results[field.id]);
                      }
                      // Fallback to old structure for backward compatibility
                      else if (
                        group.values?.[component.id]?.[field.id] !== undefined
                      ) {
                        fieldValue = String(
                          group.values[component.id][field.id]
                        );
                      }
                      // Additional fallback: try field name in group values
                      else if (
                        group.values?.[component.id]?.[field.name] !== undefined
                      ) {
                        fieldValue = String(
                          group.values[component.id][field.name]
                        );
                      }

                      const isResult = field.name
                        .toLowerCase()
                        .includes("result");
                      const fieldNormalRange = null; // tg_fields table doesn't have normal range columns

                      const resultColor = isResult
                        ? getResultColor(
                            fieldValue,
                            fieldNormalRange,
                            field.status
                          )
                        : "transparent";

                      return (
                        <View
                          key={fieldIdx}
                          style={[
                            styles.cell,
                            {
                              flex: field.width,
                              backgroundColor:
                                resultColor !== "transparent"
                                  ? resultColor
                                  : undefined,
                            },
                            isResult && styles.resultCell,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              isResult && {
                                color:
                                  resultColor === "#2ecc40" ||
                                  resultColor === "#ff4136"
                                    ? "#fff"
                                    : "#333",
                                fontWeight: "bold",
                              },
                            ]}
                          >
                            {fieldValue}
                          </Text>
                          {isResult && fieldNormalRange && (
                            <Text style={styles.rangeText}>
                              {fieldNormalRange}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              };

              // Helper function to render category header with improved page break handling
              const renderCategoryHeader = (categoryName) => (
                <View
                  key={`category-${categoryName}`}
                  style={styles.categoryHeader}
                >
                  <View
                    style={[
                      styles.cell,
                      {
                        flex: allFields.reduce(
                          (sum, f) => sum + (f.width || 1),
                          0
                        ),
                        justifyContent: "flex-start",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          fontSize: 11, // Slightly smaller font
                          fontWeight: "bold",
                          color: "#2d3e8b",
                          textAlign: "center",
                          paddingVertical: 3, // Reduced padding
                        },
                      ]}
                    >
                      {categoryName}
                    </Text>
                  </View>
                </View>
              );

              // Helper function to render small header row under category names
              const renderCategorySubHeader = () => (
                <View style={styles.categorySubHeader}>
                  {allFields.map((field, idx) => (
                    <View
                      key={`sub-header-${field.id || idx}`}
                      style={[
                        styles.categorySubHeaderCell,
                        { flex: field.width || 1 },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 6,
                          fontWeight: "bold",
                          color: "#5d6481",
                          textAlign: "center",
                        }}
                      >
                        {field.name}
                      </Text>
                    </View>
                  ))}
                </View>
              );

              return (
                <View
                  key={groupIndex}
                  style={[
                    styles.tableContainer,
                    { marginTop: groupIndex === 0 ? 20 : 10 },
                  ]}
                >
                  <Text style={styles.tableTitle}>
                    {group.name || "Unknown Group"}
                  </Text>

                  {/* Table Header - Enhanced visibility with fixed positioning */}
                  <View style={styles.tableHeaderFixed} wrap={false} fixed>
                    {allFields.map((field, idx) => (
                      <View
                        key={field.id || idx}
                        style={[styles.headerCell, { flex: field.width || 1 }]}
                      >
                        <Text
                          style={[
                            styles.headerText,
                            { fontSize: 8, fontWeight: "bold" },
                          ]}
                        >
                          {field.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Render Direct Components First - wrapped in section */}
                  {directComponents.length > 0 && (
                    <View style={styles.tableSection}>
                      {directComponents.map((component, compIndex) =>
                        renderComponentRow(
                          component,
                          compIndex,
                          compIndex % 2 === 0
                        )
                      )}
                    </View>
                  )}

                  {/* Render Categorized Components Grouped by Category */}
                  {Object.entries(categorizedGroups).map(
                    ([categoryName, components], catIndex) => {
                      const startIndex =
                        directComponents.length +
                        Object.entries(categorizedGroups)
                          .slice(0, catIndex)
                          .reduce(
                            (sum, [, comps]) => sum + comps.length + 1,
                            0
                          ); // +1 for category header

                      return (
                        <View
                          key={`category-group-${categoryName}`}
                          style={styles.categoryContainer}
                        >
                          {/* Category Header */}
                          {renderCategoryHeader(categoryName)}

                          {/* Small Header Row under Category Name */}
                          {/* {renderCategorySubHeader()} */}

                          {/* Category Components - wrapped in section to prevent breaks */}
                          <View style={styles.tableSection}>
                            {components.map((component, compIndex) =>
                              renderComponentRow(
                                component,
                                startIndex + compIndex + 1, // +1 for category header
                                (startIndex + compIndex + 1) % 2 === 0
                              )
                            )}
                          </View>
                        </View>
                      );
                    }
                  )}
                  
                  {/* Render test group comments */}
                  {renderTestGroupComments(group.id, comments)}
                </View>
              );
            })}
          </>
        ) : null}
        {/* Doctor's Comment */}
        {doctorComment && (
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
      report.cultures?.length > 0 ||
      report.test_groups?.length > 0 ||
      report.reportTests?.length > 0 ||
      report.medical_report_has_cultures?.length > 0 ||
      report.tg_id_test_groups?.length > 0 ||
      report.test_group_results?.length > 0);

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
      {!isMobile && (
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
      )}
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
  const testsData = report.reportTests || report.tests || [];
  const tests = testsData.map((test) => {
    let selectedComponent = null;
    let allComponents = [];
    let hasComponentResults = false;
    let componentResults = [];

    // Use components from new API structure (test.components) or fallback to old structure
    const testComponents = test.components || test.test_components || [];

    if (Array.isArray(testComponents) && testComponents.length > 0) {
      const mappedComponents = testComponents.map((component) => ({
        ...component,
        gender: component.gender,
      }));

      // Filter components based on patient age and gender (matching MedicalReports.jsx logic)
      let finalFilteredComponents;

      if (!patientGender && !patient.birth_date) {
        // Both gender and birth date missing - show all components
        finalFilteredComponents = mappedComponents;
      } else if (!patientGender) {
        // Only gender missing - filter by age but show all genders
        finalFilteredComponents = mappedComponents.filter((tc) => {
          const ageMatch =
            (tc.age_start == null || patientAge >= tc.age_start) &&
            (tc.age_end == null || patientAge <= tc.age_end);
          return ageMatch;
        });
      } else if (!patient.birth_date) {
        // Only birth date missing - filter by gender but show all ages
        finalFilteredComponents = mappedComponents.filter((tc) => {
          const genderMatch = !tc.gender || tc.gender === patientGender;
          return genderMatch;
        });
      } else {
        // Both available - filter by both gender and age
        finalFilteredComponents = mappedComponents.filter((tc) => {
          const genderMatch = !tc.gender || tc.gender === patientGender;
          const ageMatch =
            (tc.age_start == null || patientAge >= tc.age_start) &&
            (tc.age_end == null || patientAge <= tc.age_end);
          return genderMatch && ageMatch;
        });
      }

      allComponents = finalFilteredComponents;

      // Check if we have component-level results from the new API structure
      // In new API: test.components[].results[]
      const allComponentResults = [];
      testComponents.forEach((component) => {
        if (component.results && component.results.length > 0) {
          component.results.forEach((result) => {
            allComponentResults.push({
              ...result,
              test_component: component,
              test_component_id: component.id,
            });
          });
        }
      });

      if (allComponentResults.length > 0) {
        // Use component results from the new API structure
        hasComponentResults = true;
        componentResults = allComponentResults.filter((cr) => {
          // Filter component results using the same logic as MedicalReports.jsx
          const component = cr.test_component;
          if (!component) return true; // Keep if no component data to filter by

          if (!patientGender && !patient.birth_date) {
            // Both gender and birth date missing - show all components
            return true;
          } else if (!patientGender) {
            // Only gender missing - filter by age but show all genders
            const ageMatch =
              (component.age_start == null ||
                patientAge >= component.age_start) &&
              (component.age_end == null || patientAge <= component.age_end);
            return ageMatch;
          } else if (!patient.birth_date) {
            // Only birth date missing - filter by gender but show all ages
            const genderMatch =
              !component.gender || component.gender === patientGender;
            return genderMatch;
          } else {
            // Both available - filter by both gender and age
            const genderMatch =
              !component.gender || component.gender === patientGender;
            const ageMatch =
              (component.age_start == null ||
                patientAge >= component.age_start) &&
              (component.age_end == null || patientAge <= component.age_end);
            return genderMatch && ageMatch;
          }
        });
      } else if (
        report.testComponentResults &&
        report.testComponentResults[test.id]
      ) {
        // Fallback to testComponentResults structure
        hasComponentResults = true;
        componentResults = report.testComponentResults[test.id].map((cr) => {
          const component =
            cr.test_component ||
            finalFilteredComponents.find((c) => c.id === cr.test_component_id);
          return {
            ...cr,
            test_component: component,
          };
        });
      } else if (finalFilteredComponents.length > 1) {
        // Only treat as multi-component test if there are actual saved results
        // Don't create empty placeholder results for PDF generation
        hasComponentResults = false;
        componentResults = [];
      }

      // Select the first component from the filtered set as the primary component
      selectedComponent = finalFilteredComponents[0] || mappedComponents[0];
    }

    // Access result and status from the medical_report_has_test relationship
    // Based on API structure: test.medical_report_has_test.result and test.medical_report_has_test.status
    const testResult =
      test.medical_report_has_test?.result ?? test.result ?? "";
    const testStatus =
      test.medical_report_has_test?.status ?? test.status ?? "pending";

    // Debug logging for test status issues
    if (!testResult || testStatus === "pending") {
      console.log(`Test ${test.name} (ID: ${test.id}):`, {
        result: testResult,
        status: testStatus,
        medical_report_has_test: test.medical_report_has_test,
        hasComponentResults: hasComponentResults,
        componentResultsCount: componentResults.length,
      });
    }

    return {
      ...test,
      unit: selectedComponent ? selectedComponent.unit : "",
      normal_from: Number.isNaN(
        selectedComponent ? selectedComponent.normal_from : 0
      )
        ? ""
        : selectedComponent
        ? selectedComponent.normal_from
        : "0",
      normal_to: Number.isNaN(
        selectedComponent ? selectedComponent.normal_to : 0
      )
        ? ""
        : selectedComponent
        ? selectedComponent.normal_to
        : "0",
      reference_range: selectedComponent
        ? selectedComponent.reference_range
        : "",
      result_type: selectedComponent ? selectedComponent.result_type : "range",
      // Add support for critical values (c_low, c_high)
      c_low: selectedComponent ? selectedComponent.c_low : null,
      c_high: selectedComponent ? selectedComponent.c_high : null,
      // Add component name for better identification
      component_name: selectedComponent ? selectedComponent.name : "",
      component_id: selectedComponent ? selectedComponent.id : null,
      result: testResult,
      status: testStatus,
      // Include all components for manual determination if needed
      all_components: allComponents,
      // Include component-level results
      has_component_results: hasComponentResults,
      component_results: componentResults,
    };
  });

  // Handle both old and new API structure for cultures
  const culturesData =
    report.medical_report_has_cultures || report.cultures || [];
  const cultures = culturesData.map((culture) => {
    // In new API structure, culture data is directly in medical_report_has_cultures
    // Each item has: culture (nested culture object), result, status, culture_antibiotics, culture_results
    const cultureInfo = culture.culture || culture; // Get nested culture info or use direct culture
    let cultureResults = [];
    let cultureAntibiotics = [];

    // Process culture results (organism findings, etc.)
    if (culture.culture_results && Array.isArray(culture.culture_results)) {
      cultureResults = culture.culture_results.map((cr) => ({
        id: cr.id,
        culture_option_name: cr.culture_option_name || "",
        culture_sub_option_name: cr.culture_sub_option_name || "",
        custom_result: cr.custom_result || "",
        result_type: cr.result_type || "",
      }));
    }

    // Process antibiotic sensitivity data
    if (
      culture.culture_antibiotics &&
      Array.isArray(culture.culture_antibiotics)
    ) {
      cultureAntibiotics = culture.culture_antibiotics.map((ca) => ({
        id: ca.id,
        sensitivity: ca.sensitivity || "",
        zone_diameter: ca.zone_diameter || "",
        mic_value: ca.mic_value || "",
        antibiotic: ca.antibiotic
          ? {
              id: ca.antibiotic.id,
              name: ca.antibiotic.name || "",
              shortcut: ca.antibiotic.shortcut || "",
              commercial_name: ca.antibiotic.commercial_name || "",
            }
          : null,
      }));
    }

    const processedCulture = {
      ...cultureInfo, // Use culture info (name, etc.)
      id: cultureInfo.id,
      name: cultureInfo.name || "",
      result: culture.result ?? "",
      status: culture.status ?? "",
      culture_results: cultureResults,
      culture_antibiotics: cultureAntibiotics,
    };

    // Debug logging for cultures
    console.log(`Culture ${cultureInfo.name} (ID: ${cultureInfo.id}):`, {
      result: processedCulture.result,
      status: processedCulture.status,
      cultureResultsCount: cultureResults.length,
      antibioticsCount: cultureAntibiotics.length,
      rawCultureResults: culture.culture_results,
      rawAntibiotics: culture.culture_antibiotics,
    });

    return processedCulture;
  });

  const culture_results = culturesData.map((cr) => ({
    culture_id: cr.culture?.id || cr.culture_id || cr.id,
    result: cr.result || "",
    status: cr.status || "",
  }));

  // Handle test groups from the new API structure
  const testGroupResults = report.test_group_results || [];

  // Group test group results by test_group_id to reconstruct test groups
  const testGroupsMap = new Map();
  const fieldsMap = new Map(); // Track unique fields across all test groups

  testGroupResults.forEach((tgr) => {
    if (tgr.test_group && tgr.tg_component) {
      const testGroupId = tgr.test_group.id;

      if (!testGroupsMap.has(testGroupId)) {
        testGroupsMap.set(testGroupId, {
          id: testGroupId,
          name: tgr.test_group.name,
          price: tgr.test_group.price,
          components: new Map(),
          fields: new Map(),
          results: [],
        });
      }

      const testGroup = testGroupsMap.get(testGroupId);
      testGroup.results.push(tgr);

      // Add component info
      if (!testGroup.components.has(tgr.tg_component.id)) {
        testGroup.components.set(tgr.tg_component.id, {
          id: tgr.tg_component.id,
          name: tgr.tg_component.name,
          reference_range: tgr.tg_component.reference_range,
          result_type: tgr.tg_component.result_type,
          category: tgr.tg_component.tgc_category,
          results: {},
        });
      }

      // Extract fields from test_group.tg_fields if available      if (tgr.test_group.tg_fields && Array.isArray(tgr.test_group.tg_fields)) {        tgr.test_group.tg_fields.forEach(field => {          if (!testGroup.fields.has(field.id)) {            testGroup.fields.set(field.id, {              id: field.id,              name: field.name,              test_group_id: field.test_group_id,              width: 1.2            });          }        });      }

      // Parse and store result_json
      if (tgr.result_json) {
        try {
          const resultJson =
            typeof tgr.result_json === "string"
              ? JSON.parse(tgr.result_json)
              : tgr.result_json;

          const component = testGroup.components.get(tgr.tg_component.id);
          Object.assign(component.results, resultJson);
        } catch (error) {
          console.error("Error parsing test group result_json:", error);
        }
      }
    }
  });

  // Convert map to array and format for PDF
  const test_groups = Array.from(testGroupsMap.values()).map((tg) => {
    const components = Array.from(tg.components.values());
    const fields = Array.from(tg.fields.values());

    // Group components by category
    const categoriesMap = new Map();
    const directComponents = [];

    components.forEach((component) => {
      if (component.category && component.category.name) {
        const categoryName = component.category.name;
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, {
            name: categoryName,
            components: [],
          });
        }
        categoriesMap.get(categoryName).components.push(component);
      } else {
        directComponents.push(component);
      }
    });

    return {
      id: tg.id,
      name: tg.name,
      price: tg.price,
      components: components,
      direct_components: directComponents,
      categories: Array.from(categoriesMap.values()),
      fields: fields, // Add fields array for PDF rendering
      results: tg.results,
    };
  });

  // Debug logging for test groups
  console.log("Test Groups Processing:", {
    testGroupResultsCount: testGroupResults.length,
    testGroupsMapSize: testGroupsMap.size,
    finalTestGroupsCount: test_groups.length,
    testGroupsData: test_groups.map((tg) => ({
      id: tg.id,
      name: tg.name,
      componentsCount: tg.components.length,
      directComponentsCount: tg.direct_components.length,
      categoriesCount: tg.categories.length,
    })),
  });

  return {
    ...report,
    tests,
    cultures,
    culture_results,
    test_groups,
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

      // Extract data from the API response structure
      const fullReportData = {
        ...responseData,
        testComponentResults: responseData.testComponentResults || {},
        testGroups: responseData.testGroups || [],
        testComponents: responseData.testComponents || {},
      };
      
      // Extract comments data from the API response
      const comments = {
        tests: responseData.testComments || {},
        testGroup: responseData.testGroupComments || {},
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
