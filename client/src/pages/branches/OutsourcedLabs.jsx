import React, { useEffect, useState, useCallback } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import { exportToExcel } from "../../utils/excelUtils";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";
import { formatDate } from "../../utils/dateFormatter";

/**
 * OutsourcedLabs — CRUD management page for outsourced (third-party) labs.
 *
 * Follows the same table + toolbar + modals pattern used by Branches.jsx.
  * Backend endpoints are documented in outsourced_labs_api.md.
 */
const OutsourcedLabs = () => {
  const { toast, confirm } = useToast();

  // ─── Data & UI state ──────────────────────────────────────────────────
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Modal state ──────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // ─── Form state ───────────────────────────────────────────────────────
  const [editingLab, setEditingLab] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // Empty form template for adding a new outsourced lab
  const emptyForm = {
    name: "",
    contact_number: "",
    email: "",
    address: "",
  };
  const [newLab, setNewLab] = useState(emptyForm);

  const apiUrl = import.meta.env.VITE_API_URL;

  // ─── Column definitions ───────────────────────────────────────────────
  // Only show these columns in the table (order matters for display)
  const tableColumns = ["id", "name", "contact_number", "email", "address"];

  // Human-readable overrides for column headers
  const customHeaders = {
    id: "ID",
    name: "Name",
    contact_number: "Contact Number",
    email: "Email",
    address: "Address",
  };

  // ─── Data fetching ────────────────────────────────────────────────────


  const fetchLabs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
            const response = await axios.get(`${apiUrl}/outsourced-labs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setLabs(response.data);
      } else {
        console.error("Expected an array but got:", response.data);
        toast.error("Unexpected data format received from the server.");
      }
    } catch (error) {
      console.error("Error fetching outsourced labs:", error);
      toast.error("Failed to fetch outsourced labs. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, toast]);

  // Initial fetch on mount
  useEffect(() => {
    fetchLabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── CRUD handlers ────────────────────────────────────────────────────


  const handleAddLab = async () => {
    // Basic client-side validation
    if (!newLab.name.trim()) {
      toast.error("Lab name is required.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
            await axios.post(`${apiUrl}/outsourced-labs`, newLab, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Outsourced lab added successfully!");
      setShowAddModal(false);
      setNewLab(emptyForm);
      await fetchLabs();
    } catch (error) {
      console.error("Error adding outsourced lab:", error);
      toast.error(error.response?.data?.error || "Failed to add outsourced lab.");
    } finally {
      setLoading(false);
    }
  };


  const handleEditLab = async () => {
    if (!editingLab.name.trim()) {
      toast.error("Lab name is required.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
            await axios.put(`${apiUrl}/outsourced-labs/${editingLab.id}`, editingLab, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Outsourced lab updated successfully!");
      setShowAddModal(false);
      setEditingLab(null);
      await fetchLabs();
    } catch (error) {
      console.error("Error updating outsourced lab:", error);
      toast.error(error.response?.data?.error || "Failed to update outsourced lab.");
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteLab = async (labId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
            await axios.delete(`${apiUrl}/outsourced-labs/${labId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Outsourced lab deleted successfully!");
      await fetchLabs();
    } catch (error) {
      console.error("Error deleting outsourced lab:", error);
      toast.error(error.response?.data?.error || "Failed to delete outsourced lab.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Excel Export ─────────────────────────────────────────────────────

  /**
   * Export the current filtered list as an XLSX file.
   * This runs entirely on the client — no backend needed.
   */
  const handleExportXLSX = async () => {
    try {
      if (filteredLabs.length === 0) {
        toast.error("No data to export.");
        return;
      }
      const exportData = filteredLabs.map((lab) => ({
        ID: lab.id,
        Name: lab.name,
        "Contact Number": lab.contact_number || "",
        Email: lab.email || "",
        Address: lab.address || "",
      }));

      const result = await exportToExcel(exportData, "outsourced_labs", "Outsourced Labs");
      if (result.success) {
        toast.success("Outsourced labs exported successfully!");
      } else {
        toast.error(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export outsourced labs.");
    }
  };

  // ─── Excel Import ─────────────────────────────────────────────────────

  /**
   * Import outsourced labs from an uploaded Excel file.
   * Standardized to use backend file processing.
   */
  const handleImportXLSX = async () => {
    if (!importFile) {
      toast.error("Please select a file to import.");
      return;
    }

    setImportLoading(true);
    const loadingToast = toast.loading("Importing outsourced labs...");
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${apiUrl}/outsourced-labs/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { summary, errorDetails, message } = response.data;

      setShowImportModal(false);
      setImportFile(null);
      
      if (summary.errors > 0) {
        toast.warning(message);
        console.log('Import errors:', errorDetails);
      } else {
        toast.success(message);
      }

      await fetchLabs();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.response?.data?.error || "Failed to import outsourced labs.");
    } finally {
      setImportLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  // ─── Filtering, sorting & pagination ──────────────────────────────────

  const filteredLabs = labs.filter((lab) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lab.name?.toLowerCase().includes(q) ||
      lab.contact_number?.toLowerCase().includes(q) ||
      lab.email?.toLowerCase().includes(q) ||
      lab.address?.toLowerCase().includes(q)
    );
  });

  const sortedLabs = [...filteredLabs].sort((a, b) => {
    if (!sortConfig.field) return 0;
    const valA = a[sortConfig.field] ?? "";
    const valB = b[sortConfig.field] ?? "";
    if (typeof valA === "string" && typeof valB === "string") {
      return sortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedLabs.length / itemsPerPage);
  const currentLabs = sortedLabs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // ─── Cell formatter ───────────────────────────────────────────────────

  const formatCellData = (data, header) => {
    if (header.toLowerCase().includes("date") && data) {
      return formatDate(data);
    }
    return data ?? "N/A";
  };

  // ─── Action buttons per row ───────────────────────────────────────────

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        title="Edit outsourced lab"
        onClick={() => {
          setEditingLab(rowData);
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        title="Delete outsourced lab"
        onClick={() => {
          confirm.delete(rowData.name, () => handleDeleteLab(rowData.id));
        }}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  // ─── Helper: get/set form field for both add and edit ─────────────────

  const formValue = (field) =>
    editingLab ? editingLab[field] : newLab[field];

  const setFormValue = (field, value) => {
    if (editingLab) {
      setEditingLab({ ...editingLab, [field]: value });
    } else {
      setNewLab({ ...newLab, [field]: value });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Container fluid className="outsourced-labs-container">
      {/* Page header with action buttons */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Outsourced Labs</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingLab(null);
              setNewLab(emptyForm);
              setShowAddModal(true);
            }}
          >
            <Plus size={16} className="me-2" />
            Add Lab
          </Button>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <LoadingSpinner message="Loading outsourced labs..." />
      ) : (
        <>
          {/* Search, sort, items-per-page toolbar */}
          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={tableColumns}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />

          {/* Data table */}
          <DynamicTable
            data={currentLabs}
            columns={tableColumns}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
            customHeaders={customHeaders}
            emptyMessage="No outsourced labs found"
          />

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={handlePageChange}
          />

          {/* ── Add / Edit Modal ────────────────────────────────────── */}
          <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
            <Modal.Header>
              <Modal.Title>
                {editingLab ? "Edit Outsourced Lab" : "Add Outsourced Lab"}
              </Modal.Title>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Form>
                {/* Lab Name (required) */}
                <Form.Group className="mb-3">
                  <Form.Label>
                    Lab Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter lab name"
                    value={formValue("name")}
                    onChange={(e) => setFormValue("name", e.target.value)}
                  />
                </Form.Group>

                {/* Contact Number */}
                <Form.Group className="mb-3">
                  <Form.Label>Contact Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter contact number"
                    value={formValue("contact_number")}
                    onChange={(e) => setFormValue("contact_number", e.target.value)}
                  />
                </Form.Group>

                {/* Email */}
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email address"
                    value={formValue("email")}
                    onChange={(e) => setFormValue("email", e.target.value)}
                  />
                </Form.Group>

                {/* Address */}
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter lab address"
                    value={formValue("address")}
                    onChange={(e) => setFormValue("address", e.target.value)}
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLab(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={editingLab ? handleEditLab : handleAddLab}
              >
                {editingLab ? "Update Lab" : "Add Lab"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* ── Import Modal ───────────────────────────────────────── */}
          <Modal
            show={showImportModal}
            onHide={() => setShowImportModal(false)}
            size="lg"
          >
            <Modal.Header>
              <Modal.Title>Import Outsourced Labs</Modal.Title>
              <button
                className="modal-close-btn"
                onClick={() => setShowImportModal(false)}
              >
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info" className="mb-3">
                <h6>Excel File Format Requirements:</h6>
                <p className="mb-2">
                  Your Excel file should have the following columns:
                </p>
                <ul className="mb-2">
                  <li>
                    <strong>Name</strong> (required) — The lab name
                  </li>
                  <li>
                    <strong>Contact Number</strong> (optional) — Phone number
                  </li>
                  <li>
                    <strong>Email</strong> (optional) — Email address
                  </li>
                  <li>
                    <strong>Address</strong> (optional) — Lab address
                  </li>
                </ul>
                <p className="mb-0">
                  <strong>Note:</strong> The first row should contain the column
                  headers. Duplicate names will be skipped.
                </p>
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
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
              >
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


        </>
      )}
    </Container>
  );
};

export default OutsourcedLabs;
