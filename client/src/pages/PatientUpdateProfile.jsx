import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Formik, Field, ErrorMessage, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { formatDateForInput } from "../utils/dateFormatter";

const PatientUpdateProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Set API URL with fallback
    const serverUrl = import.meta.env.VITE_API_URL;
    console.log("Server URL from env:", serverUrl);
    // setApiUrl(serverUrl || "http://localhost:3001"); // This line is removed as per the edit hint
  }, []);

  const initialValues = {
    name: user?.name || "",
    birth_date: formatDateForInput(user?.birth_date) || "",
    gender: user?.gender || "",
    primaryPhone: user?.phones?.[0]?.phone_number || "",
    secondaryPhone: user?.phones?.[1]?.phone_number || "",
    email: user?.email || "",
    address: user?.address || "",
    nationality: user?.nationality || "",
    passport_no: user?.passport_no || "",
    national_id: user?.national_id || "",
  };

  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    birth_date: Yup.date().nullable().required("Birth date is required"),
    gender: Yup.string().oneOf(["m", "f"], "Invalid gender").required("Gender is required"),
    primaryPhone: Yup.string().matches(/^\d+$/, "Must be a valid phone number"),
    secondaryPhone: Yup.string().matches(/^\d+$/, "Must be a valid phone number"),
    email: Yup.string().email("Invalid email format").required("Email is required"),
    address: Yup.string(),
    nationality: Yup.string(),
    passport_no: Yup.string().matches(/^\d+$/, "Invalid passport number"),
    national_id: Yup.string().matches(/^\d+$/, "Invalid national ID"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setError("");
    const token = localStorage.getItem("token");
    
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      navigate("/login");
      return;
    }

    try {
      console.log("Current API URL:", apiUrl);
      console.log("Sending update request to:", `${apiUrl}/patient/update`);
      
      const requestData = {
        ...values,
        phones: [
          { phone_number: values.primaryPhone },
          { phone_number: values.secondaryPhone }
        ].filter(phone => phone.phone_number)
      };
      
      console.log("Request data:", requestData);

      const response = await axios.put(
        `${apiUrl}/patient/update`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Update response:", response.data);

      if (response.data.success) {
        // Use the new updateUser function from context
        const updateSuccess = await setUser(response.data.updatedUser);
        
        if (updateSuccess) {
          navigate("/patient/dashboard/profile", { replace: true });
        } else {
          setError("Profile updated but failed to refresh user data. Please try logging in again.");
        }
      } else {
        setError(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error.response || error);
      
      if (error.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      } else {
        setError(
          error.response?.data?.message || 
          error.message || 
          "An error occurred while updating your profile"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg rounded">
            <Card.Header className="bg-primary text-white text-center">
              <h3>Update Profile</h3>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting }) => (
                  <FormikForm>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Field type="text" name="name" className="form-control" />
                      <ErrorMessage name="name" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Birth Date</Form.Label>
                      <Field type="date" name="birth_date" className="form-control" />
                      <ErrorMessage name="birth_date" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Field as="select" name="gender" className="form-control">
                        <option value="">Select Gender</option>
                        <option value="m">Male</option>
                        <option value="f">Female</option>
                      </Field>
                      <ErrorMessage name="gender" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Primary Phone</Form.Label>
                      <Field type="text" name="primaryPhone" className="form-control" />
                      <ErrorMessage name="primaryPhone" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Secondary Phone</Form.Label>
                      <Field type="text" name="secondaryPhone" className="form-control" />
                      <ErrorMessage name="secondaryPhone" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Field type="email" name="email" className="form-control" />
                      <ErrorMessage name="email" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Field type="text" name="address" className="form-control" />
                      <ErrorMessage name="address" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Nationality</Form.Label>
                      <Field type="text" name="nationality" className="form-control" />
                      <ErrorMessage name="nationality" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Passport No</Form.Label>
                      <Field type="text" name="passport_no" className="form-control" />
                      <ErrorMessage name="passport_no" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>National ID</Form.Label>
                      <Field type="text" name="national_id" className="form-control" />
                      <ErrorMessage name="national_id" component="div" className="text-danger" />
                    </Form.Group>

                    <Button 
                      variant="primary" 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-100"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </FormikForm>
                )}
              </Formik>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PatientUpdateProfile;
