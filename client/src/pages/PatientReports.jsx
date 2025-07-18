import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Toolbar from "../components/Toolbar";
import TablePagination from "../components/TablePagination";
import DynamicTable from "../components/DynamicTable";
import PrintPDF from "../components/PrintPDF";
import { formatDate } from "../utils/dateFormatter";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import headerImage from "../assets/headerpdf.png";
import footerImage from "../assets/footerpdf.png";

function generateMedicalReportPDF(patient, report) {
  const doc = new jsPDF("p", "mm", "a4");
  try { doc.addImage(headerImage, "PNG", 10, 10, 190, 30); } catch {}
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Medical Report", 105, 50, null, null, "center");
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 60, 190, 40, "F");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const patientInfo = [
    [`Patient Name:`, patient.name || "Not Provided"],
    [`Age:`, patient.birth_date ? Math.floor((new Date().getFullYear() - new Date(patient.birth_date).getFullYear())) : "Not Provided"],
    [`Gender:`, patient.gender === "m" ? "Male" : patient.gender === "f" ? "Female" : "Not Provided"],
    [`Patient Code:`, patient.patientcode || "Not Provided"],
  ];
  patientInfo.forEach((item, index) => {
    doc.text(`${item[0]} ${item[1]}`, 15, 70 + index * 8);
  });
  let testsWithResults = [];
  if (report.tests && Array.isArray(report.tests)) {
    testsWithResults = report.tests.map(test => {
      if (test.components && Array.isArray(test.components) && test.components.length > 0) {
        const mergedComponents = test.components.map(component => {
          let resultObj = null;
          if (report.test_results && Array.isArray(report.test_results)) {
            resultObj = report.test_results.find(r => r.test_id === test.id && r.component_id === component.id);
          }
          return {
            ...component,
            result: resultObj ? resultObj.result : '',
            status: resultObj ? resultObj.status : ''
          };
        });
        return { ...test, components: mergedComponents };
      } else {
        let resultObj = null;
        if (report.test_results && Array.isArray(report.test_results)) {
          resultObj = report.test_results.find(r => r.test_id === test.id);
        }
        return {
          ...test,
          result: resultObj ? resultObj.result : '',
          status: resultObj ? resultObj.status : ''
        };
      }
    });
  }
  const testResults = testsWithResults.flatMap((test) => {
    if (test.components && test.components.length > 0) {
      return test.components.map(component => [
        `${test.test_name || test.name || "N/A"} - ${component.name}`,
        component.result || "N/A",
        component.unit || "N/A",
        component.status || "N/A",
        component.normal_from && component.normal_to ? `${component.normal_from} - ${component.normal_to}` : "N/A",
      ]);
    } else {
      return [[
        test.test_name || test.name || "N/A",
        test.result || "N/A",
        test.unit || "N/A",
        test.status || "N/A",
        test.normal_from && test.normal_to ? `${test.normal_from} - ${test.normal_to}` : "N/A",
      ]];
    }
  });
  const tableResult = autoTable(doc, {
    startY: 110,
    head: [["Test Name", "Result", "Unit", "Status", "Normal Range"]],
    body: testResults,
    theme: "grid",
    styles: { fontSize: 12, textColor: [0, 0, 0] },
    headStyles: { fillColor: [75, 46, 127], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  let finalY = (tableResult && tableResult.finalY) || (doc.autoTable && doc.autoTable.previous && doc.autoTable.previous.finalY) || 180;
  if (report.cultures && Array.isArray(report.cultures) && report.cultures.length > 0) {
    const cultureResults = report.cultures.map(culture => {
      let resultObj = null;
      if (report.culture_results && Array.isArray(report.culture_results)) {
        resultObj = report.culture_results.find(r => r.culture_id === culture.id);
      }
      return [
        culture.name || "N/A",
        resultObj ? resultObj.result : culture.result || "N/A",
        resultObj ? resultObj.status : culture.status || "N/A"
      ];
    });
    const cultureTable = autoTable(doc, {
      startY: finalY + 10,
      head: [["Culture Name", "Result", "Status"]],
      body: cultureResults,
      theme: "grid",
      styles: { fontSize: 12, textColor: [0, 0, 0] },
      headStyles: { fillColor: [75, 46, 127], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    finalY = (cultureTable && cultureTable.finalY) || (finalY + 40);
  }
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Doctor Comments:", 14, finalY + 10);
  doc.setFont("helvetica", "normal");
  const comment = report.comment || "No additional comments provided.";
  const commentLines = doc.splitTextToSize(comment, 180);
  const commentY = finalY + 20;
  doc.text(commentLines, 14, commentY);
  const lineHeight = 7;
  const doctorY = commentY + commentLines.length * lineHeight + 4;
  doc.setFont("helvetica", "bold");
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 30;
  const footerY = pageHeight - footerHeight;
  let safeDoctorY = doctorY;
  if (doctorY + 8 > footerY) {
    safeDoctorY = footerY - 8;
  }
  doc.text(`Doctor: ${report.doctor_name || "Not Provided"}`, 14, safeDoctorY, { maxWidth: 180 });
  try { doc.addImage(footerImage, "PNG", 10, footerY, 190, footerHeight); } catch {}
  doc.save(`Medical_Report_${patient.name}.pdf`);
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function transformReportForPDF(report, patient) {
  const test_results = (report.medical_report_has_tests || []).map(tr => ({
    test_id: tr.test_id,
    result: tr.result,
    status: tr.status
  }));

  const patientAge = calculateAge(patient.birth_date);
  const patientGender = patient.gender;

  const tests = (report.test_id_test_medical_report_has_tests || []).map(test => {
    // Find the result for this test
    const resultObj = test_results.find(r => r.test_id === test.id);

    let selectedComponent = null;
    if (Array.isArray(test.test_components) && test.test_components.length > 0) {
      selectedComponent = test.test_components.find(tc => {
        const genderMatch = !tc.gender || tc.gender === patientGender;
        const ageMatch = (tc.age_start == null || patientAge >= tc.age_start) &&
                         (tc.age_end == null || patientAge <= tc.age_end);
        return genderMatch && ageMatch;
      });
    }

    return {
      ...test,
      unit: selectedComponent ? selectedComponent.unit : '',
      normal_from: selectedComponent ? selectedComponent.normal_from : '',
      normal_to: selectedComponent ? selectedComponent.normal_to : '',
      result: resultObj ? resultObj.result : '',
      status: resultObj ? resultObj.status : ''
    };
  });

  const cultures = (report.culture_id_culture_medical_report_has_cultures || []).map(culture => ({
    ...culture
  }));
  const culture_results = (report.medical_report_has_cultures || []).map(cr => ({
    culture_id: cr.culture_id,
    result: cr.result,
    status: cr.status
  }));

  return {
    ...report,
    tests,
    test_results,
    cultures,
    culture_results
  };
}

const PatientReports = () => {
  const [reports, setReports] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "", direction: "asc" });
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [typeFilter, setTypeFilter] = useState("all");
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);

    axios
      .get(`${apiUrl}/patient/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (Array.isArray(response.data)) {
          setReports(response.data);

          const headers = new Set();
          response.data.forEach((item) => {
            Object.keys(item).forEach((key) => headers.add(key));
          });
          setTableHeaders([...headers]);
        } else {
          console.error("Expected an array but got:", response.data);
          setError("Unexpected data format received from the server.");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching reports:", error);
        setError("Failed to fetch reports. Please try again later.");
        setLoading(false);
      });
  }, [apiUrl]);

  useEffect(() => {
    if (itemsPerPage == reports.length) {
      {
        setCurrentPage(1);
      }
    }
  }, [itemsPerPage]);

  const filteredReports = reports.filter((report) => {
    const dateMatches =
      (!dateFilter.startDate || new Date(report.date) >= new Date(dateFilter.startDate)) &&
      (!dateFilter.endDate || new Date(report.date) <= new Date(dateFilter.endDate));

    const searchMatches = searchQuery
      ? report.comment?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return dateMatches && searchMatches;
  });

  // Sort the filtered reports if a sort field is specified
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (!sortConfig.field) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (aValue === bValue) return 0;
    
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return aValue > bValue ? direction : -direction;
  });

  const formatCellData = (data, header) => {
    // Handle null/undefined data
    if (data === null || data === undefined) {
      return "-";
    }

    // Format arrays (like tests)
    if (Array.isArray(data)) {
      if (data.length === 0) return "-";
  
      // If the array contains objects (like test results)
      if (typeof data[0] === "object" && data[0] !== null) {
        const keys = Object.keys(data[0]);
        return (
          <table style={{ 
            borderCollapse: "collapse", 
            width: "100%", 
            border: "1px solid #ddd", 
            fontSize: "0.9rem",
            backgroundColor: "#fff" 
          }}>
            <thead>
              <tr>
                {keys.map((key) => (
                  <th key={key} style={{ 
                    border: "1px solid #ddd", 
                    padding: "6px 8px", 
                    background: "#f8f9fa", 
                    textAlign: "left",
                    fontWeight: "600",
                    textTransform: "capitalize"
                  }}>
                    {key.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  {keys.map((key) => (
                    <td key={key} style={{ 
                      border: "1px solid #ddd", 
                      padding: "6px 8px",
                      backgroundColor: rowIndex % 2 === 0 ? "#fff" : "#f8f9fa"
                    }}>
                      {formatValue(item[key], key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
  
      // For arrays of primitive values
      return data.join(", ") || "-";
    }

    return formatValue(data, header.toLowerCase());
  };

  const formatValue = (value, key) => {
    // Special handling for done and pending columns
    if (key === "done" || key === "pending") {
      if (value === null) return "-";
      if (value === 0 || value === "0") return "No";
      if (value === 1 || value === "1") return "Yes";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return "-";
    }

    // Format dates
    if (key.includes("date")) {
      return formatDate(value);
    }

    // Format status with colors
    if (key === "status") {
      return (
        <span style={{
          color: value.toLowerCase() === "high" ? "#dc3545" : 
                 value.toLowerCase() === "low" ? "#ffc107" : "#28a745",
          fontWeight: "500"
        }}>
          {value}
        </span>
      );
    }

    // Format numbers
    if (typeof value === "number") {
      return value.toLocaleString();
    }

    return String(value);
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleDownloadPDF = async (rowData) => {
    setPdfLoadingId(rowData.id);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/patient/reports/${rowData.id}`, { headers });
      const fullReport = response.data;
      const transformed = transformReportForPDF(fullReport, user);
      generateMedicalReportPDF(user, transformed);
    } catch (error) {
      console.error("Failed to fetch full report for PDF", error);
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <Container fluid className="patient-reports-container">
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <>
          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            showDateFilter={true}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            sortableFields={tableHeaders}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            showTypeFilter={false}
          />
          <DynamicTable 
            data={sortedReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)} 
            columns={tableHeaders} 
            formatCellData={formatCellData} 
            ActionComponent={({ rowData }) => (
              <button
                className="btn btn-primary"
                onClick={() => handleDownloadPDF(rowData)}
                disabled={pdfLoadingId === rowData.id}
              >
                {pdfLoadingId === rowData.id ? 'Downloading...' : 'Download PDF'}
              </button>
            )}
          />
          <TablePagination 
            currentPage={currentPage} 
            pageCount={Math.ceil(sortedReports.length / itemsPerPage)} 
            handlePageChange={handlePageChange} 
          />
        </>
      )}
    </Container>
  );
};

export default PatientReports;
