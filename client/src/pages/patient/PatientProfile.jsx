import React from "react";
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Button,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import {
  PersonCircle,
  Calendar,
  ClipboardCheck,
  GenderAmbiguous,
  Telephone,
  Envelope,
  House,
  FileMedical,
  Globe,
  FileEarmarkPerson,
  CardHeading,
} from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/dateFormatter";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useLabPrefix from "../../hooks/useLabPrefix";
const PatientProfile = () => {
  const prefix = useLabPrefix();
  const { user } = useAuth();
  
  if (!user) {
    return (
      <LoadingSpinner message="Loading patient profile..." />
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg rounded">
            <Card.Header className="bg-primary text-white text-center">
              <h3>
                <PersonCircle className="me-2" /> {user.name}'s Profile
              </h3>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Calendar className="me-2 text-primary" />
                  <strong>Birthdate:</strong> {formatDate(user.birth_date)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <GenderAmbiguous className="me-2 text-primary" />
                  <strong>Gender:</strong>{" "}
                  {user.gender
                    ? user.gender === "Male"
                      ? "Male"
                      : "Female"
                    : "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <Telephone className="me-2 text-primary" />
                  <strong>Primary Phone:</strong>{" "}
                  {user.phones?.[0]?.phone_number || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <Telephone className="me-2 text-primary" />
                  <strong>Secondary Phone:</strong>{" "}
                  {user.phones?.[1]?.phone_number || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <Envelope className="me-2 text-primary" />
                  <strong>Email:</strong> {user.email || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <House className="me-2 text-primary" />
                  <strong>Address:</strong> {user.address || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <ClipboardCheck className="me-2 text-primary" />
                  <strong>Patient Code:</strong> {user.patientcode}
                </ListGroup.Item>
                <ListGroup.Item>
                  <Globe className="me-2 text-primary" />
                  <strong>Nationality:</strong>{" "}
                  {user.nationality || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FileEarmarkPerson className="me-2 text-primary" />
                  <strong>Passport No:</strong>{" "}
                  {user.passport_no || "Not provided"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <CardHeading className="me-2 text-primary" />
                  <strong>National ID:</strong>{" "}
                  {user.national_id || "Not provided"}
                </ListGroup.Item>
              </ListGroup>

              <div className="text-center mt-4">
                <Button
                  variant="success"
                  className="me-2"
                  as={Link}
                  to={`/${prefix}/patient/reports`}
                >
                  <FileMedical className="me-1" />
                  View Medical Reports
                </Button>
                <Button
                  variant="outline-primary"
                  as={Link}
                  to={`/${prefix}/patient/profile/update`}
                >
                  Update Profile
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PatientProfile;
