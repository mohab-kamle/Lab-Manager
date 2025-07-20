import axios from "axios";
import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col, Card } from "react-bootstrap";
import Toolbar from "../components/Toolbar";
import TablePagination from "../components/TablePagination";
import DynamicTable from "../components/DynamicTable";
import { Pencil, Trash2, Plus, X, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

const Tests = () => {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedTestComponents, setSelectedTestComponents] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    shortcut: "",
    price: "",
    category_id: "",
    precautions: "",
    decreased_in: "",
    increased_in: "",
    sample_type_id: "",
    lab_to_lab: "",
    cost: "",
    lab_name: "",
    questions: [] // Array of question IDs
  });
  const [testComponents, setTestComponents] = useState([]);
  const [newComponent, setNewComponent] = useState({
    name: "",
    unit: "",
    normal_from: "",
    normal_to: "",
    reference_range: "",
    gender: "",
    age_start: "",
    age_end: "",
    c_low: "",
    c_high: "",
    result_type: "range" // Added result_type
  });
  const [componentError, setComponentError] = useState("");
  const [questionSearchTerm, setQuestionSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [sampleTypeSearchTerm, setSampleTypeSearchTerm] = useState("");
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    category: ""
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: ""
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  // Extracted fetch logic
  const fetchTestsAndRelated = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const [testsResponse, categoriesResponse, samplesResponse, questionsResponse] = await Promise.all([
        axios.get(`${apiUrl}/tests/all-with-components`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/samples`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/questions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (Array.isArray(testsResponse.data)) {
        setTests(testsResponse.data);
        const headers = new Set();
        testsResponse.data.forEach((item) => {
          Object.keys(item).forEach((key) => {
            if (key !== 'test_components' && key !== 'category' && key !== 'sample_type') headers.add(key);
          });
        });
        setTableHeaders([...headers]);
      }
      setCategories(categoriesResponse.data);
      setSampleTypes(samplesResponse.data);
      setQuestions(questionsResponse.data);
    } catch (error) {
      setError("Failed to fetch data. Please try again later.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTestsAndRelated();
    // eslint-disable-next-line
  }, [apiUrl]);

  const filteredTests = tests.filter((test) => {
    const searchMatches = searchQuery
      ? test.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return searchMatches;
  });

  const sortedTests = [...filteredTests].sort((a, b) => {
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
    return 0;
  });

  const pageCount = Math.ceil(sortedTests.length / itemsPerPage);
  const currentTests = sortedTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleViewDetails = async (test) => {
    setSelectedTest(test);
    setSelectedTestComponents(test.test_components || []);
    setShowDetailsModal(true);
  };

  const formatCellData = (data, header) => {
    if (header === 'Actions') {
      return null; // This will be handled by ActionComponent
    }
    
    // Handle questions array specifically
    if (header === 'questions' && Array.isArray(data)) {
      if (data.length === 0) return "No questions";
      return (
        <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
          {data.map((question, index) => (
            <li key={index}>
              {typeof question === 'object' && question.text ? question.text : String(question)}
            </li>
          ))}
        </ul>
      );
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
    if (header === 'price' && data) {
      return `EGP ${parseFloat(data).toFixed(2)}`;
    }
    if (header === 'cost' && data) {
      return `EGP ${parseFloat(data).toFixed(2)}`;
    }
    if ((header === 'lab_to_lab' || header === 'lab_to_lab_status') && data) {
      return data === 'IN' ? 'In' : data === 'OUT' ? 'Out' : data;
    }
    if (header === 'category_id' && data) {
      const category = categories.find(cat => cat.id === data);
      return category ? category.name : data;
    }
    if (header === 'sample_type_id' && data) {
      const sampleType = sampleTypes.find(sample => sample.id === data);
      return sampleType ? sampleType.type : data;
    }
    return data ?? "N/A";
  };

  const handleAdd = () => {
    setEditingTest(null);
    setError(null); // Clear any previous errors
    setModalError(null); // Clear modal errors
    setFormData({
      name: "",
      shortcut: "",
      price: "",
      category_id: "",
      precautions: "",
      decreased_in: "",
      increased_in: "",
      sample_type_id: "",
      lab_to_lab: "",
      cost: "",
      lab_name: "",
      questions: []
    });
    setTestComponents([]);
    setNewComponent({
      name: "",
      unit: "",
      normal_from: "",
      normal_to: "",
      reference_range: "",
      gender: "",
      age_start: "",
      age_end: "",
      c_low: "",
      c_high: "",
      result_type: "range" // Added result_type
    });
    // Clear search terms
    setCategorySearchTerm("");
    setSampleTypeSearchTerm("");
    setQuestionSearchTerm("");
    setShowModal(true);
  };

  const handleEdit = async (test) => {
    setEditingTest(test);
    setError(null); // Clear any previous errors
    setModalError(null); // Clear modal errors
    setFormData({
      name: test.name || "",
      shortcut: test.shortcut || "",
      price: test.price || "",
      category_id: test.category_id || "",
      precautions: test.precautions || "",
      decreased_in: test.decreased_in || "",
      increased_in: test.increased_in || "",
      sample_type_id: test.sample_type_id || "",
      lab_to_lab: test.lab_to_lab_status || "", // Map lab_to_lab_status to lab_to_lab
      cost: test.cost || "",
      lab_name: test.lab_name || "",
      questions: test.questions ? test.questions.map(q => q.id) : []
    });
    
    // Fetch test components for this test
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/tests/${test.id}/components`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map gender values from database format to frontend format
      const mappedComponents = (response.data || []).map(component => ({
        ...component,
        gender: component.gender === 'Male' ? 'm' : component.gender === 'Female' ? 'f' : ''
      }));
      
      setTestComponents(mappedComponents);
    } catch (error) {
      console.error("Error fetching test components:", error);
      setTestComponents([]);
    }
    
    // Clear search terms
    setCategorySearchTerm("");
    setSampleTypeSearchTerm("");
    setQuestionSearchTerm("");
    setShowModal(true);
  };

  const handleDelete = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const addComponent = () => {
    setComponentError("");
    
    if (!newComponent.name.trim()) {
      setComponentError("Component name is required");
      return;
    }
    if (!newComponent.unit.trim()) {
      setComponentError("Unit is required");
      return;
    }
    if (newComponent.result_type === 'range') {
      if (!newComponent.normal_from.trim()) {
        setComponentError("Normal from is required for range type");
        return;
      }
      if (!newComponent.normal_to.trim()) {
        setComponentError("Normal to is required for range type");
        return;
      }
    }
    // If gender is "both", create two components (male and female)
    if (newComponent.gender === "both") {
      const maleComponent = { 
        ...newComponent, 
        gender: "m", 
        id: Date.now() 
      };
      const femaleComponent = { 
        ...newComponent, 
        gender: "f", 
        id: Date.now() + 1 
      };
      setTestComponents([...testComponents, maleComponent, femaleComponent]);
    } else {
      setTestComponents([...testComponents, { ...newComponent, id: Date.now() }]);
    }
    setNewComponent({
      name: "",
      unit: "",
      normal_from: "",
      normal_to: "",
      reference_range: "",
      gender: "",
      age_start: "",
      age_end: "",
      c_low: "",
      c_high: "",
      result_type: "range" // Added result_type
    });
  };

  const removeComponent = (index) => {
    setTestComponents(testComponents.filter((_, i) => i !== index));
  };

  const handleAddQuestion = async () => {
    try {
      if (!newQuestion.text.trim()) {
        alert('Question text is required');
        return;
      }

      const token = localStorage.getItem("token");
      const response = await axios.post(`${apiUrl}/questions`, newQuestion, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add the new question to the questions list
      setQuestions(prev => [...prev, response.data]);
      
      // Add the new question to the current test's questions
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, response.data.id]
      }));

      // Reset the form
      setNewQuestion({
        text: "",
        category: ""
      });
      
      // Close the modal
      setShowAddQuestionModal(false);
      
      alert('Question created successfully!');
    } catch (error) {
      console.error('Error creating question:', error);
      alert(error.response?.data?.error || 'Failed to create question');
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!newCategory.name.trim()) {
        alert('Category name is required');
        return;
      }

      const token = localStorage.getItem("token");
      const response = await axios.post(`${apiUrl}/categories`, newCategory, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add the new category to the categories list
      setCategories(prev => [...prev, response.data]);
      
      // Select the new category automatically
      setFormData(prev => ({
        ...prev,
        category_id: response.data.id
      }));

      // Reset the form
      setNewCategory({
        name: "",
        description: ""
      });
      
      // Close the modal
      setShowAddCategoryModal(false);
      
      alert('Category created successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.response?.data?.error || 'Failed to create category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Test name is required');
      return;
    }
    if (!formData.category_id) {
      alert('Category is required');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const testData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        sample_type_id: formData.sample_type_id ? parseInt(formData.sample_type_id) : null,
        lab_to_lab_status: formData.lab_to_lab // Map lab_to_lab to lab_to_lab_status
      };
      
      // Remove questions and lab_to_lab from testData as they will be handled separately
      const { questions, lab_to_lab, ...testDataWithoutQuestions } = testData;
      if (editingTest) {
        await axios.put(`${apiUrl}/tests/${editingTest.id}`, testDataWithoutQuestions, { headers });
        await axios.put(`${apiUrl}/tests/${editingTest.id}/components`, { components: testComponents }, { headers });
        // Update questions for existing test
        if (questions && questions.length >= 0) {
          await axios.put(`${apiUrl}/questions/${editingTest.id}/tests`, { questionIds: questions }, { headers });
        }
      } else {
        const response = await axios.post(`${apiUrl}/tests`, testDataWithoutQuestions, { headers });
        const newTestId = response.data.id;
        if (testComponents.length > 0) {
          await axios.post(`${apiUrl}/tests/${newTestId}/components`, { components: testComponents }, { headers });
        }
        // Add questions for new test
        if (questions && questions.length > 0) {
          await axios.put(`${apiUrl}/questions/${newTestId}/tests`, { questionIds: questions }, { headers });
        }
      }
      setShowModal(false);
      setEditingTest(null);
      setFormData({
        name: "",
        shortcut: "",
        price: "",
        category_id: "",
        precautions: "",
        decreased_in: "",
        increased_in: "",
        sample_type_id: "",
        lab_to_lab: "",
        cost: "",
        lab_name: "",
        questions: []
      });
      setTestComponents([]);
      // Refresh using extracted logic
      await fetchTestsAndRelated();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to save test";
      setModalError(errorMessage);
      // Don't close modal on error so user can fix the issue
      return;
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${apiUrl}/tests/${testToDelete.id}`, { headers });
      setShowDeleteModal(false);
      setTestToDelete(null);
      // Refresh using extracted logic
      await fetchTestsAndRelated();
    } catch (error) {
      setError("Failed to delete test");
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button variant="primary" size="sm" onClick={() => handleViewDetails(rowData)} title="View Details">
        <i className="fas fa-info-circle"></i> More Info
      </Button>
      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(rowData)} title="Edit Test">
        <Pencil size={16} />
      </Button>
      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData)} title="Delete Test">
        <Trash2 size={16} />
      </Button>
    </div>
  );

  // XLSX Export Handler
  const handleExportXLSX = () => {
    const exportData = filteredTests.map(test => ({
      'Name': test.name,
      'Shortcut': test.shortcut,
      'Price': test.price,
      'Cost': test.cost,
      'Lab to Lab': test.lab_to_lab === 'IN' ? 'In' : test.lab_to_lab === 'OUT' ? 'Out' : test.lab_to_lab,
      'Lab Name': test.lab_name,
      'Category': categories.find(cat => cat.id === test.category_id)?.name || '',
      'Sample Type': sampleTypes.find(sample => sample.id === test.sample_type_id)?.type || '',
      'Precautions': test.precautions,
      'Decreased In': test.decreased_in,
      'Increased In': test.increased_in
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tests");
    XLSX.writeFile(wb, `tests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // XLSX Import Handler (now connected to backend)
  const handleImportXLSX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${apiUrl}/tests/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(`Imported: ${response.data.imported}, Updated: ${response.data.updated}, Errors: ${response.data.errors.length}`);
      await fetchTestsAndRelated();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to import tests');
    }
  };

  return (
    <Container fluid className="tests-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Tests</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" as="label">
            <Upload size={16} className="me-2" />
            Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportXLSX} />
          </Button>
        <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Test</Button>
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
            data={currentTests}
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
      
      {/* Test Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Test Details: {selectedTest?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTest && (
            <>
              <Row>
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Name:</strong> {selectedTest.name}</p>
                  <p><strong>Shortcut:</strong> {selectedTest.shortcut || 'N/A'}</p>
                  <p><strong>Price:</strong> {selectedTest.price ? `EGP ${parseFloat(selectedTest.price).toFixed(2)}` : 'N/A'}</p>
                  <p><strong>Cost:</strong> {selectedTest.cost ? `EGP ${parseFloat(selectedTest.cost).toFixed(2)}` : 'N/A'}</p>
                  <p><strong>Lab to Lab:</strong> {selectedTest.lab_to_lab_status === 'IN' ? 'In' : selectedTest.lab_to_lab_status === 'OUT' ? 'Out' : selectedTest.lab_to_lab_status || 'N/A'}</p>
                  <p><strong>Lab Name:</strong> {selectedTest.lab_name || 'N/A'}</p>
                  <p><strong>Category:</strong> {selectedTest.category?.name || categories.find(cat => cat.id === selectedTest.category_id)?.name || 'N/A'}</p>
                  <p><strong>Sample Type:</strong> {selectedTest.sample_type?.type || sampleTypes.find(sample => sample.id === selectedTest.sample_type_id)?.type || 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <h6>Medical Information</h6>
                  <p><strong>Precautions:</strong> {selectedTest.precautions || 'N/A'}</p>
                  <p><strong>Decreased In:</strong> {selectedTest.decreased_in || 'N/A'}</p>
                  <p><strong>Increased In:</strong> {selectedTest.increased_in || 'N/A'}</p>
                </Col>
              </Row>
              
              <hr />
              
              <h6>Test Components ({selectedTestComponents.length})</h6>
              {selectedTestComponents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Normal From</th>
                        <th>Normal To</th>
                        <th>Reference Range</th>
                        <th>C Low</th>
                        <th>C High</th>
                        <th>Gender</th>
                        <th>Age Start</th>
                        <th>Age End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTestComponents.map((component, index) => (
                        <tr key={index}>
                          <td>{component.name}</td>
                          <td>{component.unit}</td>
                          <td>{component.normal_from || 'N/A'}</td>
                          <td>{component.normal_to || 'N/A'}</td>
                          <td>{component.reference_range || 'N/A'}</td>
                          <td>{component.c_low || 'N/A'}</td>
                          <td>{component.c_high || 'N/A'}</td>
                          <td>{
                            component.gender === 'm' || component.gender === 'Male'
                              ? 'Male'
                              : component.gender === 'f' || component.gender === 'Female'
                              ? 'Female'
                              : 'Any'
                          }</td>
                          <td>{
                            component.age_start !== undefined && component.age_start !== null && component.age_start !== ''
                              ? component.age_start
                              : 'Any'
                          }</td>
                          <td>{
                            component.age_end !== undefined && component.age_end !== null && component.age_end !== ''
                              ? component.age_end
                              : 'Any'
                          }</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No components defined for this test.</p>
              )}
              
              <hr />
              
              <h6>Questions ({selectedTest?.questions?.length || 0})</h6>
              {selectedTest?.questions && selectedTest.questions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTest.questions.map((question, index) => (
                        <tr key={index}>
                          <td>{question.text}</td>
                          <td>{question.category || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No questions defined for this test.</p>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingTest ? "Edit Test" : "Add New Test"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {modalError && (
              <Alert variant="danger" onClose={() => setModalError(null)} dismissible>
                {modalError}
              </Alert>
            )}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.name} 
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (modalError) setModalError(null); // Clear error when user starts typing
                    }} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Shortcut</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.shortcut} 
                    onChange={e => {
                      setFormData({ ...formData, shortcut: e.target.value });
                      if (modalError) setModalError(null); // Clear error when user starts typing
                    }} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <div className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      className="flex-grow-1"
                    />
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowAddCategoryModal(true)}
                      title="Add New Category"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <Form.Select 
                    value={formData.category_id} 
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    isInvalid={!formData.category_id}
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter(cat => 
                        cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                      )
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Please select a category
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sample Type</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search sample types..."
                    value={sampleTypeSearchTerm}
                    onChange={(e) => setSampleTypeSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <Form.Select 
                    value={formData.sample_type_id} 
                    onChange={e => setFormData({ ...formData, sample_type_id: e.target.value })}
                  >
                    <option value="">Select Sample Type</option>
                    {sampleTypes
                      .filter(sample => 
                        sample.type.toLowerCase().includes(sampleTypeSearchTerm.toLowerCase())
                      )
                      .map(sample => (
                        <option key={sample.id} value={sample.id}>{sample.type}</option>
                      ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01"
                    value={formData.price} 
                    onChange={e => setFormData({ ...formData, price: e.target.value })} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cost</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01"
                    value={formData.cost} 
                    onChange={e => setFormData({ ...formData, cost: e.target.value })} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lab to Lab</Form.Label>
                  <Form.Select 
                    value={formData.lab_to_lab} 
                    onChange={e => setFormData({ ...formData, lab_to_lab: e.target.value })}
                  >
                    <option value="">Select Lab to Lab Status</option>
                    <option value="IN">In</option>
                    <option value="OUT">Out</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lab Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.lab_name} 
                    onChange={e => setFormData({ ...formData, lab_name: e.target.value })} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Precautions</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2}
                    value={formData.precautions} 
                    onChange={e => setFormData({ ...formData, precautions: e.target.value })} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Decreased In</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.decreased_in} 
                    onChange={e => setFormData({ ...formData, decreased_in: e.target.value })} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Increased In</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.increased_in} 
                    onChange={e => setFormData({ ...formData, increased_in: e.target.value })} 
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Test Components Section */}
            <Card className="mt-4">
              <Card.Header>
                <h6 className="mb-0">Test Components</h6>
              </Card.Header>
              <Card.Body>
                {/* Add New Component - Refactored to column layout */}
                <div className="mb-3">
                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Component Name *</Form.Label>
                        <Form.Control
                          placeholder="Component Name"
                          value={newComponent.name}
                          onChange={e => setNewComponent({ ...newComponent, name: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Unit *</Form.Label>
                        <Form.Control
                          placeholder="Unit"
                          value={newComponent.unit}
                          onChange={e => setNewComponent({ ...newComponent, unit: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Result Type</Form.Label>
                        <Form.Select
                          value={newComponent.result_type || 'range'}
                          onChange={e => setNewComponent({ ...newComponent, result_type: e.target.value })}
                        >
                          <option value="range">Range</option>
                          <option value="boolean">Boolean (Positive/Negative)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  {newComponent.result_type === 'boolean' ? (
                    <Row className="g-2 mt-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Reference Range</Form.Label>
                          <Form.Control
                            placeholder="e.g., Positive/Negative"
                            value={newComponent.reference_range}
                            onChange={e => setNewComponent({ ...newComponent, reference_range: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  ) : (
                    <Row className="g-2 mt-2">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Normal From *</Form.Label>
                          <Form.Control
                            placeholder="Normal From"
                            value={newComponent.normal_from}
                            onChange={e => setNewComponent({ ...newComponent, normal_from: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Normal To *</Form.Label>
                          <Form.Control
                            placeholder="Normal To"
                            value={newComponent.normal_to}
                            onChange={e => setNewComponent({ ...newComponent, normal_to: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Reference Range</Form.Label>
                          <Form.Control
                            placeholder="e.g., 0.22 - 5.1 mg/dL"
                            value={newComponent.reference_range}
                            onChange={e => setNewComponent({ ...newComponent, reference_range: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                  <Row className="g-2 mt-2">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>C Low</Form.Label>
                        <Form.Control
                          placeholder="C Low"
                          value={newComponent.c_low}
                          onChange={e => setNewComponent({ ...newComponent, c_low: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>C High</Form.Label>
                        <Form.Control
                          placeholder="C High"
                          value={newComponent.c_high}
                          onChange={e => setNewComponent({ ...newComponent, c_high: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          value={newComponent.gender}
                          onChange={e => setNewComponent({ ...newComponent, gender: e.target.value })}
                        >
                          <option value="">Gender</option>
                          <option value="m">Male</option>
                          <option value="f">Female</option>
                          <option value="both">Both (Male & Female)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label>Age Start</Form.Label>
                        <Form.Control
                          placeholder="Age Start"
                          type="number"
                          value={newComponent.age_start}
                          onChange={e => setNewComponent({ ...newComponent, age_start: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label>Age End</Form.Label>
                        <Form.Control
                          placeholder="Age End"
                          type="number"
                          value={newComponent.age_end}
                          onChange={e => setNewComponent({ ...newComponent, age_end: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={1} className="d-flex align-items-end">
                      <Button variant="outline-primary" size="sm" onClick={addComponent} className="w-100">
                        <Plus size={16} />
                      </Button>
                    </Col>
                  </Row>
                </div>
                {componentError && (
                  <Alert variant="danger" className="mb-3">
                    {componentError}
                  </Alert>
                )}
                {/* Existing Components - Card layout for clarity */}
                <div className="mt-4">
                  {testComponents.length === 0 ? (
                    <div className="text-muted">No components added yet.</div>
                  ) : (
                    <Row className="g-3">
                      {testComponents.map((component, index) => (
                        <Col md={6} lg={4} key={component.id || index}>
                          <Card className="h-100 shadow-sm">
                            <Card.Header className="d-flex justify-content-between align-items-center bg-light">
                              <div>
                                <strong>{component.name || <span className="text-muted">Unnamed</span>}</strong>
                                <span className="ms-2 badge bg-secondary">{component.result_type === 'boolean' ? 'Boolean' : 'Range'}</span>
                              </div>
                              <Button variant="outline-danger" size="sm" onClick={() => removeComponent(index)} title="Remove Component">
                                <X size={16} />
                              </Button>
                            </Card.Header>
                            <Card.Body>
                              <div className="mb-2"><strong>Unit:</strong> {component.unit || <span className="text-muted">N/A</span>}</div>
                              {component.result_type === 'boolean' ? (
                                <>
                                  <div className="mb-2"><strong>Reference Range:</strong> {component.reference_range || <span className="text-muted">N/A</span>}</div>
                                </>
                              ) : (
                                <>
                                  <div className="mb-2"><strong>Normal From:</strong> {component.normal_from || <span className="text-muted">N/A</span>}</div>
                                  <div className="mb-2"><strong>Normal To:</strong> {component.normal_to || <span className="text-muted">N/A</span>}</div>
                                  <div className="mb-2"><strong>Reference Range:</strong> {component.reference_range || <span className="text-muted">N/A</span>}</div>
                                </>
                              )}
                              <div className="mb-2"><strong>C Low:</strong> {component.c_low || <span className="text-muted">N/A</span>}</div>
                              <div className="mb-2"><strong>C High:</strong> {component.c_high || <span className="text-muted">N/A</span>}</div>
                              <div className="mb-2"><strong>Gender:</strong> {component.gender === 'Male' ? 'Male' : component.gender === 'Female' ? 'Female' : <span className="text-muted">Any</span>}</div>
                              <div className="mb-2"><strong>Age Start:</strong> {component.age_start || <span className="text-muted">Any</span>}</div>
                              <div className="mb-2"><strong>Age End:</strong> {component.age_end || <span className="text-muted">Any</span>}</div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Questions Section */}
            <Card className="mt-4">
              <Card.Header>
                <h6 className="mb-0">Questions</h6>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Select Questions</Form.Label>
                  <div className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      placeholder="Search questions..."
                      value={questionSearchTerm}
                      onChange={(e) => setQuestionSearchTerm(e.target.value)}
                      className="flex-grow-1"
                    />
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowAddQuestionModal(true)}
                      title="Add New Question"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    {questions
                      .filter(question => 
                        question.text.toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
                        (question.category && question.category.toLowerCase().includes(questionSearchTerm.toLowerCase()))
                      )
                      .map(question => (
                        <Form.Check
                          key={question.id}
                          type="checkbox"
                          label={`${question.text} ${question.category ? `(${question.category})` : ''}`}
                          checked={formData.questions.includes(question.id)}
                          onChange={(e) => {
                            const selected = formData.questions.includes(question.id)
                              ? formData.questions.filter(id => id !== question.id)
                              : [...formData.questions, question.id];
                            setFormData({ ...formData, questions: selected });
                          }}
                        />
                      ))}
                  </div>
                  <Form.Text className="text-muted">
                    Select questions that should be asked for this test
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingTest ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete the test "{testToDelete?.name}"? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Add Question Modal */}
      <Modal show={showAddQuestionModal} onHide={() => setShowAddQuestionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Question Text *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter question text"
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter category"
                value={newQuestion.category}
                onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddQuestionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddQuestion}
            disabled={!newQuestion.text.trim()}
          >
            Add Question
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Category Modal */}
      <Modal show={showAddCategoryModal} onHide={() => setShowAddCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Category Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter category description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddCategoryModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddCategory}
            disabled={!newCategory.name.trim()}
          >
            Add Category
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Tests;
