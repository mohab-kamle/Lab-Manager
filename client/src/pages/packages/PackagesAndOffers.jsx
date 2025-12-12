import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import { Pencil, Trash2, Plus } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const PackagesAndOffers = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [tests, setTests] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [item, setItem] = useState({
    name: "",
    shortcut: "",
    price: "",
    start_date: "",
    end_date: "",
    type: "package",
    tests: [],
    cultures: [],
    item_id: "",
    item_type: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [lastAttemptedItem, setLastAttemptedItem] = useState(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("test"); // "test" or "culture"

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [itemsRes, testsRes, culturesRes] = await Promise.all([
          axios.get(`${apiUrl}/packages-and-offers`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/tests`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/cultures`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setItems(itemsRes.data);
        setTests(testsRes.data);
        setCultures(culturesRes.data);

        // Set up table headers based on item type
        const headers = [
          { field: 'name', label: 'Name', sortable: true },
          { field: 'shortcut', label: 'Shortcut', sortable: true },
          { field: 'price', label: 'Price', sortable: true },
          { field: 'start_date', label: 'Start Date', sortable: true },
          { field: 'end_date', label: 'End Date', sortable: true },
          { field: 'type', label: 'Type', sortable: true },
          { field: 'tests', label: 'Tests' },
          { field: 'cultures', label: 'Cultures' }
        ];

        setTableHeaders(headers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      // Clean up the cultures array to ensure only valid IDs are included
      const cleanedCultures = item.cultures
        .map(id => parseInt(id))
        .filter(id => !isNaN(id) && id > 0);

      // Create a cleaned item object
      const cleanedItem = {
        ...item,
        cultures: cleanedCultures,
        price: parseFloat(item.price),
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        tests: item.tests.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0),
        item_id: item.item_id || null,
        item_type: item.item_type || null
      };

      // Validate dates
      if (cleanedItem.start_date && cleanedItem.end_date && new Date(cleanedItem.start_date) > new Date(cleanedItem.end_date)) {
        setFormErrors(prev => ({
          ...prev,
          dates: "End date must be after start date"
        }));
        return;
      }

      // Validate the cleaned item
      const validationErrors = validateForm(cleanedItem);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        console.log('Validation errors:', validationErrors);
        return;
      }

      // Remove unnecessary fields based on type
      const dataToSend = {
        ...cleanedItem,
        manager_id: user.id
      };

      if (dataToSend.type === 'package') {
        delete dataToSend.item_id;
        delete dataToSend.item_type;
      } else {
        delete dataToSend.tests;
        delete dataToSend.cultures;
      }

      console.log('Sending data to server:', dataToSend);

      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);
      setShowRetryButton(false);

      let response;
      if (editingItem) {
        // Update existing item
        response = await axios.put(`${apiUrl}/packages-and-offers/${editingItem.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Update the items state by replacing the old item with the updated one
        setItems(prevItems => prevItems.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
      } else {
        // Create new item
        response = await axios.post(`${apiUrl}/packages-and-offers`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Add the new item to the items state
        setItems(prevItems => [...prevItems, response.data]);
      }

      console.log('Server response:', response.data);
      setShowAddModal(false);
      handleResetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      setError(error.response?.data?.error || 'Failed to save item');
      setShowRetryButton(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastAttemptedItem) {
      setItem(lastAttemptedItem);
      handleAddItem();
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      await axios.delete(`${apiUrl}/packages-and-offers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the items state by removing the deleted item
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError("Failed to delete item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortcut?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig.field) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === "asc" 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortConfig.direction === "asc"
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    
    return 0;
  });

  const pageCount = Math.ceil(sortedItems.length / itemsPerPage);
  const currentItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => {
          setEditingItem(rowData);
          setItem({
            ...rowData,
            start_date: new Date(rowData.start_date),
            end_date: new Date(rowData.end_date)
          });
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          setItemToDelete(rowData);
          setShowDeleteModal(true);
        }}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  const validateForm = (item) => {
    const errors = {};
    
    if (!item.name) errors.name = 'Name is required';
    if (!item.shortcut) errors.shortcut = 'Shortcut is required';
    if (!item.price || isNaN(item.price) || item.price <= 0) errors.price = 'Valid price is required';
    if (!item.start_date) errors.start_date = 'Start date is required';
    if (!item.end_date) errors.end_date = 'End date is required';
    if (!item.type) errors.type = 'Type is required';

    if (item.type === 'package') {
      if (!item.tests || item.tests.length === 0) {
        errors.tests = 'At least one test is required for packages';
      }
      // Cultures are optional for packages, but if provided, they must be valid
      if (item.cultures && item.cultures.length > 0) {
        const invalidCultures = item.cultures.filter(id => isNaN(id) || id <= 0);
        if (invalidCultures.length > 0) {
          errors.cultures = 'Invalid culture IDs selected';
        }
      }
    } else if (item.type === 'offer') {
      if (!item.item_id) errors.item_id = 'Item ID is required';
      if (!item.item_type) errors.item_type = 'Item type is required';
    }

    return errors;
  };

  const formatCellData = (value, field) => {
    if (value === null || value === undefined) return '-';
    
    switch (field) {
      case 'start_date':
      case 'end_date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'tests':
        if (!Array.isArray(value) || value.length === 0) return '-';
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5', textAlign: 'left' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {value.map((test, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>{test.name || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>${Number(test.price || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'cultures':
        if (!Array.isArray(value) || value.length === 0) return '-';
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5', textAlign: 'left' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {value.map((culture, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>{culture.name || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>${Number(culture.price || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'price':
        return `$${Number(value || 0).toFixed(2)}`;
      case 'type':
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : '-';
      default:
        return String(value || '-');
    }
  };

  // Update the culture selection handling
  const handleCultureChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    console.log('Selected cultures:', selectedOptions);
    setItem(prev => ({
      ...prev,
      cultures: selectedOptions
    }));
  };

  const handleResetForm = () => {
    setItem({
      name: "",
      shortcut: "",
      price: "",
      start_date: "",
      end_date: "",
      type: "package",
      tests: [],
      cultures: [],
      item_id: "",
      item_type: ""
    });
    setFormErrors({});
  };

  return (
    <Container fluid className="packages-offers-container">
      {loading ? (
        <LoadingSpinner message="Loading packages and offers..." />
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Packages & Offers</h2>
            <Button 
              variant="primary" 
              onClick={() => {
                setEditingItem(null);
                setItem({
                  name: "",
                  shortcut: "",
                  price: "",
                  start_date: "",
                  end_date: "",
                  type: "package",
                  tests: [],
                  cultures: [],
                  item_id: "",
                  item_type: ""
                });
                setShowAddModal(true);
              }}
            >
              <Plus size={16} className="me-2" />
              Add New
            </Button>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={tableHeaders.filter(h => h.sortable).map(h => h.field)}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            showTypeFilter={true}
          />
          <DynamicTable
            data={currentItems}
            columns={tableHeaders.map(header => header.field)}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
          />
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={setCurrentPage}
          />

          {/* Add/Edit Modal */}
          <Modal show={showAddModal} onHide={() => {
            setShowAddModal(false);
            setError(null);
            setShowRetryButton(false);
            setLastAttemptedItem(null);
            setFormErrors({});
          }} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>
                {editingItem ? "Edit" : "Add"} {item.type === "package" ? "Package" : "Offer"}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                  {showRetryButton && (
                    <Button variant="outline-danger" size="sm" className="ms-2" onClick={handleRetry}>
                      Try Again
                    </Button>
                  )}
                </Alert>
              )}
              <Form onSubmit={handleAddItem} noValidate id="package-form">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Type</Form.Label>
                      <Form.Select
                        value={item.type}
                        onChange={(e) => {
                          setItem({ 
                            ...item, 
                            type: e.target.value,
                            tests: [],
                            cultures: [],
                            item_id: "",
                            item_type: ""
                          });
                          setFormErrors({});
                        }}
                      >
                        <option value="package">Package</option>
                        <option value="offer">Offer</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder={`Enter ${item.type} name`}
                        value={item.name}
                        onChange={(e) => {
                          setItem({ ...item, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                        }}
                        isInvalid={!!formErrors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Shortcut *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={`Enter ${item.type} shortcut`}
                    value={item.shortcut}
                    onChange={(e) => {
                      setItem({ ...item, shortcut: e.target.value });
                      if (formErrors.shortcut) setFormErrors({ ...formErrors, shortcut: null });
                    }}
                    isInvalid={!!formErrors.shortcut}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.shortcut}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Price *</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="Enter price"
                        value={item.price}
                        onChange={(e) => {
                          setItem({ ...item, price: e.target.value });
                          if (formErrors.price) setFormErrors({ ...formErrors, price: null });
                        }}
                        isInvalid={!!formErrors.price}
                        min="0"
                        step="0.01"
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.price}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  {item.type === "package" ? (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Tests</Form.Label>
                          <Form.Select
                            multiple
                            value={item.tests}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              setItem({ ...item, tests: selected });
                              if (formErrors.tests) setFormErrors({ ...formErrors, tests: null });
                            }}
                            isInvalid={!!formErrors.tests}
                          >
                            {tests.map(test => (
                              <option key={`test-${test.id}`} value={test.id}>
                                {test.name} (${test.price})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {formErrors.tests}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Cultures</Form.Label>
                          <Form.Select
                            multiple
                            value={item.cultures}
                            onChange={handleCultureChange}
                            isInvalid={!!formErrors.cultures}
                          >
                            {cultures.map(culture => (
                              <option key={`culture-${culture.id}`} value={culture.id}>
                                {culture.name} (${culture.price})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {formErrors.cultures}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </>
                  ) : (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Item Type *</Form.Label>
                          <Form.Select
                            value={selectedItemType}
                            onChange={(e) => {
                              setSelectedItemType(e.target.value);
                              setItem({ ...item, item_id: null, item_type: null });
                            }}
                          >
                            <option value="test">Test</option>
                            <option value="culture">Culture</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Select {selectedItemType === "test" ? "Test" : "Culture"} *</Form.Label>
                          <Form.Select
                            value={item.item_id ? `${item.item_type}-${item.item_id}` : ""}
                            onChange={(e) => {
                              const [type, id] = e.target.value.split("-");
                              setItem({ ...item, item_type: type, item_id: id });
                              if (formErrors.item_id) setFormErrors({ ...formErrors, item_id: null });
                            }}
                            isInvalid={!!formErrors.item_id}
                          >
                            <option value="">Select a {selectedItemType}</option>
                            {selectedItemType === "test" ? (
                              tests.map(test => (
                                <option key={`test-${test.id}`} value={`test-${test.id}`}>
                                  {test.name} (Original Price: ${test.price})
                                </option>
                              ))
                            ) : (
                              cultures.map(culture => (
                                <option key={`culture-${culture.id}`} value={`culture-${culture.id}`}>
                                  {culture.name} (Original Price: ${culture.price})
                                </option>
                              ))
                            )}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {formErrors.item_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </>
                  )}
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date *</Form.Label>
                      <DatePicker
                        selected={item.start_date}
                        onChange={(date) => {
                          setItem({ ...item, start_date: date });
                          if (formErrors.start_date) setFormErrors({ ...formErrors, start_date: null });
                        }}
                        className={`form-control ${formErrors.start_date ? 'is-invalid' : ''}`}
                        dateFormat="yyyy-MM-dd"
                      />
                      {formErrors.start_date && (
                        <div className="invalid-feedback d-block">
                          {formErrors.start_date}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Date *</Form.Label>
                      <DatePicker
                        selected={item.end_date}
                        onChange={(date) => {
                          setItem({ ...item, end_date: date });
                          if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: null });
                        }}
                        className={`form-control ${formErrors.end_date ? 'is-invalid' : ''}`}
                        dateFormat="yyyy-MM-dd"
                      />
                      {formErrors.end_date && (
                        <div className="invalid-feedback d-block">
                          {formErrors.end_date}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowAddModal(false);
                setError(null);
                setShowRetryButton(false);
                setLastAttemptedItem(null);
                setFormErrors({});
              }}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                form="package-form"
                disabled={loading}
              >
                {loading ? "Saving..." : (editingItem ? "Update" : "Add")}
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
                Are you sure you want to delete this {itemToDelete?.type === "package" ? "package" : "offer"}?
                This action cannot be undone.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleDelete(itemToDelete?.id)}
              >
                Delete
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default PackagesAndOffers;