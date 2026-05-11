import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Alert, Spinner } from "react-bootstrap";
import { Search } from "lucide-react";
import axios from "axios";
import { useToast } from "../../components/ui/ToastContext";

const GlobalCatalogPickerModal = ({ show, onHide, onImportSuccess }) => {
  const { toast } = useToast();
  const [tests, setTests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchGlobalTests = async (search = "", pageNum = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${apiUrl}/global-catalog`, {
        params: { search, page: pageNum, limit: 15 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setTests(res.data.tests);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to fetch global catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      fetchGlobalTests(searchQuery, 1);
      setSelectedIds([]);
    }
  }, [show]); // Refetch when opened

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGlobalTests(searchQuery, 1);
  };

  const handleCheckboxChange = (id) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = tests.map(t => t.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      const pageIds = tests.map(t => t.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) return;
    
    const toastId = toast.loading("Importing selected tests from global catalog...");
    try {
      setImporting(true);
      const token = localStorage.getItem("token");
      
      const res = await axios.post(`${apiUrl}/global-catalog/import-bulk`, {
        global_test_ids: selectedIds
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { importedCount, skippedCount } = res.data;

      if (importedCount === 0 && skippedCount > 0) {
        toast.update(toastId, {
          type: 'warning',
          render: `⚠️ ${skippedCount === 1 ? 'This test is' : `All ${skippedCount} tests are`} already imported.`,
          autoClose: 5000
        });
        setImporting(false);
        return;
      }

      if (importedCount > 0 && skippedCount > 0) {
        toast.update(toastId, {
          type: 'info',
          render: `Imported ${importedCount} new ${importedCount === 1 ? 'test' : 'tests'}. ${skippedCount} skipped (already exist).`,
          autoClose: 4000
        });
        
        setTimeout(() => {
          onImportSuccess();
        }, 2000);
        setImporting(false);
        return;
      }

      toast.update(toastId, {
        type: 'success',
        render: `Successfully imported ${importedCount} tests!`,
        autoClose: 3000
      });
      onImportSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || "Failed to import selected tests";
      toast.update(toastId, {
        type: 'error',
        render: errorMessage,
        autoClose: 6000
      });
      setImporting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Import from Global Catalog (LOINC)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSearch} className="mb-3 d-flex gap-2">
          <div className="flex-grow-1 position-relative">
            <Search className="position-absolute text-muted" size={18} style={{ left: 10, top: 10 }} />
            <Form.Control
              type="text"
              placeholder="Search by test name, LOINC code, or consumer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '35px' }}
            />
          </div>
          <Button variant="primary" type="submit" disabled={loading}>
            Search
          </Button>
        </Form>

        <div className="rounded border shadow-sm overflow-auto" style={{ minHeight: '400px', background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          {loading ? (
            <div className="d-flex justify-content-center p-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center p-5 text-muted">No global tests found matching your search.</div>
          ) : (
            <Table hover responsive className="mb-0">
              <thead className="sticky-top" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                <tr>
                  <th width="40" className="text-center">
                    <Form.Check 
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={tests.length > 0 && tests.every(t => selectedIds.includes(t.id))}
                    />
                  </th>
                  <th>LOINC Code</th>
                  <th>Name</th>
                  <th>Patient Friendly Name</th>
                  <th>Category</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => (
                  <tr key={test.id} >
                    <td className="text-center">
                      <Form.Check 
                        type="checkbox"
                        checked={selectedIds.includes(test.id)}
                        onChange={() => handleCheckboxChange(test.id)}
                      />
                    </td>
                    <td><span className="badge bg-secondary">{test.loinc_code}</span></td>
                    <td className="fw-semibold">{test.name}</td>
                    <td className="text-muted">{test.patient_friendly_name || '-'}</td>
                    <td>{test.global_category}</td>
                    <td><span className="badge bg-info">{test.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {/* Basic Pagination Controls */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">Showing Page {page} of {totalPages}</span>
          <div className="d-flex gap-2">
            <Button 
               variant="outline-secondary" 
               size="sm" 
               disabled={page <= 1 || loading}
               onClick={() => fetchGlobalTests(searchQuery, page - 1)}
            >
              Previous
            </Button>
            <Button 
               variant="outline-secondary" 
               size="sm" 
               disabled={page >= totalPages || loading}
               onClick={() => fetchGlobalTests(searchQuery, page + 1)}
            >
              Next
            </Button>
          </div>
        </div>

      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100 align-items-center">
          <span className="text-primary fw-bold">
            {selectedIds.length} {selectedIds.length === 1 ? 'test' : 'tests'} selected
          </span>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide} disabled={importing}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImport} disabled={selectedIds.length === 0 || importing}>
              {importing ? <><Spinner size="sm" className="me-2"/> Importing...</> : "Import Selected"}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default GlobalCatalogPickerModal;
