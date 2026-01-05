import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const Diseases = () => {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [diseaseToDelete, setDiseaseToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    details: ""
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const columns = ["id", "name", "details"];

  // Extracted fetch logic for reuse
  const fetchDiseases = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/diseases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiseases(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching diseases:", error);
      setError("Failed to fetch diseases. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiseases();
  }, [apiUrl]);

  const handleAdd = () => {
    setEditingDisease(null);
    setFormData({ name: "", details: "" });
    setShowModal(true);
  };

  const handleEdit = (disease) => {
    setEditingDisease(disease);
    setFormData({
      name: disease.name || "",
      details: disease.details || ""
    });
    setShowModal(true);
  };

  const handleDelete = (disease) => {
    setDiseaseToDelete(disease);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingDisease) {
        // Update existing disease
        await axios.put(
          `${apiUrl}/diseases/${editingDisease.id}`,
          formData,
          { headers }
        );
      } else {
        // Create new disease
        await axios.post(`${apiUrl}/diseases`, formData, { headers });
      }

      setShowModal(false);
      setEditingDisease(null);
      setFormData({ name: "", details: "" });
      fetchDiseases(); // Refresh the list
    } catch (error) {
      console.error("Error saving disease:", error);
      setError("Failed to save disease. Please try again.");
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${apiUrl}/diseases/${diseaseToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowDeleteModal(false);
      setDiseaseToDelete(null);
      fetchDiseases(); // Refresh the list
    } catch (error) {
      console.error("Error deleting disease:", error);
      setError("Failed to delete disease. Please try again.");
    }
  };

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredDiseases.map(disease => ({
        'Name': disease.name,
        'Details': disease.details
      }));

      const result = await exportToExcel(exportData, 'diseases', 'Diseases');
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export diseases');
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
      const response = await axios.post(`${apiUrl}/diseases/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setSuccessMessage(`Successfully imported ${response.data.imported} diseases${response.data.errors.length > 0 ? ` with ${response.data.errors.length} errors` : ''}`);
      
      if (response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      
      await fetchDiseases();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import diseases');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredDiseases = diseases.filter((disease) => {
    const searchMatches = searchQuery
      ? disease.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        disease.details?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedDiseases = [...filteredDiseases].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const valueA = a[sortConfig.field] ?? "";
    const valueB = b[sortConfig.field] ?? "";

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortConfig.direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedDiseases.length / itemsPerPage);
  const currentDiseases = sortedDiseases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatCellData = (data, header) => {
    if (data === null || data === undefined || data === "") {
      return "-";
    }
    return String(data);
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => handleEdit(rowData)}
        title="Edit Disease"
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => handleDelete(rowData)}
        title="Delete Disease"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <Container fluid className="diseases-container">
      {loading ? (
        <LoadingSpinner message="Loading diseases..." />
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
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h2>Diseases</h2>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline-success" onClick={handleExportXLSX}>
                <Download size={16} className="me-2" />
                Export XLSX
              </Button>
              <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
                <Upload size={16} className="me-2" />
                Import Excel
              </Button>
              <Button variant="primary" onClick={handleAdd}>
                <Plus size={16} className="me-2" />
                Add Disease
              </Button>
            </div>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={columns}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentDiseases}
            columns={columns}
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
          <Modal.Title>
            {editingDisease ? "Edit Disease" : "Add New Disease"}
          </Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter disease name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Details</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter disease details"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingDisease ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Import Diseases</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <h6>Excel File Format Requirements:</h6>
            <p className="mb-2">Your Excel file should have the following columns:</p>
            <ul className="mb-2">
              <li><strong>Name</strong> (required) - The disease name</li>
              <li><strong>Details</strong> (optional) - Additional details about the disease</li>
            </ul>
            <p className="mb-0"><strong>Note:</strong> The first row should contain the column headers. Duplicate names will be skipped.</p>
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header>
          <Modal.Title>Confirm Delete</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the disease "{diseaseToDelete?.name}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Diseases;