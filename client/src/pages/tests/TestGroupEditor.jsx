import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Form, Card, Table, Modal } from "react-bootstrap";
import { Plus, Pencil, Trash2, Move } from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../../components/ui/LoadingSpinner";



// Category and Component Management UI
const CategoriesManager = ({ categories, onAddCategory, onEditCategory, onDeleteCategory, onAddComponent, onEditComponent, onDeleteComponent, onMoveComponent, directComponents, onMoveToCategory, onMoveToDirect }) => (
  <div>
    {categories.length === 0 && <div className="text-muted">No categories yet.</div>}
    {categories.map((cat, catIdx) => (
      <Card key={cat.id || catIdx} className="mb-2">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <b>{cat.name}</b>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => onEditCategory(cat)} title="Edit Category"><Pencil size={16} /></Button>
            <Button variant="outline-danger" size="sm" onClick={() => onDeleteCategory(cat)} title="Delete Category"><Trash2 size={16} /></Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span>Components</span>
            <Button variant="outline-success" size="sm" onClick={() => onAddComponent(cat)}><Plus size={16} className="me-1" />Add Component</Button>
          </div>
          {cat.tg_components && cat.tg_components.length > 0 ? (
            <ul className="list-group mb-2">
              {cat.tg_components.map((comp, compIdx) => (
                <li key={comp.id || compIdx} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{comp.name}</span>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => onEditComponent(comp, cat)} title="Edit Component"><Pencil size={16} /></Button>
                    <Button variant="outline-danger" size="sm" onClick={() => onDeleteComponent(comp, cat)} title="Delete Component"><Trash2 size={16} /></Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => onMoveToDirect(comp, cat)} title="Move to Direct"><Move size={16} /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="text-muted">No components in this category.</div>}
        </Card.Body>
      </Card>
    ))}
    {/* Move direct components to a category */}
    {directComponents && directComponents.length > 0 && (
      <div className="mt-3">
        <div className="fw-bold mb-2">Move Direct Components to Category</div>
        <ul className="list-group">
          {directComponents.map((comp, idx) => (
            <li key={comp.id || idx} className="list-group-item d-flex justify-content-between align-items-center">
              <span>{comp.name}</span>
              <div className="d-flex gap-2">
                {categories.map((cat, catIdx) => (
                  <Button key={cat.id || catIdx} variant="outline-secondary" size="sm" onClick={() => onMoveToCategory(comp, cat)} title={`Move to ${cat.name}`}><Move size={16} /> {cat.name}</Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const TestGroupEditor = ({ testGroupId, onSave, onCancel }) => {
  // State for the test group and all nested entities
  const [testGroup, setTestGroup] = useState({
    id: null,
    name: "",
    price: "", // add price to state
    tgc_categories: [],
    tg_components: [], // direct components
    tg_fields: [],
    field_comp_options: []
  });
  // Loading and error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add modal state for category/component
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");

  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [componentName, setComponentName] = useState("");
  const [componentCategory, setComponentCategory] = useState(null);
  const [componentReferenceRange, setComponentReferenceRange] = useState("");
  const [componentResultType, setComponentResultType] = useState("range");

  // Field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldName, setFieldName] = useState("");

  // Helper to get all components (direct + in categories)
  const getAllComponents = () => {
    const direct = testGroup.tg_components || [];
    const fromCategories = (testGroup.tgc_categories || []).flatMap(cat => (cat.tg_components || []));
    return [...direct, ...fromCategories];
  };

  // Option modal state
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionName, setOptionName] = useState("");
  const [optionField, setOptionField] = useState(null);
  const [optionComponent, setOptionComponent] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Add success state
  const [success, setSuccess] = useState(false);

  // Fetch data if editing
  useEffect(() => {
    if (testGroupId) {
      setLoading(true);
      setError(null);
      axios.get(`${apiUrl}/test-groups/${testGroupId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => {
          // Transform backend data to match frontend state shape
          const group = res.data;
          setTestGroup({
            id: group.id,
            name: group.name,
            price: group.price || "", // load price
            tgc_categories: (group.tgc_categories || []).map(cat => ({
              ...cat,
              tg_components: cat.tg_components || []
            })),
            tg_components: group.tg_components || [],
            tg_fields: group.tg_fields || [],
            field_comp_options: group.field_comp_options || []
          });
        })
        .catch(() => setError("Failed to load test group."))
        .finally(() => setLoading(false));
    } else {
      // Reset for new group
      setTestGroup({
        id: null,
        name: "",
        price: "",
        tgc_categories: [],
        tg_components: [],
        tg_fields: [],
        field_comp_options: []
      });
    }
  }, [testGroupId]);

  // Handlers for add/edit/delete/move (to be implemented)
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setShowCategoryModal(true);
  };
  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };
  const handleDeleteCategory = (cat) => {
    setTestGroup(prev => ({
      ...prev,
      tgc_categories: prev.tgc_categories.filter(c => c !== cat)
    }));
  };
  const handleCategoryModalSave = () => {
    if (editingCategory) {
      setTestGroup(prev => ({
        ...prev,
        tgc_categories: prev.tgc_categories.map(c => c === editingCategory ? { ...c, name: categoryName } : c)
      }));
    } else {
      setTestGroup(prev => ({
        ...prev,
        tgc_categories: [...prev.tgc_categories, { id: Date.now(), name: categoryName, tg_components: [] }]
      }));
    }
    setShowCategoryModal(false);
  };

  const handleAddComponent = (cat) => {
    setEditingComponent(null);
    setComponentName("");
    setComponentReferenceRange("");
    setComponentResultType("range");
    setComponentCategory(cat);
    setShowComponentModal(true);
  };
  const handleEditComponent = (comp, cat) => {
    setEditingComponent(comp);
    setComponentName(comp.name);
    setComponentReferenceRange(comp.reference_range || "");
    setComponentResultType(comp.result_type || "range");
    setComponentCategory(cat);
    setShowComponentModal(true);
  };
  const handleDeleteComponent = (comp, cat) => {
    if (cat) {
      setTestGroup(prev => ({
        ...prev,
        tgc_categories: prev.tgc_categories.map(c => c === cat ? { ...c, tg_components: c.tg_components.filter(tc => tc !== comp) } : c)
      }));
    } else {
      setTestGroup(prev => ({
        ...prev,
        tg_components: prev.tg_components.filter(tc => tc !== comp)
      }));
    }
  };
  const handleComponentModalSave = () => {
    if (editingComponent) {
      setTestGroup(prev => ({
        ...prev,
        tgc_categories: prev.tgc_categories.map(c => c === componentCategory ? { ...c, tg_components: c.tg_components.map(tc => tc === editingComponent ? { ...tc, name: componentName, reference_range: componentReferenceRange, result_type: componentResultType } : tc) } : c),
        tg_components: prev.tg_components.map(tc => tc === editingComponent ? { ...tc, name: componentName, reference_range: componentReferenceRange, result_type: componentResultType } : tc)
      }));
    } else {
      const newComponent = { id: Date.now(), name: componentName, reference_range: componentReferenceRange, result_type: componentResultType };
      if (componentCategory) {
        setTestGroup(prev => ({
          ...prev,
          tgc_categories: prev.tgc_categories.map(c => c === componentCategory ? { ...c, tg_components: [...c.tg_components, newComponent] } : c)
        }));
      } else {
        setTestGroup(prev => ({
          ...prev,
          tg_components: [...prev.tg_components, newComponent]
        }));
      }
    }
    setShowComponentModal(false);
  };

  const handleMoveToDirect = (comp, cat) => {
    setTestGroup(prev => ({
      ...prev,
      tgc_categories: prev.tgc_categories.map(c => c === cat ? { ...c, tg_components: c.tg_components.filter(tc => tc !== comp) } : c),
      tg_components: [...prev.tg_components, comp]
    }));
  };
  const handleMoveToCategory = (comp, cat) => {
    setTestGroup(prev => ({
      ...prev,
      tg_components: prev.tg_components.filter(tc => tc !== comp),
      tgc_categories: prev.tgc_categories.map(c => c === cat ? { ...c, tg_components: [...(c.tg_components || []), comp] } : c)
    }));
  };

  // Add Option
  const handleAddOption = (field, component) => {
    setEditingOption(null);
    setOptionName("");
    setOptionField(field);
    setOptionComponent(component);
    setShowOptionModal(true);
  };
  const handleEditOption = (option, field, component) => {
    setEditingOption(option);
    setOptionName(option.name);
    setOptionField(field);
    setOptionComponent(component);
    setShowOptionModal(true);
  };
  const handleDeleteOption = (option) => {
    setTestGroup(prev => ({
      ...prev,
      field_comp_options: prev.field_comp_options.filter(o => o !== option)
    }));
  };
  const handleOptionModalSave = () => {
    if (editingOption) {
      setTestGroup(prev => ({
        ...prev,
        field_comp_options: prev.field_comp_options.map(o => o === editingOption ? { ...o, name: optionName } : o)
      }));
    } else {
      setTestGroup(prev => ({
        ...prev,
        field_comp_options: [...prev.field_comp_options, { id: Date.now(), name: optionName, tg_fields_id: optionField.id, tg_component_id: optionComponent.id }]
      }));
    }
    setShowOptionModal(false);
  };

  // Add Field
  const handleAddField = () => {
    setEditingField(null);
    setFieldName("");
    setShowFieldModal(true);
  };

  const handleFieldModalSave = () => {
    if (editingField) {
      setTestGroup(prev => ({
        ...prev,
        tg_fields: prev.tg_fields.map(f => f === editingField ? { ...f, name: fieldName } : f)
      }));
    } else {
      setTestGroup(prev => ({
        ...prev,
        tg_fields: [...prev.tg_fields, { id: Date.now(), name: fieldName }]
      }));
    }
    setShowFieldModal(false);
  };

  // Save handler
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        name: testGroup.name,
        price: testGroup.price !== "" ? parseFloat(testGroup.price) : null, // include price
        tgc_categories: testGroup.tgc_categories,
        tg_components: testGroup.tg_components,
        tg_fields: testGroup.tg_fields,
        field_comp_options: testGroup.field_comp_options
      };
      let response;
      if (testGroupId) {
        response = await axios.put(`${apiUrl}/test-groups/${testGroupId}`, payload, { headers });
      } else {
        response = await axios.post(`${apiUrl}/test-groups`, payload, { headers });
      }
      if (response.data && response.data.success) {
        setSuccess(true);
        if (onSave) onSave(response.data);
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to save test group.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    onCancel && onCancel();
  };

  // UI rendering
  return (
    <Container fluid className="test-group-editor-container">
      <h2>{testGroupId ? "Edit Test Group" : "Add New Test Group"}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">Test group saved successfully!</div>}
      {loading ? (
        <LoadingSpinner message="Loading test group editor..." />
      ) : (
        <>
          {/* Test Group Info */}
          <Card className="mb-3">
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Test Group Name</Form.Label>
                <Form.Control
                  type="text"
                  value={testGroup.name}
                  onChange={e => setTestGroup({ ...testGroup, name: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Price</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={testGroup.price}
                  onChange={e => setTestGroup({ ...testGroup, price: e.target.value })}
                  required
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Categories and Components Section */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Categories</span>
              <Button variant="primary" size="sm" onClick={handleAddCategory}><Plus size={16} className="me-1" />Add Category</Button>
            </Card.Header>
            <Card.Body>
              <CategoriesManager
                categories={testGroup.tgc_categories}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddComponent={handleAddComponent}
                onEditComponent={handleEditComponent}
                onDeleteComponent={handleDeleteComponent}
                onMoveComponent={() => {}}
                directComponents={testGroup.tg_components}
                onMoveToCategory={handleMoveToCategory}
                onMoveToDirect={handleMoveToDirect}
              />
            </Card.Body>
          </Card>

          {/* Direct Components Section */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Direct Components</span>
              <Button variant="primary" size="sm" onClick={() => { setEditingComponent(null); setComponentName(""); setComponentCategory(null); setShowComponentModal(true); }}><Plus size={16} className="me-1" />Add Component</Button>
            </Card.Header>
            <Card.Body>
              {testGroup.tg_components.length === 0 ? (
                <div className="text-muted">No direct components yet.</div>
              ) : (
                <ul className="list-group mb-2">
                  {testGroup.tg_components.map((comp, idx) => (
                    <li key={comp.id || idx} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{comp.name}</span>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => { setEditingComponent(comp); setComponentName(comp.name); setComponentCategory(null); setShowComponentModal(true); }} title="Edit Component"><Pencil size={16} /></Button>
                        <Button variant="outline-danger" size="sm" onClick={() => setTestGroup(prev => ({ ...prev, tg_components: prev.tg_components.filter(tc => tc !== comp) }))} title="Delete Component"><Trash2 size={16} /></Button>
                        {testGroup.tgc_categories.length > 0 && (
                          <div className="d-flex gap-1">
                            {testGroup.tgc_categories.map((cat, catIdx) => (
                              <Button key={cat.id || catIdx} variant="outline-secondary" size="sm" onClick={() => handleMoveToCategory(comp, cat)} title={`Move to ${cat.name}`}><Move size={16} /> {cat.name}</Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>

          {/* Fields Section */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Fields</span>
              <Button variant="primary" size="sm" onClick={handleAddField}><Plus size={16} className="me-1" />Add Field</Button>
            </Card.Header>
            <Card.Body>
              {testGroup.tg_fields.length === 0 ? (
                <div className="text-muted">No fields yet.</div>
              ) : (
                <ul className="list-group mb-2">
                  {testGroup.tg_fields.map((field, idx) => (
                    <li key={field.id || idx} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{field.name}</span>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => { setEditingField(field); setFieldName(field.name); setShowFieldModal(true); }} title="Edit Field"><Pencil size={16} /></Button>
                        <Button variant="outline-danger" size="sm" onClick={() => setTestGroup(prev => ({ ...prev, tg_fields: prev.tg_fields.filter(f => f !== field) }))} title="Delete Field"><Trash2 size={16} /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>

          {/* Field/Component Options Matrix Section */}
          <Card className="mb-3">
            <Card.Header>Component / Field Options Matrix</Card.Header>
            <Card.Body>
              {testGroup.tg_fields.length === 0 || getAllComponents().length === 0 ? (
                <div className="text-muted">Add fields and components to manage options.</div>
              ) : (
                <Table bordered responsive>
                  <thead>
                    <tr>
                      <th>Component \ Field</th>
                      {testGroup.tg_fields.map((field, idx) => (
                        <th key={field.id || idx}>{field.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getAllComponents().map((comp, cIdx) => (
                      <tr key={comp.id || cIdx}>
                        <td><b>{comp.name}</b></td>
                        {testGroup.tg_fields.map((field, fIdx) => {
                          const options = testGroup.field_comp_options.filter(o => o.tg_fields_id === field.id && o.tg_component_id === comp.id);
                          return (
                            <td key={field.id || fIdx}>
                              <ul className="list-unstyled mb-1">
                                {options.map((option, oIdx) => (
                                  <li key={option.id || oIdx} className="d-flex justify-content-between align-items-center">
                                    <span>{option.name}</span>
                                    <div className="d-flex gap-1">
                                      <Button variant="outline-primary" size="sm" onClick={() => handleEditOption(option, field, comp)} title="Edit Option"><Pencil size={14} /></Button>
                                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteOption(option)} title="Delete Option"><Trash2 size={14} /></Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <Button variant="outline-success" size="sm" onClick={() => handleAddOption(field, comp)}><Plus size={14} /> Add</Button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Save/Cancel Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="success" onClick={handleSave}>Save</Button>
          </div>
        </>
      )}

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCategory ? "Edit Category" : "Add Category"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Category Name</Form.Label>
            <Form.Control type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCategoryModalSave}>{editingCategory ? "Update" : "Add"}</Button>
        </Modal.Footer>
      </Modal>

      {/* Component Modal */}
      <Modal show={showComponentModal} onHide={() => setShowComponentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingComponent ? "Edit Component" : "Add Component"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Component Name</Form.Label>
            <Form.Control type="text" value={componentName} onChange={e => setComponentName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Result Type</Form.Label>
            <Form.Select value={componentResultType} onChange={e => setComponentResultType(e.target.value)}>
              <option value="range">Range</option>
              <option value="boolean">Boolean (Positive/Negative)</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Reference Range</Form.Label>
            <Form.Control 
              type="text" 
              value={componentReferenceRange} 
              onChange={e => setComponentReferenceRange(e.target.value)}
              placeholder="e.g., 0.22 - 5.1 or Positive/Negative"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowComponentModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleComponentModalSave}>{editingComponent ? "Update" : "Add"}</Button>
        </Modal.Footer>
      </Modal>

      {/* Option Modal */}
      <Modal show={showOptionModal} onHide={() => setShowOptionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingOption ? "Edit Option" : "Add Option"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Option Name</Form.Label>
            <Form.Control type="text" value={optionName} onChange={e => setOptionName(e.target.value)} required />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOptionModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleOptionModalSave}>{editingOption ? "Update" : "Add"}</Button>
        </Modal.Footer>
      </Modal>

      {/* Field Modal */}
      <Modal show={showFieldModal} onHide={() => setShowFieldModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingField ? "Edit Field" : "Add Field"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Field Name</Form.Label>
            <Form.Control type="text" value={fieldName} onChange={e => setFieldName(e.target.value)} required />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFieldModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleFieldModalSave}>{editingField ? "Update" : "Add"}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TestGroupEditor;