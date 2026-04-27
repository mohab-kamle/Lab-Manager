import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Formik, Field, ErrorMessage, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { formatDateForInput } from "../../utils/dateFormatter";
import { useToast } from "../../components/ui/ToastContext";
import { motion } from "framer-motion";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import "../../styles/PatientProfile.css";
import PhoneInput from "../../components/ui/PhoneInput";

const PatientUpdateProfile = () => {
  const { toast } = useToast();
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
    phoneNumbers: user?.phones && user.phones.length > 0 
      ? user.phones.map(p => ({ ...p, phone: p.phone_number || p.phone })) 
      : [{ phone: "", type: "personal", is_primary: true }],
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
        phoneNumbers: values.phoneNumbers.filter(p => p.phone && p.phone.trim() !== ""),
      };

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
        navigate(`/patient/profile`, { replace: true });
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
                        <Col md={12}>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-bold small text-uppercase text-muted">
                              Phone Numbers
                            </Form.Label>
                            {values.phoneNumbers.map((phoneEntry, index) => (
                              <div key={index} className="d-flex gap-2 mb-3 align-items-start">
                                <div style={{ flex: 1 }}>
                                  <PhoneInput
                                    value={phoneEntry.phone}
                                    onChange={(val) => {
                                      const newPhones = [...values.phoneNumbers];
                                      newPhones[index].phone = val;
                                      setFieldValue("phoneNumbers", newPhones);
                                    }}
                                    placeholder="Enter phone number"
                                  />
                                </div>
                                <Form.Select
                                  style={{ width: '130px', borderRadius: '20px' }}
                                  value={phoneEntry.type}
                                  onChange={(e) => {
                                    const newPhones = [...values.phoneNumbers];
                                    newPhones[index].type = e.target.value;
                                    setFieldValue("phoneNumbers", newPhones);
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
                                      const newPhones = values.phoneNumbers.map((p, i) => ({
                                        ...p,
                                        is_primary: i === index
                                      }));
                                      setFieldValue("phoneNumbers", newPhones);
                                    }}
                                    title="Set as primary"
                                  />
                                  <small className="text-muted" style={{ fontSize: '10px' }}>Primary</small>
                                </div>
                                {values.phoneNumbers.length > 1 && (
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    className="rounded-circle p-1"
                                    style={{ width: '32px', height: '32px' }}
                                    onClick={() => {
                                      const newPhones = values.phoneNumbers.filter((_, i) => i !== index);
                                      if (phoneEntry.is_primary && newPhones.length > 0) {
                                        newPhones[0].is_primary = true;
                                      }
                                      setFieldValue("phoneNumbers", newPhones);
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
                              className="mt-1 rounded-pill"
                              onClick={() => {
                                setFieldValue("phoneNumbers", [
                                  ...values.phoneNumbers,
                                  { phone: "", type: "personal", is_primary: false }
                                ]);
                              }}
                            >
                              <Plus size={14} className="me-1" /> Add Another Phone
                            </Button>
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
