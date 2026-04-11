import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const Cultures = () => {
  const [cultures, setCultures] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCulture, setEditingCulture] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cultureToDelete, setCultureToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: "", price: "", sample_type_id: "", category_id: "" });
  const [sampleTypes, setSampleTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic for reuse
  const fetchCulturesAndRelated = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError(null);

    try {
      // Fetch cultures
      const culturesResponse = await axios.get(`${apiUrl}/cultures`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(culturesResponse.data)) {
        setCultures(culturesResponse.data);

        const headers = new Set();
        culturesResponse.data.forEach((item) => {
          Object.keys(item).forEach((key) => headers.add(key));
        });

        setTableHeaders([...headers]);
      } else {
        console.error("Expected an array but got:", culturesResponse.data);
        setError("Unexpected data format received from the server.");
      }

      // Fetch sample types
      const sampleTypesResponse = await axios.get(`${apiUrl}/cultures/sample-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSampleTypes(sampleTypesResponse.data);

      // Fetch categories
      const categoriesResponse = await axios.get(`${apiUrl}/cultures/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(categoriesResponse.data);

    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCulturesAndRelated();
  }, [apiUrl]);

  const filteredCultures = cultures.filter((culture) => {
    return searchQuery
      ? culture.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        culture.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        culture.sample_type_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
  });

  const sortedCultures = [...filteredCultures].sort((a, b) => {
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
      return sortConfig.direction === "asc" ? (valueA === valueB ? 0 : valueA ? -1 : 1) : (valueA === valueB ? 0 : valueA ? 1 : -1);
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedCultures.length / itemsPerPage);
  const currentCultures = sortedCultures.slice(
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
      return new Date(data).toLocaleDateString();
    }
    if (typeof data === "boolean") {
      return data ? "Yes" : "No";
    }
    if (header === "price" && data) {
      return `$${parseFloat(data).toFixed(2)}`;
    }
    return data ?? "N/A";
  };

  const handleAdd = () => {
    setEditingCulture(null);
    setFormData({ name: "", price: "", sample_type_id: "", category_id: "" });
    setShowModal(true);
  };

  const handleEdit = (culture) => {
    setEditingCulture(culture);
    setFormData({ 
      name: culture.name || "", 
      price: culture.price || "", 
      sample_type_id: culture.sample_type_id || "",
      category_id: culture.category_id || ""
    });
    setShowModal(true);
  };

  const handleDelete = (culture) => {
    setCultureToDelete(culture);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingCulture) {
        // Update
        await axios.put(`${apiUrl}/cultures/${editingCulture.id}`, formData, { headers });
      } else {
        // Create
        await axios.post(`${apiUrl}/cultures`, formData, { headers });
      }
      
      setShowModal(false);
      setEditingCulture(null);
      setFormData({ name: "", price: "", sample_type_id: "", category_id: "" });
      setError(null);
      setSuccessMessage(editingCulture ? "Culture updated successfully!" : "Culture added successfully!");
      
      // Refresh using extracted function
      await fetchCulturesAndRelated();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to save culture";
      setError(errorMessage);
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/cultures/${cultureToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setCultureToDelete(null);
      setError(null);
      setSuccessMessage("Culture deleted successfully!");
      
      // Refresh using extracted function
      await fetchCulturesAndRelated();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to delete culture";
      setError(errorMessage);
    }
  };

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredCultures.map(culture => ({
        'Name': culture.name,
        'Price': culture.price,
        'Sample Type': culture.sample_type_name,
        'Category': culture.category_name
      }));

      const result = await exportToExcel(exportData, 'cultures', 'Cultures');
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export cultures');
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
      const response = await axios.post(`${apiUrl}/cultures/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setSuccessMessage(`Successfully imported ${response.data.imported} cultures${response.data.errors.length > 0 ? ` with ${response.data.errors.length} errors` : ''}`);
      
      if (response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      
      await fetchCulturesAndRelated();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import cultures');
    } finally {
      setImportLoading(false);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Culture"><Pencil size={16} /></Button>
      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Culture"><Trash2 size={16} /></Button>
    </div>
  );

  return (
    <Container fluid className="cultures-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Cultures</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Culture</Button>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading cultures..." />
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
            data={currentCultures}
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
          <Modal.Title>{editingCulture ? "Edit Culture" : "Add New Culture"}</Modal.Title>
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
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price</Form.Label>
              <Form.Control 
                type="number" 
                step="0.01"
                value={formData.price} 
                onChange={e => setFormData({ ...formData, price: e.target.value })} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sample Type</Form.Label>
              <Form.Select 
                value={formData.sample_type_id} 
                onChange={e => setFormData({ ...formData, sample_type_id: e.target.value })}
              >
                <option value="">Select Sample Type</option>
                {sampleTypes.map(sample => (
                  <option key={sample.id} value={sample.id}>{sample.type}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select 
                value={formData.category_id} 
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingCulture ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Import Cultures</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <h6>Excel File Format Requirements:</h6>
            <p className="mb-2">Your Excel file should have the following columns:</p>
            <ul className="mb-2">
              <li><strong>Name</strong> (required) - The culture name</li>
              <li><strong>Price</strong> (optional) - The culture price</li>
              <li><strong>Sample Type</strong> (optional) - The sample type name (must exist in the system)</li>
              <li><strong>Category</strong> (optional) - The category name (must exist in the system)</li>
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
        <Modal.Body>Are you sure you want to delete the culture "{cultureToDelete?.name}"? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Cultures;