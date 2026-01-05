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
} from "lucide-react";
import { Nav, Tab as TabContent, TabPane } from "react-bootstrap";
import { toast } from "react-toastify";
import { formatDate } from "../../utils/dateFormatter";
import {
  exportToExcel,
  importFromExcel,
  validateExcelFile,
} from "../../utils/excelUtils";
import { useLab } from "../../context/LabContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

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
  const [editingReport, setEditingReport] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReportForResults, setSelectedReportForResults] =
    useState(null);
  const [testComponents, setTestComponents] = useState({});
  const [testGroups, setTestGroups] = useState([]);
  const [testGroupValues, setTestGroupValues] = useState({});
  const [fieldOptions, setFieldOptions] = useState({});
  const [activeTab, setActiveTab] = useState("tests");
  const [resultsData, setResultsData] = useState({
    test_results: [],
    culture_results: [],
    test_component_results: {}, // { testId: { componentId: { result: '', status: '' } } }
  });
  const [antibiotics, setAntibiotics] = useState([]);
  const [antibioticsLoaded, setAntibioticsLoaded] = useState(false); // Cache flag for antibiotics
  const [cultureAntibiotics, setCultureAntibiotics] = useState({}); // { cultureResultId: [{ antibiotic_id, sensitivity, zone_size }] }
  const [expandedSections, setExpandedSections] = useState({}); // { cultureResultId: boolean }
  const [antibioticSearch, setAntibioticSearch] = useState({}); // { cultureResultId: string }
  const [showAddAntibioticModal, setShowAddAntibioticModal] = useState({}); // { cultureResultId: boolean }
  const [newAntibioticData, setNewAntibioticData] = useState({
    name: "",
    shortcut: "",
    commercial_name: "",
  });
  // Culture options and sub-options state
  const [cultureOptions, setCultureOptions] = useState([]);
  const [cultureSubOptions, setCultureSubOptions] = useState({});
  const [selectedCultureOptions, setSelectedCultureOptions] = useState({}); // { cultureId: [{ option_id, sub_option_id, custom_result, result_type, id }] }
  const [formData, setFormData] = useState({
    comment: "",
    done: 0,
    pending: 0,
  });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  // Loading states for various operations
  const [enteringResults, setEnteringResults] = useState(false);
  const [signingReport, setSigningReport] = useState(null); // reportId being signed
  
  // Comment-related state
  const [comments, setComments] = useState({
    testComments: [],
    testGroupComments: [],
    reportImages: []
  });
  const [commentImages, setCommentImages] = useState({
    tests: {}, // { testId: [images] }
    testGroups: {}, // { testGroupId: [images] }
    medicalReport: [] // [images] for main comment
  });
  const [commentTexts, setCommentTexts] = useState({
    tests: {}, // { testId: 'comment text' }
    testGroups: {} // { testGroupId: 'comment text' }
  });
  const [expandedComments, setExpandedComments] = useState({
    tests: {}, // { testId: boolean }
    testGroups: {} // { testGroupId: boolean }
  });
  const [savingComments, setSavingComments] = useState({ test: false, testGroup: false, medicalReport: false });
  const [updatingReport, setUpdatingReport] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [markingCollected, setMarkingCollected] = useState(null); // reportId being marked
  const [savingResults, setSavingResults] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(null); // reportId for invoice loading
  // Add state for inline add option
  const [addingOption, setAddingOption] = useState({}); // { [groupId_fieldId_componentId]: true }
  const [newOptionValue, setNewOptionValue] = useState({}); // { [groupId_fieldId_componentId]: "" }
  const addOptionInputRef = useRef(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false); // PDF preview modal
  const [selectedReportForPDF, setSelectedReportForPDF] = useState(null); // Report to preview
  // Patient data editing states
  const [editingPatientData, setEditingPatientData] = useState(false);
  const [patientEditData, setPatientEditData] = useState({
    gender: "",
    birth_date: "",
  });

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
      const [reportsRes, patientsRes] = await Promise.all([
        axios.get(`${apiUrl}/medical-reports`, { headers }),
        axios.get(`${apiUrl}/patient`, { headers }),
      ]);

      setReports(reportsRes.data);
      setPatients(patientsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data");
      setLoading(false);
    }
  }, [apiUrl]);

  // Fetch culture options and sub-options
  const fetchCultureOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const [optionsRes, subOptionsRes] = await Promise.all([
        axios.get(`${apiUrl}/culture-options/with-suboptions`, { headers }),
        axios.get(`${apiUrl}/culture-sub-options`, { headers }),
      ]);

      setCultureOptions(optionsRes.data);

      // Group sub-options by culture_option_id for easier access
      const subOptionsMap = {};
      subOptionsRes.data.forEach((subOption) => {
        if (!subOptionsMap[subOption.culture_option_id]) {
          subOptionsMap[subOption.culture_option_id] = [];
        }
        subOptionsMap[subOption.culture_option_id].push(subOption);
      });
      setCultureSubOptions(subOptionsMap);
    } catch (error) {
      console.error("Error fetching culture options:", error);
    }
  }, [apiUrl]);

  // Fetch comments for a medical report
  const fetchComments = useCallback(async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/medical-reports/${reportId}/comments`, { headers });
      
      // Organize comments by test/group ID for UI consumption
      const organizedComments = {
        test: {},
        testGroup: {},
        testComments: response.data.testComments,
        testGroupComments: response.data.testGroupComments,
        reportImages: response.data.reportImages,
        medicalReport: response.data.reportImages
      };
      
      // Group test comments by test_id
      response.data.testComments.forEach(comment => {
        if (!organizedComments.test[comment.test_id]) {
          organizedComments.test[comment.test_id] = [];
        }
        organizedComments.test[comment.test_id].push(comment);
      });
      
      // Group test group comments by test_group_id
      response.data.testGroupComments.forEach(comment => {
        if (!organizedComments.testGroup[comment.test_group_id]) {
          organizedComments.testGroup[comment.test_group_id] = [];
        }
        organizedComments.testGroup[comment.test_group_id].push(comment);
      });
      
      setComments(organizedComments);
      
      // Initialize comment texts from existing comments (keep empty for new comments)
      const newCommentTexts = { tests: {}, testGroups: {} };
      setCommentTexts(newCommentTexts);
      
      // Initialize comment images
      const newCommentImages = { tests: {}, testGroups: {}, medicalReport: response.data.reportImages };
      setCommentImages(newCommentImages);
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
      formData.append('test_id', testId);
      formData.append('comment', comment);
      
      if (images && images.length > 0) {
        images.forEach(image => {
          formData.append('images', image);
        });
      }
      
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

  // Save test group comment
  const saveTestGroupComment = async (testGroupId, comment, images) => {
    try {
      setSavingComments(prev => ({ ...prev, testGroup: true }));
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const formData = new FormData();
      formData.append('test_group_id', testGroupId);
      formData.append('comment', comment);
      
      if (images && images.length > 0) {
        images.forEach(image => {
          formData.append('images', image);
        });
      }
      
      await axios.post(
        `${apiUrl}/medical-reports/${selectedReportForResults.id}/test-group-comments`,
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success("Test group comment saved successfully");
      await fetchComments(selectedReportForResults.id);
    } catch (error) {
      console.error("Error saving test group comment:", error);
      toast.error("Failed to save test group comment");
    } finally {
      setSavingComments(prev => ({ ...prev, testGroup: false }));
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
      images.forEach(image => {
        formData.append('images', image);
      });
      
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

  // Delete test group comment
  const deleteTestGroupComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`${apiUrl}/medical-reports/test-group-comments/${commentId}`, { headers });
      
      toast.success("Test group comment deleted successfully");
      await fetchComments(selectedReportForResults.id);
    } catch (error) {
      console.error("Error deleting test group comment:", error);
      toast.error("Failed to delete test group comment");
    }
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
    fetchCultureOptions();
  }, [fetchData, fetchCultureOptions]);

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
      header === "cultures_count" ||
      header === "test_groups_count"
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

      // Fetch new unified results-data payload + full test group structure
      const apiCalls = [
        axios.get(`${apiUrl}/medical-reports/${rowData.id}/results-data`, {
          headers,
        }),
        axios.get(`${apiUrl}/medical-reports/${rowData.id}/test-groups`, {
          headers,
        }),
        ...(!antibioticsLoaded
          ? [axios.get(`${apiUrl}/culture-antibiotics`, { headers })]
          : []),
      ];

      const responses = await Promise.all(apiCalls);
      const reportResponse = responses[0];
      const testGroupsResponse = responses[1];
      // Only access responses[2] if antibiotics call was made
      const antibioticsResponse = !antibioticsLoaded && responses.length > 2 ? responses[2] : undefined;

      // Extract data from the new results-data endpoint
      const fullReport = reportResponse.data;
      const tests = fullReport.tests || [];
      const cultures = fullReport.cultures || [];

      // Build test components map from tests in the new structure
      const testComponentsData = {};
      tests.forEach((t) => {
        testComponentsData[t.id] = t.components || [];
      });

      // Build test component results defaults
      // NOTE: The new results-data response does not include per-component results.
      // Until the API exposes component results, we initialize as empty/pending.
      const transformedTestComponentResults = {};
      Object.keys(testComponentsData).forEach((testId) => {
        transformedTestComponentResults[testId] = {};
        (testComponentsData[testId] || []).forEach((component) => {
          transformedTestComponentResults[testId][component.id] = {
            result: "",
            status: "pending",
          };
        });
      });

      // If API returned test_component_results map, hydrate defaults
      if (fullReport.test_component_results) {
        Object.entries(fullReport.test_component_results).forEach(
          ([tId, compArr]) => {
            compArr.forEach((entry) => {
              if (transformedTestComponentResults[tId]) {
                transformedTestComponentResults[tId][entry.test_component_id] =
                  {
                    result: entry.result || "",
                    status: entry.status || "pending",
                  };
              }
            });
          }
        );
      }

      // Use dedicated test-groups endpoint for full structure (fields, options, values)
      const testGroupsData = Array.isArray(testGroupsResponse.data)
        ? testGroupsResponse.data
        : [];

      // Initialize editable values state for test groups
      const testGroupValues = {};
      testGroupsData.forEach((group) => {
        testGroupValues[group.id] = group.values || {};
        // Ensure each component has an object to type into
        const allComponents = [
          ...(group.direct_components || group.directComponents || []),
          ...(group.categories || []).flatMap((cat) => cat.components || []),
        ];
        allComponents.forEach((comp) => {
          if (!testGroupValues[group.id][comp.id]) {
            testGroupValues[group.id][comp.id] = {};
          }
        });
      });

      // Determine active tab
      let activeTabToSet = "tests"; // default
      if (tests.length === 0 && testGroupsData.length > 0) {
        activeTabToSet = "test-groups";
      } else if (tests.length > 0) {
        activeTabToSet = "tests";
      } else if (cultures.length > 0) {
        activeTabToSet = "cultures";
      }

      // Update antibiotics cache if fetched
      if (antibioticsResponse && !antibioticsLoaded) {
        setAntibiotics(antibioticsResponse.data);
        setAntibioticsLoaded(true);
      }

      // Prepare initial results data
      const initialResultsData = {
        test_results: tests.map((test) => ({
          test_id: test.id,
          // Hydrated from medical_report_has_test if present; otherwise empty/pending
          result: test.medical_report_has_test?.result || "",
          status: test.medical_report_has_test?.status || "pending",
        })),
        culture_results: cultures.map((culture) => ({
          culture_id: culture.culture?.id || culture.culture_id,
          result: culture.result || "",
          status: culture.status || "pending",
        })),
        test_component_results: transformedTestComponentResults,
      };

      // Batch state updates
      setTestComponents(testComponentsData);
      // Normalize key name to the UI shape (expects directComponents)
      const normalizedGroups = testGroupsData.map((g) => ({
        ...g,
        directComponents: g.directComponents || g.direct_components || [],
      }));
      setTestGroups(normalizedGroups);
      setTestGroupValues(testGroupValues);
      setSelectedReportForResults(fullReport);
      setResultsData(initialResultsData);
      setActiveTab(activeTabToSet);

      // Initialize culture antibiotics from the fetched data
      const initialCultureAntibiotics = {};
      cultures.forEach((culture) => {
        const cultureResultId = culture.id;
        if (
          cultureResultId &&
          culture.culture_antibiotics &&
          culture.culture_antibiotics.length > 0
        ) {
          initialCultureAntibiotics[cultureResultId] =
            culture.culture_antibiotics.map((ca) => ({
              antibiotic_id: ca.antibiotic?.id || ca.antibiotic_id,
              sensitivity: ca.sensitivity || "moderate",
              zone_size: ca.zone_size || null,
            }));
        }
      });
      setCultureAntibiotics(initialCultureAntibiotics);

      // Initialize culture options from the fetched data
      const initialSelectedCultureOptions = {};
      cultures.forEach((culture) => {
        // Use culture.id (medical_report_has_culture ID) as the key to match the UI
        const cultureKey = culture.id;
        if (culture.culture_results && culture.culture_results.length > 0) {
          initialSelectedCultureOptions[cultureKey] =
            culture.culture_results.map((cr) => {
              // Map database result_type to frontend values
              let frontendResultType = "custom";
              if (
                cr.result_type === "option" ||
                cr.result_type === "sub_option"
              ) {
                frontendResultType = "predefined";
              }

              // Try to map culture_option_name back to option_id
              let optionId = null;
              let subOptionId = null;

              if (
                frontendResultType === "predefined" &&
                cr.culture_option_name
              ) {
                const matchingOption = cultureOptions.find(
                  (opt) => opt.option === cr.culture_option_name
                );
                if (matchingOption) {
                  optionId = matchingOption.id;

                  // Try to map culture_sub_option_name back to sub_option_id
                  if (
                    cr.culture_sub_option_name &&
                    cultureSubOptions[matchingOption.id]
                  ) {
                    const matchingSubOption = cultureSubOptions[
                      matchingOption.id
                    ].find((sub) => sub.name === cr.culture_sub_option_name);
                    if (matchingSubOption) {
                      subOptionId = matchingSubOption.id;
                    }
                  }
                }
              }

              return {
                id: cr.id,
                result_type: frontendResultType,
                option_id: optionId,
                sub_option_id: subOptionId,
                custom_result: cr.custom_result || "",
                culture_option_name: cr.culture_option_name || null,
                culture_sub_option_name: cr.culture_sub_option_name || null,
              };
            });
        }
      });
      setSelectedCultureOptions(initialSelectedCultureOptions);

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

  // Memoized function to prevent unnecessary re-renders
  const handleTestGroupValueChange = useCallback(
    (groupId, componentId, fieldId, value) => {
      setTestGroupValues((prev) => {
        // Create a deep copy of the previous state to avoid direct mutation
        const newState = {
          ...prev,
          [groupId]: {
            ...(prev[groupId] || {}),
            [componentId]: {
              ...(prev[groupId]?.[componentId] || {}),
              [fieldId]: value,
            },
          },
        };

        // Also update the results data if needed
        setResultsData((prevData) => ({
          ...prevData,
          // Add or update the test group value in the results data
          test_group_values: {
            ...(prevData.test_group_values || {}),
            [groupId]: {
              ...(prevData.test_group_values?.[groupId] || {}),
              [componentId]: {
                ...(prevData.test_group_values?.[groupId]?.[componentId] || {}),
                [fieldId]: value,
              },
            },
          },
        }));

        return newState;
      });
    },
    []
  ); // Empty dependency array since we're using functional updates

  // Add option handler
  const handleAddFieldCompOption = async (
    groupId,
    fieldId,
    componentId,
    value
  ) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      // Call backend to add option
      const response = await axios.post(
        `${apiUrl}/field-comp-options`,
        {
          name: value,
          tg_fields_id: fieldId,
          tg_component_id: componentId,
          test_group_id: groupId,
        },
        { headers }
      );
      // Update local state
      setTestGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            fields: g.fields.map((f) => {
              if (f.id !== fieldId) return f;
              return {
                ...f,
                field_comp_options: [
                  ...(f.field_comp_options || []),
                  {
                    id: response.data.id,
                    name: value,
                    tg_component_id: componentId,
                    tg_fields_id: fieldId,
                  },
                ],
              };
            }),
          };
        })
      );
      setAddingOption((prev) => ({
        ...prev,
        [`${groupId}_${fieldId}_${componentId}`]: false,
      }));
      setNewOptionValue((prev) => ({
        ...prev,
        [`${groupId}_${fieldId}_${componentId}`]: "",
      }));
    } catch (error) {
      alert("Failed to add option");
    }
  };

  const handleSaveTestGroupValues = async (reportId, groupId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Transform the data structure to match backend expectations
      const values = {};
      if (testGroupValues[groupId]) {
        Object.entries(testGroupValues[groupId]).forEach(
          ([componentId, fields]) => {
            values[componentId] = {};
            Object.entries(fields).forEach(([fieldId, value]) => {
              values[componentId][fieldId] = value;
            });
          }
        );
      }

      await axios.post(
        `${apiUrl}/medical-reports/${reportId}/test-groups`,
        {
          test_group_id: parseInt(groupId, 10),
          values: values,
        },
        { headers }
      );

      return true;
    } catch (error) {
      console.error("Error saving test group values:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error:", error.message);
      }
      return false;
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

      console.log("Preparing bulk save request:", {
        resultsData,
        testGroupValues,
        cultureAntibiotics,
        selectedCultureOptions,
      });

      // Prepare test component results with validation
      const validatedTestComponentResults = {};
      Object.entries(resultsData.test_component_results || {}).forEach(
        ([testId, components]) => {
          // Get valid component IDs for this test to filter out invalid entries
          const validComponentIds = (testComponents[testId] || []).map(
            (comp) => comp.id
          );

          const validComponents = {};
          Object.entries(components).forEach(([componentId, componentData]) => {
            // Convert componentId to number and validate it's a valid component ID
            const numericComponentId = parseInt(componentId, 10);
            const isValidComponentId =
              !isNaN(numericComponentId) &&
              validComponentIds.includes(numericComponentId);

            if (isValidComponentId && componentData.result !== undefined) {
              validComponents[componentId] = componentData;
            }
          });

          if (Object.keys(validComponents).length > 0) {
            validatedTestComponentResults[testId] = validComponents;
          }
        }
      );

      // Prepare culture antibiotics with culture result IDs
      const formattedCultureAntibiotics = {};
      Object.entries(cultureAntibiotics).forEach(
        ([cultureResultId, antibiotics]) => {
          if (antibiotics && antibiotics.length > 0) {
            formattedCultureAntibiotics[cultureResultId] = antibiotics;
          }
        }
      );

      // Prepare culture options with proper formatting
      const formattedCultureOptions = {};
      Object.entries(selectedCultureOptions).forEach(
        ([cultureId, optionsArray]) => {
          if (optionsArray && optionsArray.length > 0) {
            // Find the actual culture ID from the medical_report_has_culture ID
            const culture = selectedReportForResults.cultures.find(
              (c) => c.id.toString() === cultureId.toString()
            );
            const actualCultureId = culture?.culture?.id || culture?.culture_id;

            if (actualCultureId) {
              // Filter out empty options and format them properly
              const validOptions = optionsArray
                .filter(
                  (optionData) =>
                    optionData.option_id || optionData.custom_result
                )
                .map((optionData) => {
                  // Get the option and sub-option names for storage
                  const selectedOption = cultureOptions.find(
                    (opt) =>
                      opt.id.toString() === optionData.option_id?.toString()
                  );
                  const selectedSubOption = optionData.sub_option_id
                    ? cultureSubOptions[optionData.option_id]?.find(
                        (sub) =>
                          sub.id.toString() ===
                          optionData.sub_option_id?.toString()
                      )
                    : null;

                  // Map frontend result_type back to database enum values
                  let dbResultType = "custom";
                  if (optionData.result_type === "predefined") {
                    if (selectedSubOption) {
                      dbResultType = "sub_option";
                    } else if (selectedOption) {
                      dbResultType = "option";
                    }
                  }

                  return {
                    culture_option_name: selectedOption?.option || null,
                    culture_sub_option_name: selectedSubOption?.name || null,
                    custom_result: optionData.custom_result || null,
                    result_type: dbResultType,
                  };
                });

              if (validOptions.length > 0) {
                formattedCultureOptions[actualCultureId] = validOptions;
              }
            }
          }
        }
      );

      // Filter culture_results to only include those with actual results (for backward compatibility)
      const filteredCultureResults = (resultsData.culture_results || []).filter(
        (cr) => cr.result && cr.result.toString().trim() !== ""
      );

      // Prepare the bulk request payload
      const bulkPayload = {
        test_results: resultsData.test_results || [],
        culture_results: filteredCultureResults,
        test_component_results: validatedTestComponentResults,
        test_group_values: testGroupValues,
        culture_antibiotics: formattedCultureAntibiotics,
        culture_options: formattedCultureOptions,
      };

      console.log("Bulk save payload:", bulkPayload);

      // Show loading state
      const toastId = toast.loading("Saving results...");

      try {
        // Make single bulk request
        await axios.post(
          `${apiUrl}/medical-reports/${selectedReportForResults.id}/results/bulk`,
          bulkPayload,
          { headers }
        );

        // Close the modal and refresh the data
        setShowResultsModal(false);
        setSelectedReportForResults(null);
        setResultsData({
          test_results: [],
          culture_results: [],
          test_component_results: {},
        });
        // Don't clear testGroupValues - they should persist after save
        // setTestGroupValues({}); // Removed to prevent values from disappearing
        setCultureAntibiotics({});
        setSelectedCultureOptions({});
        setExpandedSections({});
        setAntibioticSearch({});
        setShowAddAntibioticModal({});

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

  const updateCultureResult = (cultureId, result) => {
    // For culture results, set status to 'done' if result is entered, 'pending' if empty
    const status =
      result && result.toString().trim() !== "" ? "done" : "pending";

    setResultsData((prev) => ({
      ...prev,
      culture_results: prev.culture_results.map((cr) =>
        cr.culture_id === cultureId ? { ...cr, result, status } : cr
      ),
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

  const updateCultureAntibiotic = (
    cultureResultId,
    antibioticId,
    sensitivity
  ) => {
    setCultureAntibiotics((prev) => {
      const current = prev[cultureResultId] || [];
      const existingIndex = current.findIndex(
        (item) => item.antibiotic_id === antibioticId
      );

      if (existingIndex >= 0) {
        // Update existing
        const updated = [...current];
        updated[existingIndex] = { antibiotic_id: antibioticId, sensitivity };
        return { ...prev, [cultureResultId]: updated };
      } else {
        // Add new
        return {
          ...prev,
          [cultureResultId]: [
            ...current,
            { antibiotic_id: antibioticId, sensitivity },
          ],
        };
      }
    });
  };

  const removeCultureAntibiotic = (cultureResultId, antibioticId) => {
    setCultureAntibiotics((prev) => {
      const current = prev[cultureResultId] || [];
      const filtered = current.filter(
        (item) => item.antibiotic_id !== antibioticId
      );
      return { ...prev, [cultureResultId]: filtered };
    });
  };

  const updateCultureAntibioticZone = (
    cultureResultId,
    antibioticId,
    zoneSize
  ) => {
    setCultureAntibiotics((prev) => {
      const current = prev[cultureResultId] || [];
      const updated = current.map((item) =>
        item.antibiotic_id === antibioticId
          ? { ...item, zone_size: zoneSize }
          : item
      );
      return { ...prev, [cultureResultId]: updated };
    });
  };

  const handleAddNewAntibiotic = async (cultureResultId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${apiUrl}/antibiotics`,
        newAntibioticData,
        { headers }
      );
      const newAntibiotic = response.data;

      // Add to local antibiotics list
      setAntibiotics((prev) => [...prev, newAntibiotic]);

      // Add to culture antibiotics
      updateCultureAntibiotic(cultureResultId, newAntibiotic.id, "moderate");

      // Reset form and close modal
      setNewAntibioticData({ name: "", shortcut: "", commercial_name: "" });
      setShowAddAntibioticModal((prev) => ({
        ...prev,
        [cultureResultId]: false,
      }));

      toast.success("Antibiotic added successfully!");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to add antibiotic";
      toast.error(errorMessage);
    }
  };

  // Culture options handler functions for multiple selections
  const addCultureOption = (cultureId) => {
    setSelectedCultureOptions((prev) => ({
      ...prev,
      [cultureId]: [
        ...(prev[cultureId] || []),
        {
          id: Date.now(), // Temporary ID for new entries
          result_type: "custom",
          option_id: null,
          sub_option_id: null,
          custom_result: "",
        },
      ],
    }));
  };

  const removeCultureOption = (cultureId, optionIndex) => {
    setSelectedCultureOptions((prev) => ({
      ...prev,
      [cultureId]: (prev[cultureId] || []).filter(
        (_, index) => index !== optionIndex
      ),
    }));
  };

  const updateCultureOption = (cultureId, optionIndex, field, value) => {
    setSelectedCultureOptions((prev) => ({
      ...prev,
      [cultureId]: (prev[cultureId] || []).map((option, index) =>
        index === optionIndex ? { ...option, [field]: value } : option
      ),
    }));
  };

  const handleCultureResultTypeChange = (
    cultureId,
    optionIndex,
    resultType
  ) => {
    updateCultureOption(cultureId, optionIndex, "result_type", resultType);
    if (resultType === "custom") {
      updateCultureOption(cultureId, optionIndex, "option_id", null);
      updateCultureOption(cultureId, optionIndex, "sub_option_id", null);
    }
  };

  const handleCultureOptionChange = (cultureId, optionIndex, optionId) => {
    updateCultureOption(cultureId, optionIndex, "option_id", optionId);
    updateCultureOption(cultureId, optionIndex, "sub_option_id", null); // Reset sub-option
  };

  const handleCultureSubOptionChange = (
    cultureId,
    optionIndex,
    subOptionId
  ) => {
    updateCultureOption(cultureId, optionIndex, "sub_option_id", subOptionId);
  };

  /**
   * Update the custom result of a culture option in the selected report.
   * @param {string} cultureId - The ID of the culture.
   * @param {number} optionIndex - The index of the culture option in the culture.
   * @param {string} customResult - The custom result text.
   */
  const handleCustomResultChange = (cultureId, optionIndex, customResult) => {
    updateCultureOption(cultureId, optionIndex, "custom_result", customResult);
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
                testGroups: responseData.testGroups || [],
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
    "test_groups_count",
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
        "Test Groups Count": report.test_groups_count || 0,
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
      alert(
        `Imported: ${response.data.imported}, Updated: ${response.data.updated}, Errors: ${response.data.errors.length}`
      );
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to import medical reports");
    }
  };

  return (
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

                  {selectedInvoice.test_groups &&
                    selectedInvoice.test_groups.length > 0 && (
                      <div className="mt-3">
                        <h6>Test Groups:</h6>
                        <Table striped bordered size="sm">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.test_groups.map((tg, index) => (
                              <tr key={`tg-${index}`}>
                                <td>{tg.name}</td>
                                <td>${Number(tg.price || 0).toFixed(2)}</td>
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
                culture_results: [],
                test_component_results: {},
              });
              setCultureAntibiotics({});
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
                  culture_results: [],
                  test_component_results: {},
                });
                setCultureAntibiotics({});
                setExpandedSections({});
                setAntibioticSearch({});
                setShowAddAntibioticModal({});
                setSelectedCultureOptions({});
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
                      <Col xs="auto">
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
                              className={`ms-2 ${
                                !selectedReportForResults?.patient?.gender
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
                              className={`ms-2 ${
                                !selectedReportForResults?.patient?.birth_date
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

                                  // Filter components based on patient age and gender
                                  let applicableComponents;

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

                                  return (
                                    <div
                                      key={test.id}
                                      className="border rounded p-3 mb-3"
                                    >
                                      <h6>{test.name}</h6>

                                      {applicableComponents.length > 0 ? (
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
                                                                src={`/uploads/comment-images/${image}`}
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
                                                    onImagesChange={(images) => {
                                                      setCommentImages(prev => ({
                                                        ...prev,
                                                        test: {
                                                          ...prev.test,
                                                          [test.id]: images
                                                        }
                                                      }));
                                                    }}
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

                      <Tab eventKey="cultures" title="Cultures">
                        {selectedReportForResults.cultures &&
                          selectedReportForResults.cultures.length > 0 && (
                            <div className="mb-4">
                              <h5 className="mb-3">Cultures</h5>
                              {selectedReportForResults.cultures.map(
                                (culture, cultureIndex) => {
                                  const cultureResult =
                                    resultsData.culture_results.find(
                                      (cr) =>
                                        cr.culture_id ===
                                        (culture.culture?.id ||
                                          culture.culture_id)
                                    );
                                  const cultureResultId = culture.id;
                                  const cultureAntibioticsList =
                                    cultureAntibiotics[cultureResultId] || [];
                                  const hasResults =
                                    selectedCultureOptions[culture.id] &&
                                    selectedCultureOptions[culture.id].length >
                                      0;
                                  const cultureStatus = hasResults
                                    ? "done"
                                    : culture.status || "pending";

                                  return (
                                    <div
                                      key={culture.id}
                                      className="card border-0 shadow-sm mb-3"
                                    >
                                      <div className="card-header bg-light border-0 py-2">
                                        <Row className="align-items-center">
                                          <Col md={6}>
                                            <div className="d-flex align-items-center">
                                              <TestTube
                                                size={18}
                                                className="text-primary me-2"
                                              />
                                              <h6 className="mb-0 fw-semibold">
                                                {culture.culture?.name ||
                                                  culture.name}
                                              </h6>
                                            </div>
                                          </Col>
                                          <Col md={4} className="text-end">
                                            <Badge
                                              bg={getStatusBadgeColor(
                                                cultureStatus
                                              )}
                                              className="px-2 py-1"
                                            >
                                              {cultureStatus}
                                            </Badge>
                                          </Col>
                                          <Col md={2} className="text-end">
                                            <Button
                                              variant="outline-primary"
                                              size="sm"
                                              onClick={() =>
                                                addCultureOption(culture.id)
                                              }
                                              className="btn-sm"
                                            >
                                              <Plus
                                                size={14}
                                                className="me-1"
                                              />
                                              Add
                                            </Button>
                                          </Col>
                                        </Row>
                                      </div>

                                      <div className="card-body py-3">
                                        {/* Culture Results Section */}
                                        <div className="mb-3">
                                          {/* Display existing culture options */}
                                          {(
                                            selectedCultureOptions[
                                              culture.id
                                            ] || []
                                          ).map((optionData, optionIndex) => (
                                            <div
                                              key={optionIndex}
                                              className="border rounded-3 p-3 mb-2 bg-white position-relative"
                                            >
                                              <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() =>
                                                  removeCultureOption(
                                                    culture.id,
                                                    optionIndex
                                                  )
                                                }
                                                className="position-absolute top-0 end-0 m-2 btn-sm"
                                                style={{ zIndex: 1 }}
                                              >
                                                <Trash2 size={12} />
                                              </Button>

                                              <Row className="g-2">
                                                {/* Result Type Selection */}
                                                <Col md={4}>
                                                  <Form.Label className="small fw-semibold text-muted mb-1">
                                                    Result Type
                                                  </Form.Label>
                                                  <Form.Select
                                                    value={
                                                      optionData.result_type ||
                                                      "custom"
                                                    }
                                                    onChange={(e) =>
                                                      handleCultureResultTypeChange(
                                                        culture.id,
                                                        optionIndex,
                                                        e.target.value
                                                      )
                                                    }
                                                    size="sm"
                                                    className="form-select-sm"
                                                  >
                                                    <option value="custom">
                                                      Custom Text
                                                    </option>
                                                    <option value="predefined">
                                                      Predefined Options
                                                    </option>
                                                  </Form.Select>
                                                </Col>

                                                {/* Predefined Options Section */}
                                                {optionData.result_type ===
                                                  "predefined" && (
                                                  <>
                                                    <Col md={4}>
                                                      <Form.Label className="small fw-semibold text-muted mb-1">
                                                        Culture Option
                                                      </Form.Label>
                                                      <Form.Select
                                                        value={
                                                          optionData.option_id ||
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          handleCultureOptionChange(
                                                            culture.id,
                                                            optionIndex,
                                                            e.target.value
                                                          )
                                                        }
                                                        size="sm"
                                                        className="form-select-sm"
                                                      >
                                                        <option value="">
                                                          Select option...
                                                        </option>
                                                        {cultureOptions.map(
                                                          (option) => (
                                                            <option
                                                              key={option.id}
                                                              value={option.id}
                                                            >
                                                              {option.option}
                                                            </option>
                                                          )
                                                        )}
                                                      </Form.Select>
                                                    </Col>

                                                    {/* Sub-options */}
                                                    {optionData.option_id &&
                                                      cultureSubOptions[
                                                        optionData.option_id
                                                      ] && (
                                                        <Col md={4}>
                                                          <Form.Label className="small fw-semibold text-muted mb-1">
                                                            Sub-option
                                                          </Form.Label>
                                                          <Form.Select
                                                            value={
                                                              optionData.sub_option_id ||
                                                              ""
                                                            }
                                                            onChange={(e) =>
                                                              handleCultureSubOptionChange(
                                                                culture.id,
                                                                optionIndex,
                                                                e.target.value
                                                              )
                                                            }
                                                            size="sm"
                                                            className="form-select-sm"
                                                          >
                                                            <option value="">
                                                              Select
                                                              sub-option...
                                                            </option>
                                                            {cultureSubOptions[
                                                              optionData
                                                                .option_id
                                                            ].map(
                                                              (subOption) => (
                                                                <option
                                                                  key={
                                                                    subOption.id
                                                                  }
                                                                  value={
                                                                    subOption.id
                                                                  }
                                                                >
                                                                  {
                                                                    subOption.name
                                                                  }
                                                                </option>
                                                              )
                                                            )}
                                                          </Form.Select>
                                                        </Col>
                                                      )}
                                                  </>
                                                )}
                                              </Row>

                                              {/* Custom Text or Additional Notes */}
                                              <Row className="mt-2">
                                                <Col md={12}>
                                                  <Form.Label className="small fw-semibold text-muted mb-1">
                                                    {optionData.result_type ===
                                                    "predefined"
                                                      ? "Additional Notes"
                                                      : "Culture Result"}
                                                  </Form.Label>
                                                  <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    placeholder={
                                                      optionData.result_type ===
                                                      "predefined"
                                                        ? "Enter additional notes (optional)"
                                                        : "Enter culture result"
                                                    }
                                                    value={
                                                      optionData.custom_result ||
                                                      ""
                                                    }
                                                    onChange={(e) =>
                                                      handleCustomResultChange(
                                                        culture.id,
                                                        optionIndex,
                                                        e.target.value
                                                      )
                                                    }
                                                    size="sm"
                                                    className="form-control-sm"
                                                  />
                                                </Col>
                                              </Row>
                                            </div>
                                          ))}

                                          {/* Show message when no results added */}
                                          {(!selectedCultureOptions[
                                            culture.id
                                          ] ||
                                            selectedCultureOptions[culture.id]
                                              .length === 0) && (
                                            <div className="text-center text-muted py-4 border rounded-3 bg-light">
                                              <TestTube
                                                size={32}
                                                className="mb-2 text-muted"
                                              />
                                              <p className="mb-0 small">
                                                No culture results added yet.
                                                Click "Add" to start.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Antibiotic Sensitivity Section - Expandable */}
                                      {cultureResultId && (
                                        <div className="mt-3">
                                          <div
                                            className="d-flex align-items-center justify-content-between p-2 bg-light rounded cursor-pointer"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => {
                                              const currentExpanded =
                                                expandedSections[
                                                  cultureResultId
                                                ] || false;
                                              setExpandedSections((prev) => ({
                                                ...prev,
                                                [cultureResultId]:
                                                  !currentExpanded,
                                              }));
                                            }}
                                          >
                                            <h6 className="mb-0">
                                              <i
                                                className={`fas fa-chevron-${
                                                  expandedSections[
                                                    cultureResultId
                                                  ]
                                                    ? "up"
                                                    : "down"
                                                } me-2`}
                                              ></i>
                                              {!expandedSections[
                                                cultureResultId
                                              ] ? (
                                                <ArrowDownWideNarrow size={16} />
                                              ) : (
                                                <ArrowUpWideNarrow size={16} />
                                              )}
                                              Antibiotic Sensitivity Testing
                                            </h6>
                                            <Badge bg="info">
                                              {cultureAntibioticsList.length}{" "}
                                              antibiotics
                                            </Badge>
                                          </div>

                                          {expandedSections[
                                            cultureResultId
                                          ] && (
                                            <div className="mt-3 p-3 border rounded">
                                              {/* Search and Add Antibiotics */}
                                              <Row className="mb-3">
                                                <Col md={6}>
                                                  <Form.Control
                                                    type="text"
                                                    placeholder="Search antibiotics..."
                                                    value={
                                                      antibioticSearch[
                                                        cultureResultId
                                                      ] || ""
                                                    }
                                                    onChange={(e) =>
                                                      setAntibioticSearch(
                                                        (prev) => ({
                                                          ...prev,
                                                          [cultureResultId]:
                                                            e.target.value,
                                                        })
                                                      )
                                                    }
                                                    size="sm"
                                                  />
                                                </Col>
                                                <Col md={6}>
                                                  <div className="d-flex gap-2">
                                                    <Form.Select
                                                      size="sm"
                                                      onChange={(e) => {
                                                        if (e.target.value) {
                                                          updateCultureAntibiotic(
                                                            cultureResultId,
                                                            parseInt(
                                                              e.target.value
                                                            ),
                                                            "moderate"
                                                          );
                                                          e.target.value = "";
                                                        }
                                                      }}
                                                    >
                                                      <option value="">
                                                        Add from list...
                                                      </option>
                                                      {antibiotics
                                                        .filter((ab) => {
                                                          const searchTerm =
                                                            antibioticSearch[
                                                              cultureResultId
                                                            ] || "";
                                                          const matchesSearch =
                                                            !searchTerm ||
                                                            ab.name
                                                              .toLowerCase()
                                                              .includes(
                                                                searchTerm.toLowerCase()
                                                              ) ||
                                                            (ab.shortcut &&
                                                              ab.shortcut
                                                                .toLowerCase()
                                                                .includes(
                                                                  searchTerm.toLowerCase()
                                                                )) ||
                                                            (ab.commercial_name &&
                                                              ab.commercial_name
                                                                .toLowerCase()
                                                                .includes(
                                                                  searchTerm.toLowerCase()
                                                                ));
                                                          const notAlreadyAdded =
                                                            !cultureAntibioticsList.find(
                                                              (ca) =>
                                                                ca.antibiotic_id ===
                                                                ab.id
                                                            );
                                                          return (
                                                            matchesSearch &&
                                                            notAlreadyAdded
                                                          );
                                                        })
                                                        .slice(0, 10) // Limit to first 10 results
                                                        .map((ab) => (
                                                          <option
                                                            key={ab.id}
                                                            value={ab.id}
                                                          >
                                                            {ab.name}{" "}
                                                            {ab.shortcut
                                                              ? `(${ab.shortcut})`
                                                              : ""}
                                                            {ab.commercial_name
                                                              ? ` - ${ab.commercial_name}`
                                                              : ""}
                                                          </option>
                                                        ))}
                                                    </Form.Select>
                                                    <Button
                                                      variant="outline-primary"
                                                      size="sm"
                                                      onClick={() =>
                                                        setShowAddAntibioticModal(
                                                          (prev) => ({
                                                            ...prev,
                                                            [cultureResultId]: true,
                                                          })
                                                        )
                                                      }
                                                    >
                                                      <Plus size={14} />
                                                    </Button>
                                                  </div>
                                                </Col>
                                              </Row>

                                              {/* Antibiotics List */}
                                              {cultureAntibioticsList.length >
                                                0 && (
                                                <div className="table-responsive">
                                                  <Table
                                                    size="sm"
                                                    bordered
                                                    className="mb-0"
                                                  >
                                                    <thead className="table-light">
                                                      <tr>
                                                        <th
                                                          style={{
                                                            width: "40%",
                                                          }}
                                                        >
                                                          Antibiotic
                                                        </th>
                                                        <th
                                                          style={{
                                                            width: "35%",
                                                          }}
                                                        >
                                                          Sensitivity
                                                        </th>
                                                        <th
                                                          style={{
                                                            width: "15%",
                                                          }}
                                                        >
                                                          Zone (mm)
                                                        </th>
                                                        <th
                                                          style={{
                                                            width: "10%",
                                                          }}
                                                        >
                                                          Action
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {cultureAntibioticsList.map(
                                                        (ca, index) => {
                                                          const antibiotic =
                                                            antibiotics.find(
                                                              (ab) =>
                                                                ab.id ===
                                                                ca.antibiotic_id
                                                            );
                                                          return (
                                                            <tr key={index}>
                                                              <td>
                                                                <div>
                                                                  <strong>
                                                                    {
                                                                      antibiotic?.name
                                                                    }
                                                                  </strong>
                                                                  {antibiotic?.shortcut && (
                                                                    <small className="text-muted d-block">
                                                                      (
                                                                      {
                                                                        antibiotic.shortcut
                                                                      }
                                                                      )
                                                                    </small>
                                                                  )}
                                                                  {antibiotic?.commercial_name && (
                                                                    <small className="text-muted d-block">
                                                                      {
                                                                        antibiotic.commercial_name
                                                                      }
                                                                    </small>
                                                                  )}
                                                                </div>
                                                              </td>
                                                              <td>
                                                                <Form.Select
                                                                  size="sm"
                                                                  value={
                                                                    ca.sensitivity
                                                                  }
                                                                  onChange={(
                                                                    e
                                                                  ) =>
                                                                    updateCultureAntibiotic(
                                                                      cultureResultId,
                                                                      ca.antibiotic_id,
                                                                      e.target
                                                                        .value
                                                                    )
                                                                  }
                                                                  className={`border-${
                                                                    ca.sensitivity ===
                                                                    "sensitive"
                                                                      ? "success"
                                                                      : ca.sensitivity ===
                                                                        "moderate"
                                                                      ? "warning"
                                                                      : "danger"
                                                                  }`}
                                                                >
                                                                  <option value="sensitive">
                                                                    Sensitive
                                                                    (S)
                                                                  </option>
                                                                  <option value="moderate">
                                                                    Intermediate
                                                                    (I)
                                                                  </option>
                                                                  <option value="resistant">
                                                                    Resistant
                                                                    (R)
                                                                  </option>
                                                                </Form.Select>
                                                              </td>
                                                              <td>
                                                                <Form.Control
                                                                  type="number"
                                                                  size="sm"
                                                                  placeholder="Zone"
                                                                  value={
                                                                    ca.zone_size ||
                                                                    ""
                                                                  }
                                                                  onChange={(
                                                                    e
                                                                  ) =>
                                                                    updateCultureAntibioticZone(
                                                                      cultureResultId,
                                                                      ca.antibiotic_id,
                                                                      e.target
                                                                        .value
                                                                    )
                                                                  }
                                                                  min="0"
                                                                  max="50"
                                                                />
                                                              </td>
                                                              <td>
                                                                <Button
                                                                  variant="outline-danger"
                                                                  size="sm"
                                                                  onClick={() =>
                                                                    removeCultureAntibiotic(
                                                                      cultureResultId,
                                                                      ca.antibiotic_id
                                                                    )
                                                                  }
                                                                  title="Remove antibiotic"
                                                                >
                                                                  <Trash2
                                                                    size={14}
                                                                  />
                                                                </Button>
                                                              </td>
                                                            </tr>
                                                          );
                                                        }
                                                      )}
                                                    </tbody>
                                                  </Table>
                                                </div>
                                              )}

                                              {cultureAntibioticsList.length ===
                                                0 && (
                                                <div className="text-center text-muted py-3">
                                                  <TestTube
                                                    size={24}
                                                    className="mb-2"
                                                  />
                                                  <p className="mb-0">
                                                    No antibiotics added yet.
                                                    Add antibiotics to test
                                                    sensitivity.
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                      </Tab>

                      {testGroups.length > 0 && (
                        <Tab
                          eventKey="test-groups"
                          title={`Test Groups (${testGroups.length})`}
                        >
                          {testGroups.length > 0 && (
                            <div className="mb-4">
                              <h5>Test Groups</h5>
                              {testGroups.map((group) => {
                                // Combine direct components and categorized components
                                const allComponents = [
                                  ...(group.directComponents || []).map(
                                    (comp) => ({ ...comp, _category: null })
                                  ),
                                  ...((group.categories || []).flatMap((cat) =>
                                    (cat.components || []).map((comp) => ({
                                      ...comp,
                                      _category: cat.name,
                                    }))
                                  ) || []),
                                ];
                                return (
                                  <div
                                    key={group.id}
                                    className="border rounded p-3 mb-4"
                                  >
                                    <h5 className="mb-3">{group.name}</h5>
                                    <div className="table-responsive">
                                      <Table bordered className="mb-0">
                                        <thead>
                                          <tr>
                                            <th>Component</th>
                                            <th>Category</th>
                                            {group.fields.map((field) => (
                                              <th key={field.id}>
                                                {field.name}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {allComponents.map((component) => (
                                            <tr key={component.id}>
                                              <td className="fw-bold">
                                                {component.name}
                                              </td>
                                              <td>
                                                {component._category || "-"}
                                              </td>
                                              {group.fields.map((field) => {
                                                const options =
                                                  field.field_comp_options
                                                    ?.filter(
                                                      (opt) =>
                                                        opt.tg_component_id ===
                                                          component.id &&
                                                        opt.tg_fields_id ===
                                                          field.id
                                                    )
                                                    .map((opt) => ({
                                                      value: opt.name,
                                                      label: opt.name,
                                                    })) || [];
                                                const currentValue =
                                                  testGroupValues[group.id]?.[
                                                    component.id
                                                  ]?.[field.id] || "";

                                                return (
                                                  <td
                                                    key={`${component.id}-${field.id}`}
                                                  >
                                                    {options.length > 0 ? (
                                                      addingOption[
                                                        `${group.id}_${field.id}_${component.id}`
                                                      ] ? (
                                                        <div
                                                          style={{
                                                            display: "flex",
                                                            alignItems:
                                                              "center",
                                                            minWidth: "150px",
                                                          }}
                                                        >
                                                          <Form.Control
                                                            ref={
                                                              addOptionInputRef
                                                            }
                                                            type="text"
                                                            value={
                                                              newOptionValue[
                                                                `${group.id}_${field.id}_${component.id}`
                                                              ] || ""
                                                            }
                                                            onChange={(e) =>
                                                              setNewOptionValue(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [`${group.id}_${field.id}_${component.id}`]:
                                                                    e.target
                                                                      .value,
                                                                })
                                                              )
                                                            }
                                                            size="sm"
                                                            placeholder="New option"
                                                            style={{
                                                              minWidth: "100px",
                                                              marginRight: 4,
                                                            }}
                                                          />
                                                          <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => {
                                                              const value =
                                                                newOptionValue[
                                                                  `${group.id}_${field.id}_${component.id}`
                                                                ]?.trim();
                                                              if (value)
                                                                handleAddFieldCompOption(
                                                                  group.id,
                                                                  field.id,
                                                                  component.id,
                                                                  value
                                                                );
                                                            }}
                                                          >
                                                            Add
                                                          </Button>
                                                          <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            style={{
                                                              marginLeft: 2,
                                                            }}
                                                            onClick={() =>
                                                              setAddingOption(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [`${group.id}_${field.id}_${component.id}`]: false,
                                                                })
                                                              )
                                                            }
                                                          >
                                                            Cancel
                                                          </Button>
                                                        </div>
                                                      ) : (
                                                        <Form.Select
                                                          style={{
                                                            minWidth: "150px",
                                                          }}
                                                          value={currentValue}
                                                          onChange={(e) => {
                                                            if (
                                                              e.target.value ===
                                                              "__add_option__"
                                                            ) {
                                                              setAddingOption(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [`${group.id}_${field.id}_${component.id}`]: true,
                                                                })
                                                              );
                                                              setTimeout(
                                                                () =>
                                                                  addOptionInputRef.current?.focus(),
                                                                0
                                                              );
                                                            } else {
                                                              handleTestGroupValueChange(
                                                                group.id,
                                                                component.id,
                                                                field.id,
                                                                e.target.value
                                                              );
                                                            }
                                                          }}
                                                          size="sm"
                                                        >
                                                          <option value="">
                                                            Select value
                                                          </option>
                                                          {options.map(
                                                            (option) => (
                                                              <option
                                                                key={
                                                                  option.value
                                                                }
                                                                value={
                                                                  option.value
                                                                }
                                                              >
                                                                {option.label}
                                                              </option>
                                                            )
                                                          )}
                                                          <option value="__add_option__">
                                                            + Add option...
                                                          </option>
                                                        </Form.Select>
                                                      )
                                                    ) : (
                                                      <Form.Control
                                                        type="text"
                                                        value={currentValue}
                                                        onChange={(e) =>
                                                          handleTestGroupValueChange(
                                                            group.id,
                                                            component.id,
                                                            field.id,
                                                            e.target.value
                                                          )
                                                        }
                                                        size="sm"
                                                        placeholder="Enter value"
                                                        style={{
                                                          minWidth: "150px",
                                                        }}
                                                      />
                                                    )}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </div>

                                    {/* Test Group Comment Section */}
                                    <div className="mt-3 border-top pt-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0 text-muted">
                                          <i className="fas fa-comment me-2"></i>
                                          Test Group Comment
                                        </h6>
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          onClick={() => toggleCommentExpansion('testGroup', group.id)}
                                        >
                                          {expandedComments.testGroup?.[group.id] ? (
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

                                      {expandedComments.testGroup?.[group.id] && (
                                        <div>
                                          {/* Existing Comments Display */}
                                          {comments.testGroup?.[group.id] && comments.testGroup[group.id].length > 0 && (
                                            <div className="mb-3">
                                              <h6 className="text-muted mb-2">Existing Comments:</h6>
                                              {comments.testGroup[group.id].map((comment) => (
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
                                                        onClick={() => deleteTestGroupComment(comment.id)}
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
                                                              src={`/uploads/comment-images/${image}`}
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
                                                  value={commentTexts.testGroup?.[group.id] || ''}
                                                  onChange={(e) => {
                                                    setCommentTexts(prev => ({
                                                      ...prev,
                                                      testGroup: {
                                                        ...prev.testGroup,
                                                        [group.id]: e.target.value
                                                      }
                                                    }));
                                                  }}
                                                />
                                              </Form.Group>

                                              <Form.Group className="mb-3">
                                                <Form.Label>Upload Images (Max 3)</Form.Label>
                                                <ImageUpload
                                                  images={commentImages.testGroup?.[group.id] || []}
                                                  onImagesChange={(images) => {
                                                    setCommentImages(prev => ({
                                                      ...prev,
                                                      testGroup: {
                                                        ...prev.testGroup,
                                                        [group.id]: images
                                                      }
                                                    }));
                                                  }}
                                                  maxImages={3}
                                                />
                                              </Form.Group>

                                              <Button
                                                variant="primary"
                                                onClick={() => saveTestGroupComment(group.id, commentTexts.testGroup?.[group.id] || '', commentImages.testGroup?.[group.id] || [])}
                                                disabled={savingComments.testGroup || (!commentTexts.testGroup?.[group.id]?.trim() && (!commentImages.testGroup?.[group.id] || commentImages.testGroup[group.id].length === 0))}
                                              >
                                                {savingComments.testGroup ? (
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
                              })}
                            </div>
                          )}
                        </Tab>
                      )}

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
                              {/* Existing Images Display */}
                              {comments.medicalReport && comments.medicalReport.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-muted mb-3">Current Images:</h6>
                                  <div className="d-flex flex-wrap gap-2">
                                    {comments.medicalReport.map((image, idx) => (
                                      <div key={idx} className="position-relative">
                                        <SecureImage
                                          src={`/uploads/comment-images/${image}`}
                                          alt={`Medical report image ${idx + 1}`}
                                          className="img-thumbnail"
                                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                          title={`Medical report image ${idx + 1}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Upload New Images */}
                              <div className="border-top pt-3">
                                <h6 className="text-muted mb-3">Upload New Images:</h6>
                                <Form.Group className="mb-3">
                                  <Form.Label>Select Images (Max 10)</Form.Label>
                                  <ImageUpload
                                    images={commentImages.medicalReport || []}
                                    onImagesChange={(images) => {
                                      setCommentImages(prev => ({
                                        ...prev,
                                        medicalReport: images
                                      }));
                                    }}
                                    maxImages={10}
                                  />
                                </Form.Group>

                                <Button
                                  variant="primary"
                                  onClick={() => saveMedicalReportImages(commentImages.medicalReport || [])}
                                  disabled={savingComments.medicalReport || !commentImages.medicalReport || commentImages.medicalReport.length === 0}
                                >
                                  {savingComments.medicalReport ? (
                                    <>
                                      <Spinner animation="border" size="sm" className="me-2" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-upload me-2"></i>
                                      Upload Images
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
                    culture_results: [],
                    test_component_results: {},
                  });
                  setCultureAntibiotics({});
                  setExpandedSections({});
                  setAntibioticSearch({});
                  setShowAddAntibioticModal({});
                  setSelectedCultureOptions({}); // Reset culture options state
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

          {/* Add Antibiotic Modal */}
          {Object.keys(showAddAntibioticModal).map(
            (cultureResultId) =>
              showAddAntibioticModal[cultureResultId] && (
                <Modal
                  key={cultureResultId}
                  show={showAddAntibioticModal[cultureResultId]}
                  onHide={() =>
                    setShowAddAntibioticModal((prev) => ({
                      ...prev,
                      [cultureResultId]: false,
                    }))
                  }
                  size="md"
                >
                  <Modal.Header>
                    <Modal.Title>Add New Antibiotic</Modal.Title>
                    <button className="modal-close-btn" onClick={() =>
                      setShowAddAntibioticModal((prev) => ({
                        ...prev,
                        [cultureResultId]: false,
                      }))
                    }>
                      <CircleX size={24} />
                    </button>
                  </Modal.Header>
                  <Modal.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Antibiotic Name *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter antibiotic name"
                          value={newAntibioticData.name}
                          onChange={(e) =>
                            setNewAntibioticData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Shortcut</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter shortcut (optional)"
                          value={newAntibioticData.shortcut}
                          onChange={(e) =>
                            setNewAntibioticData((prev) => ({
                              ...prev,
                              shortcut: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Commercial Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter commercial name (optional)"
                          value={newAntibioticData.commercial_name}
                          onChange={(e) =>
                            setNewAntibioticData((prev) => ({
                              ...prev,
                              commercial_name: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                    </Form>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setShowAddAntibioticModal((prev) => ({
                          ...prev,
                          [cultureResultId]: false,
                        }))
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleAddNewAntibiotic(cultureResultId)}
                      disabled={!newAntibioticData.name.trim()}
                    >
                      Add Antibiotic
                    </Button>
                  </Modal.Footer>
                </Modal>
              )
          )}
        </>
      )}
    </Container>
  );
};

export default MedicalReports;
