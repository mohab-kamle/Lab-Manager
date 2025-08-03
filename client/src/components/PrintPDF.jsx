import React, { useMemo, useRef } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, PDFViewer, Font } from '@react-pdf/renderer';
import axios from 'axios';
import { toast } from 'react-toastify';
import LabIcon from '../assets/LabIcon.png';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import ReactDOM from 'react-dom';
import QRCodeSVG from 'qrcode-svg';
import { usePDF } from '@react-pdf/renderer';
import CairoFont from '../assets/fonts/Cairo.ttf';
import { FileText } from 'lucide-react';

// Register Cairo font for Arabic support
Font.register({
  family: 'Cairo',
  src: CairoFont,
  fontWeight: 'normal',
});

// Register Roboto font - using Google Fonts CDN for better compatibility
try {
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/roboto/v16/zN7GBFwfMP4uA6AR0HCoLQ.ttf',
        fontWeight: 'normal',
      }
    ],
  });
} catch (error) {
  console.warn('Failed to register Roboto font, falling back to default:', error);
  // Fallback to default fonts if registration fails
}

// Note: @react-pdf/renderer has better built-in support for Arabic text
// than jsPDF, so we'll use the default font handling

// Helper to determine result color
function getResultColor(result, normalRange, status) {
  if (status && status.toLowerCase() === 'normal') return '#2ecc40'; // green
  if (status && status.toLowerCase() === 'n') return '#2ecc40'; // green
  if (status && status.toLowerCase() === 'abnormal') return '#ff4136'; // red
  if (status && status.toLowerCase() === 'a') return '#ff4136'; // red
  if (typeof result === 'number' && normalRange) {
    // Try to parse normal range like '0.22 - 5.1'
    const match = /([\d.]+)\s*-\s*([\d.]+)/.exec(normalRange);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max)) {
        if (result < min || result > max) return '#ff4136';
        return '#2ecc40';
      }
    }
  }
  return '#e9ecef'; // light grey
}

const styles = StyleSheet.create({
  tableContainer: {
    marginBottom: 5,
    marginHorizontal: 12,
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    overflow: 'visible',
    pageBreakInside: 'avoid', // Prevent breaking inside table
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableTitle: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    fontWeight: 'bold',
    borderBottom: '2px solid #e0e0e0',
    textAlign: 'center',
    fontSize: 10,
    color: '#2d3e8b',
    letterSpacing: 0.5,
    pageBreakAfter: 'avoid', // Prevent page break immediately after title
    orphans: 3, // Ensure at least 3 lines follow the title
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2d3e8b',
    color: 'white',
    padding: '4px 12px',
    position: 'relative',
    zIndex: 1,
  },
  tableHeaderFixed: {
    flexDirection: 'row',
    backgroundColor: '#2d3e8b',
    color: 'white',
    position: 'relative',
    zIndex: 1,
    minHeight: 20,             // Reduced header height
    alignItems: 'center',
    pageBreakAfter: 'avoid', // Prevent page break immediately after header
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 7,               // Slightly smaller font
    textAlign: 'center',
    padding: '4px 3px',        // Reduced padding
    minHeight: 12,             // Reduced minimum height
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f0f0f0',
    padding: '1px 2px',        // Reduced padding for smaller rows
    minHeight: 8,              // Reduced minimum row height
    alignItems: 'center',
    pageBreakInside: 'avoid', // Prevent row breaking
    orphans: 2, // Minimum lines at bottom of page
    widows: 2,  // Minimum lines at top of page
  },
  evenRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    flex: 1,
    fontSize: 6,
    padding: '3px 4px',        // Reduced padding for smaller cells
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 4,              // Reduced minimum height
    lineHeight: 1.0,           // Tighter line height
  },
  componentCell: {
    justifyContent: 'flex-center',
    alignItems: 'flex-center',
  },
  page: {
    fontFamily: 'Cairo', // Use Cairo for Arabic support
    fontSize: 10,
    padding: 0,
    backgroundColor: '#fff',
    paddingBottom: 85,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 5,
    backgroundColor: '#fff',
    borderBottom: '1pt solid #e6e6e6',
  },
  headerRow: {
    border: '1pt solid #e6e6e6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 12,
  },
  logo: {
    width: 30,
    height: 35,
    marginRight: 10,
  },
  labName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3e8b',
  },
  subtitle: {
    fontSize: 8,
    color: '#2d3e8b',
    marginBottom: 2,
  },
  accreditations: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  accPlaceholder: {
    width: 60,
    height: 30,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginRight: 6,
  },
  infoGridWrapper: {
    alignItems: 'center',
    width: '100%',
    marginTop: 8,    
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 600,
    width: '90%',
    marginHorizontal: 'auto',
    paddingBottom: 5,
    marginBottom: 5,
    borderBottom: '1pt solid #e6e6e6',
  },
  infoCard: {
    borderRadius: 6,
    border: '1pt solid #e6e6e6',
    padding: 8,
    flex: 1,
    marginRight: 8,
    minHeight: 48,
  },
  infoCardLast: {
    marginRight: 0,
  },
  infoTitle: {
    fontWeight: 'bold',
    color: '#5d6481',
    borderRadius: 4,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginBottom: 2,
    fontSize: 6,
    backgroundColor: '#dedfeb',
  },
  infoText: {
    color: '#333',
    fontSize: 10,
    lineHeight: 1.3,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginHorizontal: 2,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 6,
    borderRadius: 4,
    color: '#5d6481', 
    fontWeight: 'bold',
    marginBottom: 2,
    backgroundColor: '#dedfeb',
    padding: 2,
  },
  statusValue: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2d3e8b',
    marginTop: 5,
    textAlign: 'center',
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 1,
    borderLeft: '1pt solid #303d85',
    marginBottom: 12,
    marginHorizontal: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  testName: {
    fontWeight: 'bold',
    color: '#2d3e8b',
    fontSize: 12,
    marginBottom: 2,
  },
  testResultBox: {
    minWidth: 80,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  testUnit: {
    fontSize: 10,
    color: '#333',
    marginLeft: 4,
  },
  testRefRange: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  testStatusBadge: {
    marginLeft: 10,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2ecc40',
  },
  abnormalBadge: {
    backgroundColor: '#ff4136',
  },
  normalBadge: {
    backgroundColor: '#2ecc40',
  },
  otherBadge: {
    backgroundColor: '#adb5bd',
  },
  testCardCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    borderTop: '1pt solid #e6e6e6',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 6,
    color: '#666',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  pageNum: {
    position: 'absolute',
    bottom: 10,
    right: 25,
    fontSize: 6,
    color: '#212529',
  },
  commentBox: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 12,
    border: '1pt solid #e6e6e6',
    borderRadius: 6,
  },
  commentLabel: {
    fontWeight: 'bold',
    color: '#2d3e8b',
    fontSize: 12,
    marginRight: 4,
  },
  signLabel: {
    fontWeight: 'bold',
    color: '#2d3e8b',
    fontSize: 12,
    marginRight: 4,
  },
  signText: {
    fontSize: 12,
    color: '#333',
  },
  // Additional styles for enhanced test groups rendering
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2d3e8b',
    textAlign: 'center',
  },
  componentText: {
    fontSize: 8,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 1.3,
    wordWrap: 'break-word',
    maxWidth: '100%',
  },
  referenceText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  unitText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 8,
    color: '#333',
    textAlign: 'center',
    lineHeight: 1.1,
  },
  rangeText: {
    fontSize: 6,
    color: '#999',
    textAlign: 'center',
    marginTop: 1,
  },
  resultCell: {
    fontWeight: 'bold',
    fontSize: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: '6px 8px',
  },
  headerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // New styles for better page break handling
  categoryContainer: {
    pageBreakInside: 'avoid', // Prevent category sections from breaking
    marginBottom: 1,           // Reduced margin for compactness
    minHeight: 30,             // Reduced minimum height
    orphans: 2, // Minimum lines at bottom of page
    widows: 2,  // Minimum lines at top of page
  },
  categoryHeader: {
    backgroundColor: '#f8f9fa',
    border: '2pt solid #2d3e8b',
    display: 'flex',
    paddingBottom: 3,          // Reduced padding
    flexDirection: 'row',
    textAlign: 'center',
    minHeight: 30,             // Reduced height
    justifyContent: 'center',
    alignItems: 'center',
    pageBreakAfter: 'avoid', // Prevent page break immediately after header
    orphans: 3, // Ensure at least 3 lines follow the header
  },
  tableSection: {
    pageBreakInside: 'avoid', // Keep table sections together
    marginBottom: 2,           // Reduced margin
    minHeight: 25,             // Reduced minimum height
    orphans: 2, // Minimum lines at bottom of page
    widows: 2,  // Minimum lines at top of page
  },
  // Small header row under category names
  categorySubHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8f0fe',
    borderBottom: '1px solid #d0d7de',
    minHeight: 14,             // Reduced height for compactness
    alignItems: 'center',
    marginBottom: 0.5,         // Reduced margin
  },
  categorySubHeaderCell: {
    flex: 1,
    fontSize: 6,
    fontWeight: 'bold',
    color: '#5d6481',
    textAlign: 'center',
    padding: '2px 3px',
    minHeight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

});

// Add styles for group and component cards
const groupCardStyle = (resultColor = '#303d85') => ({
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  border: '1pt solid #e6e6e6',
  borderLeft: `3pt solid ${resultColor}`,
  marginBottom: 18,
  marginHorizontal: 20,
  padding: 14,
});
const groupTitleStyle = {
  fontWeight: 'bold',
  color: '#2d3e8b',
  fontSize: 12,
  marginBottom: 8,
};
const componentCardStyle = (resultColor = '#303d85') => ({
  backgroundColor: '#fff',
  borderRadius: 6,
  border: '1pt solid #ddd',
  borderLeft: `3pt solid ${resultColor}`,
  marginBottom: 10,
  padding: 10,
  marginLeft: 10,
});
const componentNameStyle = {
  fontWeight: 'bold',
  color: '#333',
  fontSize: 11,
  marginBottom: 4,
};
const fieldRowStyle = {
  flexDirection: 'row',
  marginBottom: 2,
};
const fieldLabelStyle = {
  fontWeight: 'bold',
  color: '#666',
  fontSize: 10,
  width: 80,
};
const fieldValueStyle = {
  textAlign: 'center',
  color: '#333',
  fontSize: 10,
  flex: 1,
};

function calculateAge(birthdate) {
  if (!birthdate) return '-';
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
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, width: 2, height: 40, margin: 0 });
      return canvas.toDataURL('image/png');
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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image src={LabIcon} style={styles.logo} />
        <View>
          <Text style={styles.labName}>{lab.name}</Text>
          <Text style={styles.subtitle}>Medical Laboratories</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
        {barcodeUrl && <Image src={barcodeUrl} style={{ width: 60, height: 20 }} />}
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
      <Text>www.labdoctors-laboratories.com | techsupport@labdoctors-laboratories.com | License No: 2600032113</Text>
      <Text>Validated By: {signatory || 'N/A'} | Approved By: {signatory || 'N/A'}</Text>
    </View>
    <View style={styles.footerRight}>
      {qrUrl && <Image src={qrUrl} style={{ width: 35 , height: 35 }} />}
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
          <Text>{patient?.name || 'N/A'}</Text>{'\n'}
          {patient?.gender === 'm' ? 'Male' : patient?.gender === 'f' ? 'Female' : 'N/A'} - {patient?.birth_date ? calculateAge(patient.birth_date) : 'N/A'}{'\n'}
          Code: {patient?.patientcode || 'N/A'}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Order</Text>
        <Text style={styles.infoText}>
          Report ID: {report?.id || 'N/A'}{'\n'}
          Branch: {report?.branch_name || 'Main Lab'}{'\n'}
          Priority: {report?.priority || 'Routine'}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Test</Text>
        <Text style={styles.infoText}>
          Tests: {report?.tests?.length || 0}{'\n'}
          Cultures: {report?.cultures?.length || 0}{'\n'}
          Groups: {report?.test_groups?.length || 0}
        </Text>
      </View>
      <View style={[styles.infoCard, styles.infoCardLast]}>
        <Text style={styles.infoTitle}>Referral</Text>
        <Text style={styles.infoText}>
          Doctor: {patient?.referral?.doctor_name || 'N/A'}{'\n'}
          Specialization: {patient?.referral?.specialization || 'N/A'}{'\n'}
          Status: {report?.done === 1 ? 'Completed' : report?.pending === 1 ? 'Pending' : 'Unsigned'}
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
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };
  
  const statusData = [
    { label: 'Registered At', date: report?.registered_at },
    { label: 'Collected At', date: report?.collected_at },
    { label: 'Received At', date: report?.received_at },
    { label: 'Reported At', date: report?.reported_at }
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
const ProfessionalPDFDocument = ({ patient, report, qrUrl, lab }) => {
  // Use report id as barcode, and a URL as QR code (e.g., report view link)
  const barcodeUrl = useBarcode(report?.id ? String(report.id) : '0');
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
            position: 'absolute',
            left: 30,
            bottom: 10,
            fontSize: 9,
            color: '#adb5bd',
          }}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        {/* Header, InfoGrid, Footer on every page */}
        <PDFHeader patient={patient} report={report} barcodeUrl={barcodeUrl} lab={lab} />
        <PDFInfoGrid patient={patient} report={report} />
        {/* Status bar only on first page */}
        <StatusBarFirstPage report={report} />
        {/* Tests Section */}
        {report?.tests && report.tests.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Tests</Text>
            {report.tests.map((test, testIndex) => {
              const normalRange = test.normal_from && test.normal_to ? `${test.normal_from} - ${test.normal_to}` : test.normal_range;
              const resultColor = getResultColor(test.result, normalRange, test.status);
              return (
                <View
                  style={styles.testCard}
                  key={testIndex}
                >
                  <View style={styles.testCardCol}>
                    <Text style={styles.testName}>{test.name || 'Unknown Test'}</Text>
                    {test.result_type === 'boolean' ? (
                      <Text style={styles.testRefRange}>Result Type: Boolean</Text>
                    ) : (
                      <Text style={styles.testRefRange}>
                        {test.normal_from && test.normal_to ? `Ref. Range: ${test.normal_from} - ${test.normal_to}` : test.normal_range ? `Ref. Range: ${test.normal_range}` : 'N/A'}
                        {test.unit ? ` ${test.unit}` : ''}
                        {test.reference_range ? ` | Ref. Range: ${test.reference_range}` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.testResultBox, { backgroundColor: resultColor }]}> 
                    <Text style={styles.testResultText}>
                      {test.result_type === 'boolean'
                        ? (test.result === 'positive' ? 'Positive' : test.result === 'negative' ? 'Negative' : test.result || 'N/A')
                        : `${test.result || 'N/A'}${test.unit ? ` ${test.unit}` : ''}`}
                    </Text>
                  </View>
                  {test.status && (
                    <Text style={[
                      styles.testStatusBadge,
                      test.status.toLowerCase() === 'normal' || test.status.toLowerCase() === 'n' ? styles.normalBadge :
                      test.status.toLowerCase() === 'abnormal' || test.status.toLowerCase() === 'a' ? styles.abnormalBadge :
                      styles.otherBadge
                    ]}>
                      {test.status}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        ) : null}
        
        {/* Cultures Section */}
        {report?.cultures && report.cultures.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Cultures</Text>
            {report.cultures.map((culture, cultureIndex) => {
              const normalRange = culture.normal_from && culture.normal_to ? `${culture.normal_from} - ${culture.normal_to}` : culture.normal_range;
              const resultColor = getResultColor(culture.result, normalRange, culture.status);
              const cultureAntibiotics = culture.culture_antibiotics || [];
              
              return (
                <View key={cultureIndex}>
                  {/* Culture Header Card */}
                  <View
                    style={styles.testCard}
                  >
                    <View style={styles.testCardCol}>
                      <Text style={styles.testName}>{culture.name || 'Unknown Culture'}</Text>
                      <Text style={styles.testRefRange}>
                        {culture.normal_from && culture.normal_to ? `Ref. Range: ${culture.normal_from} - ${culture.normal_to}` : culture.normal_range ? `Ref. Range: ${culture.normal_range}` : 'N/A'}
                        {culture.unit ? ` ${culture.unit}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.testResultBox, { backgroundColor: resultColor }]}> 
                      <Text style={styles.testResultText}>
                        {`${culture.result || 'N/A'}${culture.unit ? ` ${culture.unit}` : ''}`}
                      </Text>
                    </View>
                    {culture.status && (
                      <Text style={[
                        styles.testStatusBadge,
                        culture.status.toLowerCase() === 'normal' || culture.status.toLowerCase() === 'n' ? styles.normalBadge :
                        culture.status.toLowerCase() === 'abnormal' || culture.status.toLowerCase() === 'a' ? styles.abnormalBadge :
                        styles.otherBadge
                      ]}>
                        {culture.status}
                      </Text>
                    )}
                  </View>
                  
                  {/* Antibiotic Sensitivity Table - Directly under culture */}
                  {cultureAntibiotics.length > 0 && (
                    <View style={{ 
                      marginTop: 8, 
                      marginHorizontal: 20,
                      marginBottom: 12
                    }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, color: '#2d3e8b' }}>
                        Antibiotic Sensitivity Testing:
                      </Text>
                      <View style={{ 
                        border: '1pt solid #e6e6e6', 
                        borderRadius: 4, 
                        padding: 8,
                        backgroundColor: '#fafafa'
                      }}>
                        <View style={{ 
                          flexDirection: 'row', 
                          borderBottom: '1pt solid #e6e6e6', 
                          paddingBottom: 4, 
                          marginBottom: 4 
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', flex: 2, color: '#2d3e8b' }}>Antibiotic</Text>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', flex: 1, color: '#2d3e8b', textAlign: 'center' }}>Sensitivity</Text>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', flex: 1, color: '#2d3e8b', textAlign: 'center' }}>Zone (mm)</Text>
                        </View>
                        {cultureAntibiotics.map((ca, abIndex) => {
                          const sensitivityColor = ca.sensitivity === 'sensitive' ? '#2ecc40' : 
                                                  ca.sensitivity === 'moderate' ? '#ff9500' : 
                                                  '#ff4136';
                          const sensitivityText = ca.sensitivity === 'sensitive' ? 'Sensitive' : 
                                                 ca.sensitivity === 'moderate' ? 'Intermediate' : 
                                                 'Resistant';
                          return (
                            <View 
                              key={abIndex} 
                              style={{
                                flexDirection: 'row',
                                paddingVertical: 2,
                                borderBottom: abIndex < cultureAntibiotics.length - 1 ? '1pt solid #f0f0f0' : 'none'
                              }}
                            >
                              <Text style={{ 
                                fontSize: 9, 
                                color: '#333', 
                                flex: 2,
                                fontWeight: 'bold'
                              }}>
                                {ca.antibiotic?.name || ca.antibiotic_name}
                                {ca.antibiotic?.shortcut && (
                                  <Text style={{ fontSize: 8, color: '#666', fontWeight: 'normal' }}>
                                    {' '}({ca.antibiotic.shortcut})
                                  </Text>
                                )}
                              </Text>
                              <View style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <View style={{
                                  backgroundColor: sensitivityColor,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 4,
                                  minWidth: 60
                                }}>
                                  <Text style={{ 
                                    fontSize: 8, 
                                    color: '#fff', 
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                  }}>
                                    {sensitivityText}
                                  </Text>
                                </View>
                              </View>
                              <Text style={{ 
                                fontSize: 9, 
                                color: '#333', 
                                flex: 1,
                                textAlign: 'center',
                                fontWeight: ca.zone_size ? 'bold' : 'normal'
                              }}>
                                {ca.zone_size ? `${ca.zone_size} mm` : '-'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Culture Options and Results */}
                  {culture.culture_results && culture.culture_results.length > 0 && (
                    <View style={{ 
                      marginTop: 8, 
                      marginHorizontal: 20,
                      marginBottom: 12
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, color: '#2d3e8b' }}>
                        Culture Results:
                      </Text>
                      <View style={{ 
                        border: '1pt solid #e6e6e6', 
                        borderRadius: 4, 
                        padding: 8,
                        backgroundColor: '#fafafa'
                      }}>
                        {culture.culture_results.map((result, resultIndex) => (
                          <View 
                            key={resultIndex}
                            style={{
                              marginBottom: resultIndex < culture.culture_results.length - 1 ? 8 : 0,
                              paddingBottom: resultIndex < culture.culture_results.length - 1 ? 8 : 0,
                              borderBottom: resultIndex < culture.culture_results.length - 1 ? '1pt solid #f0f0f0' : 'none'
                            }}
                          >
                            {result.result_type === 'predefined' ? (
                              <View>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2d3e8b', marginBottom: 2 }}>
                                  {result.culture_option_name}
                                </Text>
                                {result.culture_sub_option_name && (
                                  <Text style={{ fontSize: 9, color: '#333', marginLeft: 10 }}>
                                    • {result.culture_sub_option_name}
                                  </Text>
                                )}
                              </View>
                            ) : (
                              <View>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2d3e8b', marginBottom: 2 }}>
                                  Custom Result:
                                </Text>
                                <Text style={{ fontSize: 9, color: '#333', marginLeft: 10 }}>
                                  {result.custom_result}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : null}
        
        {/* Test Groups Section - Enhanced with Category Grouping */}
{report?.test_groups && report.test_groups.length > 0 ? (
  <>
    <Text style={styles.sectionTitle}>Test Groups</Text>
    {report.test_groups.map((group, groupIndex) => {
      // Get all unique fields across all components
      const allFields = [
        { id: 'component', name: 'Component', width: 3 },
        ...(group.fields || []).map(f => ({ ...f, width: 1.2 })),
      ];

      // Organize components by category for better rendering
      const directComponents = (group.direct_components || []).map(c => ({ 
        ...c, 
        category: null,
        type: 'direct'
      }));

      // Group categorized components by category
      const categorizedGroups = {};
      (group.categories || []).forEach(cat => {
        if (cat.components && cat.components.length > 0) {
          categorizedGroups[cat.name] = cat.components.map(comp => ({ 
            ...comp, 
            category: cat.name,
            type: 'categorized'
          }));
        }
      });

      // Helper function to render component rows
      const renderComponentRow = (component, compIndex, isEven) => {
        const componentNormalRange = component.normal_from && component.normal_to 
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
                pageBreakInside: 'avoid', // Prevent component row from breaking
                orphans: 2, // Minimum lines at bottom of page
                widows: 2,  // Minimum lines at top of page
              }
            ]}
          >
            {allFields.map((field, fieldIdx) => {
              // Component Name Cell
              if (field.id === 'component') {
                return (
                  <View 
                    key={fieldIdx} 
                    style={[styles.cell, { flex: field.width }, styles.componentCell]}
                  >
                    <Text style={styles.componentText}>
                      {component.name}
                    </Text>
                  </View>
                );
              }

              // Reference Range Cell
              if (field.id === 'reference') {
                return (
                  <View 
                  key={fieldIdx} 
                  style={[styles.cell, { flex: field.width, minWidth: 80, padding: '4px 2px' }]}
                >
                  <Text style={[styles.referenceText, { fontSize: 7, lineHeight: 1.2 }]}>
                    {componentNormalRange || 'N/A'}
                  </Text>
                </View>
                );
              }

              // Unit Cell
              if (field.id === 'unit') {
                return (
                  <View 
                  key={fieldIdx} 
                  style={[styles.cell, { flex: field.width, minWidth: 40 }]}
                >
                  <Text style={[styles.unitText, { fontSize: 8 }]}>
                    {component.unit || '-'}
                  </Text>
                </View>
                );
              }

              // Regular Field Cell
              let fieldValue = 'N/A';
              if (group.values?.[component.id]?.[field.id] !== undefined) {
                fieldValue = String(group.values[component.id][field.id]);
              }

              const isResult = field.name.toLowerCase().includes('result');
              const fieldNormalRange = field.normal_from && field.normal_to 
                ? `${field.normal_from} - ${field.normal_to}` 
                : field.normal_range;
              
              const resultColor = isResult 
                ? getResultColor(fieldValue, fieldNormalRange, field.status) 
                : 'transparent';

              return (
                <View 
                  key={fieldIdx} 
                  style={[
                    styles.cell, 
                    { 
                      flex: field.width,
                      backgroundColor: resultColor !== 'transparent' ? resultColor : undefined
                    },
                    isResult && styles.resultCell
                  ]}
                >
                  <Text style={[
                    styles.cellText,
                    isResult && { 
                      color: (resultColor === '#2ecc40' || resultColor === '#ff4136') 
                        ? '#fff' 
                        : '#333',
                      fontWeight: 'bold'
                    }
                  ]}>
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
          <View style={[styles.cell, { flex: allFields.reduce((sum, f) => sum + (f.width || 1), 0), justifyContent: 'flex-start' }]}>
            <Text style={[
              styles.categoryText,
              {
                fontSize: 11,              // Slightly smaller font
                fontWeight: 'bold',
                color: '#2d3e8b',
                textAlign: 'center',
                paddingVertical: 3,        // Reduced padding
              }
            ]}>
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
              style={[styles.categorySubHeaderCell, { flex: field.width || 1 }]}
            >
              <Text style={{
                fontSize: 6,
                fontWeight: 'bold',
                color: '#5d6481',
                textAlign: 'center'
              }}>
                {field.name}
              </Text>
            </View>
          ))}
        </View>
      );

      return (
        <View key={groupIndex} style={[styles.tableContainer, { marginTop: groupIndex === 0 ? 20 : 10 }]}>
          <Text style={styles.tableTitle}>{group.name || 'Unknown Group'}</Text>
          
          {/* Table Header - Enhanced visibility with fixed positioning */}
          <View style={styles.tableHeaderFixed} wrap={false} fixed>
            {allFields.map((field, idx) => (
              <View 
                key={field.id || idx} 
                style={[styles.headerCell, { flex: field.width || 1 }]}
              >
                <Text style={[styles.headerText, { fontSize: 8, fontWeight: 'bold' }]}>{field.name}</Text>
              </View>
            ))}
          </View>

          {/* Render Direct Components First - wrapped in section */}
          {directComponents.length > 0 && (
            <View style={styles.tableSection}>
              {directComponents.map((component, compIndex) => 
                renderComponentRow(component, compIndex, compIndex % 2 === 0)
              )}
            </View>
          )}

          {/* Render Categorized Components Grouped by Category */}
          {Object.entries(categorizedGroups).map(([categoryName, components], catIndex) => {
            const startIndex = directComponents.length + 
              Object.entries(categorizedGroups)
                .slice(0, catIndex)
                .reduce((sum, [, comps]) => sum + comps.length + 1, 0); // +1 for category header
            
            return (
              <View key={`category-group-${categoryName}`} style={styles.categoryContainer}>
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
          })}
        </View>
      );
    })}
  </>
) : null}
        {/* Doctor's Comment */}
        {doctorComment && (
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>Comment : </Text>
            <Text style={styles.infoText}>{doctorComment}</Text>
          </View>
        )}
        <PDFFooter qrUrl={qrUrl} signatory={signatory} fixed />
      </Page>
    </Document>
  );
};

// Main PrintPDF Component
const PrintPDF = ({ patient, report, lab }) => {
  // Safety check for valid props
  if (!patient || !report) {
    return (
      <span style={styles.btn}>
        Invalid Data
      </span>
    );
  }

  const qrUrl = useQrPngDataUrl(`https://doctorslab.com/patient?patientcode=${patient?.patientcode || ''}`);

  if (!qrUrl) {
    return (
      <span style={styles.btn}>
        Generating QR...
      </span>
    );
  }

  // Defensive check for required data
  const hasValidData = patient && report && 
    (report.tests?.length > 0 || report.cultures?.length > 0 || report.test_groups?.length > 0);

  if (!hasValidData) {
    return (
      <span style={styles.btn}>
        No Data Available
      </span>
    );
  }

  // Mobile detection function
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  const isMobile = isMobileDevice();

  // === LIVE PDF PREVIEW WITH MOBILE COMPATIBILITY ===
  return (
    <div>
      {isMobile ? (
        // Mobile-friendly fallback
        <div style={{ 
          height: '300px', 
          border: '1px solid #ccc', 
          marginBottom: 16, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <FileText size={48} color="#6c757d" />
          </div>
          <h5 style={{ color: '#495057', marginBottom: '10px' }}>PDF Preview Not Available</h5>
          <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
            PDF preview is not supported on mobile devices. Please download the PDF to view it.
          </p>
          <PDFDownloadLink
            document={<ProfessionalPDFDocument patient={patient} report={report} qrUrl={qrUrl} lab={lab} />}
            fileName={`Medical_Report_${patient.name || 'Report'}.pdf`}
          >
            {({ loading, error }) => {
              if (error) {
                return (
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}>
                    PDF Error
                  </button>
                );
              }
              
              return (
                <button style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }} disabled={loading}>
                  {loading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              );
            }}
          </PDFDownloadLink>
        </div>
      ) : (
        // Desktop PDF viewer
        <div style={{ height: '90vh', border: '1px solid #ccc', marginBottom: 16 }}>
          <PDFViewer width="100%" height="100%">
            <ProfessionalPDFDocument patient={patient} report={report} qrUrl={qrUrl} lab={lab} />
          </PDFViewer>
        </div>
      )}
      
      {/* Download button for desktop */}
      {!isMobile && (
        <PDFDownloadLink
          document={<ProfessionalPDFDocument patient={patient} report={report} qrUrl={qrUrl} lab={lab} />}
          fileName={`Medical_Report_${patient.name || 'Report'}.pdf`}
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
              <span style={{
                ...styles.btn,
                ...(loading ? styles.btnLoading : {}),
              }}>
                {loading ? 'Generating PDF...' : 'Download PDF'}
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
  const patientAge = calculateAge(patient.birth_date);
  const patientGender = patient.gender;

  const tests = (report.tests || []).map(test => {
    let selectedComponent = null;
    if (Array.isArray(test.test_components) && test.test_components.length > 0) {
      selectedComponent = test.test_components.find(tc => {
        const genderMatch = !tc.gender || tc.gender === patientGender;
        const ageMatch = (tc.age_start == null || patientAge >= tc.age_start) &&
                         (tc.age_end == null || patientAge <= tc.age_end);
        return genderMatch && ageMatch;
      });
      // If no match, fallback to first component for unit/normal_range
      if (!selectedComponent) {
        selectedComponent = test.test_components[0];
      }
    }
    return {
      ...test,
      unit: selectedComponent ? selectedComponent.unit : '',
      normal_from: selectedComponent ? selectedComponent.normal_from : '',
      normal_to: selectedComponent ? selectedComponent.normal_to : '',
      reference_range: selectedComponent ? selectedComponent.reference_range : '',
      result_type: selectedComponent ? selectedComponent.result_type : 'range',
      result: test.result ?? '',
      status: test.status ?? ''
    };
  });

  const cultures = (report.cultures || []).map(culture => ({
    ...culture
  }));

  const culture_results = (report.medical_report_has_cultures || []).map(cr => ({
    culture_id: cr.culture_id,
    result: cr.result,
    status: cr.status
  }));

  const test_groups = (report.test_groups || []).map(tg => ({
    ...tg,
    fields: tg.fields || tg.tg_fields, // Ensure fields are passed correctly
    components: tg.components || tg.tg_components, // legacy fallback
    direct_components: tg.direct_components || [],
    categories: tg.categories || [],
    values: tg.values || tg.medical_report_tg_field_values || [] // Ensure values are passed correctly
  }));

  return {
    ...report,
    tests,
    cultures,
    culture_results,
    test_groups,
    doctor_name: report.signatory_name || ''
  };
}

// Direct PDF Download Component - fetches data and downloads in one step
const DirectPDFDownload = ({ reportId, patient, apiUrl }) => {
  const [loading, setLoading] = React.useState(false);
  const downloadTriggeredRef = useRef(false);

  const qrUrl = useQrPngDataUrl(`https://doctorslab.com/patient?patientcode=${patient?.patientcode || ''}`);

  if (!qrUrl) {
    return (
      <button disabled style={{
        display: 'inline-block',
        padding: '4px 12px',
        border: '1px solid #1d498e',
        borderRadius: 4,
        backgroundColor: '#e9ecef',
        color: '#1d498e',
        fontSize: 10,
        fontWeight: 'bold',
        cursor: 'not-allowed',
        margin: '0 2px',
        textDecoration: 'none',
        minWidth: 110,
        textAlign: 'center',
      }}>Generating QR...</button>
    );
  }

  const handleDownload = async () => {
    setLoading(true);
    downloadTriggeredRef.current = false;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      // Fetch the full report with all details
      const response = await axios.get(`${apiUrl}/medical-reports/${reportId}`, { headers });
      const fullReportData = response.data;
      console.log('Full report data received:', fullReportData);
      console.log('Test groups in report:', fullReportData.test_groups);
      console.log('Tests in report:', fullReportData.tests);
      console.log('Cultures in report:', fullReportData.cultures);
      
      // Transform the full report data for PDF
      const transformedReport = transformReportForPDF(fullReportData, fullReportData.patient);
      console.log('Transformed report data:', transformedReport);
      console.log('Transformed test groups:', transformedReport.test_groups);
      // Create a temporary div to render the PDF component
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      // Create a temporary React component that will trigger the download
      const TempDownloadComponent = () => (
        <PDFDownloadLink
          document={<ProfessionalPDFDocument patient={transformedReport.patient} report={transformedReport} qrUrl={qrUrl} />}
          fileName={`Medical_Report_${transformedReport.patient.name || 'Report'}.pdf`}
        >
          {({ loading: pdfLoading, error, url }) => {
            if (error) {
              toast.error("Failed to generate PDF");
              return null;
            }
            if (url && !pdfLoading && !downloadTriggeredRef.current) {
              downloadTriggeredRef.current = true;
              // Trigger download
              const link = document.createElement('a');
              link.href = url;
              link.download = `Medical_Report_${transformedReport.patient.name || 'Report'}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              // Clean up temporary div
              setTimeout(() => {
                if (document.body.contains(tempDiv)) {
                  document.body.removeChild(tempDiv);
                }
              }, 1000);
            }
            return null;
          }}
        </PDFDownloadLink>
      );
      // Render the temporary component using React 18 createRoot
      const ReactDOMClient = await import('react-dom/client');
      const root = ReactDOMClient.createRoot(tempDiv);
      root.render(<TempDownloadComponent />);
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
        display: 'inline-block',
        padding: '4px 12px',
        border: '1px solid #1d498e',
        borderRadius: 4,
        backgroundColor: loading ? '#e9ecef' : '#ececec',
        color: loading ? '#888' : '#1d498e',
        fontSize: 10,
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        margin: '0 2px',
        textDecoration: 'none',
        minWidth: 110,
        textAlign: 'center',
      }}
    >
      {loading ? 'Generating...' : 'Download PDF'}
    </button>
  );
};

export default PrintPDF;
export { DirectPDFDownload };
