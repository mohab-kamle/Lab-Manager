import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Badge, Alert, Spinner } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import io from "socket.io-client";
import {
  Smartphone,
  Link as LinkIcon,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const MobileScannerBridge = ({ onScan, onClose }) => {
  const [sessionId] = useState(uuidv4().substring(0, 8));
  const [connected, setConnected] = useState(false);
  const [phoneJoined, setPhoneJoined] = useState(false);
  const socketRef = useRef(null);
  const onScanRef = useRef(onScan);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Keep ref in sync with latest onScan callback
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Construct the mobile scanner URL
  // Use the current domain or fallback to window.location.origin
  const scannerUrl = `${window.location.origin}/mobile-scanner/${sessionId}`;

  useEffect(() => {
    // Initialize Socket
    socketRef.current = io(apiUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      setConnected(true);
      socketRef.current.emit("join-scanner", { sessionId });
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
    });

    socketRef.current.on("scan-result", (data) => {
      if (onScanRef.current) {
        onScanRef.current(data);
      }
    });

    socketRef.current.on("scanner-joined", () => {
      setPhoneJoined(true);
    });

    // We can detect if a phone joins by having the phone emit a 'joined' event
    // For now, we'll just show the connection status of the desktop socket

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [sessionId, apiUrl]);

  return (
    <Card className="border-primary shadow-sm mobile-scanner-bridge">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-2">
        <div className="d-flex align-items-center">
          <Smartphone size={18} className="me-2" />
          <span className="fw-bold">Mobile Scanner Bridge</span>
        </div>
        <Badge
          bg={connected ? "success" : "danger"}
          className="d-flex align-items-center"
        >
          {connected ? (
            <Wifi size={12} className="me-1" />
          ) : (
            <WifiOff size={12} className="me-1" />
          )}
          {connected ? (phoneJoined ? "Phone Connected" : "Live") : "Offline"}
        </Badge>
      </Card.Header>
      <Card.Body className="text-center p-4">
        <div className="mb-4">
          <p className="text-muted small mb-3">
            Scan this QR code with your smartphone camera to start scanning
            barcodes wirelessly.
          </p>

          <div className="d-inline-block p-3 bg-white rounded shadow-sm border mb-3">
            <QRCodeSVG value={scannerUrl} size={180} level="H" />
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <LinkIcon size={14} className="text-muted" />
            <code className="small text-primary">{scannerUrl}</code>
          </div>
        </div>

        <div className="status-indicator p-3 bg-light rounded-3 border">
          {!connected ? (
            <div className="text-danger small fw-bold">
              <Spinner animation="border" size="sm" className="me-2" />
              Waiting for server connection...
            </div>
          ) : !phoneJoined ? (
            <div className="text-primary small fw-bold">
              <Spinner animation="grow" size="sm" className="me-2" />
              Waiting for phone to scan QR code...
            </div>
          ) : (
            <div className="text-success small fw-bold d-flex align-items-center justify-content-center">
              <CheckCircle2 size={16} className="me-2" />
              Bridge Active: Phone connected and ready
            </div>
          )}
        </div>

        {onClose && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="mt-3"
            onClick={onClose}
          >
            Disable Mobile Bridge
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default MobileScannerBridge;
