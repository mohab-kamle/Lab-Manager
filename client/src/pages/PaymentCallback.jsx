import React, { useEffect, useState } from 'react';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useLab } from '../context/LabContext';
import axios from 'axios';
import useLabPrefix from '../hooks/useLabPrefix';

const PaymentCallback = () => {
  const prefix = useLabPrefix();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAfterUpgrade } = useLab();
  const [status, setStatus] = useState('processing'); // processing, success, error, cancelled
  const [message, setMessage] = useState('Processing your payment...');
  const [userToken, setUserToken] = useState(null);
  const [labData, setLabData] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // New state to track initial load
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/';

  useEffect(() => {
    const processPaymentCallback = async () => {
      try {
        // Get parameters from URL
        const merchantOrderId = searchParams.get('merchant_order_id');
        const paymentStatus = searchParams.get('success');
        const paymentIntentionId = searchParams.get('id');
        
        if (!merchantOrderId) {
          setStatus('error');
          setMessage('Invalid payment callback - missing order information.');
          return;
        }

        // Check if payment was cancelled
        if (paymentStatus === 'false' || searchParams.get('pending') === 'true') {
          setStatus('cancelled');
          setMessage('Payment was cancelled or is still pending. Please try again.');
          return;
        }

        // If payment was successful, determine if this is registration or upgrade
        if (paymentStatus === 'true') {
          try {
            // Check if this is an upgrade payment
            const upgradePaymentData = localStorage.getItem('upgradePaymentData');
            const isUpgrade = upgradePaymentData && JSON.parse(upgradePaymentData).merchant_order_id === merchantOrderId;
            
            if (isUpgrade) {
              // Handle subscription upgrade
              const upgradeData = JSON.parse(upgradePaymentData);
              const token = localStorage.getItem('token');
              const upgradeResponse = await axios.post(`${apiUrl}/labs/${upgradeData.lab_id}/upgrade`, {
                plan: upgradeData.plan,
                paymentMethod: 'card',
                merchant_order_id: merchantOrderId
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (upgradeResponse.data.success) {
                setStatus('success');
                setMessage('Payment successful! Your subscription has been upgraded.');
                localStorage.removeItem('upgradePaymentData'); // Clear upgrade payment data
                
                // Refresh lab data
                await refreshAfterUpgrade();
                
                // Redirect to lab management after 3 seconds
                setTimeout(() => {
                  navigate(`${prefix}/lab-management`);
                }, 3000);
              } else {
                setStatus('error');
                setMessage('Payment was successful but subscription upgrade failed. Please contact support.');
              }
            } else {
              // Handle new registration
              const response = await axios.post(`${apiUrl}/register/complete/${merchantOrderId}`);
              console.log('Registration completed:', response.data);
              if (response.data.success) {
                setStatus('success');
                setMessage('Payment successful! Your lab has been created.');
                setUserToken(response.data.token);
                setLabData(response.data.lab);
                
                // Store authentication data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.removeItem('registrationFormData'); // Clear registration form data
                
                // Redirect to dashboard after 3 seconds
                setTimeout(() => {
                  navigate('/login');
                }, 3000);
              } else {
                setStatus('error');
                setMessage('Payment was successful but lab creation failed. Please contact support.');
              }
            }
          } catch (completeError) {
            console.error('Error completing registration:', completeError);
            
            if (completeError.response?.status === 404) {
              setStatus('error');
              setMessage('Payment record not found. Please contact support.');
            } else if (completeError.response?.status === 400) {
              // Payment not confirmed yet - try manual completion for testing
              console.log('Payment not confirmed, attempting manual completion...');
              try {
                // Check if this is an upgrade payment for manual completion too
                const upgradePaymentData = localStorage.getItem('upgradePaymentData');
                const isUpgrade = upgradePaymentData && JSON.parse(upgradePaymentData).merchant_order_id === merchantOrderId;
                
                if (isUpgrade) {
                  // For upgrade payments, just mark as successful since payment gateway handles the completion
                  const manualResponse = await axios.post(`${apiUrl}/payments/complete-manual/${merchantOrderId}`);
                  console.log('Manual completion successful for upgrade:', manualResponse.data);
                  
                  if (manualResponse.data.success) {
                    // Now call the upgrade endpoint
                    const upgradeData = JSON.parse(upgradePaymentData);
                    const token = localStorage.getItem('token');
                    const upgradeResponse = await axios.post(`${apiUrl}/labs/${upgradeData.lab_id}/upgrade`, {
                      plan: upgradeData.plan,
                      paymentMethod: 'card',
                      merchant_order_id: merchantOrderId
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (upgradeResponse.data.success) {
                      setStatus('success');
                      setMessage('Payment successful! Your subscription has been upgraded.');
                      localStorage.removeItem('upgradePaymentData');
                      
                      // Refresh lab data
                      await refreshAfterUpgrade();
                      
                      setTimeout(() => {
                        navigate('/lab-management');
                      }, 3000);
                    } else {
                      setStatus('error');
                      setMessage('Payment confirmed but subscription upgrade failed. Please contact support.');
                    }
                  } else {
                    setStatus('error');
                    setMessage('Payment confirmed but upgrade processing failed. Please contact support.');
                  }
                } else {
                  // Handle registration manual completion
                  const manualResponse = await axios.post(`${apiUrl}/payments/complete-manual/${merchantOrderId}`);
                  console.log('Manual completion successful:', manualResponse.data);
                  
                  if (manualResponse.data.success && manualResponse.data.lab_creation?.success) {
                    setStatus('success');
                    setMessage('Payment successful! Your lab has been created.');
                    setUserToken(manualResponse.data.lab_creation.token);
                    setLabData(manualResponse.data.lab_creation.lab);
                    
                    // Store authentication data
                    localStorage.setItem('token', manualResponse.data.lab_creation.token);
                    localStorage.setItem('user', JSON.stringify(manualResponse.data.lab_creation.user));
                    localStorage.removeItem('registrationFormData'); // Clear registration form data
                    
                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                      navigate('/dashboard');
                    }, 3000);
                  } else {
                    setStatus('error');
                    setMessage('Payment confirmed but lab creation failed. Please contact support.');
                  }
                }
              } catch (manualError) {
                console.error('Manual completion failed:', manualError);
                setStatus('error');
                setMessage('Payment not confirmed yet. Please wait a moment and refresh the page, or contact support if the issue persists.');
              }
            } else {
              setStatus('error');
              setMessage('Failed to complete registration. Please contact support.');
            }
          }
        } else {
          // Payment failed
          setStatus('error');
          setMessage('Payment failed. Please try again.');
        }
        
      } catch (error) {
        console.error('Error processing payment callback:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment. Please contact support.');
      } finally {
        setInitialLoadComplete(true); // Set to true after all processing attempts
      }
    };

    processPaymentCallback();
  }, [searchParams, navigate, apiUrl]);

  const handleRetryPayment = () => {
    // Check if this was an upgrade payment
    const upgradePaymentData = localStorage.getItem('upgradePaymentData');
    if (upgradePaymentData) {
      // If it was an upgrade, redirect back to lab management
      navigate('/lab-management');
    } else {
      // If it was a registration, redirect to register page
      navigate('/register');
    }
  };

  const handleContactSupport = () => {
    // You can implement contact support functionality here
    window.location.href = 'mailto:techsupport@labdoctors-laboratories.com?subject=LabManager Support&body=Please describe your issue or question.';
  };

  const renderIcon = () => {
    if (!initialLoadComplete) {
      return <Spinner animation="border" size="lg" className="text-primary mb-3" />;
    }
    switch (status) {
      case 'success':
        return <CheckCircle size={64} className="text-success mb-3" />;
      case 'error':
        return <XCircle size={64} className="text-danger mb-3" />;
      case 'cancelled':
        return <AlertTriangle size={64} className="text-warning mb-3" />;
      default:
        return null;
    }
  };

  const renderActions = () => {
    if (!initialLoadComplete) {
      return null;
    }
    switch (status) {
      case 'success':
        return (
          <div className="d-flex gap-2 justify-content-center">
            <Button 
              variant="primary" 
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        );
      case 'error':
      case 'cancelled':
        return (
          <div className="d-flex gap-2 justify-content-center">
            <Button 
              variant="primary" 
              onClick={handleRetryPayment}
            >
              Try Again
            </Button>
            <Button 
              variant="outline-secondary" 
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body className="p-5">
          {renderIcon()}
          
          <h3 className="mb-3">
            {initialLoadComplete ? (
              status === 'success' ? 'Payment Successful!' :
              status === 'error' ? 'Payment Failed' :
              status === 'cancelled' ? 'Payment Cancelled' :
              'Processing Payment' // Fallback for unexpected status after load
            ) : 'Processing Payment'}
          </h3>
          
          <p className="text-muted mb-4">
            {initialLoadComplete ? message : 'Processing your payment...'}
          </p>
          
          {labData && initialLoadComplete && status === 'success' && (
            <Alert variant="success" className="text-start mb-4">
              <strong>Lab Created Successfully:</strong>
              <br />
              <strong>Name:</strong> {labData.name}
              <br />
              <strong>Subdomain:</strong> {labData.subdomain}
            </Alert>
          )}
          
          {renderActions()}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PaymentCallback;