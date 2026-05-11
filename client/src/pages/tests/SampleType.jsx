import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";

const Samples = () => {
  const { toast, confirm } = useToast();
  const [samples, setSamples] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic for reuse
  const fetchSamples = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const response = await axios.get(`${apiUrl}/samples`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setSamples(response.data);

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
    } catch (error) {
      console.error("Error fetching samples:", error);
      setError("Failed to fetch samples. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [apiUrl]);

  const filteredSamples = samples.filter((sample) => {
    const searchMatches = searchQuery
      ? sample.type?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedSamples = [...filteredSamples].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const valueA = a[sortConfig.field] ?? "";
    const valueB = b[sortConfig.field] ?? "";

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortConfig.direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    } else if (typeof valueA === "boolean" && typeof valueB === "boolean") {
      return sortConfig.direction === "asc"
        ? valueA === valueB
          ? 0
          : valueA
          ? -1
          : 1
        : valueA === valueB
        ? 0
        : valueA
        ? 1
        : -1;
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedSamples.length / itemsPerPage);
  const currentSamples = sortedSamples.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatCellData = (data, header) => {
    if (Array.isArray(data)) {
      return (
        <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
          {data.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    if (header.toLowerCase().includes("date") && data) {
      return formatDate(data);
    }
    if (typeof data === "boolean") {
      return data ? "Yes" : "No";
    }
    return data ?? "N/A";
  };

  const handleAdd = () => {
    setEditingSample(null);
    setFormData({ name: "" });
    setShowModal(true);
  };

  const handleEdit = (sample) => {
    setEditingSample(sample);
    setFormData({ name: sample.type || "" });
    setShowModal(true);
  };

  const handleDelete = (sample) => {
    confirm.delete(sample.type, async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`${apiUrl}/samples/${sample.id}`, { headers });
        toast.success("Sample type deleted successfully!");
        fetchSamples();
      } catch (error) {
        console.error("Delete error:", error);
        toast.error(error.response?.data?.error || "Failed to delete sample type");
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingSample) {
        // Update
        await axios.put(`${apiUrl}/samples/${editingSample.id}`, formData, { headers });
      } else {
        // Create
        await axios.post(`${apiUrl}/samples`, formData, { headers });
      }
      setShowModal(false);
      setEditingSample(null);
      setFormData({ name: "" });
      setError(null); // Clear any previous errors
      setSuccessMessage(editingSample ? "Sample type updated successfully!" : "Sample type added successfully!");
      // Refresh using extracted function
      await fetchSamples();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to save sample type";
      setError(errorMessage);
    }
  };



  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredSamples.map(sample => ({
        'Type': sample.type
      }));

      const result = await exportToExcel(exportData, 'sample_types', 'Sample Types');
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export sample types');
    }
  };

  // XLSX Import Handler
  const handleImportXLSX = async () => {
    if (!importFile) {
      setError("Please select a file to import");
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    
    setImportLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${apiUrl}/samples/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setSuccessMessage(`Successfully imported ${response.data.imported} sample types${response.data.errors.length > 0 ? ` with ${response.data.errors.length} errors` : ''}`);
      
      if (response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      
      await fetchSamples();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import sample types');
    } finally {
      setImportLoading(false);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Sample Type"><Pencil size={16} /></Button>
      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Sample Type"><Trash2 size={16} /></Button>
    </div>
  );

  return (
    <Container fluid className="samples-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Sample Types</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Sample Type</Button>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading sample types..." />
      ) : (
        <>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
              {successMessage}
            </Alert>
          )}
          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={tableHeaders}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentSamples}
            columns={tableHeaders}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
          />
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={handlePageChange}
          />
        </>
      )}
      
      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>{editingSample ? "Edit Sample Type" : "Add New Sample Type"}</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Type *</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingSample ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Import Sample Types</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <h6>Excel File Format Requirements:</h6>
            <p className="mb-2">Your Excel file should have the following columns:</p>
            <ul className="mb-2">
              <li><strong>Type</strong> (required) - The sample type name</li>
            </ul>
            <p className="mb-0"><strong>Note:</strong> The first row should contain the column headers. Duplicate types will be skipped.</p>
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>Select Excel/CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files[0])}
            />
            <Form.Text className="text-muted">
              Supported formats: .xlsx, .xls, .csv (max 5MB)
            </Form.Text>
          </Form.Group>
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowImportModal(false);
            setImportFile(null);
            setError(null);
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleImportXLSX}
            disabled={!importFile || importLoading}
          >
            {importLoading ? "Importing..." : "Import"}
          </Button>
        </Modal.Footer>
      </Modal>
      

    </Container>
  );
};

export default Samples;
