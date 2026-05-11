import React, { useState } from "react";
import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { ArrowRight, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/ui/ToastContext";

const OTPVerify = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP

    const handleRequestOTP = (e) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error("Please enter your email address");
            return;
        }

        // 🛑 API INTEGRATION POINT (1/2): REQUEST OTP
        // Here you should call your backend to send the OTP to the user's email.
        // Example:
        // axios.post(`${apiUrl}/auth/request-otp`, { email })
        //   .then(() => {
        //       toast.success("OTP sent successfully to your email.");
        //       setStep(2);
        //   })
        //   .catch(err => toast.error(err.response?.data?.message || "Failed to send OTP"));

        // Placeholder behavior (remove when API is ready):
        console.log("Requesting OTP for:", email);
        toast.info("Mock API: OTP requested. Proceeding to verification.");
        setStep(2);
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            toast.error("Please enter the OTP code");
            return;
        }

        // 🛑 API INTEGRATION POINT (2/2): VERIFY OTP
        // Here you should call your backend to verify the OTP.
        // Example:
        // axios.post(`${apiUrl}/auth/verify-otp`, { email, otp })
        //   .then((res) => {
        //       toast.success("OTP verified successfully.");
        //       // Optional: Save reset token if required for change password
        //       // localStorage.setItem("reset_token", res.data.token);
        //       navigate('/change-password');
        //   })
        //   .catch(err => toast.error(err.response?.data?.message || "Invalid OTP"));

        // Placeholder behavior (remove when API is ready):
        console.log("Verifying OTP:", otp);
        toast.success("Mock API: OTP verified successfully!");
        navigate('/change-password', { state: { type: 'Forget' } });
    };

    return (
<<<<<<< HEAD
        <div className="min-vh-100 d-flex align-items-center" style={{ background: 'var(--bg-dark)', padding: '20px 0' }}>
            <Container>
                <Row className="justify-content-center">
                    <Col lg={6} md={8} sm={12}>
                        <Card className="shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div className="text-center pt-4" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
                                <div className="mb-3">
                                    <div className="d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg)', backdropFilter: 'blur(10px)' }}>
=======
        <div className="min-vh-100 d-flex align-items-center" style={{ background: 'var(--bg-base)', padding: '20px 0' }}>
            <Container>
                <Row className="justify-content-center">
                    <Col lg={6} md={8} sm={12}>
                        <Card className="shadow-lg bg-theme-surface" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
                            <div className="text-center pt-4" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                <div className="mb-3">
                                    <div className="d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', backdropFilter: 'blur(10px)' }}>
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                                        <KeyRound size={40} />
                                    </div>
                                </div>
                                <h2 className="fw-bold">{step === 1 ? "Forgot Password" : "Verify OTP"}</h2>
                                <p className="mb-0 opacity-75">
                                    {step === 1 ? "Enter your email to receive an OTP" : "Enter the verification code sent to your email"}
                                </p>
                            </div>

                            <Card.Body className="px-5 py-4">
                                {step === 1 ? (
                                    <Form onSubmit={handleRequestOTP}>
                                        <Form.Group className="mb-4">
<<<<<<< HEAD
                                            <Form.Label className="fw-semibold text-dark">Email Address</Form.Label>
=======
                                            <Form.Label className="fw-semibold text-theme">Email Address</Form.Label>
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                                            <Form.Control
                                                type="email"
                                                placeholder="Enter your registered email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
<<<<<<< HEAD
                                                className="py-3 px-4 border-0"
                                                style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', fontSize: '1.1em' }}
=======
                                                className="py-3 px-4 border-0 text-theme"
                                                style={{
                                                    backgroundColor: 'var(--bg-inset)',
                                                    borderRadius: '12px',
                                                    fontSize: '1.1em',
                                                    paddingRight: '50px'
                                                }}
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                                            />
                                        </Form.Group>
                                        <Button type="submit" variant="primary" size="lg" className="w-100 py-3 fw-semibold border-0" style={{ borderRadius: '12px', fontSize: '1.1em' }}>
                                            Send OTP <ArrowRight size={18} className="ms-2" />
                                        </Button>
                                    </Form>
                                ) : (
                                    <Form onSubmit={handleVerifyOTP}>
                                        <Form.Group className="mb-4">
<<<<<<< HEAD
                                            <Form.Label className="fw-semibold text-dark">One-Time Password (OTP)</Form.Label>
=======
                                            <Form.Label className="fw-semibold text-theme">One-Time Password (OTP)</Form.Label>
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                                            <Form.Control
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="Enter 6-digit OTP"
                                                value={otp}
                                                onChange={(e) => {
                                                    // Only allow numeric input, max 6 digits
                                                    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setOtp(numericValue);
                                                }}
                                                required
<<<<<<< HEAD
                                                className="py-3 px-4 border-0 text-center"
                                                style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', fontSize: '1.5em', letterSpacing: '8px' }}
=======
                                                className="py-3 px-4 border-0 text-center text-theme"
                                                style={{ backgroundColor: 'var(--bg-inset)', borderRadius: '12px', fontSize: '1.5em', letterSpacing: '8px' }}
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                                                maxLength="6"
                                            />
                                        </Form.Group>
                                        <Button type="submit" variant="primary" size="lg" className="w-100 py-3 fw-semibold border-0 mb-3" style={{ borderRadius: '12px', fontSize: '1.1em' }}>
                                            Verify & Proceed <ArrowRight size={18} className="ms-2" />
                                        </Button>
                                        <div className="text-center">
                                            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setStep(1)}>
                                                Use a different email
                                            </Button>
                                        </div>
                                    </Form>
                                )}

                                <div className="text-center mt-4">
                                    <Button variant="link" className="text-secondary text-decoration-none" onClick={() => navigate('/login')}>
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
