import React, { useState, useEffect, useMemo, useContext } from "react";
import PropTypes from "prop-types";
import { Container, Button, Modal, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import DynamicTable from "../../components/ui/DynamicTable";
import api from "../../utils/api";
import { ThemeContext } from "../../context/ThemeContext";

const InventoryItems = () => {
  const { role } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "", category: "Reagent", unit: "", min_stock_level: 0, description: ""
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/items");
      setItems(res.data);
    } catch (error) {
      console.error("Failed to fetch inventory items", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleShowModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ name: "", category: "Reagent", unit: "", min_stock_level: 0, description: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/inventory/items/${editingItem.id}`, formData);
      } else {
        await api.post("/inventory/items", formData);
      }
      handleCloseModal();
      fetchItems();
    } catch (error) {
      console.error("Error saving item", error);
      alert(error.response?.data?.message || "Failed to save item");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await api.delete(`/inventory/items/${id}`);
        fetchItems();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to delete item");
      }
    }
  };

  const ActionComponent = useMemo(() => {
    const Component = ({ item }) => (
      <div className="d-flex gap-2">
        <Button variant="success" size="sm" onClick={() => navigate(`/${role}/inventory/items/${item.id}/batches`)}>Stock/Batches</Button>
        <Button variant="outline-primary" size="sm" onClick={() => handleShowModal(item)}>Edit</Button>
        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    );
    Component.displayName = "ItemActionComponent";
    Component.propTypes = {
      item: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      }).isRequired,
    };
    return Component;
  }, [navigate, role]);

  const formatCellData = useMemo(() => {
    const formatter = (key, value, item) => {
      if (key === 'total_stock') {
        const isLowStock = value <= item.min_stock_level;
        return <span className={isLowStock ? 'text-danger fw-bold' : ''}>{value} {item.unit}</span>;
      }
      return value;
    };
    formatter.displayName = "ItemFormatCellData";
    return formatter;
  }, []);

  const columns = [
    { key: "name", label: "Item Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    { key: "total_stock", label: "Current Stock", sortable: true },
    { key: "min_stock_level", label: "Min Level", sortable: true },
    { key: "unit", label: "Unit", sortable: false },
  ];

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-theme">Inventory Catalog</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Add Item</Button>
      </div>

      <DynamicTable
        data={items}
        columns={columns}
        ActionComponent={ActionComponent}
        formatCellData={formatCellData}
        loading={loading}
        searchKeys={["name", "category"]}
        emptyMessage="No inventory items found."
      />

      <Modal show={showModal} onHide={handleCloseModal} data-bs-theme={isDarkMode ? 'dark' : 'light'}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="bg-theme-surface">
            <Modal.Title className="text-theme">{editingItem ? "Edit Item" : "Add Item"}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-theme-surface">
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Item Name *</Form.Label>
              <Form.Control
                type="text" required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Category *</Form.Label>
              <Form.Select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="Reagent">Reagent</option>
                <option value="Consumable">Consumable</option>
                <option value="Kit">Kit</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Unit (e.g., ml, box, tests) *</Form.Label>
              <Form.Control
                type="text" required
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Minimum Stock Level</Form.Label>
              <Form.Control
                type="number" step="0.01" min="0"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
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

export default InventoryItems;
