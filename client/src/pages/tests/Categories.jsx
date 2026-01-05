import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic for reuse
  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const response = await axios.get(`${apiUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setCategories(response.data);

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
      console.error("Error fetching categories:", error);
      setError("Failed to fetch categories. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [apiUrl]);

  const filteredCategories = categories.filter((category) => {
    const searchMatches = searchQuery
      ? category.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (!sortConfig.field) return 0; // No sorting if no field is selected

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
    return 0; // Default no sorting for unhandled types
  });

  const pageCount = Math.ceil(sortedCategories.length / itemsPerPage);
  const currentCategories = sortedCategories.slice(
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
    return data ?? "N/A";
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "" });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name || "" });
    setShowModal(true);
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingCategory) {
        // Update
        await axios.put(`${apiUrl}/categories/${editingCategory.id}`, formData, { headers });
      } else {
        // Create
        await axios.post(`${apiUrl}/categories`, formData, { headers });
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: "" });
      // Refresh using extracted function
      await fetchCategories();
    } catch (error) {
      setError("Failed to save category");
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/categories/${categoryToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      // Refresh using extracted function
      await fetchCategories();
    } catch (error) {
      setError("Failed to delete category");
    }
  };

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredCategories.map(category => ({
        'Name': category.name,
        'Details': category.details
      }));

      const result = await exportToExcel(exportData, 'categories', 'Categories');
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export categories');
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
      const response = await axios.post(`${apiUrl}/categories/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setSuccessMessage(`Successfully imported ${response.data.imported} categories${response.data.errors.length > 0 ? ` with ${response.data.errors.length} errors` : ''}`);
      
      if (response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      
      await fetchCategories();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import categories');
    } finally {
      setImportLoading(false);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Category"><Pencil size={16} /></Button>
      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Category"><Trash2 size={16} /></Button>
    </div>
  );

  return (
    <Container fluid className="categories-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Categories</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Category</Button>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading categories..." />
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
            sortableFields={tableHeaders}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentCategories}
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
          <Modal.Title>{editingCategory ? "Edit Category" : "Add New Category"}</Modal.Title>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingCategory ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Import Categories</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <h6>Excel File Format Requirements:</h6>
            <p className="mb-2">Your Excel file should have the following columns:</p>
            <ul className="mb-2">
              <li><strong>Name</strong> (required) - The category name</li>
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
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
              {successMessage}
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
        <Modal.Body>Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Categories;
