import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Formik, Field, ErrorMessage, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { formatDateForInput } from "../../utils/dateFormatter";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Save, ArrowLeft } from "lucide-react";
import "../../styles/PatientProfile.css";

const PatientUpdateProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
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
    gender: Yup.string()
      .oneOf(["Male", "Female"], "Invalid gender")
      .required("Gender is required"),
    primaryPhone: Yup.string().matches(/^\d+$/, "Must be a valid phone number"),
    secondaryPhone: Yup.string().matches(
      /^\d+$/,
      "Must be a valid phone number"
    ),
    email: Yup.string()
      .email("Invalid email format")
      .required("Email is required"),
    address: Yup.string(),
    nationality: Yup.string(),
    passport_no: Yup.string().matches(/^\d+$/, "Invalid passport number"),
    national_id: Yup.string().matches(/^\d+$/, "Invalid national ID"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("You are not authenticated. Please log in again.");
      navigate("/login");
      return;
    }

    try {
      const requestData = {
        ...values,
        phones: [],
      };

      if (values.primaryPhone) {
        requestData.phones.push({
          phone_number: values.primaryPhone,
          type: "primary",
        });
      }
      if (values.secondaryPhone) {
        requestData.phones.push({
          phone_number: values.secondaryPhone,
          type: "secondary",
        });
      }

      const response = await axios.put(
        `${apiUrl}/patient/update`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setUser(response.data.updatedUser);
        toast.success("Profile updated successfully!");
        navigate(`/patient/dashboard/profile`, { replace: true });
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);

      if (error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      } else {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "An error occurred while updating your profile"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="cheerful-container py-5">
      <Container>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="mb-4">
            <Button
              variant="link"
              className="text-decoration-none text-muted p-0 d-flex align-items-center gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} /> Back to Profile
            </Button>
          </div>

          <Row className="justify-content-center">
            <Col md={8}>
              <div className="patient-profile-card p-4 p-md-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Update Profile</h2>
                  <p className="text-muted">Keep your information up-to-date</p>
                </div>

                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                  enableReinitialize
                >
                  {({ isSubmitting }) => (
                    <FormikForm>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Name
                            </Form.Label>
                            <Field
                              type="text"
                              name="name"
                              className="form-control rounded-pill"
                              placeholder="Enter your name"
                            />
                            <ErrorMessage
                              name="name"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Birth Date
                            </Form.Label>
                            <Field
                              type="date"
                              name="birth_date"
                              className="form-control rounded-pill"
                            />
                            <ErrorMessage
                              name="birth_date"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Gender
                            </Form.Label>
                            <Field
                              as="select"
                              name="gender"
                              className="form-control rounded-pill form-select"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </Field>
                            <ErrorMessage
                              name="gender"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Email
                            </Form.Label>
                            <Field
                              type="email"
                              name="email"
                              className="form-control rounded-pill"
                              placeholder="name@example.com"
                            />
                            <ErrorMessage
                              name="email"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Primary Phone
                            </Form.Label>
                            <Field
                              type="text"
                              name="primaryPhone"
                              className="form-control rounded-pill"
                              placeholder="01xxxxxxxxx"
                            />
                            <ErrorMessage
                              name="primaryPhone"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Secondary Phone
                            </Form.Label>
                            <Field
                              type="text"
                              name="secondaryPhone"
                              className="form-control rounded-pill"
                              placeholder="Optiona"
                            />
                            <ErrorMessage
                              name="secondaryPhone"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Address
                            </Form.Label>
                            <Field
                              type="text"
                              name="address"
                              className="form-control rounded-4"
                              placeholder="Your address"
                            />
                            <ErrorMessage
                              name="address"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Nationality
                            </Form.Label>
                            <Field
                              type="text"
                              name="nationality"
                              className="form-control rounded-pill"
                            />
                            <ErrorMessage
                              name="nationality"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Passport No
                            </Form.Label>
                            <Field
                              type="text"
                              name="passport_no"
                              className="form-control rounded-pill"
                            />
                            <ErrorMessage
                              name="passport_no"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              National ID
                            </Form.Label>
                            <Field
                              type="text"
                              name="national_id"
                              className="form-control rounded-pill"
                            />
                            <ErrorMessage
                              name="national_id"
                              component="div"
                              className="text-danger small mt-1"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="text-center mt-4">
                        <Button
                          className="cheerful-btn cheerful-btn-primary w-50 d-inline-flex align-items-center justify-content-center gap-2"
                          type="submit"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </FormikForm>
                  )}
                </Formik>
              </div>
            </Col>
          </Row>
        </motion.div>
      </Container>
    </div>
  );
};

export default PatientUpdateProfile;
