import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../components/Toolbar"; // Updated Toolbar import
import TablePagination from "../components/TablePagination";
import DynamicTable from "../components/DynamicTable";
import { Pencil, Trash2, Plus } from "lucide-react";

const CultureOptions = () => {
  const [cultureOptions, setCultureOptions] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: "" });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${apiUrl}/culture-options`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(response.data)) {
          setCultureOptions(response.data);

          const headers = new Set();
          response.data.forEach((item) => {
            Object.keys(item).forEach((key) => headers.add(key));
          });

          setTableHeaders([...headers]);
        } else {
          console.error("Expected an array but got:", response.data);
          setError("Unexpected data format received from the server.");
        }
      } catch (error) {
        console.error("Error fetching culture options:", error);
        setError("Failed to fetch culture options. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const filteredCultureOptions = cultureOptions.filter((cultureOption) => {
    const searchMatches = searchQuery
      ? cultureOption.option?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedCultureOptions = [...filteredCultureOptions].sort((a, b) => {
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

  const pageCount = Math.ceil(sortedCultureOptions.length / itemsPerPage);
  const currentCultureOptions = sortedCultureOptions.slice(
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
    setEditingOption(null);
    setFormData({ name: "" });
    setShowModal(true);
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setFormData({ name: option.option || "" });
    setShowModal(true);
  };

  const handleDelete = (option) => {
    setOptionToDelete(option);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingOption) {
        // Update
        await axios.put(`${apiUrl}/culture-options/${editingOption.id}`, formData, { headers });
      } else {
        // Create
        await axios.post(`${apiUrl}/culture-options`, formData, { headers });
      }
      
      setShowModal(false);
      setEditingOption(null);
      setFormData({ name: "" });
      setError(null);
      setSuccessMessage(editingOption ? "Culture option updated successfully!" : "Culture option added successfully!");
      
      // Refresh
      const response = await axios.get(`${apiUrl}/culture-options`, { headers });
      setCultureOptions(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to save culture option";
      setError(errorMessage);
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/culture-options/${optionToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setOptionToDelete(null);
      setError(null);
      setSuccessMessage("Culture option deleted successfully!");
      
      // Refresh
      const response = await axios.get(`${apiUrl}/culture-options`, { headers });
      setCultureOptions(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to delete culture option";
      setError(errorMessage);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Culture Option"><Pencil size={16} /></Button>
      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Culture Option"><Trash2 size={16} /></Button>
    </div>
  );

  return (
    <Container fluid className="culture-options-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Culture Options</h2>
        <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Culture Option</Button>
      </div>
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
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
            data={currentCultureOptions}
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
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingOption ? "Edit Culture Option" : "Add New Culture Option"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ name: e.target.value })} 
                required 
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingOption ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete the culture option "{optionToDelete?.option}"? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CultureOptions;
