import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import CairoFont from "../../assets/fonts/Cairo.ttf";

// Register Cairo font for Arabic support
Font.register({
  family: "Cairo",
  fonts: [
    {
      src: CairoFont,
      fontWeight: "normal",
      fontStyle: "normal",
    },
  ],
});

// Register fonts if needed (Cairo is already registered in PrintPDF.jsx, 
// but we might need it here if used standalone)

const styles = StyleSheet.create({
  page: {
    width: "50mm",
    height: "25mm",
    padding: "1.5mm",
    fontFamily: "Cairo",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fff",
  },
  barcodeContainer: {
    textAlign: "center",
    marginBottom: 0.5,
    alignItems: "center",
    width: "100%",
  },
  barcode: {
    width: "45mm",
    height: "8mm",
  },
  sampleIdText: {
    fontSize: 7,
    textAlign: "center",
    marginBottom: 1,
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  infoContainer: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0.5,
  },
  label: {
    fontSize: 6.5,
    fontWeight: "bold",
  },
  value: {
    fontSize: 6.5,
    maxWidth: "30mm",
  },
});

/**
 * SampleLabelDocument
 * A react-pdf component for a single sample label (50x25mm).
 */
const SampleLabelDocument = ({ sampleData, barcodeUrl }) => {
  if (!sampleData) return null;

  const formattedDate = sampleData.created_at
    ? new Date(sampleData.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <Document>
      <Page size={[141.73, 70.87]} style={styles.page}>
        <View style={styles.barcodeContainer}>
          {barcodeUrl && <Image src={barcodeUrl} style={styles.barcode} />}
        </View>
        <Text style={styles.sampleIdText}>{sampleData.sample_id}</Text>
        
        <View style={styles.infoContainer}>
          <View style={styles.row}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value} numberOfLines={1}>
              {sampleData.patient_name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Test:</Text>
            <Text style={styles.value} numberOfLines={1}>
              {sampleData.test_name}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.label}>Report:</Text>
              <Text style={[styles.value, { marginLeft: 2 }]}>#{sampleData.report_id}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.label}>Date:</Text>
              <Text style={[styles.value, { marginLeft: 2 }]}>{formattedDate}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default SampleLabelDocument;
