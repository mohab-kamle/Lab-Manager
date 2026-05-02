import axios from "axios";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col, Card } from "react-bootstrap";
import PropTypes from 'prop-types';
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, X, Download, Upload, CircleX, Search } from "lucide-react";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";
import GlobalCatalogPickerModal from "./GlobalCatalogPickerModal";

/**
 * Self-contained inline form for adding a reference range to an existing component.
 * Each instance manages its own local state so multiple components can have their
 * own independent "add range" sub-forms without conflicting.
 * Uses labeled fields in two rows for readability.
 */
const RangeAdder = ({ onAdd }) => {
  const [range, setRange] = useState({
    gender: "", age_min: "", age_max: "", min: "", max: "", panic_min: "", panic_max: "",
  });
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!range.min && !range.max) {
      setError("At least Normal Min or Normal Max is required");
      return;
    }
    setError("");
    onAdd(range);
    setRange({ gender: "", age_min: "", age_max: "", min: "", max: "", panic_min: "", panic_max: "" });
  };

  return (
    <div className="mt-3 p-3 border rounded" style={{ background: '#f8f9fa' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="fw-bold text-secondary">Add Reference Range</small>
      </div>
      {error && <Alert variant="danger" className="py-1 mb-2 small">{error}</Alert>}

      {/* Row 1: Demographics */}
      <Row className="g-2 mb-2">
        <Col md={4}>
          <Form.Label className="small mb-1">Gender</Form.Label>
          <Form.Select size="sm" value={range.gender} onChange={e => setRange({ ...range, gender: e.target.value })}>
            <option value="">Any Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Label className="small mb-1">Age Min (years)</Form.Label>
          <Form.Control size="sm" type="number" placeholder="e.g. 0" value={range.age_min} onChange={e => setRange({ ...range, age_min: e.target.value })} />
        </Col>
        <Col md={4}>
          <Form.Label className="small mb-1">Age Max (years)</Form.Label>
          <Form.Control size="sm" type="number" placeholder="e.g. 120" value={range.age_max} onChange={e => setRange({ ...range, age_max: e.target.value })} />
        </Col>
      </Row>

      {/* Row 2: Reference values */}
      <Row className="g-2 align-items-end">
        <Col md={2}>
          <Form.Label className="small mb-1">Normal Min</Form.Label>
          <Form.Control size="sm" type="number" step="any" placeholder="—" value={range.min} onChange={e => setRange({ ...range, min: e.target.value })} />
        </Col>
        <Col md={2}>
          <Form.Label className="small mb-1">Normal Max</Form.Label>
          <Form.Control size="sm" type="number" step="any" placeholder="—" value={range.max} onChange={e => setRange({ ...range, max: e.target.value })} />
        </Col>
        <Col md={2}>
          <Form.Label className="small mb-1">Panic Low</Form.Label>
          <Form.Control size="sm" type="number" step="any" placeholder="—" value={range.panic_min} onChange={e => setRange({ ...range, panic_min: e.target.value })} />
        </Col>
        <Col md={2}>
          <Form.Label className="small mb-1">Panic High</Form.Label>
          <Form.Control size="sm" type="number" step="any" placeholder="—" value={range.panic_max} onChange={e => setRange({ ...range, panic_max: e.target.value })} />
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button variant="success" size="sm" onClick={handleAdd} className="w-100">
            <Plus size={14} className="me-1" />Add Range
          </Button>
        </Col>
      </Row>
    </div>
  );
};
RangeAdder.propTypes = {
  onAdd: PropTypes.func.isRequired,
};


const Tests = () => {
  const { toast } = useToast();
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [outsourcedLabs, setOutsourcedLabs] = useState([]); // Outsourced labs for the "Lab Name" dropdown
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
  const [selectedTests, setSelectedTests] = useState([]);
  const [showGlobalCatalogModal, setShowGlobalCatalogModal] = useState(false);
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
    type: "single",
    questions: [] // Array of question IDs
  });
  const [testComponents, setTestComponents] = useState([]);
  // Component being built — core identity fields only.
  // Reference ranges live inside each component's reference_ranges array.
  const [newComponent, setNewComponent] = useState({
    name: "",
    unit: "",
    result_type: "range",         // range | boolean | culture_panel
    reference_range: "",          // for boolean result type display text
    reference_ranges: [],         // array of { gender, age_min, age_max, min, max, panic_min, panic_max }
  });
  // State for the "add range" sub-form within a component
  const [newRange, setNewRange] = useState({
    gender: "",
    age_min: "",
    age_max: "",
    min: "",
    max: "",
    panic_min: "",
    panic_max: "",
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
  const fetchTestsAndRelated = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const [testsResponse, categoriesResponse, samplesResponse, questionsResponse, outsourcedLabsResponse] = await Promise.all([
        axios.get(`${apiUrl}/tests/all-with-components`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/samples`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/questions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/outsourced-labs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (Array.isArray(testsResponse.data)) {
        setTests(testsResponse.data);
        const headers = new Set();
        testsResponse.data.forEach((item) => {
          Object.keys(item).forEach((key) => {
            if (key !== 'components' && key !== 'category' && key !== 'sample_type') headers.add(key);
          });
        });
        setTableHeaders([...headers]);
      }
      setCategories(categoriesResponse.data);
      setSampleTypes(samplesResponse.data);
      setQuestions(questionsResponse.data);
      // Populate outsourced labs list for the Lab Name dropdown
      if (Array.isArray(outsourcedLabsResponse.data)) {
        setOutsourcedLabs(outsourcedLabsResponse.data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to fetch data. Please try again later.");
      toast.error(error.response?.data?.error || "Failed to fetch data. Please try again later.");
    }
    setLoading(false);
  }, [apiUrl, toast]);

  useEffect(() => {
    fetchTestsAndRelated();
  }, [fetchTestsAndRelated]);

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

  const handleViewDetails = useCallback(async (test) => {
    setSelectedTest(test);
    setSelectedTestComponents(test.components || []);
    setShowDetailsModal(true);
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedTests(currentTests.map(t => t.id));
    } else {
      setSelectedTests([]);
    }
  }, [currentTests]);

  const handleSelectItem = useCallback((id, checked) => {
    setSelectedTests(prev =>
      checked ? [...prev, id] : prev.filter(testId => testId !== id)
    );
  }, []);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTests.length} tests?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/tests/bulk-delete`, { testIds: selectedTests }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTests([]);
      fetchTestsAndRelated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to bulk delete tests");
    }
  };

  const formatCellData = useCallback((data, header) => {
    if (header === 'Actions') {
      return null; // This will be handled by ActionComponent
    }

    // Handle components/structure_config array specifically
    if ((header === 'components' || header === 'structure_config' || header === 'Structure Config') && Array.isArray(data)) {
      if (data.length === 0) return "No components";

      const ComponentsCell = () => {
        const [expanded, setExpanded] = useState(false);

        return (
          <div>
            <Button
              variant="outline-info"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mb-1"
            >
              {expanded ? 'Hide' : 'Show'} Components ({data.length})
            </Button>
            {expanded && (
              <div className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {data.map((component, index) => (
                  <div key={index} className="border rounded p-2 mb-1" style={{ fontSize: '0.85em' }}>
                    <strong>{component.name || component.label || 'Unnamed'}</strong>
                    {component.unit && <span className="text-muted"> ({component.unit})</span>}
                    <br />
                    {/* Show nested reference ranges if available */}
                    {Array.isArray(component.reference_ranges) && component.reference_ranges.length > 0 ? (
                      <span className="text-success">
                        {component.reference_ranges.map((r, ri) =>
                          `${r.gender ? r.gender + ': ' : ''}${r.min ?? '-'}–${r.max ?? '-'}`
                        ).join(' | ')}
                      </span>
                    ) : component.reference_range ? (
                      <span className="text-info">Ref: {component.reference_range}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      };

      return <ComponentsCell />;
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
  }, [categories, sampleTypes]);

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
      type: "single",
      questions: []
    });
    setTestComponents([]);
    setNewComponent({
      name: "",
      unit: "",
      result_type: "range",
      reference_range: "",
      reference_ranges: [],
    });
    setNewRange({
      gender: "",
      age_min: "",
      age_max: "",
      min: "",
      max: "",
      panic_min: "",
      panic_max: "",
    });
    // Clear search terms
    setCategorySearchTerm("");
    setSampleTypeSearchTerm("");
    setQuestionSearchTerm("");
    setShowModal(true);
  };

  const handleEdit = useCallback(async (test) => {
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
      type: test.type || "single",
      questions: test.questions ? test.questions.map(q => q.id) : []
    });

    // Fetch test components for this test — backend now returns the full reference_ranges array
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/tests/${test.id}/components`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Components now come with the full reference_ranges array attached
      const mappedComponents = (response.data || []).map((component, idx) => ({
        ...component,
        id: component.id || Date.now() + idx, // ensure each component has an id for keying
        reference_ranges: Array.isArray(component.reference_ranges) ? component.reference_ranges : [],
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
  }, [apiUrl]);

  const handleDelete = useCallback((test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  }, []);

  // Adds a reference range entry to the component being built (before it's committed to the list)
  const addRangeToNewComponent = () => {
    // Validate: at least min or max should be provided for range type
    if (newComponent.result_type === 'range' && !newRange.min && !newRange.max) {
      setComponentError("At least Normal Min or Normal Max is required");
      return;
    }
    setComponentError("");
    setNewComponent(prev => ({
      ...prev,
      reference_ranges: [...prev.reference_ranges, { ...newRange, id: Date.now() }],
    }));
    // Reset the range sub-form for the next entry
    setNewRange({
      gender: "",
      age_min: "",
      age_max: "",
      min: "",
      max: "",
      panic_min: "",
      panic_max: "",
    });
  };

  // Removes a range from the component being built
  const removeRangeFromNewComponent = (rangeIndex) => {
    setNewComponent(prev => ({
      ...prev,
      reference_ranges: prev.reference_ranges.filter((_, i) => i !== rangeIndex),
    }));
  };

  // Adds a reference range entry to an already-committed component in the testComponents list
  const addRangeToExistingComponent = (componentIndex, range) => {
    setTestComponents(prev => prev.map((comp, i) => {
      if (i !== componentIndex) return comp;
      return {
        ...comp,
        reference_ranges: [...(comp.reference_ranges || []), { ...range, id: Date.now() }],
      };
    }));
  };

  // Removes a reference range from an already-committed component
  const removeRangeFromExistingComponent = (componentIndex, rangeIndex) => {
    setTestComponents(prev => prev.map((comp, i) => {
      if (i !== componentIndex) return comp;
      return {
        ...comp,
        reference_ranges: comp.reference_ranges.filter((_, ri) => ri !== rangeIndex),
      };
    }));
  };

  const addComponent = () => {
    setComponentError("");

    if (!newComponent.name.trim()) {
      setComponentError("Component name is required");
      return;
    }
    // For range type, at least one reference range should be added
    if (newComponent.result_type === 'range' && newComponent.reference_ranges.length === 0) {
      setComponentError("Add at least one reference range for this component");
      return;
    }

    setTestComponents([...testComponents, { ...newComponent, id: Date.now() }]);
    setNewComponent({
      name: "",
      unit: "",
      result_type: "range",
      reference_range: "",
      reference_ranges: [],
    });
  };

  const removeComponent = (index) => {
    setTestComponents(testComponents.filter((_, i) => i !== index));
  };

  const handleAddQuestion = async () => {
    try {
      if (!newQuestion.text.trim()) {
        toast.error('Question text is required');
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

      toast.success('Question created successfully!');
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error(error.response?.data?.error || 'Failed to create question');
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!newCategory.name.trim()) {
        toast.error('Category name is required');
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

      toast.success('Category created successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.error || 'Failed to create category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Test name is required');
      return;
    }
    if (!formData.category_id) {
      toast.error('Category is required');
      return;
    }
    // When outsourcing, the user must select which lab performs the test
    if (formData.lab_to_lab === 'OUT' && !formData.lab_name.trim()) {
      toast.error('Lab Name is required when Lab to Lab is set to "Out"');
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
      toast.success(editingTest ? "Test updated successfully!" : "Test created successfully!");
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
        type: "single",
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
      toast.success("Test deleted successfully!");
      setShowDeleteModal(false);
      setTestToDelete(null);
      // Refresh using extracted logic
      await fetchTestsAndRelated();
    } catch (error) {
      setError("Failed to delete test");
    }
  };

  const ActionComponent = useMemo(() => {
    const Component = ({ rowData }) => (
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
    Component.displayName = "ActionComponent";
    Component.propTypes = {
      rowData: PropTypes.object.isRequired
    };
    return Component;
  }, [handleViewDetails, handleEdit, handleDelete]);

  // XLSX Export Handler
  const handleExportXLSX = async () => {
    try {
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

      const result = await exportToExcel(exportData, 'tests', 'Tests');
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export tests');
    }
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
      toast.success(`Imported: ${response.data.imported}, Updated: ${response.data.updated}, Errors: ${response.data.errors.length}`);
      await fetchTestsAndRelated();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to import tests');
    }
  };

  return (
    <Container fluid className="tests-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h2>Tests</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-success" onClick={handleExportXLSX}>
            <Download size={16} className="me-2" />
            Export XLSX
          </Button>
          <Button variant="outline-info" as="label">
            <Upload size={16} className="me-2" />
            Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportXLSX} />
          </Button>
          <Button variant="primary" onClick={() => setShowGlobalCatalogModal(true)}>
            <Search size={16} className="me-2" />Search Global Catalog
          </Button>
          {selectedTests.length > 0 && (
            <Button variant="danger" onClick={handleBulkDelete}>
              <Trash2 size={16} className="me-2" />
              Delete Selected ({selectedTests.length})
            </Button>
          )}
          <Button variant="primary" onClick={handleAdd}><Plus size={16} className="me-2" />Add Test</Button>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading tests..." />
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
            showCheckboxes={true}
            selectedItems={selectedTests}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
          />
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={handlePageChange}
          />
        </>
      )}

      <GlobalCatalogPickerModal
        show={showGlobalCatalogModal}
        onHide={() => setShowGlobalCatalogModal(false)}
        onImportSuccess={() => {
          setShowGlobalCatalogModal(false);
          fetchTestsAndRelated();
        }}
      />

      {/* Test Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header>
          <Modal.Title>Test Details: {selectedTest?.name}</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowDetailsModal(false)}>
            <CircleX size={24} />
          </button>
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
                  <p><strong>Type:</strong> {selectedTest.type || 'single'}</p>
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
                <div>
                  {selectedTestComponents.map((component, index) => (
                    <Card key={index} className="mb-2 shadow-sm">
                      <Card.Header className="py-2 bg-light">
                        <strong>{component.name}</strong>
                        {component.unit && <span className="text-muted ms-2">({component.unit})</span>}
                        <span className="ms-2 badge bg-secondary">{component.result_type === 'boolean' ? 'Boolean' : component.result_type === 'culture_panel' ? 'Culture' : 'Range'}</span>
                      </Card.Header>
                      <Card.Body className="py-2">
                        {component.result_type === 'boolean' ? (
                          <div><strong>Reference:</strong> {component.reference_range || 'N/A'}</div>
                        ) : component.result_type === 'culture_panel' ? (
                          <div className="text-info"><em>Dynamic Culture Inputs</em></div>
                        ) : component.reference_ranges && component.reference_ranges.length > 0 ? (
                          <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.85em' }}>
                            <thead className="table-light">
                              <tr>
                                <th>Gender</th>
                                <th>Age Min</th>
                                <th>Age Max</th>
                                <th>Normal Min</th>
                                <th>Normal Max</th>
                                <th>Panic Low</th>
                                <th>Panic High</th>
                              </tr>
                            </thead>
                            <tbody>
                              {component.reference_ranges.map((range, ri) => (
                                <tr key={ri}>
                                  <td>{range.gender || 'Any'}</td>
                                  <td>{range.age_min ?? '-'}</td>
                                  <td>{range.age_max ?? '-'}</td>
                                  <td>{range.min ?? '-'}</td>
                                  <td>{range.max ?? '-'}</td>
                                  <td>{range.panic_min ?? '-'}</td>
                                  <td>{range.panic_max ?? '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-muted small">No reference ranges configured.</div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
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
        <Modal.Header>
          <Modal.Title>{editingTest ? "Edit Test" : "Add New Test"}</Modal.Title>
          <button className="modal-close-btn" onClick={() => setShowModal(false)}>
            <CircleX size={24} />
          </button>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {modalError && (
              <Alert variant="danger" onClose={() => setModalError(null)} dismissible>
                {modalError}
              </Alert>
            )}
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="single">Single</option>
                    <option value="panel">Panel</option>
                    <option value="culture">Culture</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
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
                    onChange={e => {
                      const newValue = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        lab_to_lab: newValue,
                        // Clear lab_name when switching away from "OUT" since it no longer applies
                        lab_name: newValue === 'OUT' ? prev.lab_name : ''
                      }));
                    }}
                  >
                    <option value="">Select Lab to Lab Status</option>
                    <option value="IN">In</option>
                    <option value="OUT">Out</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Lab Name{formData.lab_to_lab === 'OUT' && <span className="text-danger"> *</span>}
                  </Form.Label>
                  {formData.lab_to_lab === 'OUT' ? (
                    // When outsourcing, show a dropdown populated with outsourced labs
                    <Form.Select
                      value={formData.lab_name}
                      onChange={e => setFormData({ ...formData, lab_name: e.target.value })}
                      isInvalid={formData.lab_to_lab === 'OUT' && !formData.lab_name}
                    >
                      <option value="">Select Outsourced Lab</option>
                      {outsourcedLabs.map(lab => (
                        <option key={lab.id} value={lab.name}>
                          {lab.name}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    // When not outsourcing, the field is disabled and empty
                    <Form.Control
                      type="text"
                      value=""
                      disabled
                      placeholder="Only available when Lab to Lab is 'Out'"
                    />
                  )}
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
                {/* ── Step 1: Component Identity ── */}
                <div className="mb-3 p-3 border rounded bg-light">
                  <h6 className="mb-3">Add New Component</h6>
                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Component Name *</Form.Label>
                        <Form.Control
                          placeholder="e.g. WBC, Hemoglobin"
                          value={newComponent.name}
                          onChange={e => setNewComponent({ ...newComponent, name: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Unit</Form.Label>
                        <Form.Control
                          placeholder="e.g. 10*3/uL, g/dL"
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
                          onChange={e => setNewComponent({ ...newComponent, result_type: e.target.value, reference_ranges: [] })}
                        >
                          <option value="range">Range (Numeric)</option>
                          <option value="boolean">Boolean (Positive/Negative)</option>
                          <option value="culture_panel">Culture Panel</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* ── Step 2: Type-specific sub-forms ── */}
                  {newComponent.result_type === 'boolean' ? (
                    <Row className="g-2 mt-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Reference Display</Form.Label>
                          <Form.Control
                            placeholder="e.g., Positive/Negative"
                            value={newComponent.reference_range}
                            onChange={e => setNewComponent({ ...newComponent, reference_range: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  ) : newComponent.result_type === 'culture_panel' ? (
                    <Row className="g-2 mt-2">
                      <Col md={12}>
                        <Alert variant="info" className="py-2 mb-0">
                          <strong>Note:</strong> Culture panels automatically generate inputs for Organism, Colony Count, and Antibiotics during result entry.
                        </Alert>
                      </Col>
                    </Row>
                  ) : (
                    /* ── Range type: Reference Ranges sub-form ── */
                    <div className="mt-3 p-2 border rounded">
                      <h6 className="text-primary mb-2">Reference Ranges</h6>
                      <p className="text-muted small mb-2">
                        Add one or more normal ranges. Use different genders/ages for demographic-specific normals (e.g., Male 4.5–11, Female 4.0–10.5).
                      </p>
                      <Row className="g-2 align-items-end">
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label className="small">Gender</Form.Label>
                            <Form.Select size="sm" value={newRange.gender} onChange={e => setNewRange({ ...newRange, gender: e.target.value })}>
                              <option value="">Any</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="small">Age Min</Form.Label>
                            <Form.Control size="sm" type="number" placeholder="0" value={newRange.age_min} onChange={e => setNewRange({ ...newRange, age_min: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="small">Age Max</Form.Label>
                            <Form.Control size="sm" type="number" placeholder="120" value={newRange.age_max} onChange={e => setNewRange({ ...newRange, age_max: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label className="small">Normal Min *</Form.Label>
                            <Form.Control size="sm" type="number" step="any" placeholder="Min" value={newRange.min} onChange={e => setNewRange({ ...newRange, min: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label className="small">Normal Max *</Form.Label>
                            <Form.Control size="sm" type="number" step="any" placeholder="Max" value={newRange.max} onChange={e => setNewRange({ ...newRange, max: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="small">Panic Low</Form.Label>
                            <Form.Control size="sm" type="number" step="any" placeholder="P.Low" value={newRange.panic_min} onChange={e => setNewRange({ ...newRange, panic_min: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="small">Panic High</Form.Label>
                            <Form.Control size="sm" type="number" step="any" placeholder="P.High" value={newRange.panic_max} onChange={e => setNewRange({ ...newRange, panic_max: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                          <Button variant="outline-success" size="sm" onClick={addRangeToNewComponent} className="w-100">
                            <Plus size={14} className="me-1" />Add Range
                          </Button>
                        </Col>
                      </Row>

                      {/* Show ranges already added to this new component */}
                      {newComponent.reference_ranges.length > 0 && (
                        <div className="mt-2">
                          <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.8em' }}>
                            <thead className="table-light">
                              <tr>
                                <th>Gender</th>
                                <th>Age Min</th>
                                <th>Age Max</th>
                                <th>Normal Min</th>
                                <th>Normal Max</th>
                                <th>Panic Low</th>
                                <th>Panic High</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {newComponent.reference_ranges.map((range, ri) => (
                                <tr key={range.id || ri}>
                                  <td>{range.gender || 'Any'}</td>
                                  <td>{range.age_min || '-'}</td>
                                  <td>{range.age_max || '-'}</td>
                                  <td>{range.min ?? '-'}</td>
                                  <td>{range.max ?? '-'}</td>
                                  <td>{range.panic_min || '-'}</td>
                                  <td>{range.panic_max || '-'}</td>
                                  <td>
                                    <Button variant="outline-danger" size="sm" onClick={() => removeRangeFromNewComponent(ri)} style={{ padding: '0 4px' }}>
                                      <X size={12} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Final: Add Component Button ── */}
                  <div className="mt-3 d-flex justify-content-end">
                    <Button variant="primary" size="sm" onClick={addComponent}>
                      <Plus size={16} className="me-1" />Add Component
                    </Button>
                  </div>
                </div>

                {componentError && (
                  <Alert variant="danger" className="mb-3 mt-2">
                    {componentError}
                  </Alert>
                )}

                {/* ── Existing Components Display ── */}
                <div className="mt-4">
                  {testComponents.length === 0 ? (
                    <div className="text-muted">No components added yet.</div>
                  ) : (
                    <Row className="g-3">
                      {testComponents.map((component, index) => (
                        <Col md={12} key={component.id || index}>
                          <Card className="shadow-sm">
                            <Card.Header className="bg-light">
                              {/* Editable identity row: name + unit + type badge + remove */}
                              <Row className="g-2 align-items-center">
                                <Col md={4}>
                                  <Form.Label className="small mb-1">Component Name</Form.Label>
                                  <Form.Control
                                    size="sm"
                                    value={component.name || ''}
                                    onChange={e => {
                                      const updated = [...testComponents];
                                      updated[index] = { ...updated[index], name: e.target.value };
                                      setTestComponents(updated);
                                    }}
                                    placeholder="e.g. WBC"
                                  />
                                </Col>
                                <Col md={3}>
                                  <Form.Label className="small mb-1">Unit</Form.Label>
                                  <Form.Control
                                    size="sm"
                                    value={component.unit || ''}
                                    onChange={e => {
                                      // Allow editing unit directly on the component card
                                      const updated = [...testComponents];
                                      updated[index] = { ...updated[index], unit: e.target.value };
                                      setTestComponents(updated);
                                    }}
                                    placeholder="e.g. 10³/µL"
                                  />
                                </Col>
                                <Col md={3} className="d-flex align-items-end">
                                  <span className="badge bg-secondary ms-1" style={{ fontSize: '0.8em' }}>
                                    {component.result_type === 'boolean' ? 'Boolean' : component.result_type === 'culture_panel' ? 'Culture Panel' : 'Range'}
                                  </span>
                                </Col>
                                <Col md={2} className="d-flex align-items-end justify-content-end">
                                  <Button variant="outline-danger" size="sm" onClick={() => removeComponent(index)} title="Remove Component">
                                    <X size={16} />
                                  </Button>
                                </Col>
                              </Row>
                            </Card.Header>
                            <Card.Body>
                              {component.result_type === 'boolean' ? (
                                <div className="mb-2"><strong>Reference:</strong> {component.reference_range || <span className="text-muted">N/A</span>}</div>
                              ) : component.result_type === 'culture_panel' ? (
                                <div className="mb-2 text-info"><em>Dynamic Culture Inputs</em></div>
                              ) : (
                                <>
                                  {/* Reference Ranges Table */}
                                  {component.reference_ranges && component.reference_ranges.length > 0 ? (
                                    <table className="table table-sm table-bordered mb-2" style={{ fontSize: '0.85em' }}>
                                      <thead className="table-light">
                                        <tr>
                                          <th>Gender</th>
                                          <th>Age Min</th>
                                          <th>Age Max</th>
                                          <th>Normal Min</th>
                                          <th>Normal Max</th>
                                          <th>Panic Low</th>
                                          <th>Panic High</th>
                                          <th></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {component.reference_ranges.map((range, ri) => (
                                          <tr key={range.id || ri}>
                                            <td>{range.gender || 'Any'}</td>
                                            <td>{range.age_min ?? '-'}</td>
                                            <td>{range.age_max ?? '-'}</td>
                                            <td>{range.min ?? '-'}</td>
                                            <td>{range.max ?? '-'}</td>
                                            <td>{range.panic_min ?? '-'}</td>
                                            <td>{range.panic_max ?? '-'}</td>
                                            <td>
                                              <Button variant="outline-danger" size="sm" onClick={() => removeRangeFromExistingComponent(index, ri)} style={{ padding: '0 4px' }}>
                                                <X size={12} />
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="text-muted small mb-2">No reference ranges configured yet.</div>
                                  )}
                                  {/* Inline Add Range to Existing Component */}
                                  <RangeAdder onAdd={(range) => addRangeToExistingComponent(index, range)} />
                                </>
                              )}
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
