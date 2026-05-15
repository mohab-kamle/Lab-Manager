import React, { useState } from "react";
import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { ArrowRight, KeyRound, User, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/ui/ToastContext";
import axios from "axios";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const OTPVerify = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [username, setUsername] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP
    const [loading, setLoading] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error("Please enter your username");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${apiUrl}/emp/forgotPassword`, { username });
            toast.success(response.data || "OTP sent successfully to your email.");
            setStep(2);
        } catch (err) {
            console.error("Request OTP error:", err);
            toast.error(err.response?.data?.error || "Failed to send OTP. Please check your username.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            toast.error("Please enter the OTP code");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${apiUrl}/emp/verifyOtp`, { username, otp });
            
            if (response.data.success) {
                toast.success("OTP verified successfully.");
                // Pass the resetToken and username to the change-password page
                navigate('/change-password', { 
                    state: { 
                        type: 'Forget', 
                        resetToken: response.data.resetToken,
                        username: username
                    } 
                });
            }
        } catch (err) {
            console.error("Verify OTP error:", err);
            toast.error(err.response?.data?.error || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center" style={{ background: 'var(--bg-base)', padding: '20px 0' }}>
            <Container>
                <Row className="justify-content-center">
                    <Col lg={6} md={8} sm={12}>
                        <Card className="shadow-lg bg-theme-surface" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
                            <div className="text-center pt-4" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                <div className="mb-3">
                                    <div className="d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', backdropFilter: 'blur(10px)' }}>
                                        <KeyRound size={40} />
                                    </div>
                                </div>
                                <h2 className="fw-bold">{step === 1 ? "Forgot Password" : "Verify OTP"}</h2>
                                <p className="mb-0 opacity-75">
                                    {step === 1 ? "Enter your username to receive an OTP" : "Enter the verification code sent to your email"}
                                </p>
                            </div>

                            <Card.Body className="px-5 py-4">
                                {step === 1 ? (
                                    <Form onSubmit={handleRequestOTP}>
                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-semibold text-theme">
                                                <User size={18} className="me-2" />
                                                Username
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter your username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                className="py-3 px-4 border-1 bg-theme-surface text-theme"
                                                style={{ borderRadius: '12px', fontSize: '1.1em' }}
                                            />
                                        </Form.Group>
                                        <Button 
                                            type="submit" 
                                            variant="primary" 
                                            size="lg" 
                                            className="w-100 py-3 fw-semibold border-0" 
                                            style={{ borderRadius: '12px', fontSize: '1.1em' }}
                                            disabled={loading}
                                        >
                                            {loading ? <LoadingSpinner size={20} /> : <>Send OTP <ArrowRight size={18} className="ms-2" /></>}
                                        </Button>
                                    </Form>
                                ) : (
                                    <Form onSubmit={handleVerifyOTP}>
                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-semibold text-theme">
                                                <Mail size={18} className="me-2" />
                                                One-Time Password (OTP)
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="Enter 6-digit OTP"
                                                value={otp}
                                                onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setOtp(numericValue);
                                                }}
                                                required
                                                className="py-3 px-4 border-1 bg-theme-surface text-theme text-center"
                                                style={{ borderRadius: '12px', fontSize: '1.5em', letterSpacing: '8px' }}
                                                maxLength="6"
                                            />
                                        </Form.Group>
                                        <Button 
                                            type="submit" 
                                            variant="primary" 
                                            size="lg" 
                                            className="w-100 py-3 fw-semibold border-0 mb-3" 
                                            style={{ borderRadius: '12px', fontSize: '1.1em' }}
                                            disabled={loading}
                                        >
                                            {loading ? <LoadingSpinner size={20} /> : <>Verify & Proceed <ArrowRight size={18} className="ms-2" /></>}
                                        </Button>
                                        <div className="text-center">
                                            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setStep(1)} disabled={loading}>
                                                Use a different username
                                            </Button>
                                        </div>
                                    </Form>
                                )}

                                <div className="text-center mt-4">
                                    <Button variant="link" className="text-secondary text-decoration-none" onClick={() => navigate('/login')} disabled={loading}>
                                        Back to Login
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default OTPVerify;

