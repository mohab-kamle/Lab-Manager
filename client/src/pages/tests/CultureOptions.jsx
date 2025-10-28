import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert } from "react-bootstrap";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Info } from "lucide-react";

const CultureOptions = () => {
  const [cultureOptions, setCultureOptions] = useState([]);
  const [cultureSubOptions, setCultureSubOptions] = useState([]);
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
  const [showSubOptionsModal, setShowSubOptionsModal] = useState(false);
  const [currentSubOptions, setCurrentSubOptions] = useState([]);
  const [optionToDelete, setOptionToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: "" });

  const apiUrl = import.meta.env.VITE_API_URL;

  // Set table headers on component mount
  useEffect(() => {
    // Initialize table headers
    const headers = ['id','option', 'subOptionsCount', 'actions'];
    setTableHeaders(headers);
  }, []);

  // Fetch culture options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${apiUrl}/culture-options/with-suboptions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('API Response:', JSON.stringify(response.data, null, 2));

        // Transform the data to match the expected format
        const transformedData = response.data.map(item => {
          // For Sequelize, we need to handle both direct and dataValues access
          const itemData = item.dataValues || item;

          // Process sub-options
          let subOptions = [];
          if (itemData.subOptions && Array.isArray(itemData.subOptions)) {
            subOptions = itemData.subOptions.map(sub => {
              const subData = sub.dataValues || sub;
              return {
                id: subData.id,
                name: subData.name || subData.option,
                is_active: subData.is_active
              };
            });
          }

          return {
            id: itemData.id,
            option: itemData.option,
            subOptions: subOptions
          };
        });

        console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

        // Update state with the transformed data
        setCultureOptions(transformedData);

        // Create a map of culture option IDs to their sub-options
        const subOptionsMap = {};
        transformedData.forEach(option => {
          subOptionsMap[option.id] = option.subOptions || [];
        });

        console.log('Sub-options map:', JSON.stringify(subOptionsMap, null, 2));
        setCultureSubOptions(subOptionsMap);
      } catch (error) {
        console.error('Error fetching culture options:', error);
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

  // Format cell data for the table
  const formatCellData = (value, column, rowData) => {
    // If we're getting a direct value (from DynamicTable)
    if (value !== undefined && column !== undefined) {
      // For the option column, just return the value as is
      if (column === 'option') {
        return value;
      }
      // For other columns, let the DynamicTable handle formatting
      return value;
    }
    
    // If we have row data, use it to get the value
    if (rowData) {
      const columnKey = typeof column === 'string' ? column : column?.key || column;
      
      // Handle special columns
      if (columnKey === 'subOptionsCount') {
        const subOptions = rowData.id !== undefined ? cultureSubOptions[rowData.id] : [];
        return Array.isArray(subOptions) ? subOptions.length : 0;
      }
      
      if (columnKey === 'actions') {
        return (
          <div className="d-flex gap-2">
            <Button 
              variant="outline-info" 
              size="sm" 
              onClick={() => handleViewSubOptions(rowData)} 
              title="View Sub-options"
            >
              <Info size={16} />
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => handleEdit(rowData)} 
              title="Edit Culture Option"
            >
              <Pencil size={16} />
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={() => handleDelete(rowData)} 
              title="Delete Culture Option"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      }
      
      // For regular data columns
      return rowData[columnKey] || 'N/A';
    }
    
    return 'N/A';
  };
  
  // Custom formatter for DynamicTable
  const customFormatter = (value, column, rowData) => {
    // For the option column, just return the value
    if (column === 'option') {
      return value;
    }
    
    // For subOptionsCount, get the count from cultureSubOptions
    if (column === 'subOptionsCount') {
      const subOptions = rowData?.id !== undefined ? cultureSubOptions[rowData.id] : [];
      return Array.isArray(subOptions) ? subOptions.length : 0;
    }
    
    // For actions, return the action buttons
    if (column === 'actions') {
      return (
        <div className="d-flex gap-2">
          <Button 
            variant="outline-info" 
            size="sm" 
            onClick={() => handleViewSubOptions(rowData)} 
            title="View Sub-options"
          >
            <Info size={16} />
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => handleEdit(rowData)} 
            title="Edit Culture Option"
          >
            <Pencil size={16} />
          </Button>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => handleDelete(rowData)} 
            title="Delete Culture Option"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }
    
    // Default case
    return value || 'N/A';
  };

  const handleViewSubOptions = (option) => {
    setCurrentSubOptions({
      name: option.option,
      subOptions: cultureSubOptions[option.id] || []
    });
    setShowSubOptionsModal(true);
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
            sortableFields={['option']} // Only allow sorting by option column
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentCultureOptions}
            columns={tableHeaders}
            formatCellData={customFormatter}
            showActions={false}
            customHeaders={{
              'option': 'Option',
              'subOptionsCount': 'Sub-options',
              'actions': 'Actions'
            }}
            formatter={customFormatter}
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

      {/* Sub-options Modal */}
      <Modal show={showSubOptionsModal} onHide={() => setShowSubOptionsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Sub-options for {currentSubOptions.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentSubOptions.subOptions?.length > 0 ? (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentSubOptions.subOptions.map((subOption) => (
                  <tr key={subOption.id}>
                    <td>{subOption.name}</td>
                    <td>
                      <span className={`badge ${subOption.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {subOption.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No sub-options found for this culture option.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubOptionsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CultureOptions;
