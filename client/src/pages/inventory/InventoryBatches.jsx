import React, { useState, useEffect, useContext } from "react";
import { Container, Button, Modal, Form, Tabs, Tab, Table } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { ThemeContext } from "../../context/ThemeContext";

const InventoryBatches = () => {
  const { role, itemId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useContext(ThemeContext);

  const [item, setItem] = useState(null);
  const [batches, setBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);

  const [receiveData, setReceiveData] = useState({
    supplier_id: "", batch_number: "", quantity: "", received_date: new Date().toISOString().split('T')[0], expiration_date: "", cost_per_unit: "", notes: ""
  });

  const [consumeData, setConsumeData] = useState({
    batch_id: "", quantity: "", notes: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, batchesRes, txRes, supRes] = await Promise.all([
        api.get("/inventory/items"),
        api.get(`/inventory/items/${itemId}/batches`),
        api.get(`/inventory/items/${itemId}/transactions`),
        api.get("/suppliers")
      ]);
      const currentItem = itemsRes.data.find(i => i.id === parseInt(itemId));
      setItem(currentItem);
      setBatches(batchesRes.data);
      setTransactions(txRes.data);
      setSuppliers(supRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [itemId]);

  const handleReceiveStock = async (e) => {
    e.preventDefault();
    try {
      await api.post("/inventory/receive", { ...receiveData, item_id: itemId });
      setShowReceiveModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to receive stock");
    }
  };

  const handleConsumeStock = async (e) => {
    e.preventDefault();
    try {
      await api.post("/inventory/consume", { ...consumeData, item_id: itemId });
      setShowConsumeModal(false);
      setConsumeData({ batch_id: "", quantity: "", notes: "" });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to consume stock");
    }
  };

  if (loading || !item) return <Container className="mt-5">Loading...</Container>;

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="link" className="ps-0 mb-2" onClick={() => navigate(`/${role}/inventory/items`)}>&larr; Back to Catalog</Button>
          <h2 className="mb-0 text-theme">{item.name} <span className="text-muted fs-4">({item.unit})</span></h2>
          <p className="text-muted">Total Stock: {item.total_stock} {item.unit} | Min Level: {item.min_stock_level}</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={() => setShowReceiveModal(true)}>+ Receive Stock</Button>
          <Button variant="warning" onClick={() => setShowConsumeModal(true)}>- Consume Stock</Button>
        </div>
      </div>

      <Tabs defaultActiveKey="batches" className="mb-4">
        <Tab eventKey="batches" title="Active Batches">
          <div className="table-responsive mt-3">
            <Table striped bordered hover className={isDarkMode ? 'table-dark' : ''}>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Supplier</th>
                  <th>Expiration Date</th>
                  <th>Initial Qty</th>
                  <th>Current Qty</th>
                  <th>Received Date</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr><td colSpan="6" className="text-center">No batches found</td></tr>
                ) : (
                  batches.map(b => (
                    <tr key={b.id} className={b.current_quantity == 0 ? "text-muted" : ""}>
                      <td>{b.batch_number}</td>
                      <td>{b.supplier?.name || 'N/A'}</td>
                      <td className={new Date(b.expiration_date) < new Date() && b.current_quantity > 0 ? "text-danger fw-bold" : ""}>
                        {b.expiration_date ? new Date(b.expiration_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>{b.initial_quantity}</td>
                      <td className="fw-bold">{b.current_quantity}</td>
                      <td>{new Date(b.received_date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Tab>
        <Tab eventKey="transactions" title="Transaction History">
          <div className="table-responsive mt-3">
            <Table striped bordered hover className={isDarkMode ? 'table-dark' : ''}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Batch</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th>Employee</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan="6" className="text-center">No transactions found</td></tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${tx.transaction_type === 'RECEIVE' ? 'bg-success' : tx.transaction_type === 'CONSUME' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td>{tx.batch?.batch_number || 'Auto (FIFO)'}</td>
                      <td className={tx.quantity > 0 ? "text-success" : "text-danger"}>{tx.quantity}</td>
                      <td>{tx.notes}</td>
                      <td>{tx.employee?.username}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Tab>
      </Tabs>

      {/* Receive Modal */}
      <Modal show={showReceiveModal} onHide={() => setShowReceiveModal(false)} data-bs-theme={isDarkMode ? 'dark' : 'light'}>
        <Form onSubmit={handleReceiveStock}>
          <Modal.Header closeButton className="bg-theme-surface">
            <Modal.Title className="text-theme">Receive Stock: {item.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-theme-surface">
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Supplier</Form.Label>
              <Form.Select
                value={receiveData.supplier_id}
                onChange={e => setReceiveData({...receiveData, supplier_id: e.target.value})}
              >
                <option value="">Select Supplier (Optional)</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Batch Number *</Form.Label>
              <Form.Control type="text" required value={receiveData.batch_number} onChange={e => setReceiveData({...receiveData, batch_number: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Quantity ({item.unit}) *</Form.Label>
              <Form.Control type="number" step="0.01" min="0.01" required value={receiveData.quantity} onChange={e => setReceiveData({...receiveData, quantity: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Expiration Date</Form.Label>
              <Form.Control type="date" value={receiveData.expiration_date} onChange={e => setReceiveData({...receiveData, expiration_date: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={receiveData.notes} onChange={e => setReceiveData({...receiveData, notes: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-theme-surface border-top-0">
            <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
            <Button variant="success" type="submit">Receive</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Consume Modal */}
      <Modal show={showConsumeModal} onHide={() => setShowConsumeModal(false)} data-bs-theme={isDarkMode ? 'dark' : 'light'}>
        <Form onSubmit={handleConsumeStock}>
          <Modal.Header closeButton className="bg-theme-surface">
            <Modal.Title className="text-theme">Consume Stock: {item.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-theme-surface">
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Batch (Optional)</Form.Label>
              <Form.Select
                value={consumeData.batch_id}
                onChange={e => setConsumeData({...consumeData, batch_id: e.target.value})}
              >
                <option value="">Auto-select (FIFO - Oldest expiration first)</option>
                {batches.filter(b => b.current_quantity > 0).map(b => (
                  <option key={b.id} value={b.id}>{b.batch_number} (Qty: {b.current_quantity})</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">If left empty, system uses oldest expiring stock first.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Quantity to Consume ({item.unit}) *</Form.Label>
              <Form.Control type="number" step="0.01" min="0.01" required value={consumeData.quantity} onChange={e => setConsumeData({...consumeData, quantity: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-theme">Notes/Reason</Form.Label>
              <Form.Control as="textarea" rows={2} value={consumeData.notes} onChange={e => setConsumeData({...consumeData, notes: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-theme-surface border-top-0">
            <Button variant="secondary" onClick={() => setShowConsumeModal(false)}>Cancel</Button>
            <Button variant="warning" type="submit">Consume</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default InventoryBatches;
