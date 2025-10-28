import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Toast, ToastContainer } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Trash2, Plus } from "lucide-react";
import TestGroupEditor from "./TestGroupEditor";

const TestGroups = () => {
  const [groups, setGroups] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [groupToRestore, setGroupToRestore] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/test-groups?includeDeleted=${includeDeleted}`, { headers });
      
      // Handle empty data gracefully
      if (!response.data || response.data.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      
      const detailedGroups = await Promise.all(
        response.data.map(async (group) => {
          try {
            const detailRes = await axios.get(`${apiUrl}/test-groups/${group.id}`, { headers });
            return detailRes.data;
          } catch (err) {
            console.error(`Failed to fetch details for test group ${group.id}:`, err);
            return null;
          }
        })
      );
      setGroups(detailedGroups.filter(Boolean));
    } catch (error) {
      console.error("Error fetching test groups:", error);
      setGroups([]); // Set empty array instead of error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [apiUrl, includeDeleted]);

  const filteredGroups = groups.filter((group) => {
    const searchMatches = searchQuery
      ? group.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return searchMatches;
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
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

  const pageCount = Math.ceil(sortedGroups.length / itemsPerPage);
  const currentGroups = sortedGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatCellData = (value, header, row) => {
    if (header === "name") {
      const isDeleted = row.deleted_at;
      return (
        <div className="d-flex align-items-center">
          <span className={isDeleted ? "text-muted" : ""}>
            {value}
            {isDeleted && <span className="badge bg-secondary ms-2">Deleted</span>}
          </span>
        </div>
      );
    }
    if (header === "price") {
      return value !== undefined && value !== null ? `EGP ${parseFloat(value).toFixed(2)}` : "-";
    }
    if (header === "fields") {
      if (!row.tg_fields || row.tg_fields.length === 0) return "-";
      return (
        <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
          <thead>
            <tr><th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Field Name</th></tr>
          </thead>
          <tbody>
            {row.tg_fields.map((field, idx) => (
              <tr key={field.id || idx}>
                <td style={{ border: '1px solid #ddd', padding: '4px' }}>{field.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (header === "categorized_components") {
      if (!row.tgc_categories || row.tgc_categories.length === 0) return "-";
      return (
        <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Components</th>
            </tr>
          </thead>
          <tbody>
            {row.tgc_categories.map((cat, idx) => (
              <tr key={cat.id || idx}>
                <td style={{ border: '1px solid #ddd', padding: '4px' }}>{cat.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                  {cat.tg_components && cat.tg_components.length > 0 ? (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {cat.tg_components.map((comp, cidx) => (
                        <li key={comp.id || cidx}>{comp.name}</li>
                      ))}
                    </ul>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (header === "direct_components") {
      if (!row.tg_components || row.tg_components.length === 0) return "-";
      return (
        <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
          <thead>
            <tr><th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Component Name</th></tr>
          </thead>
          <tbody>
            {row.tg_components.map((comp, idx) => (
              <tr key={comp.id || idx}>
                <td style={{ border: '1px solid #ddd', padding: '4px' }}>{comp.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return value;
  };

  const handleDelete = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/test-groups/${groupToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setGroupToDelete(null);
      fetchGroups();
      setShowSuccessToast(true);
    } catch (error) {
      setError("Failed to delete test group");
    }
  };

  const handleRestore = (group) => {
    setGroupToRestore(group);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${apiUrl}/test-groups/${groupToRestore.id}/restore`, {}, { headers });
      setShowRestoreModal(false);
      setGroupToRestore(null);
      fetchGroups();
      setShowSuccessToast(true);
    } catch (error) {
      setError("Failed to restore test group");
    }
  };

  const ActionComponent = ({ rowData }) => {
    const isDeleted = rowData.deleted_at;
    
    return (
      <div className="d-flex gap-2">
        {!isDeleted && (
          <>
            <Button variant="outline-primary" size="sm" onClick={() => { setEditingGroupId(rowData.id); setShowEditor(true); }}>Edit</Button>
            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Test Group"><Trash2 size={16} /></Button>
          </>
        )}
        {isDeleted && (
          <Button variant="outline-success" size="sm" onClick={() => handleRestore(rowData)} title="Restore Test Group">
            Restore
          </Button>
        )}
      </div>
    );
  };

  return (
    <Container fluid className="categories-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Test Groups</h2>
        <div className="d-flex gap-2 align-items-center">
          <div className="form-check">
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
          <Button variant="primary" onClick={() => { setEditingGroupId(null); setShowEditor(true); }}><Plus size={16} className="me-2" />Add Test Group</Button>
        </div>
      </div>
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
            sortableFields={tableHeaders}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentGroups}
            columns={["id", "name", "price", "fields", "categorized_components", "direct_components"]}
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
      {showEditor && (
        <Modal show={showEditor} onHide={() => setShowEditor(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>{editingGroupId ? "Edit Test Group" : "Add Test Group"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <TestGroupEditor
              testGroupId={editingGroupId}
              onSave={() => {
                setShowEditor(false);
                setEditingGroupId(null);
                fetchGroups();
                setShowSuccessToast(true);
              }}
              onCancel={() => {
                setShowEditor(false);
                setEditingGroupId(null);
              }}
            />
          </Modal.Body>
        </Modal>
      )}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast bg="success" show={showSuccessToast} onClose={() => setShowSuccessToast(false)} delay={2500} autohide>
          <Toast.Body className="text-white">Test group operation completed successfully!</Toast.Body>
        </Toast>
      </ToastContainer>
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Soft Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to soft delete the test group "{groupToDelete?.name}"? 
          <br /><br />
          This will hide it from normal operations but preserve all data. The test group can be restored later if needed.
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
        <Modal.Body>Are you sure you want to restore the test group "{groupToRestore?.name}"? This will make it available for use again.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>Cancel</Button>
          <Button variant="success" onClick={confirmRestore}>Restore</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TestGroups;