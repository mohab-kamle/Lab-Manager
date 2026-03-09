import React from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { Shield } from 'lucide-react';

const Vault = () => {
  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center py-5">
          <div className="mb-4 text-warning">
            <Shield size={64} />
          </div>
          <h2 className="mb-3">Vault Under Construction</h2>
          <p className="text-muted mb-4 lead">
            This secure storage feature is currently being developed.
          </p>
          <Alert variant="info" className="d-inline-block">
            Expected availability: Coming Soon
          </Alert>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Vault;
