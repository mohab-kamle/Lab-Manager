import React, { useState, useEffect } from "react";
import { Container, Modal, Button } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
// Use the same PDF components that admin uses for consistent PDF output
import PrintPDF, { DirectPDFDownload } from "../../components/pdf/PrintPDF";
import { formatDate } from "../../utils/dateFormatter";
import { Eye, CircleX } from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/ui/LoadingSpinner";


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
  // PDF Preview state (mirrors admin interface)
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedReportForPDF, setSelectedReportForPDF] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null); // reportId being loaded


  const apiUrl = import.meta.env.VITE_API_URL;
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

  /**
   * Fetch full report data and open the PDF preview modal.
   * Uses the same endpoint as admin (/medical-reports/:id?pdf=true) for identical output.
   */
  const handlePreviewPDF = async (reportId) => {
    // Prevent multiple clicks on the same report
    if (previewLoading === reportId) return;

    setPreviewLoading(reportId);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch the complete report details for PDF preview using the optimized endpoint
      const response = await axios.get(
        `${apiUrl}/medical-reports/${reportId}?pdf=true`,
        { headers }
      );
      const responseData = response.data;

      // Extract data from the API response structure (same as admin)
      const fullReportData = {
        ...responseData,
        testComponentResults: responseData.testComponentResults || {},
        testGroups: responseData.testGroups || [],
        testComponents: responseData.testComponents || {},
      };

      setSelectedReportForPDF(fullReportData);
      setShowPDFPreview(true);
    } catch (error) {
      console.error("Error fetching full report data:", error);
      toast.error("Failed to load report data for preview");
    } finally {
      setPreviewLoading(null);
    }
  };



  return (
    <Container fluid className="patient-reports-container">
      {loading ? (
        <LoadingSpinner message="Loading patient reports..." />
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
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {/* Download PDF - same DirectPDFDownload component as admin */}
                <DirectPDFDownload
                  reportId={rowData.id}
                  patient={rowData.patient || user}
                  apiUrl={apiUrl}
                />
                {/* Preview PDF - same approach as admin */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handlePreviewPDF(rowData.id)}
                  title="Preview PDF"
                  disabled={previewLoading === rowData.id}
                  style={{ minWidth: 36 }}
                >
                  {previewLoading === rowData.id ? (
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ width: "12px", height: "12px" }}
                    />
                  ) : (
                    <Eye size={16} />
                  )}
                </Button>
              </div>
            )}
          />
          <TablePagination 
            currentPage={currentPage} 
            pageCount={Math.ceil(sortedReports.length / itemsPerPage)} 
            handlePageChange={handlePageChange} 
          />

          {/* PDF Preview Modal - matches admin interface */}
          <Modal
            show={showPDFPreview}
            onHide={() => {
              setShowPDFPreview(false);
              setSelectedReportForPDF(null);
            }}
            size="xl"
          >
            <Modal.Header>
              <Modal.Title>PDF Preview</Modal.Title>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowPDFPreview(false);
                  setSelectedReportForPDF(null);
                }}
              >
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {selectedReportForPDF && selectedReportForPDF.patient && (
                <PrintPDF
                  patient={selectedReportForPDF.patient}
                  report={selectedReportForPDF}
                  lab={selectedReportForPDF.lab}
                  comments={{}}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPDFPreview(false);
                  setSelectedReportForPDF(null);
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default PatientReports;
