import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";

const InventoryDashboard = () => {
  const { role } = useParams();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [lowStockRes, expiringRes] = await Promise.all([
        api.get("/inventory/alerts/low-stock"),
        api.get("/inventory/alerts/expiring?days=30")
      ]);
      setLowStockItems(lowStockRes.data);
      setExpiringBatches(expiringRes.data);
    } catch (error) {
      console.error("Failed to fetch inventory alerts", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-theme">Inventory Dashboard</h2>
        <div>
          <Link to={`/${role}/inventory/items`} className="btn btn-primary me-2">Manage Catalog</Link>
          <Link to={`/${role}/inventory/suppliers`} className="btn btn-outline-primary">Manage Suppliers</Link>
        </div>
      </div>

      <Row>
        <Col md={6}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">Low Stock Alerts ({lowStockItems.length})</h5>
            </Card.Header>
            <Card.Body>
              {lowStockItems.length === 0 ? (
                <p className="text-muted mb-0">No items are currently low on stock.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Current Stock</th>
                        <th>Min Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map(item => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td className="text-danger fw-bold">{item.total_stock} {item.unit}</td>
                          <td>{item.min_stock_level} {item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">Expiring Soon (30 Days) ({expiringBatches.length})</h5>
            </Card.Header>
            <Card.Body>
              {expiringBatches.length === 0 ? (
                <p className="text-muted mb-0">No batches are expiring soon.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Batch</th>
                        <th>Expiration</th>
                        <th>Qty Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringBatches.map(batch => {
                        const isExpired = new Date(batch.expiration_date) < new Date();
                        return (
                          <tr key={batch.id} className={isExpired ? "table-danger" : ""}>
                            <td>{batch.item?.name}</td>
                            <td>{batch.batch_number}</td>
                            <td className={isExpired ? "text-danger fw-bold" : ""}>
                              {new Date(batch.expiration_date).toLocaleDateString()}
                              {isExpired && " (Expired)"}
                            </td>
                            <td>{batch.current_quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default InventoryDashboard;
