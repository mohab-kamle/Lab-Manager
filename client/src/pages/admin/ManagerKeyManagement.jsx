import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Modal, Alert, Badge, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import DynamicTable from '../../components/ui/DynamicTable';
import { formatDate } from '../../utils/dateFormatter';
import { Plus, Trash, Copy, AlertTriangle } from 'lucide-react';

const ManagerKeyManagement = () => {
  const { user } = useAuth();
  const { toast, showConfirm } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);

  // Mock fetching keys - will be replaced with actual API call
  const fetchKeys = async () => {
    setLoading(true);
    try {
      /* 
      TODO: IMPLEMENT BACKEND API CALL
      const response = await axios.get('/api/admin/keys', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setKeys(response.data);
      */
      
      // Mock data for now
      const mockKeys = [
        {
          id: 1,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          key_name: `${user?.name || 'Admin'}_key1`,
          first_four: 'ABCD',
          expires_at: new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Active'
        },
        {
          id: 2,
          created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
          key_name: `${user?.name || 'Admin'}_oldkey`,
          first_four: 'WXYZ',
          expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Expired'
        }
      ];
      setKeys(mockKeys);
    } catch (error) {
      toast.error('Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerateKey = async () => {
    try {
      // Logic for naming: adminName_customName or adminName_key{number}
      const adminPrefix = user?.name || 'Admin';
      const finalName = keyName.trim() 
        ? `${adminPrefix}_${keyName.trim()}` 
        : `${adminPrefix}_key${keys.length + 1}`;
      
      
      /* 
      TODO: IMPLEMENT BACKEND API CALL
      const response = await axios.post('/api/admin/keys', { 
        name: finalName 
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const fullKey = response.data.key;
      */
      
      const fullKey = `KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      setGeneratedKey({
        fullKey,
        name: finalName,
        expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)
      });
      
      // Refresh list after generation (in reality, the full key won't be in the list)
      fetchKeys();
    } catch (error) {
      toast.error('Failed to generate key');
    }
  };

  const handleDeleteKey = async (id) => {
    const isConfirmed = await showConfirm({
      title: 'Delete Authorization Key',
      message: (
        <div>
          <p className="text-danger">
            <AlertTriangle className="me-2" />
            Warning: This action cannot be undone. Any system or person using this key will immediately lose authorization.
          </p>
          <p>Please type <strong>confirm delete</strong> to proceed:</p>
        </div>
      ),
      confirmText: 'Delete Key',
      requireMatch: 'confirm delete',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        /* 
        TODO: IMPLEMENT BACKEND API CALL
        await axios.delete(`/api/admin/keys/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        */
        setKeys(keys.filter(k => k.id !== id));
        toast.success('Key deleted successfully');
      } catch (error) {
        toast.error('Failed to delete key');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Key copied to clipboard');
  };

  const formatCellData = (value, column, row) => {
    if (column === 'status') {
      const isExpired = new Date(row.expires_at) < new Date();
      return (
        <Badge bg={isExpired ? 'danger' : 'success'}>
          {isExpired ? 'Expired' : 'Active'}
        </Badge>
      );
    }
    if (column === 'first_four') {
      return `${value}****`;
    }
    if (column === 'created_at' || column === 'expires_at') {
      return formatDate(new Date(value));
    }
    return value;
  };

  const ActionComponent = ({ rowData }) => (
    <Button 
      variant="outline-danger" 
      size="sm" 
      onClick={() => handleDeleteKey(rowData.id)}
      title="Delete Key"
    >
      <Trash size={16} />
    </Button>
  );

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Manager Key Management</h2>
          <p className="text-muted">Generate and manage authorization keys for secure operations.</p>
        </div>
        <Button variant="primary" onClick={() => {
          setGeneratedKey(null);
          setKeyName('');
          setShowGenerateModal(true);
        }}>
          <Plus className="me-2" /> Generate Authorization Key
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <DynamicTable
            data={keys}
            columns={['created_at', 'id', 'key_name', 'first_four', 'expires_at', 'status']}
            customHeaders={{
              created_at: 'Date',
              id: 'Key ID',
              key_name: 'Name',
              first_four: 'Key',
              expires_at: 'Expire Date',
              status: 'Status'
            }}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
            emptyMessage="No authorization keys found. Click 'Generate' to create your first key."
          />
        </Card.Body>
      </Card>

      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} backdrop="static" centered size="lg">
        <Modal.Header closeButton className="bg-primary text-white" data-bs-theme="dark">
          <Modal.Title>Generate New Authorization Key</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {!generatedKey ? (
            <Form>
              <Form.Group className="mb-4">
                <Form.Label>Key Name (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={`Default: ${user?.name || 'Admin'}_key${keys.length + 1}`}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
                <Form.Text className="text-muted">
                  A custom name to help you identify where this key is used.
                </Form.Text>
              </Form.Group>

              <Alert variant="info" className="d-flex align-items-center border-0 bg-light-blue shadow-sm">
                <div className="me-3 fs-4 text-primary">
                  <AlertTriangle />
                </div>
                <div>
                  <strong>Key Expiry Information</strong>
                  <br />
                  All generated keys automatically expire after 6 months.
                  <br />
                  Estimated Expiry: <strong>{formatDate(new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000))}</strong>
                </div>
              </Alert>

              <div className="d-grid mt-4">
                <Button variant="primary" size="lg" onClick={handleGenerateKey}>
                  Generate Secure Key
                </Button>
              </div>
            </Form>
          ) : (
            <div className="text-center">
              <div className="mb-4 mt-2">
                <h3>Key Generated Successfully!</h3>
              </div>

              <Alert variant="warning" className="text-start border-0 shadow-sm mb-4">
                <div className="d-flex">
                  <div className="me-3 fs-3 text-warning">
                    <AlertTriangle />
                  </div>
                  <div>
                    <h5 className="alert-heading">CRITICAL WARNING: Copy Your Key Now!</h5>
                    <p className="mb-0">
                      This is the <strong>ONLY TIME</strong> you will see the full key. 
                      Once you close this window, the key will be hashed, and you will never be able to retrieve it again.
                      Please copy it or take a screenshot and store it securely.
                    </p>
                  </div>
                </div>
              </Alert>

              <div className="p-4 bg-light rounded border mb-4">
                <p className="text-muted small mb-2 text-uppercase fw-bold ls-wider">Your Authorization Key</p>
                <div className="d-flex align-items-center justify-content-center">
                  <code className="fs-3 fw-bold text-dark me-3 ls-wide">{generatedKey.fullKey}</code>
                  <Button variant="outline-primary" onClick={() => copyToClipboard(generatedKey.fullKey)}>
                    <Copy className="me-2" /> Copy
                  </Button>
                </div>
              </div>

              <Row className="text-start mb-4">
                <Col>
                  <p className="mb-1 text-muted small fw-bold">NAME</p>
                  <p className="mb-0">{generatedKey.name}</p>
                </Col>
                <Col>
                  <p className="mb-1 text-muted small fw-bold">EXPIRES ON</p>
                  <p className="mb-0">{formatDate(generatedKey.expiresAt)}</p>
                </Col>
              </Row>

              <div className="d-grid">
                <Button variant="success" size="lg" onClick={() => setShowGenerateModal(false)}>
                  I have copied the key. Close this window.
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ManagerKeyManagement;
