import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { Button, Alert, InputGroup, FormControl } from 'react-bootstrap';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeSlash, PersonFill, LockFill } from 'react-bootstrap-icons';

const AdminPage = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [apiError, setApiError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const initialValues = {
        username: '',
        password: ''
    };

    const validationSchema = Yup.object({
        username: Yup.string()
            .min(3, "Username must be at least 3 characters")
            .required('Username is required'),
        password: Yup.string()
            .min(6, "Password must be at least 6 characters")
            .required('Password is required')
    });

    const onSubmit = async (values, { setSubmitting, setErrors }) => {
        setApiError(null);
        try {
            const response = await axios.post(`${apiUrl}/emp/login`, values);
            localStorage.setItem('token', response.data.token);
            setUser(response.data.user);
            navigate('/admin/dashboard');
        } catch (error) {
            setApiError("Failed to log in. Please check your credentials.");
            setErrors({ username: "Invalid username or password" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="d-flex justify-content-center mt-5 flex-column width-50 border border-primary p-4 rounded-3 w-75 mx-auto shadow mb-2">
            <h3 className="text-center mb-3">Admin Login</h3>
            {apiError && <Alert variant="danger">{apiError}</Alert>}
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">Username</label>
                            <InputGroup>
                                <InputGroup.Text><PersonFill /></InputGroup.Text>
                                <Field
                                    type="text"
                                    id="username"
                                    name="username"
                                    className="form-control"
                                />
                            </InputGroup>
                            <ErrorMessage name="username" component="div" className="text-danger" />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <InputGroup>
                                <InputGroup.Text><LockFill /></InputGroup.Text>
                                <FormControl
                                    as={Field}
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    className="form-control"
                                />
                                <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <EyeSlash /> : <Eye />}
                                </Button>
                            </InputGroup>
                            <ErrorMessage name="password" component="div" className="text-danger" />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-100">
                            {isSubmitting ? "Logging in..." : "Login"}
                        </Button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default AdminPage;
