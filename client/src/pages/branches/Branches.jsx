import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import { Pencil, Trash2, Plus, Download, Upload } from "lucide-react";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';

const Branches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLabSelectModal, setShowLabSelectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    landline: "",
    branch_number: "",
    lab_id: "",
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic for reuse
  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const response = await axios.get(`${apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setBranches(response.data);
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
      console.error("Error fetching branches:", error);
      setError("Failed to fetch branches. Please try again later.");
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${apiUrl}/labs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        // Filter labs to only show those owned by the current user
        const userLabs = response.data.filter(lab => lab.owner_id === user.id);
        setLabs(userLabs);
      }
    } catch (error) {
      console.error("Error fetching labs:", error);
      setError("Failed to fetch labs. Please try again later.");
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchLabs();
  }, []);

  const handleAddBranch = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      await axios.post(
        `${apiUrl}/branches`,
        { 
          ...newBranch, 
          lab_id: selectedLab.id,
          manager_id: user.id 
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchBranches();
      setShowAddModal(false);
      setShowLabSelectModal(false);
      setNewBranch({
        name: "",
        address: "",
        landline: "",
        branch_number: "",
        lab_id: "",
      });
      setSelectedLab(null);
    } catch (error) {
      console.error("Error adding branch:", error);
      setError("Failed to add branch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranch = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      await axios.put(
        `${apiUrl}/branches/${editingBranch.id}`,
        editingBranch,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchBranches();
      setShowAddModal(false);
      setEditingBranch(null);
    } catch (error) {
      console.error("Error updating branch:", error);
      setError("Failed to update branch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      await axios.delete(`${apiUrl}/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchBranches();
      setShowDeleteModal(false);
      setBranchToDelete(null);
    } catch (error) {
      console.error("Error deleting branch:", error);
      setError("Failed to delete branch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredBranches.map(branch => ({
        'Name': branch.name,
        'Address': branch.address,
        'Landline': branch.landline,
        'Branch Number': branch.branch_number,
        'Lab': branch.lab_name
      }));

      const result = await exportToExcel(exportData, 'branches', 'Branches');
      if (result.success) {
        setSuccessMessage('Branches exported successfully!');
      } else {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export branches');
    }
  };

  // Excel Import Handler
  const handleImportXLSX = async () => {
    if (!importFile) {
      setError("Please select a file to import");
      return;
    }

    setImportLoading(true);
    setError(null);
    
    try {
      // Validate file first
      const validation = validateExcelFile(importFile);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      // Import from Excel
      const result = await importFromExcel(importFile);
      if (!result.success) {
        setError(result.message);
        return;
      }

      // Process the imported data
      const token = localStorage.getItem('token');
      const response = await axios.post(`${apiUrl}/branches/bulk`, {
        branches: result.data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setSuccessMessage(`Successfully imported ${response.data.imported} branches${response.data.errors?.length > 0 ? ` with ${response.data.errors.length} errors` : ''}`);
      
      if (response.data.errors?.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      
      await fetchBranches();
    } catch (error) {
      console.error('Import error:', error);
      setError(error.response?.data?.error || 'Failed to import branches');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredBranches = branches.filter((branch) => {
    const searchMatches = searchQuery
      ? branch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.address?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedBranches = [...filteredBranches].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const valueA = a[sortConfig.field] ?? "";
    const valueB = b[sortConfig.field] ?? "";

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortConfig.direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedBranches.length / itemsPerPage);
  const currentBranches = sortedBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatCellData = (data, header) => {
    if (header.toLowerCase().includes("date") && data) {
      return new Date(data).toLocaleDateString();
    }
    return data ?? "N/A";
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => {
          setEditingBranch(rowData);
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          setBranchToDelete(rowData);
          setShowDeleteModal(true);
        }}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <Container fluid className="branches-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Branches</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button variant="primary" onClick={() => setShowLabSelectModal(true)}>
            <Plus size={16} className="me-2" />
            Add Branch
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
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
            data={currentBranches}
            columns={tableHeaders}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
          />
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={handlePageChange}
          />

          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
              {successMessage}
            </Alert>
          )}

          {/* Lab Selection Modal */}
          <Modal show={showLabSelectModal} onHide={() => setShowLabSelectModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Select Lab</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {labs.length === 0 ? (
                <Alert variant="warning">No labs found. You need to be an owner of a lab to add branches.</Alert>
              ) : (
                <div className="list-group">
                  {labs.map((lab) => (
                    <button
                      key={lab.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => {
                        setSelectedLab(lab);
                        setShowLabSelectModal(false);
                        setShowAddModal(true);
                      }}
                    >
                      {lab.name}
                    </button>
                  ))}
                </div>
              )}
            </Modal.Body>
          </Modal>

          {/* Add/Edit Branch Modal */}
          <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>{editingBranch ? "Edit Branch" : "Add New Branch"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Branch Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter branch name"
                    value={editingBranch ? editingBranch.name : newBranch.name}
                    onChange={(e) =>
                      editingBranch
                        ? setEditingBranch({ ...editingBranch, name: e.target.value })
                        : setNewBranch({ ...newBranch, name: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter branch address"
                    value={editingBranch ? editingBranch.address : newBranch.address}
                    onChange={(e) =>
                      editingBranch
                        ? setEditingBranch({ ...editingBranch, address: e.target.value })
                        : setNewBranch({ ...newBranch, address: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Landline Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter landline number"
                    value={editingBranch ? editingBranch.landline : newBranch.landline}
                    onChange={(e) =>
                      editingBranch
                        ? setEditingBranch({ ...editingBranch, landline: e.target.value })
                        : setNewBranch({ ...newBranch, landline: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Branch Number (Hotline)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter branch number/hotline"
                    value={editingBranch ? editingBranch.branch_number : newBranch.branch_number}
                    onChange={(e) =>
                      editingBranch
                        ? setEditingBranch({ ...editingBranch, branch_number: e.target.value })
                        : setNewBranch({ ...newBranch, branch_number: e.target.value })
                    }
                  />
                </Form.Group>
                {selectedLab && !editingBranch && (
                  <Alert variant="info">
                    Selected Lab: {selectedLab.name}
                  </Alert>
                )}
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowAddModal(false);
                setEditingBranch(null);
              }}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={editingBranch ? handleEditBranch : handleAddBranch}
              >
                {editingBranch ? "Update Branch" : "Add Branch"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Import Modal */}
          <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Import Branches</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info" className="mb-3">
                <h6>Excel File Format Requirements:</h6>
                <p className="mb-2">Your Excel file should have the following columns:</p>
                <ul className="mb-2">
                  <li><strong>Name</strong> (required) - The branch name</li>
                  <li><strong>Address</strong> (required) - The branch address</li>
                  <li><strong>Landline</strong> (optional) - The landline number</li>
                  <li><strong>Branch Number</strong> (optional) - The branch number/hotline</li>
                  <li><strong>Lab</strong> (required) - The lab name (must exist in the system)</li>
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
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="warning">
                Are you sure you want to delete the branch "{branchToDelete?.name}"?
                This action cannot be undone.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowDeleteModal(false);
                setBranchToDelete(null);
              }}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleDeleteBranch(branchToDelete?.id)}
              >
                Delete Branch
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default Branches;
