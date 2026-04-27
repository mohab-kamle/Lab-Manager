import React, { useState, useEffect, useMemo, useContext } from "react";
import PropTypes from "prop-types";
import { Container, Button, Modal, Form } from "react-bootstrap";
import DynamicTable from "../../components/ui/DynamicTable";
import api from "../../utils/api";
// import { ThemeContext } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import PhoneInput from "../../components/ui/PhoneInput";
import { Plus, Trash2 } from "lucide-react";

const Suppliers = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  // const { isDarkMode } = useContext(ThemeContext);

  const [formData, setFormData] = useState({
    name: "", 
    contact_info: "", 
    email: "", 
    phoneNumbers: [{ phone: "", type: "personal", is_primary: true }], 
    address: ""
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleShowModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        ...supplier,
        phoneNumbers: supplier.phones && supplier.phones.length > 0 
          ? supplier.phones 
          : [{ phone: "", type: "personal", is_primary: true }]
      });
    } else {
      setEditingSupplier(null);
      setFormData({ 
        name: "", 
        contact_info: "", 
        email: "", 
        phoneNumbers: [{ phone: "", type: "personal", is_primary: true }], 
        address: "" 
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        toast.success("Supplier updated successfully!");
      } else {
        await api.post("/suppliers", formData);
        toast.success("Supplier added successfully!");
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier", error);
      toast.error(error.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success("Supplier deleted successfully!");
        fetchSuppliers();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete supplier");
      }
    }
  };

  const ActionComponent = useMemo(() => {
    // DynamicTable passes row data as 'rowData' prop
    const Component = ({ rowData }) => (
      <div className="d-flex gap-2">
        <Button variant="outline-primary" size="sm" onClick={() => handleShowModal(rowData)}>Edit</Button>
        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rowData.id)}>Delete</Button>
      </div>
    );
    Component.displayName = "SupplierActionComponent";
    Component.propTypes = {
      rowData: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      }).isRequired,
    };
    return Component;
  }, []);

  // DynamicTable expects columns as an array of strings (data keys)
  const columns = ["name", "phones", "email", "contact_info"];

  // Friendly column headers for DynamicTable
  const customHeaders = {
    name: "Supplier Name",
    contact_info: "Contact Person",
    phones: "Phone",
  };

  const formatCellData = (value, field, rowData) => {
    if (value === null || value === undefined) return "-";
    switch (field) {
      case "phones":
        if (!value || value.length === 0) return "-";
        const primary = value.find(p => p.is_primary) || value[0];
        return (
          <div className="d-flex flex-column gap-1">
            <span className="fw-bold">{primary.phone}</span>
            {value.length > 1 && (
              <span className="text-muted" style={{ fontSize: '11px' }}>
                +{value.length - 1} more
              </span>
            )}
          </div>
        );
      default:
        return String(value || "-");
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-theme">Suppliers</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Add Supplier</Button>
      </div>

      <DynamicTable
        data={suppliers}
        columns={columns}
        customHeaders={customHeaders}
        formatCellData={formatCellData}
        ActionComponent={ActionComponent}
        emptyMessage="No suppliers found."
      />

      <Modal show={showModal} onHide={handleCloseModal} /*data-bs-theme={isDarkMode ? 'dark' : 'light'}*/>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="bg-theme-surface">
            <Modal.Title className="text-theme">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-theme-surface">
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Supplier Name *</Form.Label>
              <Form.Control
                type="text" required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Contact Person</Form.Label>
              <Form.Control
                type="text"
                value={formData.contact_info || ""}
                onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Phone Numbers *</Form.Label>
              {formData.phoneNumbers.map((phoneEntry, index) => (
                <div key={index} className="d-flex gap-2 mb-2 align-items-start">
                  <div style={{ flex: 1 }}>
                    <PhoneInput
                      value={phoneEntry.phone}
                      onChange={(val) => {
                        const newPhones = [...formData.phoneNumbers];
                        newPhones[index].phone = val;
                        setFormData({ ...formData, phoneNumbers: newPhones });
                      }}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <Form.Select
                    style={{ width: '130px' }}
                    value={phoneEntry.type}
                    onChange={(e) => {
                      const newPhones = [...formData.phoneNumbers];
                      newPhones[index].type = e.target.value;
                      setFormData({ ...formData, phoneNumbers: newPhones });
                    }}
                  >
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="home">Home</option>
                  </Form.Select>
                  <div className="d-flex flex-column align-items-center">
                    <Form.Check
                      type="radio"
                      name="primaryPhone"
                      checked={phoneEntry.is_primary}
                      onChange={() => {
                        const newPhones = formData.phoneNumbers.map((p, i) => ({
                          ...p,
                          is_primary: i === index
                        }));
                        setFormData({ ...formData, phoneNumbers: newPhones });
                      }}
                      title="Set as primary"
                    />
                    <small className="text-muted" style={{ fontSize: '10px' }}>Primary</small>
                  </div>
                  {formData.phoneNumbers.length > 1 && (
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => {
                        const newPhones = formData.phoneNumbers.filter((_, i) => i !== index);
                        if (phoneEntry.is_primary && newPhones.length > 0) {
                          newPhones[0].is_primary = true;
                        }
                        setFormData({ ...formData, phoneNumbers: newPhones });
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="mt-1"
                onClick={() => {
                  setFormData({
                    ...formData,
                    phoneNumbers: [
                      ...formData.phoneNumbers,
                      { phone: "", type: "personal", is_primary: false }
                    ]
                  });
                }}
              >
                <Plus size={14} className="me-1" /> Add Another Phone
              </Button>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Address</Form.Label>
              <Form.Control
                as="textarea" rows={3}
                value={formData.address || ""}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-theme-surface border-top-0">
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Suppliers;
