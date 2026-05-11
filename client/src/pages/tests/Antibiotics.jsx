import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import {
  exportToExcel,
  importFromExcel,
  validateExcelFile,
} from "../../utils/excelUtils";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";

const Antibiotics = () => {
  const { toast, confirm } = useToast();
  const [antibiotics, setAntibiotics] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAntibiotic, setEditingAntibiotic] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    shortcut: "",
    commercial_name: "",
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic for reuse
  const fetchAntibiotics = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const response = await axios.get(`${apiUrl}/antibiotics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setAntibiotics(response.data);

        const headers = new Set();
        response.data.forEach((item) => {
          Object.keys(item).forEach((key) => headers.add(key));
        });

        setTableHeaders([...headers]);
      } else {
        console.error("Expected an array but got:", response.data);
        toast.error("Unexpected data format received from the server.");
      }
    } catch (error) {
      console.error("Error fetching antibiotics:", error);
      toast.error("Failed to fetch antibiotics. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAntibiotics();
  }, [apiUrl]);

  const filteredAntibiotics = antibiotics.filter((antibiotic) => {
    const searchMatches = searchQuery
      ? antibiotic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        antibiotic.shortcut
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        antibiotic.commercial_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedAntibiotics = [...filteredAntibiotics].sort((a, b) => {
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
    return 0; // Default no sorting for unhandled types
  });

  const pageCount = Math.ceil(sortedAntibiotics.length / itemsPerPage);
  const currentAntibiotics = sortedAntibiotics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
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
    setEditingAntibiotic(null);
    setFormData({ name: "", shortcut: "", commercial_name: "" });
    setShowModal(true);
  };

  const handleEdit = (antibiotic) => {
    setEditingAntibiotic(antibiotic);
    setFormData({
      name: antibiotic.name || "",
      shortcut: antibiotic.shortcut || "",
      commercial_name: antibiotic.commercial_name || "",
    });
    setShowModal(true);
  };

  const handleDelete = (antibiotic) => {
    confirm.delete(antibiotic.name, async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`${apiUrl}/antibiotics/${antibiotic.id}`, {
          headers,
        });
        toast.success("Antibiotic deleted successfully!");
        fetchAntibiotics();
      } catch (error) {
        console.error("Delete error:", error);
        toast.error(
          error.response?.data?.error || "Failed to delete antibiotic",
        );
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingAntibiotic) {
        // Update
        await axios.put(
          `${apiUrl}/antibiotics/${editingAntibiotic.id}`,
          formData,
          { headers },
        );
      } else {
        // Create
        await axios.post(`${apiUrl}/antibiotics`, formData, { headers });
      }

      setShowModal(false);
      setEditingAntibiotic(null);
      setFormData({ name: "", shortcut: "", commercial_name: "" });
      toast.success(
        editingAntibiotic
          ? "Antibiotic updated successfully!"
          : "Antibiotic added successfully!",
      );

      // Refresh using extracted function
      await fetchAntibiotics();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.error || "Failed to save antibiotic");
    }
  };

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredAntibiotics.map((antibiotic) => ({
        Name: antibiotic.name,
        Shortcut: antibiotic.shortcut,
        "Commercial Name": antibiotic.commercial_name,
      }));

      const result = await exportToExcel(
        exportData,
        "antibiotics",
        "Antibiotics",
      );
      if (result.success) {
        toast.success("Antibiotics exported successfully");
      } else {
        toast.error(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export antibiotics");
    }
  };

  // XLSX Import Handler
  const handleImportXLSX = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    setImportLoading(true);
    const loadingToast = toast.loading("Importing antibiotics...");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${apiUrl}/antibiotics/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const { summary, errorDetails, message } = response.data;

      setShowImportModal(false);
      setImportFile(null);

      if (summary.errors > 0) {
        toast.warning(message);
        console.log("Import errors:", errorDetails);
      } else {
        toast.success(message);
      }

      await fetchAntibiotics();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error.response?.data?.error || "Failed to import antibiotics",
      );
    } finally {
      setImportLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => handleEdit(rowData)}
        title="Edit Antibiotic"
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => handleDelete(rowData)}
        title="Delete Antibiotic"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <Container fluid className="antibiotics-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Antibiotics</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button
            variant="outline-info"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={16} className="me-2" />
            Import Excel
          </Button>
          <Button variant="primary" onClick={handleAdd}>
            <Plus size={16} className="me-2" />
            Add Antibiotic
          </Button>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading antibiotics..." />
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
            data={currentAntibiotics}
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
          <Modal.Title>
            {editingAntibiotic ? "Edit Antibiotic" : "Add New Antibiotic"}
          </Modal.Title>
          <button
            className="modal-close-btn"
            onClick={() => setShowModal(false)}
          >
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Shortcut</Form.Label>
              <Form.Control
                type="text"
                value={formData.shortcut}
                onChange={(e) =>
                  setFormData({ ...formData, shortcut: e.target.value })
                }
                placeholder="e.g., AMP, PEN"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Commercial Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.commercial_name}
                onChange={(e) =>
                  setFormData({ ...formData, commercial_name: e.target.value })
                }
                placeholder="e.g., Ampicillin, Penicillin"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingAntibiotic ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>Import Antibiotics</Modal.Title>
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
                <strong>Name</strong> (required) - The antibiotic name
              </li>
              <li>
                <strong>Shortcut</strong> (optional) - Abbreviation like AMP,
                PEN
              </li>
              <li>
                <strong>Commercial Name</strong> (optional) - Commercial brand
                name
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
    </Container>
  );
};

export default Antibiotics;
