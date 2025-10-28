import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { Button, Alert } from 'react-bootstrap';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // ✅ Import AuthContext

function getPatientCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('patientcode') || '';
}

const PatientPage = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [apiError, setApiError] = useState(null);
    const navigate = useNavigate();
    const { setUser } = useAuth(); // ✅ Use AuthContext to update global user state

    const [initialValues, setInitialValues] = useState({ patientcode: '' });

    const validationSchema = Yup.object({
        patientcode: Yup.string()
            .matches(/^\d+$/, "Patient code must be numeric")
            .required('Patient code is required')
    });

    const onSubmit = async (values, { setSubmitting, setErrors }) => {
        setApiError(null);
        try {
            const response = await axios.post(`${apiUrl}/patient/login`, values);
            localStorage.setItem('token', response.data.token);
            setUser(response.data.user); 
            navigate('/patient/dashboard');
        } catch (error) {
            setApiError("Failed to log in. Please check your patient code.");
            setErrors({ patientcode: "Invalid patient code" });
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const code = getPatientCodeFromUrl();
        if (code) {
            setInitialValues({ patientcode: code });
        }
    }, []);

    return (
        <div className="d-flex justify-content-center mt-5 flex-column width-50 border border-primary p-3 rounded-3 w-75 mx-auto">
            {apiError && <Alert variant="danger">{apiError}</Alert>}
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
                enableReinitialize={true}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <div className="mb-3">
                            <label htmlFor="patientcode" className="form-label">Patient Code</label>
                            <Field
                                type="text"
                                id="patientcode"
                                name="patientcode"
                                className="form-control"
                            />
                            <ErrorMessage name="patientcode" component="div" className="text-danger" />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default PatientPage;
