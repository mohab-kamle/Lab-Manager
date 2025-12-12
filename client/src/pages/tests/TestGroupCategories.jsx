import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert, Toast, ToastContainer } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const TestGroupCategories = () => {
  const [categories, setCategories] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [categoryToRestore, setCategoryToRestore] = useState(null);
  const [formData, setFormData] = useState({ name: "", test_group_id: "" });
  const [testGroups, setTestGroups] = useState([]);
  const [testGroupSearch, setTestGroupSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);
    Promise.all([
      axios.get(`${apiUrl}/tgc-categories?includeDeleted=${includeDeleted}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${apiUrl}/test-groups?includeDeleted=false`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([catRes, tgRes]) => {
        console.log('Categories response:', catRes.data);

        if (Array.isArray(catRes.data)) {
          setCategories(catRes.data);
          const headers = new Set();
          catRes.data.forEach((item) => {
            Object.keys(item).forEach((key) => {
              if (key !== 'test_group') headers.add(key);
            });
          });
          headers.add('test_group_name');
          setTableHeaders([...headers]);
        } else {
          setCategories([]); // Set empty array instead of error
        }
        setTestGroups(tgRes.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setCategories([]); // Set empty array instead of error
        setTestGroups([]);
        setLoading(false);
      });
  }, [apiUrl, includeDeleted]);

  const filteredCategories = categories.filter((category) => {
    const searchMatches = searchQuery
      ? category.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return searchMatches;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
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

  const pageCount = Math.ceil(sortedCategories.length / itemsPerPage);
  const currentCategories = sortedCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatCellData = (data, header, row) => {
    if (header === 'name') {
      const isDeleted = row.deleted_at;
      return (
        <div className="d-flex align-items-center">
          <span className={isDeleted ? "text-muted" : ""}>
            {data}
            {isDeleted && <span className="badge bg-secondary ms-2">Deleted</span>}
          </span>
        </div>
      );
    }
    if (header === 'deleted_at') {
      if (!data) return "Active";
      return (
        <div className="d-flex align-items-center">
          <span className="text-muted">
            {new Date(data).toLocaleDateString()}
            <span className="badge bg-secondary ms-2">Deleted</span>
          </span>
        </div>
      );
    }
    if (header === 'test_group_name') {
      console.log('Row in formatCellData:', row);
      return row && row.test_group && row.test_group.name ? row.test_group.name : 'N/A';
    }
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
    setFormData({ name: "", test_group_id: testGroups[0]?.id || "" });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name || "", test_group_id: category.test_group_id || "" });
    setShowModal(true);
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleRestore = (category) => {
    setCategoryToRestore(category);
    setShowRestoreModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingCategory) {
        await axios.put(`${apiUrl}/tgc-categories/${editingCategory.id}`, formData, { headers });
      } else {
        await axios.post(`${apiUrl}/tgc-categories`, formData, { headers });
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: "", test_group_id: testGroups[0]?.id || "" });
      // Refresh
      const response = await axios.get(`${apiUrl}/tgc-categories?includeDeleted=${includeDeleted}`, { headers });
      setCategories(response.data);
      setShowSuccessToast(true);
    } catch (error) {
      setError("Failed to save test group category");
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/tgc-categories/${categoryToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      // Refresh
      const response = await axios.get(`${apiUrl}/tgc-categories?includeDeleted=${includeDeleted}`, { headers });
      setCategories(response.data);
      setShowSuccessToast(true);
    } catch (error) {
      setError("Failed to delete test group category");
    }
  };

  const confirmRestore = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${apiUrl}/tgc-categories/${categoryToRestore.id}/restore`, {}, { headers });
      setShowRestoreModal(false);
      setCategoryToRestore(null);
      // Refresh
      const response = await axios.get(`${apiUrl}/tgc-categories?includeDeleted=${includeDeleted}`, { headers });
      setCategories(response.data);
      setShowSuccessToast(true);
    } catch (error) {
      setError("Failed to restore test group category");
    }
  };

  const ActionComponent = ({ rowData }) => {
    const isDeleted = rowData.deleted_at;
    
    return (
      <div className="d-flex gap-2">
        {!isDeleted && (
          <>
            <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Category"><Pencil size={16} /></Button>
            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Category"><Trash2 size={16} /></Button>
          </>
        )}
        {isDeleted && (
          <Button variant="outline-success" size="sm" onClick={() => handleRestore(rowData)} title="Restore Category">
            Restore
          </Button>
        )}
      </div>
    );
  };

  return (
    <Container fluid className="categories-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Test Group Categories</h2>
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="includeDeleted"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="includeDeleted">
                Show Deleted
              </label>
            </div>
            <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2 " />Add Category</Button>
          </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading test group categories..." />
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
            formatCellData={(data, header, row) => formatCellData(data, header, row)}
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
          <Modal.Title>{editingCategory ? "Edit Category" : "Add New Category"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Test Group</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search test groups..."
                value={testGroupSearch}
                onChange={e => setTestGroupSearch(e.target.value)}
                className="mb-2"
              />
              <Form.Select
                value={formData.test_group_id}
                onChange={e => setFormData({ ...formData, test_group_id: e.target.value })}
                required
              >
                <option value="">Select Test Group</option>
                {testGroups
                  .filter(tg => tg.name.toLowerCase().includes(testGroupSearch.toLowerCase()))
                  .map(tg => (
                    <option key={tg.id} value={tg.id}>{tg.name}</option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingCategory ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Soft Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to soft delete the category "{categoryToDelete?.name}"? 
          <br /><br />
          This will hide it from normal operations but preserve all data. The category can be restored later if needed.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="warning" onClick={confirmDelete}>Soft Delete</Button>
        </Modal.Footer>
      </Modal>
      {/* Restore Confirmation Modal */}
      <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Restore</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to restore the category "{categoryToRestore?.name}"? This will make it available for use again.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>Cancel</Button>
          <Button variant="success" onClick={confirmRestore}>Restore</Button>
        </Modal.Footer>
      </Modal>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast bg="success" show={showSuccessToast} onClose={() => setShowSuccessToast(false)} delay={2500} autohide>
          <Toast.Body className="text-white">Test group category operation completed successfully!</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default TestGroupCategories;