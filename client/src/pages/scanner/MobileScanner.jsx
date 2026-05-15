import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Button, Alert, Card } from 'react-bootstrap';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from 'html5-qrcode';
import io from 'socket.io-client';
import { Camera, Zap, ZapOff, RefreshCcw, Smartphone } from 'lucide-react';

const MobileScanner = () => {
  const { sessionId } = useParams();
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const socketRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScanResetTimerRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Initialize Socket
    socketRef.current = io(apiUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join-scanner', { sessionId });
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    // Initialize Scanner
    const formatsToSupport = [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
    ];

    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        formatsToSupport: formatsToSupport,
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText) => {
      if (decodedText !== lastScan) {
        setLastScan(decodedText);
        // Haptic feedback
        if (window.navigator.vibrate) {
          window.navigator.vibrate(100);
        }
        
        // Relay to desktop
        socketRef.current.emit('scan-data', { sessionId, data: decodedText });
        
        // Reset last scan after a short delay to allow re-scanning same code
        if (lastScanResetTimerRef.current) {
          clearTimeout(lastScanResetTimerRef.current);
        }
        lastScanResetTimerRef.current = setTimeout(() => {
          setLastScan(null);
          lastScanResetTimerRef.current = null;
        }, 2000);
      }
    };

    const onScanFailure = (error) => {
      // Quietly ignore scan failures
    };

    // Check if camera is available
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      } else {
        setError("No camera found on this device.");
      }
    }).catch(err => {
      setError("Camera access denied or not available.");
      console.error(err);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
      if (lastScanResetTimerRef.current) {
        clearTimeout(lastScanResetTimerRef.current);
      }
    };
  }, [sessionId, apiUrl, lastScan]);

  const handleManualSend = (e) => {
    e.preventDefault();
    const data = e.target.elements.manualData.value;
    if (data) {
      socketRef.current.emit('scan-data', { sessionId, data });
      setLastScan(data);
      e.target.reset();
      
      if (lastScanResetTimerRef.current) {
        clearTimeout(lastScanResetTimerRef.current);
      }
      lastScanResetTimerRef.current = setTimeout(() => {
        setLastScan(null);
        lastScanResetTimerRef.current = null;
      }, 2000);
    }
  };

  return (
    <Container className="py-4 mobile-scanner-page" style={{ maxWidth: '500px' }}>
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="text-center">
          <div className="d-flex align-items-center justify-content-center mb-3">
            <Smartphone className="me-2 text-primary" size={24} />
            <h4 className="mb-0">Remote Scanner</h4>
          </div>
          
          <div className="mb-2">
            {connected ? (
              <span className="badge bg-success">
                <span className="d-inline-block rounded-circle bg-white me-1" style={{ width: '8px', height: '8px' }}></span>
                Connected to Desktop
              </span>
            ) : (
              <span className="badge bg-danger">Disconnected</span>
            )}
          </div>
          
          <p className="text-muted small">
            Session: <code className="bg-light px-2 py-1 rounded">{sessionId}</code>
          </p>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      <div 
        id="reader" 
        className="overflow-hidden rounded-3 shadow-sm bg-black mb-3"
        style={{ width: '100%', minHeight: '300px' }}
      ></div>

      {lastScan && (
        <Alert variant="success" className="text-center py-2 animate__animated animate__pulse">
          <strong>Relayed:</strong> {lastScan}
        </Alert>
      )}

      <div className="d-grid gap-2 mb-3">
        <Button 
          variant="outline-secondary" 
          onClick={() => window.location.reload()}
          className="d-flex align-items-center justify-content-center"
        >
          <RefreshCcw size={18} className="me-2" />
          Reload Scanner
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <p className="small fw-bold text-muted mb-2">MANUAL ENTRY</p>
          <form onSubmit={handleManualSend} className="d-flex gap-2">
            <input 
              name="manualData" 
              className="form-control form-control-sm" 
              placeholder="Type ID manually..."
            />
            <Button type="submit" size="sm" variant="primary">Send</Button>
          </form>
        </Card.Body>
      </Card>

      <div className="mt-2 text-center text-muted small">
        <p>Keep this window open and scan barcodes to send them directly to your computer.</p>
      </div>
    </Container>
  );
};

export default MobileScanner;
