import React, { useState } from "react";
import { Container, Row, Col, Button, Card, Table } from "react-bootstrap";
import { useToast } from "../../components/ui/ToastContext";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Loader2, 
  Save, 
  Trash2, 
  ExternalLink,
  MessageSquare,
  Group,
  XCircle,
  Layout
} from "lucide-react";

const ToastTestPage = () => {
  const { toast, confirm, hideToast } = useToast();
  const [loadingToastId, setLoadingToastId] = useState(null);
  const [position, setPosition] = useState("center");

  const triggerLongToast = () => {
    toast.info(
      "This is an extremely long toast message designed to test the new wrapping functionality. " +
      "Before our fix, this message would have been truncated with an ellipsis (...), but now it should wrap correctly to multiple lines " +
      "and expand the toast card height accordingly. You can even include formatting like \nNew lines\nand extra spaces!",
      { position }
    );
  };

  const triggerManyToasts = () => {
    toast.success("First success message", { position });
    setTimeout(() => toast.success("Second success message", { position }), 200);
    setTimeout(() => toast.success("Third success message", { position }), 400);
    setTimeout(() => toast.success("Fourth success message", { position }), 600);
    setTimeout(() => toast.success("Fifth success message", { position }), 800);
  };

  const triggerLimitTest = () => {
    const types = ["success", "error", "warning", "info", "loading"];
    const positions = ["center", "right"];
    let count = 0;

    // Trigger 10 combinations (5 types * 2 positions)
    positions.forEach(pos => {
      types.forEach(type => {
        setTimeout(() => {
          toast[type](`Group ${++count}: ${type} at ${pos}`, { position: pos });
        }, count * 300);
      });
    });

    // Trigger the 11th one to show the limit logic (oldest should disappear)
    setTimeout(() => {
      toast.info("Group 11: This should push out the first group (Group 1: success at center)", { position: "right" });
    }, 11 * 300);
  };

  const triggerBasic = (type) => {
    const messages = {
      success: "Operation completed successfully!",
      error: "An unexpected error occurred. Please try again.",
      warning: "Your subscription will expire in 3 days.",
      info: "New updates are available for your laboratory."
    };
    toast[type](messages[type], { position });
  };

  const triggerLoadingUpdate = () => {
    const id = toast.loading("Processing your request...", { position });
    setLoadingToastId(id);
    
    setTimeout(() => {
      toast.update(id, {
        render: "Halfway there! Still processing...",
        type: "info",
        isLoading: true
      });
    }, 2000);

    setTimeout(() => {
      toast.update(id, {
        render: "Success! Your data has been processed and saved to our secure servers.",
        type: "success",
        isLoading: false,
        autoClose: 5000
      });
      setLoadingToastId(null);
    }, 4500);
  };

  const handleConfirmDelete = async () => {
    const result = await confirm.delete("Selected Sample #12345", async () => {
      // Simulate API call
      return new Promise(resolve => setTimeout(resolve, 1500));
    });
    
    if (result) {
      toast.success("Sample deleted successfully");
    }
  };

  const handleCustomConfirm = async () => {
    await confirm.custom({
      title: "Export Data?",
      message: "Do you want to export the current view as a PDF file? This might take a few seconds.",
      type: "info",
      confirmText: "Export as PDF",
      cancelText: "Close"
    });
  };

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold">Toast System Showcase</h1>
        <p className="text-muted lead">Demonstrating all notification and confirmation types</p>
      </div>

      <Row className="g-4">
        {/* Settings & Controls */}
        <Col md={12}>
          <Card className="shadow-sm border-0 bg-primary text-white">
            <Card.Body className="p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <Layout size={24} />
                <h5 className="mb-0 fw-bold">Display Position:</h5>
                <div className="btn-group">
                  <Button 
                    variant={position === "center" ? "light" : "outline-light"} 
                    onClick={() => setPosition("center")}
                  >
                    Center
                  </Button>
                  <Button 
                    variant={position === "right" ? "light" : "outline-light"} 
                    onClick={() => setPosition("right")}
                  >
                    Right Side
                  </Button>
                </div>
              </div>
              <Button variant="danger" className="fw-bold" onClick={() => hideToast()}>
                <XCircle size={18} className="me-2" /> Clear All Toasts
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Basic Toasts */}
        <Col md={6}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
              <h4 className="fw-bold mb-0">Basic Notifications</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-grid gap-2">
                <Button variant="success" onClick={() => triggerBasic("success")}>
                  <CheckCircle size={18} className="me-2" /> Success Toast
                </Button>
                <Button variant="danger" onClick={() => triggerBasic("error")}>
                  <AlertCircle size={18} className="me-2" /> Error Toast
                </Button>
                <Button variant="warning" onClick={() => triggerBasic("warning")}>
                  <AlertTriangle size={18} className="me-2" /> Warning Toast
                </Button>
                <Button variant="info" onClick={() => triggerBasic("info")}>
                  <Info size={18} className="me-2" /> Info Toast
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Advanced Logic */}
        <Col md={6}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
              <h4 className="fw-bold mb-0">Advanced Logic</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-grid gap-2">
                <Button variant="outline-primary" onClick={triggerLoadingUpdate}>
                  <Loader2 size={18} className="me-2" /> Loading & Update Sequence
                </Button>
                <Button variant="outline-secondary" onClick={() => toast.info("This toast will stay until you click it.", { autoClose: false })}>
                  <Save size={18} className="me-2" /> Persistent Toast (No Auto-close)
                </Button>
                <Button variant="outline-dark" onClick={triggerLongToast}>
                  <MessageSquare size={18} className="me-2" /> Long Text (Wrapping Test)
                </Button>
                <Button variant="outline-info" onClick={triggerManyToasts}>
                  <Group size={18} className="me-2" /> Grouping Feature
                </Button>
                <Button variant="outline-danger" onClick={triggerLimitTest}>
                  <Bell size={18} className="me-2" /> Stress Test: 11 Unique Groups
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Confirmation Dialogs */}
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
              <h4 className="fw-bold mb-0">Confirmation Dialogs</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={3} className="mb-2">
                  <Button variant="danger" className="w-100" onClick={handleConfirmDelete}>
                    <Trash2 size={18} className="me-2" /> Delete Confirm
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="warning" className="w-100" onClick={() => confirm.warning("Change Status?", "Are you sure you want to mark this report as pending?")}>
                    <AlertTriangle size={18} className="me-2" /> Warning Confirm
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="info" className="w-100" onClick={() => confirm.info("System Notice", "The laboratory will undergo maintenance at 10 PM.")}>
                    <Info size={18} className="me-2" /> Info Confirm
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="dark" className="w-100" onClick={handleCustomConfirm}>
                    <ExternalLink size={18} className="me-2" /> Custom Dialog
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="mt-5 p-4 bg-light rounded-3 border">
        <h5 className="fw-bold">Features Highlighted:</h5>
        <ul>
          <li><strong>Pause on Hover:</strong> Hover over any toast to stop the countdown timer and progress bar.</li>
          <li><strong>Progress Bar:</strong> Visual countdown at the bottom of each toast.</li>
          <li><strong>Intelligent Grouping:</strong> Multiple toasts of the same type stack automatically.</li>
          <li><strong>Multi-line Support:</strong> Long messages now wrap gracefully instead of truncating.</li>
          <li><strong>Promise-based Confirms:</strong> Clean async/await syntax for user confirmations.</li>
          <li><strong>Smooth Animations:</strong> Premium shake-in and slide-out effects.</li>
        </ul>
      </div>
    </Container>
  );
};

export default ToastTestPage;
