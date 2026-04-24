import React, { useState, useEffect, useMemo, useContext } from "react";
import PropTypes from "prop-types";
import { Container, Button, Modal, Form } from "react-bootstrap";
import DynamicTable from "../../components/ui/DynamicTable";
import api from "../../utils/api";
// import { ThemeContext } from "../../context/ThemeContext";
import { useToast } from "../../components/ui/ToastContext";

const Suppliers = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  // const { isDarkMode } = useContext(ThemeContext);

  const [formData, setFormData] = useState({
    name: "", contact_info: "", email: "", phone: "", address: ""
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
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", contact_info: "", email: "", phone: "", address: "" });
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
  const columns = ["name", "phone", "email", "contact_info"];

  // Friendly column headers for DynamicTable
  const customHeaders = {
    name: "Supplier Name",
    contact_info: "Contact Person",
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
              <Form.Label className="text-theme">Phone</Form.Label>
              <Form.Control
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
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
