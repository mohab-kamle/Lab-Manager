import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Button,
  Modal,
  Form,
  Alert,
  Row,
  Col,
  Badge,
  Table,
  Tabs,
  Tab,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import PrintPDF, { DirectPDFDownload } from "../../components/pdf/PrintPDF";
import RichTextEditor from "../../components/ui/RichTextEditor";
import ImageUpload from "../../components/ui/ImageUpload";
import SecureImage from "../../components/ui/SecureImage";
import DynamicResultForm from "../../components/tests/DynamicResultForm";
import SamplesListModal from "../../components/samples/SamplesListModal";
import {
  Pencil,
  CheckCircle,
  Eye,
  Trash2,
  Download,
  FileText,
  TestTube,
  Save,
  Upload,
  Plus,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CircleX,
  Undo,
  Wand2,
  Sparkles,
  Activity,
  ScanBarcode,
} from "lucide-react";
import { extractFromImage } from "../../api/medicalReports";
import { Nav, Tab as TabContent, TabPane } from "react-bootstrap";
import { useToast } from "../../components/ui/ToastContext";
import { formatDate } from "../../utils/dateFormatter";
import {
  exportToExcel,
  importFromExcel,
  validateExcelFile,
} from "../../utils/excelUtils";
import { useLab } from "../../context/LabContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import SampleQuickInfoModal from "../../components/samples/SampleQuickInfoModal";

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const MedicalReports = () => {
  const { toast, hideToast } = useToast();
  const { user } = useAuth();
  const { labInfo } = useLab();
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    field: "date",
    direction: "desc",
  }); // Default: latest to oldest
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    patient: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showSamplesModal, setShowSamplesModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [selectedReportForSamples, setSelectedReportForSamples] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReportForResults, setSelectedReportForResults] =
    useState(null);
  const [testComponents, setTestComponents] = useState({});
  const [fieldOptions, setFieldOptions] = useState({});
  const [activeTab, setActiveTab] = useState("tests");
  const [resultsData, setResultsData] = useState({
    test_results: [],
    test_component_results: {}, // { testId: { componentId: { result: '', status: '' } } }
  });
  const [antibiotics, setAntibiotics] = useState([]);
  const [antibioticsLoaded, setAntibioticsLoaded] = useState(false); // Cache flag for antibiotics
  // Culture and test_group state removed - now using structure_config from tests instead
  const [tests, setTests] = useState([]);
  const [formData, setFormData] = useState({
    comment: "",
    done: 0,
    pending: 0,
  });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedReportForPDF, setSelectedReportForPDF] = useState(null);
  // Loading states for various operations

  // Comment-related state
  const [comments, setComments] = useState({
    testComments: [],
    reportImages: []
  });
  const [commentImages, setCommentImages] = useState({
    tests: {}, // { testId: [images] }
    medicalReport: [] // [images] for main comment
  });
  const [commentTexts, setCommentTexts] = useState({
    tests: {}, // { testId: 'comment text' }
  });
  const [expandedComments, setExpandedComments] = useState({
    tests: {}, // { testId: boolean }
  });
  const [savingComments, setSavingComments] = useState({ test: false, medicalReport: false });
  const [updatingReport, setUpdatingReport] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [markingCollected, setMarkingCollected] = useState(null); // reportId being marked
  const [savingResults, setSavingResults] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(null); // reportId for invoice loading
  // Loading states for various operations
  const [expandedSections, setExpandedSections] = useState({});
  const [antibioticSearch, setAntibioticSearch] = useState({});
  const [showAddAntibioticModal, setShowAddAntibioticModal] = useState({});
  const [enteringResults, setEnteringResults] = useState(false);
  const [signingReport, setSigningReport] = useState(null); // reportId being signed
  // Patient data editing states
  const [editingPatientData, setEditingPatientData] = useState(false);
  const [patientEditData, setPatientEditData] = useState({
    gender: "",
    birth_date: "",
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [showImageDeleteConfirm, setShowImageDeleteConfirm] = useState(false);
  const [pendingImageDeletion, setPendingImageDeletion] = useState(null);
  const fileInputRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Function to update patient data
  const updatePatientData = async (patientId, updatedData) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.put(`${apiUrl}/patient/${patientId}`, updatedData, {
        headers,
      });

      // Update the selected report with new patient data
      setSelectedReportForResults((prev) => ({
        ...prev,
        patient: {
          ...prev.patient,
          ...updatedData,
        },
      }));

      // Update the reports list
      setReports((prev) =>
        prev.map((report) =>
          report.id === selectedReportForResults.id
            ? {
              ...report,
              patient: {
                ...report.patient,
                ...updatedData,
              },
            }
            : report
        )
      );

      toast.success("Patient data updated successfully");
      setEditingPatientData(false);
    } catch (error) {
      console.error("Error updating patient data:", error);
      toast.error("Failed to update patient data");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [reportsRes, patientsRes, antibioticsRes] = await Promise.all([
        axios.get(`${apiUrl}/medical-reports`, { headers }),
        axios.get(`${apiUrl}/patient`, { headers }),
        axios.get(`${apiUrl}/antibiotics`, { headers }).catch(e => ({ data: [] }))
      ]);

      setReports(reportsRes.data);
      setPatients(patientsRes.data);
      setAntibiotics(antibioticsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data");
      setLoading(false);
    }
  }, [apiUrl]);



  // Fetch comments for a medical report
  const fetchComments = useCallback(async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/medical-reports/${reportId}/comments`, { headers });

      // Map test comments and their images
      const testComments = (response.data.testComments || []).map(comment => ({
        ...comment,
        images: (comment.images || []).map(filename => ({
          image_name: filename,
          image_path: `/uploads/comment-images/${filename}`,
          isExisting: true
        }))
      }));

      // Organize comments by test/group ID for UI consumption
      const reportImages = (response.data.reportImages || []).map(img => ({
        image_name: img,
        image_path: `/uploads/comment-images/${img}`,
        isExisting: true,
        preview: null // No preview for existing images
      }));

      const organizedComments = {
        test: {},
        testComments: testComments,
        reportImages: reportImages,
        medicalReport: reportImages
      };

      // Set initial values for input fields from existing data if needed
      // (This avoids clearing the input images if they were already there, 
      // but usually we want to clear them after successful save)

      // Group test comments by test_id
      testComments.forEach(comment => {
        if (!organizedComments.test[comment.test_id]) {
          organizedComments.test[comment.test_id] = [];
        }
        organizedComments.test[comment.test_id].push(comment);
      });

      setComments(organizedComments);

      // Initialize comment texts from existing comments (keep empty for new comments)
      const newCommentTexts = { tests: {} };
      setCommentTexts(newCommentTexts);

      // Initialize comment images
      const initialCommentImages = { test: {}, medicalReport: reportImages };

      setCommentImages(initialCommentImages);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to fetch comments");
    }
  }, [apiUrl]);

  // Save test comment
  const saveTestComment = async (testId, comment, images) => {
    try {
      setSavingComments(prev => ({ ...prev, test: true }));
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const formData = new FormData();
      formData.append('reportId', selectedReportForResults.id);
      formData.append('test_id', testId);
      formData.append('comment', comment);

      const existingImages = [];
      if (images && images.length > 0) {
        images.forEach(image => {
          if (image.isExisting) {
            existingImages.push(image.image_name);
          } else {
            const fileToUpload = image.file || image;
            if (fileToUpload instanceof File) {
              formData.append('images', fileToUpload);
            }
          }
        });
      }

      // Add existing images to keep
      existingImages.forEach(img => formData.append('existingImages', img));

      await axios.post(
        `${apiUrl}/medical-reports/${selectedReportForResults.id}/test-comments`,
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );

      toast.success("Test comment saved successfully");
      await fetchComments(selectedReportForResults.id);
    } catch (error) {
      console.error("Error saving test comment:", error);
      toast.error("Failed to save test comment");
    } finally {
      setSavingComments(prev => ({ ...prev, test: false }));
    }
  };


  // Save medical report images
  const saveMedicalReportImages = async (images) => {
    if (!images || images.length === 0) {
      toast.warning("Please select at least one image to upload");
      return;
    }

    try {
      setSavingComments(prev => ({
        ...prev,
        medicalReport: true
      }));

      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const formData = new FormData();
      formData.append('reportId', selectedReportForResults.id);
      formData.append('commentType', 'medical_report');

      const existingImages = [];
      if (images && images.length > 0) {
        images.forEach(image => {
          if (image.isExisting) {
            existingImages.push(image.image_name);
          } else {
            const fileToUpload = image.file || image;
            if (fileToUpload instanceof File) {
              formData.append('images', fileToUpload);
            }
          }
        });
      }

      // Add existing images to keep
      existingImages.forEach(img => formData.append('existingImages', img));

      await axios.post(
        `${apiUrl}/medical-reports/${selectedReportForResults.id}/comment-images`,
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );

      toast.success("Medical report images saved successfully");

      // Clear the uploaded images
      setCommentImages(prev => ({
        ...prev,
        medicalReport: []
      }));

      await fetchComments(selectedReportForResults.id);
    } catch (error) {
      console.error("Error saving medical report images:", error);
      toast.error("Failed to save medical report images");
    } finally {
      setSavingComments(prev => ({
        ...prev,
        medicalReport: false
      }));
    }
  };

  // Delete test comment
  const deleteTestComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.delete(`${apiUrl}/medical-reports/test-comments/${commentId}`, { headers });

      toast.success("Test comment deleted successfully");
      await fetchComments(selectedReportForResults.id);
    } catch (error) {
      console.error("Error deleting test comment:", error);
      toast.error("Failed to delete test comment");
    }
  };


  // Handle image changes with deletion confirmation
  const handleImageChange = (type, newImages, id = null) => {
    const oldImages = type === 'medicalReport'
      ? commentImages.medicalReport
      : (commentImages.test[id] || []);

    // Check if an image was removed
    if (newImages.length < oldImages.length) {
      const removedImage = oldImages.find(oldImg => {
        // If it's a new image, it has a 'preview' property
        if (oldImg.preview) {
          return !newImages.some(newImg => newImg.preview === oldImg.preview);
        }
        // If it's an existing image, it has 'image_name'
        return !newImages.some(newImg => newImg.image_name === oldImg.image_name);
      });

      if (removedImage && removedImage.isExisting) {
        // Intercept deletion of existing image
        setPendingImageDeletion({ type, id, newImages, removedImage });
        setShowImageDeleteConfirm(true);
        return;
      }
    }

    // If it's an addition or a deletion of a new image, update state immediately
    updateImageState(type, newImages, id);
  };

  const updateImageState = (type, images, id = null) => {
    setCommentImages(prev => {
      if (type === 'medicalReport') {
        return { ...prev, medicalReport: images };
      } else {
        return {
          ...prev,
          test: {
            ...prev.test,
            [id]: images
          }
        };
      }
    });
  };

  const confirmImageDeletion = () => {
    if (pendingImageDeletion) {
      updateImageState(
        pendingImageDeletion.type,
        pendingImageDeletion.newImages,
        pendingImageDeletion.id
      );
    }
    setShowImageDeleteConfirm(false);
    setPendingImageDeletion(null);
  };

  const cancelImageDeletion = () => {
    setShowImageDeleteConfirm(false);
    setPendingImageDeletion(null);
  };

  // Toggle comment section expansion
  const toggleCommentExpansion = (type, id) => {
    setExpandedComments(prev => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [id]: !(prev[type] && prev[type][id])
      }
    }));
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedReportForResults && selectedReportForResults.cultures) {
      setResultsData((prev) => ({
        ...prev,
        culture_results: selectedReportForResults.cultures.map((culture) => {
          const id = culture.culture?.id || culture.culture_id || culture.id;
          const existing = prev.culture_results?.find(
            (cr) => cr.culture_id === id
          );
          return (
            existing || {
              culture_id: id,
              result: culture.result || "",
              status: culture.status || "pending",
            }
          );
        }),
      }));
    }

  }, [selectedReportForResults]);

  const getStatusBadge = (report) => {
    if (report.done === 1) {
      return <Badge bg="success">Done</Badge>;
    } else if (report.pending === 1) {
      return <Badge bg="warning">Pending</Badge>;
    } else {
      return <Badge bg="secondary">Unsigned</Badge>;
    }
  };

  const formatCellData = (value, header, row) => {
    if (
      header === "date" ||
      header === "registered_at" ||
      header === "collected_at" ||
      header === "received_at" ||
      header === "reported_at"
    ) {
      return value ? formatDate(value) : "-";
    } else if (header === "done" || header === "pending") {
      return value ? "Yes" : "No";
    } else if (header === "prints_number" || header === "whatsapp_sends") {
      return value || 0;
    } else if (
      header === "tests_count" ||
      header === "cultures_count"
    ) {
      return value || 0;
    } else if (header === "invoice_id") {
      return value ? `#${value}` : "-";
    } else {
      return String(value);
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      comment: report.comment || "",
      done: report.done || 0,
      pending: report.pending || 0,
    });
    setShowEditModal(true);
  };

  const handleSign = async (report) => {
    // Prevent multiple clicks
    if (signingReport === report.id) return;

    try {
      setSigningReport(report.id);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Determine if we are signing or unsigning
      const isSigning = report.done !== 1;

      const updateData = isSigning
        ? {
          done: 1,
          pending: 0,
          signatory_name: user.name,
          date: new Date().toISOString(),
        }
        : {
          done: 0,
          pending: 1,
          signatory_name: null,
          signatory_id: null,
          signatory_admin_id: null,
          reported_at: null,
        };

      if (isSigning) {
        // Set the appropriate signatory ID based on user role
        if (user.role === "admin") {
          updateData.signatory_admin_id = user.id;
        } else if (user.role === "chemist") {
          updateData.signatory_id = user.id;
        }
      }

      const response = await axios.put(
        `${apiUrl}/medical-reports/${report.id}`,
        updateData,
        { headers }
      );

      setReports((prevReports) =>
        prevReports.map((r) => (r.id === report.id ? response.data : r))
      );

      setShowEditModal(false);
      setEditingReport(null);
      toast.success(
        isSigning ? "Report signed successfully" : "Report unsigned successfully"
      );
    } catch (error) {
      console.error("Error signing/unsigning report:", error);
      setError("Failed to update report status");
      toast.error("Failed to update report status");
    } finally {
      setSigningReport(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (updatingReport) return;

    try {
      setUpdatingReport(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const updateData = {
        ...formData,
        date: new Date().toISOString(),
      };

      // If marking as done, set signatory info
      if (formData.done === 1) {
        updateData.signatory_name = user.name;
        if (user.role === "admin") {
          updateData.signatory_admin_id = user.id;
        } else if (user.role === "chemist") {
          updateData.signatory_id = user.id;
        }
      }

      const response = await axios.put(
        `${apiUrl}/medical-reports/${editingReport.id}`,
        updateData,
        { headers }
      );

      setReports((prevReports) =>
        prevReports.map((r) => (r.id === editingReport.id ? response.data : r))
      );

      setShowEditModal(false);
      setEditingReport(null);
      toast.success("Report updated successfully");
    } catch (error) {
      console.error("Error updating report:", error);
      setError("Failed to update report");
      toast.error("Failed to update report");
    } finally {
      setUpdatingReport(false);
    }
  };

  const handleDelete = async () => {
    // Prevent multiple clicks
    if (deletingReport) return;

    try {
      setDeletingReport(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${apiUrl}/medical-reports/${reportToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReports((prevReports) =>
        prevReports.filter((r) => r.id !== reportToDelete.id)
      );
      setShowDeleteModal(false);
      setReportToDelete(null);
      toast.success("Report deleted successfully");
    } catch (error) {
      console.error("Error deleting report:", error);
      setError("Failed to delete report");
      toast.error("Failed to delete report");
    } finally {
      setDeletingReport(false);
    }
  };

  const handleViewInvoice = async (report) => {
    // Prevent multiple clicks
    if (loadingInvoice === report.id) return;

    try {
      setLoadingInvoice(report.id);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch invoice details
      const response = await axios.get(`${apiUrl}/invoices/${report.bill_id}`, {
        headers,
      });
      setSelectedInvoice(response.data);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setError("Failed to fetch invoice details");
      toast.error("Failed to fetch invoice details");
    } finally {
      setLoadingInvoice(null);
    }
  };

  const handleMarkCollected = async (report) => {
    // Prevent multiple clicks
    if (markingCollected === report.id) return;

    try {
      setMarkingCollected(report.id);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Check if we are collecting or uncollecting
      const isCollecting = !report.collected_at;

      if (isCollecting) {
        // Use existing endpoint for collecting because it might trigger other side effects (like date updates in specific ways)
        // Although the code shows it just calls updateMedicalReportDates, sticking to it for collecting is safe.
        await axios.post(
          `${apiUrl}/medical-reports/${report.id}/collected`,
          {},
          { headers }
        );
      } else {
        // Use PUT endpoint to clear the collected_at date
        await axios.put(
          `${apiUrl}/medical-reports/${report.id}`,
          { collected_at: null },
          { headers }
        );
      }

      // Update the local state
      setReports((prevReports) =>
        prevReports.map((r) =>
          r.id === report.id
            ? {
              ...r,
              collected_at: isCollecting ? new Date().toISOString() : null,
            }
            : r
        )
      );

      toast.success(
        isCollecting
          ? "Sample marked as collected"
          : "Sample marked as uncollected"
      );
    } catch (error) {
      console.error("Error updating sample collection status:", error);
      toast.error("Failed to update sample collection status");
    } finally {
      setMarkingCollected(null);
    }
  };

  const handleEnterResults = async (rowData) => {
    // Prevent multiple clicks
    if (enteringResults === rowData.id) return;

    try {
      setEnteringResults(rowData.id);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const apiCalls = [
        axios.get(`${apiUrl}/medical-reports/${rowData.id}/entry-form`, {
          headers,
        })
      ];

      const responses = await Promise.all(apiCalls);
      const reportResponse = responses[0];

      // Extract data from the new entry-form endpoint
      const fullReport = reportResponse.data;
      const tests = fullReport.tests || [];

      // Build test component results defaults
      // The new endpoint returns results in the shape: results: { [parameter_key]: { value, clinical_flag } }
      const transformedTestComponentResults = {};
      tests.forEach((test) => {
        transformedTestComponentResults[test.id] = {};
        if (test.results) {
          Object.entries(test.results).forEach(([key, data]) => {
            // data.value may be a plain scalar (new format) OR a JSON-wrapped
            // object like { result, status } (legacy bulk-save format).
            // Safely unwrap either case so DynamicResultForm receives a plain value.
            let resolvedVal = data.value;
            if (resolvedVal && typeof resolvedVal === 'object' && resolvedVal.result !== undefined) {
              resolvedVal = resolvedVal.result; // unwrap legacy format
            }
            transformedTestComponentResults[test.id][key] = {
              result: resolvedVal,
              status: data.clinical_flag || 'pending',
            };
          });
        }
      });

      let activeTabToSet = "tests"; // default
      if (tests.length > 0) {
        activeTabToSet = "tests";
      }

      // Prepare initial results data
      const initialResultsData = {
        test_results: [],
        culture_results: [],
        test_component_results: transformedTestComponentResults,
      };

      // Batch state updates
      // Re-map the patient correctly from the entry-form response
      const reportForState = {
        ...fullReport,
        id: rowData.id, // Ensure id is always present for consistent API calls
        date: rowData.date, // keep original date from table
        patient: fullReport.patient,
        tests: tests // use the tests array with structure_config attached
      };

      setTestComponents({}); // Not needed in new architecture
      setSelectedReportForResults(reportForState);
      setResultsData(initialResultsData);
      setActiveTab(activeTabToSet);

      // Culture states cleared - using structure_config from tests instead

      // Fetch comments for this medical report
      await fetchComments(rowData.id);

      setShowResultsModal(true);
    } catch (error) {
      console.error("Error preparing results entry:", error);
      setError("Failed to load results data. Please try again.");
      toast.error("Failed to load results data. Please try again.");
    } finally {
      setEnteringResults(null);
    }
  };


  const handleSaveResults = async () => {
    // Prevent multiple clicks
    if (savingResults) return;

    try {
      setSavingResults(true);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Prepare test results data to avoid concurrent DB locking
      const saveRequests = [];
      Object.entries(resultsData.test_component_results || {}).forEach(
        ([testId, components]) => {
          // Format the results object as { [parameter_key]: result_value }
          const formattedResults = {};
          let hasResults = false;

          Object.entries(components).forEach(([key, data]) => {
            if (data && data.result !== undefined && data.result !== null && data.result !== '') {
              formattedResults[key] = data.result;
              hasResults = true;
            }
          });

          if (hasResults) {
            saveRequests.push({ testId, formattedResults });
          }
        }
      );

      // Show loading state
      const toastId = toast.loading("Saving results...");

      try {
        // Execute sequentially to avoid MySQL deadlocks from concurrent transaction gap locks
        for (const req of saveRequests) {
          await axios.post(
            `${apiUrl}/medical-reports/${selectedReportForResults.id}/results`,
            { test_id: req.testId, results: req.formattedResults },
            { headers }
          );
        }

        // Close the modal and refresh the data
        setShowResultsModal(false);
        setSelectedReportForResults(null);
        // Clear the form data
        setResultsData({
          test_results: [],
          test_component_results: {},
        });
        // Note: setExpandedSections / setAntibioticSearch are not used in current architecture

        // Refresh the reports list
        await fetchData();

        toast.update(toastId, {
          render: "Results saved successfully",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } catch (error) {
        console.error("Error saving results:", error);
        toast.update(toastId, {
          render:
            error.response?.data?.message ||
            "Failed to save results. Please try again.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error("Error preparing save request:", error);
      toast.error("Failed to prepare save request. Please try again.");
    } finally {
      setSavingResults(false);
    }
  };

  const handleAiExtraction = async (file) => {
    if (!file) return;

    try {
      setIsExtracting(true);
      const toastId = toast.loading("AI is scanning and extracting data...");

      // Get expected parameters to help the AI map correctly
      const expectedKeys = selectedReportForResults.tests.flatMap(test => {
        const configKeys = (test.structure_config || [])
          .filter(p => p.type !== 'header')
          .map(p => p.label || p.name || p.key);

        const componentKeys = (testComponents[test.id] || [])
          .map(c => c.label || c.name);

        return [...configKeys, ...componentKeys];
      });

      const extractedData = await extractFromImage(file, expectedKeys);

      if (!extractedData || Object.keys(extractedData).length === 0) {
        toast.update(toastId, {
          render: "No data could be extracted from this image.",
          type: "warning",
          autoClose: 5000
        });
        return;
      }

      const newComponentResults = { ...resultsData.test_component_results };
      let matchCount = 0;

      // Map AI data to existing report structure
      selectedReportForResults.tests.forEach(test => {
        // Create a new object for this test's results to ensure React detects changes
        const currentTestResults = { ...(newComponentResults[test.id] || {}) };

        const structureConfig = test.structure_config || [];
        const comps = testComponents[test.id] || [];

        Object.entries(extractedData).forEach(([aiKey, aiValue]) => {
          if (aiValue === null || aiValue === undefined) return;

          // Standardize both sides for comparison
          const normalize = (str) => str?.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedAiKey = normalize(aiKey);

          // 1. Try to find a matching parameter in the structure config
          let param = structureConfig.find(p => {
            const normKey = normalize(p.key);
            const normName = normalize(p.name);
            const normLabel = normalize(p.label);

            return normKey === normalizedAiKey ||
              normName === normalizedAiKey ||
              normLabel === normalizedAiKey ||
              // Allow partial matches for better resilience (e.g., "glucose" matching "glucose_fasting")
              (normalizedAiKey.length > 3 && normLabel && (normLabel.includes(normalizedAiKey) || normalizedAiKey.includes(normLabel)));
          });

          if (param && param.type !== 'header') {
            const key = param.key || param.name;
            currentTestResults[key] = {
              ...(currentTestResults[key] || {}),
              result: aiValue
            };
            matchCount++;
            return;
          }

          // 2. If no structure config match, try matching against simple components
          const component = comps.find(c => {
            const normName = normalize(c.name);
            const normLabel = normalize(c.label);
            return normName === normalizedAiKey || normLabel === normalizedAiKey;
          });

          if (component) {
            const key = component.id;
            currentTestResults[key] = {
              ...(currentTestResults[key] || {}),
              result: aiValue
            };
            matchCount++;
          }
        });

        // Update the top-level copy with our new test results object
        newComponentResults[test.id] = currentTestResults;
      });

      setResultsData(prev => ({
        ...prev,
        test_component_results: newComponentResults
      }));

      if (matchCount > 0) {
        toast.update(toastId, {
          render: `Successfully extracted ${matchCount} test results!`,
          type: "success",
          autoClose: 5000
        });
      } else {
        toast.update(toastId, {
          render: "AI finished scanning but couldn't find matches for the tests in this report.",
          type: "warning",
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error("AI Extraction failed:", error);
      // We can't use toastId here if it failed before toastId was assigned, 
      // but toast.loading is synchronous so it's fine.
      toast.error(error.message || "Failed to extract data from image");
      // Actually, if we use toast.error, the loading toast will stay.
      // Better to use update if we have the id.
    } finally {
      setIsExtracting(false);
    }
  };

  // Note: Status calculation is now handled by the backend automatically

  const updateTestResult = (testId, result) => {
    // Backend will calculate status automatically, so we only update the result
    setResultsData((prev) => ({
      ...prev,
      test_results: prev.test_results.map((tr) =>
        tr.test_id === testId ? { ...tr, result } : tr
      ),
    }));
  };

  const updateTestComponentResult = (testId, componentId, result) => {
    // Backend will calculate status automatically, so we only update the result
    setResultsData((prev) => ({
      ...prev,
      test_component_results: {
        ...prev.test_component_results,
        [testId]: {
          ...prev.test_component_results[testId],
          [componentId]: {
            ...prev.test_component_results[testId]?.[componentId],
            result,
          },
        },
      },
    }));
  };

  const handleDynamicResultChange = (testId, flatResults) => {
    // flatResults is an object like { "WBC": 5.4, "RBC": 4.2 }
    const formattedComponents = {};
    Object.entries(flatResults).forEach(([key, val]) => {
      // Create objects with a 'result' property to match existing structure
      formattedComponents[key] = { result: val };
    });

    setResultsData((prev) => ({
      ...prev,
      test_component_results: {
        ...prev.test_component_results,
        [testId]: {
          ...prev.test_component_results[testId],
          ...formattedComponents,
        },
      },
    }));
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case "normal":
        return "success";
      case "high":
      case "low":
        return "warning";
      case "critical high":
      case "critical low":
        return "danger";
      case "abnormal":
        return "warning";
      case "done":
        return "info";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const filteredReports = reports.filter((report) => {
    const searchMatch = searchQuery
      ? report.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.patient?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      report.signatory_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const dateMatch =
      (!filters.startDate ||
        new Date(report.date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(report.date) <= new Date(filters.endDate));

    const statusMatch =
      !filters.status ||
      (filters.status === "done" && report.done === 1) ||
      (filters.status === "pending" && report.pending === 1) ||
      (filters.status === "unsigned" &&
        report.done === 0 &&
        report.pending === 0);

    const patientMatch =
      !filters.patient || report.patient_id === parseInt(filters.patient);

    return searchMatch && dateMatch && statusMatch && patientMatch;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const valueA = a[sortConfig.field] ?? "";
    const valueB = b[sortConfig.field] ?? "";

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortConfig.direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedReports.length / itemsPerPage);
  const currentReports = sortedReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const ActionComponent = ({ rowData }) => {
    return (
      <div className="d-flex gap-1 justify-content-center">
        <Button
          variant="outline-primary"
          className="action-btn-fixed"
          onClick={() => {
            setSelectedReportForSamples(rowData);
            setShowSamplesModal(true);
          }}
          title="Sample Tracking"
        >
          <Activity size={16} />
        </Button>
        <Button
          variant="outline-primary"
          className="action-btn-fixed"
          onClick={() => handleEdit(rowData)}
          title="Edit Report"
        >
          <Pencil size={16} />
        </Button>
        <Button
          variant={
            rowData.done === 1 ? "outline-secondary" : "outline-success"
          }
          className="action-btn-fixed"
          onClick={() => handleSign(rowData)}
          title={rowData.done === 1 ? "Unsign Report" : "Sign Report"}
          disabled={signingReport === rowData.id}
        >
          {signingReport === rowData.id ? (
            <div
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ width: "12px", height: "12px" }}
            />
          ) : rowData.done === 1 ? (
            <Undo size={16} />
          ) : (
            <CheckCircle size={16} />
          )}
        </Button>
        {rowData.bill_id && (
          <Button
            variant="outline-info"
            className="action-btn-fixed"
            onClick={() => handleViewInvoice(rowData)}
            title="View Invoice"
            disabled={loadingInvoice === rowData.id}
          >
            {loadingInvoice === rowData.id ? (
              <div
                className="spinner-border spinner-border-sm"
                role="status"
                style={{ width: "12px", height: "12px" }}
              />
            ) : (
              <FileText size={16} />
            )}
          </Button>
        )}
        {(user.role === "admin" || user.role === "chemist") && (
          <Button
            variant="outline-warning"
            className="action-btn-fixed"
            onClick={() => handleEnterResults(rowData)}
            title="Enter Results"
            disabled={enteringResults === rowData.id}
          >
            {enteringResults === rowData.id ? (
              <div
                className="spinner-border spinner-border-sm"
                role="status"
                style={{ width: "12px", height: "12px" }}
              />
            ) : (
              <TestTube size={16} />
            )}
          </Button>
        )}
        <Button
          variant={
            rowData.collected_at ? "outline-secondary" : "outline-info"
          }
          className="action-btn-fixed"
          onClick={() => handleMarkCollected(rowData)}
          title={
            rowData.collected_at
              ? "Mark as Uncollected"
              : "Mark as Collected"
          }
          disabled={markingCollected === rowData.id}
        >
          {markingCollected === rowData.id ? (
            <div
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ width: "12px", height: "12px" }}
            />
          ) : rowData.collected_at ? (
            <Undo size={16} />
          ) : (
            <Save size={16} />
          )}
        </Button>
        {/* Direct PDF Download - wrapped to maintain layout if component supports it, otherwise assumed consistent */}
        <div className="action-btn-wrapper">
          <DirectPDFDownload
            reportId={rowData.id}
            patient={rowData.patient}
            apiUrl={apiUrl}
            className="action-btn-fixed"
          />
        </div>

        {/* PDF Preview Button */}
        <Button
          variant="outline-secondary"
          className="action-btn-fixed"
          onClick={async () => {
            try {
              const token = localStorage.getItem("token");
              const headers = { Authorization: `Bearer ${token}` };

              // Fetch the complete report details for PDF preview using optimized endpoint
              const response = await axios.get(
                `${apiUrl}/medical-reports/${rowData.id}?pdf=true`,
                { headers }
              );
              const responseData = response.data;

              // Extract data from the API response structure (same as download)
              const fullReportData = {
                ...responseData,
                testComponentResults: responseData.testComponentResults || {},
                testComponents: responseData.testComponents || {},
              };

              setSelectedReportForPDF(fullReportData);
              setShowPDFPreview(true);
            } catch (error) {
              console.error("Error fetching full report data:", error);
              toast.error("Failed to load report data for preview");
            }
          }}
          title="Preview PDF"
        >
          <Eye size={16} />
        </Button>
        <Button
          variant="outline-danger"
          className="action-btn-fixed"
          onClick={() => {
            setReportToDelete(rowData);
            setShowDeleteModal(true);
          }}
          title="Delete Report"
          disabled={deletingReport}
        >
          {deletingReport ? (
            <div
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ width: "12px", height: "12px" }}
            />
          ) : (
            <Trash2 size={16} />
          )}
        </Button>
      </div>
    );
  };

  const columns = [
    "date",
    "patient_name",
    "registered_at",
    "collected_at",
    "received_at",
    "reported_at",
    "done",
    "pending",
    "signatory_name",
    "prints_number",
    "whatsapp_sends",
    "tests_count",
    "cultures_count",
    "invoice_id",
  ];

  // Excel Export Handler
  const handleExportXLSX = async () => {
    try {
      const exportData = filteredReports.map((report) => ({
        Date: formatDate(report.date),
        Patient: report.patient?.name || "",
        "Registered At": report.registered_at
          ? formatDate(report.registered_at)
          : "-",
        "Collected At": report.collected_at
          ? formatDate(report.collected_at)
          : "-",
        "Received At": report.received_at
          ? formatDate(report.received_at)
          : "-",
        "Reported At": report.reported_at
          ? formatDate(report.reported_at)
          : "-",
        Comment: report.comment || "",
        Done: report.done ? "Yes" : "No",
        Pending: report.pending ? "Yes" : "No",
        Signatory: report.signatory_name || "",
        Prints: report.prints_number || 0,
        "WhatsApp Sends": report.whatsapp_sends || 0,
        "Tests Count": report.tests_count || 0,
        "Cultures Count": report.cultures_count || 0,
        "Invoice ID": report.invoice_id || "",
      }));

      const result = await exportToExcel(
        exportData,
        "medical_reports",
        "MedicalReports"
      );
      if (!result.success) {
        setError(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      setError("Failed to export medical reports");
    }
  };

  // XLSX Import Handler (now connected to backend)
  const handleImportXLSX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${apiUrl}/medical-reports/import`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success(
        `Imported: ${response.data.imported}, Updated: ${response.data.updated}, Errors: ${response.data.errors.length}`
      );
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to import medical reports");
    }
  };

  return (
    <>
      <SampleQuickInfoModal
        show={showScanModal}
        onHide={() => setShowScanModal(false)}
      />
      <Container fluid className="medical-reports-container">
        {loading ? (
          <LoadingSpinner message="Loading medical reports..." />
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h2>Medical Reports</h2>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline-primary" onClick={() => setShowScanModal(true)}>
                <ScanBarcode size={16} className="me-2" />
                Scan Sample
              </Button>
              <Button variant="outline-success" as="label">
                <Download size={16} className="me-2" />
                Export XLSX
                <input type="file" style={{ display: "none" }} disabled />
              </Button>
              <Button variant="outline-info" as="label">
                <Upload size={16} className="me-2" />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={handleImportXLSX}
                />
              </Button>
              <Badge bg="success" className="d-flex align-items-center gap-1">
                Done: {reports.filter((r) => r.done === 1).length}
              </Badge>
              <Badge bg="warning" className="d-flex align-items-center gap-1">
                Pending: {reports.filter((r) => r.pending === 1).length}
              </Badge>
              <Badge bg="secondary" className="d-flex align-items-center gap-1">
                Unsigned:{" "}
                {reports.filter((r) => r.done === 0 && r.pending === 0).length}
              </Badge>
            </div>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            showDateFilter={true}
            dateFilter={filters}
            setDateFilter={setFilters}
            sortableFields={columns}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            filters={filters}
            setFilters={setFilters}
            patients={patients}
            statuses={[
              { id: "done", state: "Done" },
              { id: "pending", state: "Pending" },
              { id: "unsigned", state: "Unsigned" },
            ]}
          />

          <DynamicTable
            data={currentReports}
            columns={columns}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
          />

          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={setCurrentPage}
          />

          {/* Edit Modal */}
          <Modal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false);
              setEditingReport(null);
            }}
            size="lg"
          >
            <Modal.Header>
              <Modal.Title>Edit Medical Report</Modal.Title>
              <button className="modal-close-btn" onClick={() => {
                setShowEditModal(false);
                setEditingReport(null);
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Comment</Form.Label>
                      <RichTextEditor
                        value={formData.comment || ''}
                        onChange={(html) =>
                          setFormData({ ...formData, comment: html })
                        }
                        placeholder="Enter doctor's comment with rich text formatting..."
                        maxLength={5000}
                        className="form-control-rich-text"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={
                          formData.done
                            ? "done"
                            : formData.pending
                              ? "pending"
                              : "unsigned"
                        }
                        onChange={(e) => {
                          const status = e.target.value;
                          setFormData({
                            ...formData,
                            done: status === "done" ? 1 : 0,
                            pending: status === "pending" ? 1 : 0,
                          });
                        }}
                      >
                        <option value="unsigned">Unsigned</option>
                        <option value="pending">Pending</option>
                        <option value="done">Done</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReport(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={updatingReport}
              >
                {updatingReport ? (
                  <>
                    <div
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Updating...
                  </>
                ) : (
                  "Update Report"
                )}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
          >
            <Modal.Header>
              <Modal.Title>Confirm Delete</Modal.Title>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              Are you sure you want to delete this medical report? This action
              cannot be undone.
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deletingReport}
              >
                {deletingReport ? (
                  <>
                    <div
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Invoice Details Modal */}
          <Modal
            show={showInvoiceModal}
            onHide={() => {
              setShowInvoiceModal(false);
              setSelectedInvoice(null);
            }}
            size="lg"
          >
            <Modal.Header>
              <Modal.Title>Invoice Details</Modal.Title>
              <button className="modal-close-btn" onClick={() => {
                setShowInvoiceModal(false);
                setSelectedInvoice(null);
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {selectedInvoice && (
                <div>
                  <Row>
                    <Col md={6}>
                      <strong>Invoice ID:</strong> {selectedInvoice.id}
                    </Col>
                    <Col md={6}>
                      <strong>Date:</strong> {formatDate(selectedInvoice.date)}
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={6}>
                      <strong>Patient:</strong> {selectedInvoice.patient_name}
                    </Col>
                    <Col md={6}>
                      <strong>Total:</strong> $
                      {Number(selectedInvoice.total || 0).toFixed(2)}
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={6}>
                      <strong>Paid:</strong> $
                      {Number(selectedInvoice.paid || 0).toFixed(2)}
                    </Col>
                    <Col md={6}>
                      <strong>Due:</strong> $
                      {Number(selectedInvoice.due || 0).toFixed(2)}
                    </Col>
                  </Row>

                  {selectedInvoice.tests &&
                    selectedInvoice.tests.length > 0 && (
                      <div className="mt-3">
                        <h6>Tests:</h6>
                        <Table striped bordered size="sm">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.tests.map((test, index) => (
                              <tr key={index}>
                                <td>{test.name}</td>
                                <td>${Number(test.price || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                  {selectedInvoice.cultures &&
                    selectedInvoice.cultures.length > 0 && (
                      <div className="mt-3">
                        <h6>Cultures:</h6>
                        <Table striped bordered size="sm">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.cultures.map((culture, index) => (
                              <tr key={index}>
                                <td>{culture.name}</td>
                                <td>
                                  ${Number(culture.price || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                  {selectedInvoice.packages &&
                    selectedInvoice.packages.length > 0 && (
                      <div className="mt-3">
                        <h6>Packages:</h6>
                        <Table striped bordered size="sm">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Type</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.packages.map((pkg, index) => (
                              <tr key={index}>
                                <td>{pkg.name}</td>
                                <td>{pkg.type}</td>
                                <td>${Number(pkg.price || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}


                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Results Entry Modal */}
          <Modal
            show={showResultsModal}
            onHide={() => {
              setShowResultsModal(false);
              setSelectedReportForResults(null);
              setResultsData({
                test_results: [],
                test_component_results: {},
              });
              setExpandedSections({});
              setAntibioticSearch({});
              setShowAddAntibioticModal({});
            }}
            size="xl"
          >
            <Modal.Header>
              <Modal.Title>Enter Test & Culture Results</Modal.Title>
              <button className="modal-close-btn" onClick={() => {
                setShowResultsModal(false);
                setSelectedReportForResults(null);
                setResultsData({
                  test_results: [],
                  test_component_results: {},
                });
                setExpandedSections({});
                setAntibioticSearch({});
                setShowAddAntibioticModal({});
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {selectedReportForResults && (
                <div>
                  {/* Enhanced Patient Information Section */}
                  <div className="patient-info-section mb-4 p-3 border rounded bg-light">
                    <Row className="align-items-center mb-2">
                      <Col>
                        <h5 className="mb-0">Patient Information</h5>
                      </Col>
                      <Col xs="auto" className="d-flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleAiExtraction(e.target.files[0]);
                              e.target.value = null; // Reset for same file selection
                            }
                          }}
                        />
                        <Button
                          variant="gradient-primary"
                          size="sm"
                          className="d-flex align-items-center ai-scan-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Spinner size="sm" className="me-1" />
                          ) : (
                            <Sparkles size={16} className="me-1" />
                          )}
                          AI Scan Report
                        </Button>
                        {!editingPatientData ? (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setEditingPatientData(true);
                              setPatientEditData({
                                gender:
                                  selectedReportForResults?.patient?.gender ||
                                  "",
                                birth_date:
                                  selectedReportForResults?.patient
                                    ?.birth_date || "",
                              });
                            }}
                          >
                            <Pencil size={16} className="me-1" />
                            Edit Patient Data
                          </Button>
                        ) : (
                          <div>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                updatePatientData(
                                  selectedReportForResults.patient.id,
                                  patientEditData
                                );
                              }}
                            >
                              <Save size={16} className="me-1" />
                              Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingPatientData(false);
                                setPatientEditData({
                                  gender: "",
                                  birth_date: "",
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <strong>Name:</strong>{" "}
                          {selectedReportForResults?.patient?.name}
                        </div>
                        <div className="mb-2">
                          <strong>Report Date:</strong>{" "}
                          {formatDate(selectedReportForResults.date)}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <strong>Gender:</strong>
                          {!editingPatientData ? (
                            <span
                              className={`ms-2 ${!selectedReportForResults?.patient?.gender
                                  ? "text-muted fst-italic"
                                  : ""
                                }`}
                            >
                              {selectedReportForResults?.patient?.gender ||
                                "Not specified"}
                            </span>
                          ) : (
                            <Form.Select
                              size="sm"
                              className="d-inline-block ms-2"
                              style={{ width: "auto" }}
                              value={patientEditData.gender}
                              onChange={(e) =>
                                setPatientEditData((prev) => ({
                                  ...prev,
                                  gender: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </Form.Select>
                          )}
                        </div>
                        <div className="mb-2">
                          <strong>Birth Date:</strong>
                          {!editingPatientData ? (
                            <span
                              className={`ms-2 ${!selectedReportForResults?.patient?.birth_date
                                  ? "text-muted fst-italic"
                                  : ""
                                }`}
                            >
                              {selectedReportForResults?.patient?.birth_date
                                ? formatDate(
                                  selectedReportForResults.patient.birth_date
                                )
                                : "Not specified"}
                            </span>
                          ) : (
                            <Form.Control
                              type="date"
                              size="sm"
                              className="d-inline-block ms-2"
                              style={{ width: "auto" }}
                              value={patientEditData.birth_date}
                              onChange={(e) =>
                                setPatientEditData((prev) => ({
                                  ...prev,
                                  birth_date: e.target.value,
                                }))
                              }
                            />
                          )}
                        </div>
                        <div className="mb-2">
                          <strong>Age:</strong>
                          <span className="ms-2">
                            {selectedReportForResults?.patient?.birth_date
                              ? `${calculateAge(
                                selectedReportForResults.patient.birth_date
                              )} years`
                              : "Unknown"}
                          </span>
                        </div>
                      </Col>
                    </Row>

                    {/* Show filtering status */}
                    {(!selectedReportForResults?.patient?.gender ||
                      !selectedReportForResults?.patient?.birth_date) && (
                        <Alert variant="info" className="mt-2 mb-0">
                          <small>
                            <strong>Note:</strong>
                            {!selectedReportForResults?.patient?.gender &&
                              !selectedReportForResults?.patient?.birth_date
                              ? " Both gender and birth date are missing. Showing all test components."
                              : !selectedReportForResults?.patient?.gender
                                ? " Gender is missing. Showing components for all genders."
                                : " Birth date is missing. Showing components for all ages."}
                            {
                              ' You can update this information using the "Edit Patient Data" button above.'
                            }
                          </small>
                        </Alert>
                      )}
                  </div>

                  <div className="scrollable-tabs">
                    <Tabs
                      activeKey={activeTab}
                      onSelect={setActiveTab}
                      id="results-tabs"
                      className="mb-3"
                    >
                      <Tab eventKey="tests" title="Tests">
                        {selectedReportForResults.tests &&
                          selectedReportForResults.tests.length > 0 && (
                            <div className="mb-4">
                              <h5>Tests</h5>
                              {selectedReportForResults.tests.map(
                                (test, testIndex) => {
                                  const comps = testComponents[test.id] || [];
                                  const patientAge = calculateAge(
                                    selectedReportForResults.patient?.birth_date
                                  );
                                  const patientGender =
                                    selectedReportForResults.patient?.gender;

                                  const hasStructureConfig = Array.isArray(test.structure_config) && test.structure_config.length > 0;

                                  // Filter components based on patient age and gender (for legacy fallback)
                                  let applicableComponents = [];

                                  if (!hasStructureConfig) {
                                    if (
                                      !patientGender &&
                                      !selectedReportForResults.patient
                                        ?.birth_date
                                    ) {
                                      // Both gender and birth date missing - show all components
                                      applicableComponents = comps;
                                    } else if (!patientGender) {
                                      // Only gender missing - filter by age but show all genders
                                      applicableComponents = comps.filter(
                                        (tc) => {
                                          const ageMatch =
                                            (tc.age_start == null ||
                                              patientAge >= tc.age_start) &&
                                            (tc.age_end == null ||
                                              patientAge <= tc.age_end);
                                          return ageMatch;
                                        }
                                      );
                                    } else if (
                                      !selectedReportForResults.patient
                                        ?.birth_date
                                    ) {
                                      // Only birth date missing - filter by gender but show all ages
                                      applicableComponents = comps.filter(
                                        (tc) => {
                                          const genderMatch =
                                            !tc.gender ||
                                            tc.gender === patientGender;
                                          return genderMatch;
                                        }
                                      );
                                    } else {
                                      // Both available - filter by both gender and age
                                      applicableComponents = comps.filter(
                                        (tc) => {
                                          const genderMatch =
                                            !tc.gender ||
                                            tc.gender === patientGender;
                                          const ageMatch =
                                            (tc.age_start == null ||
                                              patientAge >= tc.age_start) &&
                                            (tc.age_end == null ||
                                              patientAge <= tc.age_end);
                                          return genderMatch && ageMatch;
                                        }
                                      );
                                    }
                                  }

                                  return (
                                    <div
                                      key={test.id}
                                      className="border rounded p-3 mb-3"
                                    >
                                      <h6>{test.name}</h6>

                                      {hasStructureConfig ? (
                                        <div className="mt-3">
                                          <DynamicResultForm
                                            structureConfig={test.structure_config}
                                            patientInfo={{
                                              gender: patientGender,
                                              age: patientAge,
                                              age_unit: "years"
                                            }}
                                            antibioticsList={antibiotics}
                                            value={Object.entries(
                                              resultsData.test_component_results[test.id] || {}
                                            ).reduce((acc, [k, data]) => {
                                              acc[k] = data?.result;
                                              return acc;
                                            }, {})}
                                            onChange={(flatResults) => {
                                              handleDynamicResultChange(test.id, flatResults);
                                            }}
                                          />
                                        </div>
                                      ) : applicableComponents.length > 0 ? (
                                        <div>
                                          {/* Header row for components */}
                                          <Row className="mb-2 fw-bold text-muted">
                                            <Col md={3}>Component</Col>
                                            <Col md={2}>Normal Range</Col>
                                            <Col md={2}>Unit</Col>
                                            <Col md={3}>Result</Col>
                                            <Col md={2}>Status</Col>
                                          </Row>

                                          {/* Component rows */}
                                          {applicableComponents.map(
                                            (component, compIndex) => {
                                              const componentResult =
                                                resultsData
                                                  .test_component_results[
                                                test.id
                                                ]?.[component.id];

                                              // Helper function to format age range
                                              const formatAgeRange = (
                                                ageStart,
                                                ageEnd
                                              ) => {
                                                if (
                                                  ageStart == null &&
                                                  ageEnd == null
                                                )
                                                  return "All ages";
                                                if (ageStart == null)
                                                  return `≤ ${ageEnd} years`;
                                                if (ageEnd == null)
                                                  return `≥ ${ageStart} years`;
                                                return `${ageStart}-${ageEnd} years`;
                                              };

                                              // Helper function to format gender
                                              const formatGender = (gender) => {
                                                if (!gender)
                                                  return "All genders";
                                                return gender === "m"
                                                  ? "Male"
                                                  : gender === "f"
                                                    ? "Female"
                                                    : gender;
                                              };

                                              return (
                                                <Row
                                                  key={component.id}
                                                  className="mb-2 align-items-center"
                                                >
                                                  <Col md={3}>
                                                    <div>
                                                      <strong>
                                                        {component.name}
                                                      </strong>
                                                      {/* Show metadata when patient data is missing or when showing fallback components */}
                                                      {(!patientGender ||
                                                        !selectedReportForResults
                                                          .patient
                                                          ?.birth_date) && (
                                                          <div className="mt-1">
                                                            <small className="text-info d-block">
                                                              <i className="fas fa-info-circle me-1"></i>
                                                              {formatGender(
                                                                component.gender
                                                              )}
                                                            </small>
                                                            <small className="text-info d-block">
                                                              <i className="fas fa-calendar me-1"></i>
                                                              {formatAgeRange(
                                                                component.age_start,
                                                                component.age_end
                                                              )}
                                                            </small>
                                                          </div>
                                                        )}
                                                    </div>
                                                  </Col>
                                                  <Col md={2}>
                                                    <small className="text-muted">
                                                      {component.normal_from !==
                                                        null &&
                                                        component.normal_to !==
                                                        null
                                                        ? `${component.normal_from} - ${component.normal_to}`
                                                        : component.reference_range ||
                                                        "N/A"}
                                                    </small>
                                                  </Col>
                                                  <Col md={2}>
                                                    <small className="text-muted">
                                                      {component.unit || "N/A"}
                                                    </small>
                                                  </Col>
                                                  <Col md={3}>
                                                    <Form.Control
                                                      type={
                                                        component.result_type ===
                                                          "text"
                                                          ? "text"
                                                          : "number"
                                                      }
                                                      step={
                                                        component.result_type ===
                                                          "number"
                                                          ? "0.01"
                                                          : undefined
                                                      }
                                                      placeholder="Enter result"
                                                      value={
                                                        componentResult?.result ||
                                                        ""
                                                      }
                                                      onChange={(e) =>
                                                        updateTestComponentResult(
                                                          test.id,
                                                          component.id,
                                                          e.target.value
                                                        )
                                                      }
                                                    />
                                                  </Col>
                                                  <Col md={2}>
                                                    <Badge
                                                      bg={getStatusBadgeColor(
                                                        componentResult?.status ||
                                                        "pending"
                                                      )}
                                                    >
                                                      {componentResult?.status ||
                                                        "pending"}
                                                    </Badge>
                                                  </Col>
                                                </Row>
                                              );
                                            }
                                          )}
                                        </div>
                                      ) : (
                                        // Fallback for tests without components
                                        <Row className="mb-2">
                                          <Col md={3}>
                                            <strong>{test.name}</strong>
                                          </Col>
                                          <Col md={2}></Col>
                                          <Col md={2}></Col>
                                          <Col md={3}>
                                            <Form.Control
                                              type="number"
                                              step="0.01"
                                              placeholder="Enter result"
                                              value={
                                                resultsData.test_results.find(
                                                  (tr) => tr.test_id === test.id
                                                )?.result || ""
                                              }
                                              onChange={(e) =>
                                                updateTestResult(
                                                  test.id,
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </Col>
                                          <Col md={2}>
                                            <Badge
                                              bg={getStatusBadgeColor(
                                                resultsData.test_results.find(
                                                  (tr) => tr.test_id === test.id
                                                )?.status || "pending"
                                              )}
                                            >
                                              {resultsData.test_results.find(
                                                (tr) => tr.test_id === test.id
                                              )?.status || "pending"}
                                            </Badge>
                                          </Col>
                                        </Row>
                                      )}

                                      {/* Test Comment Section */}
                                      <div className="mt-3 border-top pt-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <h6 className="mb-0 text-muted">
                                            <i className="fas fa-comment me-2"></i>
                                            Test Comment
                                          </h6>
                                          <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => toggleCommentExpansion('test', test.id)}
                                          >
                                            {expandedComments.test?.[test.id] ? (
                                              <>
                                                <i className="fas fa-chevron-up me-1"></i>
                                                Hide
                                              </>
                                            ) : (
                                              <>
                                                <i className="fas fa-chevron-down me-1"></i>
                                                Show
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        {expandedComments.test?.[test.id] && (
                                          <div>
                                            {/* Existing Comments Display */}
                                            {comments.test?.[test.id] && comments.test[test.id].length > 0 && (
                                              <div className="mb-3">
                                                <h6 className="text-muted mb-2">Existing Comments:</h6>
                                                {comments.test[test.id].map((comment) => (
                                                  <div key={comment.id} className="card mb-2">
                                                    <div className="card-body p-2">
                                                      <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                          <p className="mb-1">{comment.comment_text}</p>
                                                          <small className="text-muted">
                                                            {new Date(comment.created_at).toLocaleString()}
                                                          </small>
                                                        </div>
                                                        <Button
                                                          variant="outline-danger"
                                                          size="sm"
                                                          onClick={() => deleteTestComment(comment.id)}
                                                        >
                                                          <i className="fas fa-trash"></i>
                                                        </Button>
                                                      </div>
                                                      {comment.images && comment.images.length > 0 && (
                                                        <div className="mt-2">
                                                          <div className="d-flex flex-wrap gap-2">
                                                            {comment.images.map((image, idx) => (
                                                              <SecureImage
                                                                key={idx}
                                                                src={`/uploads/comment-images/${image.image_name}`}
                                                                alt={`Comment image ${idx + 1}`}
                                                                className="img-thumbnail"
                                                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                                              />
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* New Comment Form */}
                                            <div className="card">
                                              <div className="card-body p-3">
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Add Comment</Form.Label>
                                                  <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    placeholder="Enter your comment..."
                                                    value={commentTexts.test?.[test.id] || ''}
                                                    onChange={(e) => {
                                                      setCommentTexts(prev => ({
                                                        ...prev,
                                                        test: {
                                                          ...prev.test,
                                                          [test.id]: e.target.value
                                                        }
                                                      }));
                                                    }}
                                                  />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                  <Form.Label>Upload Images (Max 3)</Form.Label>
                                                  <ImageUpload
                                                    images={commentImages.test?.[test.id] || []}
                                                    onImagesChange={(images) => handleImageChange('test', images, test.id)}
                                                    maxImages={3}
                                                  />
                                                </Form.Group>

                                                <Button
                                                  variant="primary"
                                                  onClick={() => saveTestComment(test.id, commentTexts.test?.[test.id] || '', commentImages.test?.[test.id] || [])}
                                                  disabled={savingComments.test || (!commentTexts.test?.[test.id]?.trim() && (!commentImages.test?.[test.id] || commentImages.test[test.id].length === 0))}
                                                >
                                                  {savingComments.test ? (
                                                    <>
                                                      <Spinner animation="border" size="sm" className="me-2" />
                                                      Saving...
                                                    </>
                                                  ) : (
                                                    'Save Comment'
                                                  )}
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                      </Tab>





                      {/* Medical Report Images Tab */}
                      <Tab eventKey="medical-report-images" title="Medical Report Images">
                        <div className="mt-3">
                          <div className="card">
                            <div className="card-header">
                              <h5 className="mb-0">
                                <i className="fas fa-images me-2"></i>
                                Medical Report Images
                              </h5>
                            </div>
                            <div className="card-body">
                              {/* Unified Image Management */}
                              <div>
                                <h6 className="text-muted mb-3">Manage Images (Max 10):</h6>
                                <Form.Group className="mb-3">
                                  <ImageUpload
                                    images={commentImages.medicalReport || []}
                                    onImagesChange={(images) => handleImageChange('medicalReport', images)}
                                    maxImages={10}
                                  />
                                </Form.Group>

                                <Button
                                  variant="primary"
                                  onClick={() => saveMedicalReportImages(commentImages.medicalReport || [])}
                                  disabled={savingComments.medicalReport}
                                >
                                  {savingComments.medicalReport ? (
                                    <>
                                      <Spinner animation="border" size="sm" className="me-2" />
                                      Saving Changes...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-save me-2"></i>
                                      Save Changes
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Tab>
                    </Tabs>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResultsModal(false);
                  setSelectedReportForResults(null);
                  setResultsData({
                    test_results: [],
                    test_component_results: {},
                  });
                  setExpandedSections({});
                  setAntibioticSearch({});
                  setShowAddAntibioticModal({});
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveResults}
                disabled={savingResults}
              >
                {savingResults ? (
                  <>
                    <div
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Saving...
                  </>
                ) : (
                  "Save Results"
                )}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* PDF Preview Modal */}
          <Modal
            show={showPDFPreview}
            onHide={() => {
              setShowPDFPreview(false);
              setSelectedReportForPDF(null);
            }}
            size="xl"
          >
            <Modal.Header>
              <Modal.Title>PDF Preview</Modal.Title>
              <button className="modal-close-btn" onClick={() => {
                setShowPDFPreview(false);
                setSelectedReportForPDF(null);
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {selectedReportForPDF && selectedReportForPDF.patient && (
                <PrintPDF
                  patient={selectedReportForPDF.patient}
                  report={selectedReportForPDF}
                  lab={labInfo}
                  comments={comments}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPDFPreview(false);
                  setSelectedReportForPDF(null);
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Image Deletion Confirmation Modal */}
          <Modal
            show={showImageDeleteConfirm}
            onHide={cancelImageDeletion}
            centered
            size="sm"
            contentClassName="border-0 shadow"
          >
            <Modal.Header closeButton className="bg-white border-0 pb-0 text-dark">
              <Modal.Title className="h5 fw-bold text-danger">Confirm Deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center pt-2">
              <div className="mb-3">
                <i className="fas fa-exclamation-triangle text-warning fa-3x"></i>
              </div>
              <p className="mb-0 text-dark">Are you sure you want to delete this image? This action cannot be undone once saved.</p>
              {pendingImageDeletion?.removedImage && (
                <div className="mt-3 p-2 bg-light rounded border">
                  <SecureImage
                    src={pendingImageDeletion.removedImage.image_path}
                    alt="Pending deletion"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    className="rounded"
                  />
                  <div className="small text-muted mt-1 text-truncate">
                    {pendingImageDeletion.removedImage.image_name}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
              <Button variant="light" onClick={cancelImageDeletion} className="fw-medium">
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmImageDeletion} className="fw-medium shadow-sm">
                Delete Image
              </Button>
            </Modal.Footer>
          </Modal>

          <SamplesListModal
            show={showSamplesModal}
            onHide={() => {
              setShowSamplesModal(false);
              setSelectedReportForSamples(null);
            }}
            report={selectedReportForSamples}
          />
        </>
      )}
    </Container>
    </>
  );
};

export default MedicalReports;
