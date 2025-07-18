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
  page: {
    fontFamily: 'Cairo', // Use Cairo for Arabic support
    fontSize: 10,
    padding: 0,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 20,
    paddingBottom: 5,
    backgroundColor: '#fff',
    borderBottom: '1pt solid #e6e6e6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 70,
    marginRight: 10,
  },
  labName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3e8b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
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
    marginBottom: 10,
    
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 600,
    width: '90%',
    marginHorizontal: 'auto',
    paddingBottom: 15,
    marginTop: 0,
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
    fontSize: 8,
    backgroundColor: '#dedfeb',
  },
  infoText: {
    color: '#333',
    fontSize: 10,
    lineHeight: 1.3,
  },
  statusBar: {
    flexDirection: 'row',
    marginBottom: 18,
    marginTop: 2,
    paddingHorizontal: 20,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 2,
    borderRadius: 4,
    padding: 6,
  },
  statusLabel: {
    fontSize: 8,
    borderRadius: 4,
    color: '#5d6481',
    fontWeight: 'bold',
    marginBottom: 2,
    backgroundColor: '#dedfeb',
    padding: 4,
  },
  statusValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3e8b',
    marginTop: 18,
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  testUnit: {
    fontSize: 10,
    color: '#333',
    marginLeft: 4,
  },
  testRefRange: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  testStatusBadge: {
    marginLeft: 10,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 9,
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
    bottom: 20,
    left: 20,
    right: 20,
    borderTop: '1pt solid #e6e6e6',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 8,
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
    fontSize: 9,
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
    fontSize: 11,
    marginRight: 4,
  },
  signLabel: {
    fontWeight: 'bold',
    color: '#2d3e8b',
    fontSize: 11,
    marginRight: 4,
  },
  signText: {
    fontSize: 11,
    color: '#333',
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
  fontSize: 14,
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
const PDFHeader = ({ patient, report, barcodeUrl }) => (
  <View style={styles.header} fixed>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image src={LabIcon} style={styles.logo} />
        <View>
          <Text style={styles.labName}>Doctors Lab</Text>
          <Text style={styles.subtitle}>Medical Laboratories</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
        {barcodeUrl && <Image src={barcodeUrl} style={{ width: 120, height: 40 }} />}
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
const PDFFooter = ({ qrUrl, signatory }) => (
  <View style={styles.footer} fixed>
    <View style={styles.footerLeft}>
      <Text>920002723 | www.doctorslab.com | info@doctorslab.com | License No: 2600032113</Text>
      <Text>Validated By: {signatory || 'Dr. Abanoub'} | Approved By: {signatory || 'Dr. Abanoub'}</Text>
    </View>
    <View style={styles.footerRight}>
      {qrUrl && <Image src={qrUrl} style={{ width: 50, height: 50}} />}
    </View>
  </View>
);

// InfoGrid component for every page
const PDFInfoGrid = ({ patient, report }) => (
  <View style={styles.infoGridWrapper}>
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
          Doctor: {report?.signatory_name || 'N/A'}{'\n'}
          MRN: {patient?.patientcode || 'N/A'}{'\n'}
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
const ProfessionalPDFDocument = ({ patient, report, qrUrl }) => {
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
        <PDFHeader patient={patient} report={report} barcodeUrl={barcodeUrl} />
        <PDFInfoGrid patient={patient} report={report} />
        {/* Status bar only on first page */}
        <StatusBarFirstPage report={report} />
        <PDFFooter qrUrl={qrUrl} signatory={signatory} fixed wrap={false} />
        
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
                  wrap={false}
                  minPresenceAhead={70}
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
                    wrap={false}
                    minPresenceAhead={cultureAntibiotics.length > 0 ? 150 : 100}
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
                    wrap={false}
                    minPresenceAhead={120}
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
                </View>
              );
            })}
          </>
        ) : null}

        {/* Test Groups Section */}
        {report?.test_groups && report.test_groups.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Test Groups</Text>
            {report.test_groups.map((group, groupIndex) => {
              const normalRange = group.normal_from && group.normal_to ? `${group.normal_from} - ${group.normal_to}` : group.normal_range;
              const resultColor = getResultColor(group.result, normalRange, group.status);
              return (
                <View
                  style={groupCardStyle(resultColor)}
                  key={groupIndex}
                  wrap={false}
                  minPresenceAhead={100}
                >
                  <Text style={groupTitleStyle}>{group.name || 'Unknown Group'}</Text>
                  {/* Direct Components */}
                  {group.direct_components && group.direct_components.length > 0 &&
                    group.direct_components.map((component, compIndex) => {
                      const componentNormalRange = component.normal_from && component.normal_to ? `${component.normal_from} - ${component.normal_to}` : component.normal_range;
                      const componentResultColor = getResultColor(component.result, componentNormalRange, component.status);
                      return (
                        <View style={componentCardStyle(componentResultColor)} key={`direct-${compIndex}`}>
                          <Text style={componentNameStyle}>{component.name || 'Unknown Component'}</Text>
                          {/* Show result type and reference range if present */}
                          {component.result_type === 'boolean' ? (
                            <Text style={styles.testRefRange}>Result Type: Boolean</Text>
                          ) : (
                            <Text style={styles.testRefRange}>
                              {component.normal_from && component.normal_to ? `Ref. Range: ${component.normal_from} - ${component.normal_to}` : component.normal_range ? `Ref. Range: ${component.normal_range}` : ''}
                              {component.unit ? ` ${component.unit}` : ''}
                              {component.reference_range ? ` | Ref. Range: ${component.reference_range}` : ''}
                            </Text>
                          )}
                          {group.fields && group.fields.map((field, fieldIndex) => {
                            let fieldValue = 'N/A';
                            if (group.values && group.values[component.id]) {
                              const componentValues = group.values[component.id];
                              if (typeof componentValues === 'object' && componentValues[field.id]) {
                                fieldValue = String(componentValues[field.id]);
                              }
                            }
                            // Color for result field
                            const isResult = field.name.toLowerCase().includes('result');
                            const fieldNormalRange = field.normal_from && field.normal_to ? `${field.normal_from} - ${field.normal_to}` : field.normal_range;
                            const resultColor = isResult ? getResultColor(fieldValue, fieldNormalRange, field.status) : '#e9ecef';
                            // Show boolean/range logic for each field if field.result_type exists, else fallback to component.result_type
                            const resultType = field.result_type || component.result_type || 'range';
                            return (
                              <View style={fieldRowStyle} key={fieldIndex}>
                                <Text style={fieldLabelStyle}>{field.name}:</Text>
                                <View style={[
                                  fieldValueStyle,
                                  isResult && {
                                    backgroundColor: resultColor,
                                    borderRadius: 8,
                                    padding: 4,
                                    fontWeight: 'bold'
                                  }
                                ]}>
                                  <Text style={{ color: (resultColor === '#2ecc40' || resultColor === '#ff4136') ? '#fff' : '#333' }}>
                                    {resultType === 'boolean'
                                      ? (fieldValue === 'positive' ? 'Positive' : fieldValue === 'negative' ? 'Negative' : fieldValue)
                                      : fieldValue}
                                  </Text>
                                </View>
                                {/* For range type, show reference range if present */}
                                {resultType === 'range' && (field.reference_range || component.reference_range) && (
                                  <Text style={{ fontSize: 8, color: '#666', marginLeft: 6 }}>
                                    Ref. Range: {field.reference_range || component.reference_range}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  {/* Categorized Components */}
                  {group.categories && group.categories.length > 0 &&
                    group.categories.map((category, catIndex) => {
                      const categoryNormalRange = category.normal_from && category.normal_to ? `${category.normal_from} - ${category.normal_to}` : category.normal_range;
                      const categoryResultColor = getResultColor(category.result, categoryNormalRange, category.status);
                      return (
                        <View style={componentCardStyle(categoryResultColor)} key={`category-${catIndex}`}>
                          <Text style={componentNameStyle}>{category.name || 'Unknown Category'}</Text>
                          {category.components && category.components.map((component, compIndex) => {
                            const componentNormalRange = component.normal_from && component.normal_to ? `${component.normal_from} - ${component.normal_to}` : component.normal_range;
                            const componentResultColor = getResultColor(component.result, componentNormalRange, component.status);
                            return (
                              <View style={componentCardStyle(componentResultColor)} key={`cat-comp-${compIndex}`}>
                                <Text style={componentNameStyle}>• {component.name || 'Unknown Component'}</Text>
                                {group.fields && group.fields.map((field, fieldIndex) => {
                                  let fieldValue = 'N/A';
                                  if (group.values && group.values[component.id]) {
                                    const componentValues = group.values[component.id];
                                    if (typeof componentValues === 'object' && componentValues[field.id]) {
                                      fieldValue = String(componentValues[field.id]);
                                    }
                                  }
                                  const isResult = field.name.toLowerCase().includes('result');
                                  const fieldNormalRange = field.normal_from && field.normal_to ? `${field.normal_from} - ${field.normal_to}` : field.normal_range;
                                  const resultColor = isResult ? getResultColor(fieldValue, fieldNormalRange, field.status) : '#e9ecef';
                                  const resultType = field.result_type || component.result_type || 'range';
                                  return (
                                    <View style={fieldRowStyle} key={fieldIndex}>
                                      <Text style={fieldLabelStyle}>{field.name}:</Text>
                                      <View style={[
                                        fieldValueStyle,
                                        isResult && {
                                          backgroundColor: resultColor,
                                          borderRadius: 8,
                                          padding: 4,
                                          fontWeight: 'bold'
                                        }
                                      ]}>
                                        <Text style={{ color: (resultColor === '#2ecc40' || resultColor === '#ff4136') ? '#fff' : '#333' }}>
                                          {resultType === 'boolean'
                                            ? (fieldValue === 'positive' ? 'Positive' : fieldValue === 'negative' ? 'Negative' : fieldValue)
                                            : fieldValue}
                                        </Text>
                                      </View>
                                      {resultType === 'range' && (field.reference_range || component.reference_range) && (
                                        <Text style={{ fontSize: 8, color: '#666', marginLeft: 6 }}>
                                          Ref. Range: {field.reference_range || component.reference_range}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  {/* Legacy fallback - if no direct or categorized components, show fields directly */}
                  {(!group.direct_components || group.direct_components.length === 0) &&
                   (!group.categories || group.categories.length === 0) &&
                    group.fields && group.fields.map((field, fieldIndex) => (
                      <View style={fieldRowStyle} key={fieldIndex}>
                        <Text style={fieldLabelStyle}>{field.name}:</Text>
                        <Text style={fieldValueStyle}>
                          {group.values && group.values[field.id]
                            ? (typeof group.values[field.id] === 'object'
                                ? JSON.stringify(group.values[field.id])
                                : String(group.values[field.id]))
                            : 'N/A'}
                        </Text>
                      </View>
                    ))}
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
      </Page>
    </Document>
  );
};

// Main PrintPDF Component
const PrintPDF = ({ patient, report }) => {
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

  // === LIVE PDF PREVIEW (DEV ONLY, REMOVE FOR PRODUCTION) ===
  // To remove the live preview, delete or comment out the following <div> block
  return (
    <div>
      <div style={{ height: '90vh', border: '1px solid #ccc', marginBottom: 16 }}>
        <PDFViewer width="100%" height="100%">
          <ProfessionalPDFDocument patient={patient} report={report} qrUrl={qrUrl} />
        </PDFViewer>
      </div>
      {/* Download button restored below */}
      <PDFDownloadLink
        document={<ProfessionalPDFDocument patient={patient} report={report} qrUrl={qrUrl} />}
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
