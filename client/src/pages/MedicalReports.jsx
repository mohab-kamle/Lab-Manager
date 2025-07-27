import React, { useState, useEffect, useCallback, useRef } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col, Badge, Table, Tabs, Tab } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Toolbar from "../components/Toolbar";
import TablePagination from "../components/TablePagination";
import DynamicTable from "../components/DynamicTable";
import PrintPDF, { DirectPDFDownload } from "../components/PrintPDF";
import { Pencil, CheckCircle, Eye, Trash2, Download, FileText, TestTube, Save, Upload, Plus } from "lucide-react";
import { Nav, Tab as TabContent, TabPane } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { formatDate } from "../utils/dateFormatter";
import * as XLSX from "xlsx";

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
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "date", direction: "desc" }); // Default: latest to oldest
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    patient: ""
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReportForResults, setSelectedReportForResults] = useState(null);
  const [testComponents, setTestComponents] = useState({});
  const [testGroups, setTestGroups] = useState([]);
  const [testGroupValues, setTestGroupValues] = useState({});
  const [fieldOptions, setFieldOptions] = useState({});
  const [activeTab, setActiveTab] = useState('tests');
  const [resultsData, setResultsData] = useState({
    test_results: [],
    culture_results: []
  });
  const [antibiotics, setAntibiotics] = useState([]);
  const [cultureAntibiotics, setCultureAntibiotics] = useState({}); // { cultureResultId: [{ antibiotic_id, sensitivity, zone_size }] }
  const [expandedSections, setExpandedSections] = useState({}); // { cultureResultId: boolean }
  const [antibioticSearch, setAntibioticSearch] = useState({}); // { cultureResultId: string }
  const [showAddAntibioticModal, setShowAddAntibioticModal] = useState({}); // { cultureResultId: boolean }
  const [newAntibioticData, setNewAntibioticData] = useState({ name: '', shortcut: '', commercial_name: '' });
  const [formData, setFormData] = useState({
    comment: "",
    done: 0,
    pending: 0
  });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  // Add state for inline add option
  const [addingOption, setAddingOption] = useState({}); // { [groupId_fieldId_componentId]: true }
  const [newOptionValue, setNewOptionValue] = useState({}); // { [groupId_fieldId_componentId]: "" }
  const addOptionInputRef = useRef(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false); // PDF preview modal
  const [selectedReportForPDF, setSelectedReportForPDF] = useState(null); // Report to preview

  const apiUrl = import.meta.env.VITE_API_URL;

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
        axios.get(`${apiUrl}/patient`, { headers })
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedReportForResults && selectedReportForResults.cultures) {
      setResultsData(prev => ({
        ...prev,
        culture_results: selectedReportForResults.cultures.map(culture => {
          const existing = prev.culture_results?.find(cr => cr.culture_id === culture.id);
          return existing || { culture_id: culture.id, result: '', status: culture.status || 'pending' };
        })
      }));
    }
    // eslint-disable-next-line
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
    if (header === "date" || header === "registered_at" || header === "collected_at" || header === "received_at" || header === "reported_at") {
      return value ? formatDate(value) : "-";
    } else if (header === "done" || header === "pending") {
      return value ? "Yes" : "No";
    } else if (header === "prints_number" || header === "whatsapp_sends") {
      return value || 0;
    } else if (header === "tests_count" || header === "cultures_count" || header === "test_groups_count") {
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
      pending: report.pending || 0
    });
    setShowEditModal(true);
  };

  const handleSign = async (report) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const updateData = {
        done: 1,
        pending: 0,
        signatory_name: user.name,
        date: new Date().toISOString()
      };

      // Set the appropriate signatory ID based on user role
      if (user.role === 'admin') {
        updateData.signatory_admin_id = user.id;
      } else if (user.role === 'chemist') {
        updateData.signatory_id = user.id;
      }

      const response = await axios.put(
        `${apiUrl}/medical-reports/${report.id}`,
        updateData,
        { headers }
      );

      setReports(prevReports =>
        prevReports.map(r =>
          r.id === report.id ? response.data : r
        )
      );

      setShowEditModal(false);
      setEditingReport(null);
    } catch (error) {
      console.error("Error signing report:", error);
      setError("Failed to sign report");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const updateData = {
        ...formData,
        date: new Date().toISOString()
      };

      // If marking as done, set signatory info
      if (formData.done === 1) {
        updateData.signatory_name = user.name;
        if (user.role === 'admin') {
          updateData.signatory_admin_id = user.id;
        } else if (user.role === 'chemist') {
          updateData.signatory_id = user.id;
        }
      }

      const response = await axios.put(
        `${apiUrl}/medical-reports/${editingReport.id}`,
        updateData,
        { headers }
      );

      setReports(prevReports =>
        prevReports.map(r =>
          r.id === editingReport.id ? response.data : r
        )
      );

      setShowEditModal(false);
      setEditingReport(null);
    } catch (error) {
      console.error("Error updating report:", error);
      setError("Failed to update report");
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${apiUrl}/medical-reports/${reportToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReports(prevReports =>
        prevReports.filter(r => r.id !== reportToDelete.id)
      );
      setShowDeleteModal(false);
      setReportToDelete(null);
    } catch (error) {
      console.error("Error deleting report:", error);
      setError("Failed to delete report");
    }
  };

  const handleViewInvoice = async (report) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch invoice details
      const response = await axios.get(`${apiUrl}/invoices/${report.bill_id}`, { headers });
      setSelectedInvoice(response.data);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setError("Failed to fetch invoice details");
    }
  };

  const handleMarkCollected = async (report) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${apiUrl}/medical-reports/${report.id}/collected`, {}, { headers });
      
      // Update the local state
      setReports(prevReports =>
        prevReports.map(r =>
          r.id === report.id ? { ...r, collected_at: new Date().toISOString() } : r
        )
      );
      
      toast.success("Sample marked as collected");
    } catch (error) {
      console.error("Error marking sample as collected:", error);
      toast.error("Failed to mark sample as collected");
    }
  };

  const handleEnterResults = async (rowData) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch the full report details first
      const response = await axios.get(`${apiUrl}/medical-reports/${rowData.id}`, { headers });
      const fullReport = response.data;
      
      const tests = fullReport.test_id_test_medical_report_has_tests || [];
      const cultures = fullReport.cultures || []; // Use fullReport.cultures which contains only associated cultures

      // Fetch test components for all tests in the report
      const testComponentsPromises = tests.map(test => 
        axios.get(`${apiUrl}/tests/${test.id}/components`, { headers })
      ) || [];
      
      // Fetch test groups for the report
      const testGroupsResponse = await axios.get(
        `${apiUrl}/medical-reports/${rowData.id}/test-groups`, 
        { headers }
      );
      
      // Fetch antibiotics
      const antibioticsResponse = await axios.get(`${apiUrl}/culture-antibiotics`, { headers });
      setAntibiotics(antibioticsResponse.data);
      
      // Process test components
      const testComponentsData = {};
      if (testComponentsPromises.length > 0) {
        const testComponentsResponses = await Promise.allSettled(testComponentsPromises);
        testComponentsResponses.forEach((response, index) => {
          if (response.status === 'fulfilled' && response.value?.data) {
            testComponentsData[fullReport.tests[index].id] = response.value.data;
          }
        });
      }
      
      // Process test groups
      const testGroupsData = testGroupsResponse.data || [];
      const testGroupValues = {};
      const fieldOptions = {};
      
      testGroupsData.forEach(group => {
        // Initialize group in testGroupValues
        if (!testGroupValues[group.id]) {
          testGroupValues[group.id] = {};
        }
        // Combine direct and categorized components
        const allComponents = [
          ...(group.direct_components || []),
          ...((group.categories || []).flatMap(cat => cat.components || []))
        ];
        allComponents.forEach(component => {
          if (!testGroupValues[group.id][component.id]) {
            testGroupValues[group.id][component.id] = {};
          }
          // Process each field
          group.fields.forEach(field => {
            // Set the field value if it exists
            const value = group.values?.[component.id]?.[field.id] || '';
            testGroupValues[group.id][component.id][field.id] = value;
            // Store field options for dropdowns
            if (field.field_comp_options?.length > 0) {
              if (!fieldOptions[field.id]) {
                fieldOptions[field.id] = [];
              }
              // Add options that match this component and field
              const options = field.field_comp_options
                .filter(opt => opt.tg_component_id === component.id)
                .map(opt => ({
                  id: opt.id,
                  name: opt.name,
                  value: opt.name
                }));
              fieldOptions[field.id] = [...fieldOptions[field.id], ...options];
            }
          });
        });
      });
      
      // Set states
      setTestComponents(testComponentsData);
      setTestGroups(testGroupsData);
      setTestGroupValues(testGroupValues);
      setFieldOptions(fieldOptions);
      setSelectedReportForResults(fullReport);

      // Set initial results data
      const initialResultsData = {
        test_results: tests.map(test => ({
          test_id: test.id,
          result: test.medical_report_has_test?.result || '',
          status: test.medical_report_has_test?.status || 'pending'
        })),
        culture_results: cultures.map(culture => ({
          culture_id: culture.id,
          result: culture.medical_report_has_culture?.result || '',
          status: culture.medical_report_has_culture?.status || 'pending'
        }))
      };

      setResultsData(initialResultsData);

      // Ensure correct tab is active for test groups only
      if (tests.length === 0 && testGroupsData.length > 0) {
        setActiveTab('test-groups');
      } else if (tests.length > 0) {
        setActiveTab('tests');
      } else if (cultures.length > 0) {
        setActiveTab('cultures');
      }

      // Initialize culture antibiotics from the fetched data
      const initialCultureAntibiotics = {};
      cultures.forEach(culture => { // Use the same cultures array
        const cultureResultId = culture.medical_report_has_culture?.id;
        if (cultureResultId && culture.culture_antibiotics && culture.culture_antibiotics.length > 0) {
          initialCultureAntibiotics[cultureResultId] = culture.culture_antibiotics.map(ca => ({
            antibiotic_id: ca.antibiotic?.id || ca.antibiotic_id,
            sensitivity: ca.sensitivity || 'moderate',
            zone_size: ca.zone_size || null
          }));
        }
      });
      setCultureAntibiotics(initialCultureAntibiotics);
      
      setShowResultsModal(true);
    } catch (error) {
      console.error("Error preparing results entry:", error);
      setError("Failed to load test components. Please try again.");
    }
  };

  const handleTestGroupValueChange = (groupId, componentId, fieldId, value) => {
    setTestGroupValues(prev => {
      // Create a deep copy of the previous state to avoid direct mutation
      const newState = {
        ...prev,
        [groupId]: {
          ...(prev[groupId] || {}),
          [componentId]: {
            ...(prev[groupId]?.[componentId] || {}),
            [fieldId]: value
          }
        }
      };
      
      // Also update the results data if needed
      setResultsData(prevData => ({
        ...prevData,
        // Add or update the test group value in the results data
        test_group_values: {
          ...(prevData.test_group_values || {}),
          [groupId]: {
            ...(prevData.test_group_values?.[groupId] || {}),
            [componentId]: {
              ...(prevData.test_group_values?.[groupId]?.[componentId] || {}),
              [fieldId]: value
            }
          }
        }
      }));
      
      return newState;
    });
  };

  // Add option handler
  const handleAddFieldCompOption = async (groupId, fieldId, componentId, value) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      // Call backend to add option
      const response = await axios.post(`${apiUrl}/field-comp-options`, {
        name: value,
        tg_fields_id: fieldId,
        tg_component_id: componentId,
        test_group_id: groupId
      }, { headers });
      // Update local state
      setTestGroups(prevGroups => prevGroups.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          fields: g.fields.map(f => {
            if (f.id !== fieldId) return f;
            return {
              ...f,
              field_comp_options: [
                ...(f.field_comp_options || []),
                {
                  id: response.data.id,
                  name: value,
                  tg_component_id: componentId,
                  tg_fields_id: fieldId
                }
              ]
            };
          })
        };
      }));
      setAddingOption(prev => ({ ...prev, [`${groupId}_${fieldId}_${componentId}`]: false }));
      setNewOptionValue(prev => ({ ...prev, [`${groupId}_${field.id}_${component.id}`]: "" }));
    } catch (error) {
      alert("Failed to add option");
    }
  };

  const handleSaveTestGroupValues = async (reportId, groupId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Transform the data structure to match backend expectations
      const values = {};
      if (testGroupValues[groupId]) {
        Object.entries(testGroupValues[groupId]).forEach(([componentId, fields]) => {
          values[componentId] = {};
          Object.entries(fields).forEach(([fieldId, value]) => {
            values[componentId][fieldId] = value;
          });
        });
      }
      
      await axios.post(
        `${apiUrl}/medical-reports/${reportId}/test-groups`,
        {
          test_group_id: parseInt(groupId, 10),
          values: values
        },
        { headers }
      );
      
      return true;
    } catch (error) {
      console.error('Error saving test group values:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error:', error.message);
      }
      return false;
    }
  };

  const handleSaveResults = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Save test results
      const testResultsPromises = (resultsData.test_results || []).map(result => 
        axios.post(
          `${apiUrl}/medical-reports/${selectedReportForResults.id}/tests/${result.test_id}/result`,
          { 
            result: result.result,
            status: result.result && result.result.toString().trim() !== '' ? 'done' : 'pending'
          },
          { headers }
        )
      );

      // Save culture results
      const cultureResultsPromises = (resultsData.culture_results || []).map(result =>
        axios.post(
          `${apiUrl}/medical-reports/${selectedReportForResults.id}/cultures/${result.culture_id}/result`,
          { 
            result: result.result,
            status: result.result && result.result.toString().trim() !== '' ? 'done' : 'pending'
          },
          { headers }
        )
      );

      // Save culture antibiotic sensitivities
      const cultureAntibioticPromises = [];
      Object.entries(cultureAntibiotics).forEach(([cultureResultId, antibiotics]) => {
        if (antibiotics && antibiotics.length > 0) {
          cultureAntibioticPromises.push(
            axios.put(
              `${apiUrl}/culture-antibiotics/culture/${cultureResultId}/bulk`,
              { antibiotics },
              { headers }
            )
          );
        }
      });

      // Save test group values if any
      const testGroupPromises = [];
      Object.entries(testGroupValues).forEach(([groupId, components]) => {
        // We need to aggregate all values for a given group and send them in one request
        const valuesPayload = {};
        Object.entries(components).forEach(([componentId, fields]) => {
          valuesPayload[componentId] = {};
          Object.entries(fields).forEach(([fieldId, value]) => {
            // Include all values, even empty strings, to handle clearing fields
            valuesPayload[componentId][fieldId] = value;
          });
        });

        testGroupPromises.push(
          axios.post(
            `${apiUrl}/medical-reports/${selectedReportForResults.id}/test-groups`,
            {
              test_group_id: groupId,
              values: valuesPayload, // Send the aggregated values for the group
            },
            { headers }
          ).catch(error => {
            console.error(`Error saving test group (ID: ${groupId}):`, error);
            throw error; // Re-throw to be caught by Promise.all
          })
        );
      });

      // Show loading state
      const toastId = toast.loading("Saving results...");

      try {
        // Wait for all requests to complete
        await Promise.all([
          ...testResultsPromises,
          ...cultureResultsPromises,
          ...cultureAntibioticPromises,
          ...testGroupPromises
        ]);

        // Close the modal and refresh the data
        setShowResultsModal(false);
        setSelectedReportForResults(null);
        setResultsData({ test_results: [], culture_results: [] });
        setTestGroupValues({});
        setCultureAntibiotics({});
        setExpandedSections({});
        setAntibioticSearch({});
        setShowAddAntibioticModal({});
        
        // Refresh the reports list
        await fetchData();
        
        toast.update(toastId, {
          render: "Results saved successfully",
          type: "success",
          isLoading: false,
          autoClose: 3000
        });
      } catch (error) {
        console.error("Error in one or more save operations:", error);
        toast.update(toastId, {
          render: error.response?.data?.message || "Failed to save some results. Please check the console for details.",
          type: "error",
          isLoading: false,
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error("Error saving results:", error);
      toast.error(error.response?.data?.message || "Failed to save results. Please try again.");
    }
  };

  const updateTestResult = (testId, result) => {
    setResultsData(prev => ({
      ...prev,
      test_results: prev.test_results.map(tr =>
        tr.test_id === testId ? { ...tr, result } : tr
      )
    }));
  };

  const updateCultureResult = (cultureId, result) => {
    setResultsData(prev => ({
      ...prev,
      culture_results: prev.culture_results.map(cr =>
        cr.culture_id === cultureId ? { ...cr, result } : cr
      )
    }));
  };

  const updateCultureAntibiotic = (cultureResultId, antibioticId, sensitivity) => {
    setCultureAntibiotics(prev => {
      const current = prev[cultureResultId] || [];
      const existingIndex = current.findIndex(item => item.antibiotic_id === antibioticId);
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...current];
        updated[existingIndex] = { antibiotic_id: antibioticId, sensitivity };
        return { ...prev, [cultureResultId]: updated };
      } else {
        // Add new
        return { 
          ...prev, 
          [cultureResultId]: [...current, { antibiotic_id: antibioticId, sensitivity }]
        };
      }
    });
  };

  const removeCultureAntibiotic = (cultureResultId, antibioticId) => {
    setCultureAntibiotics(prev => {
      const current = prev[cultureResultId] || [];
      const filtered = current.filter(item => item.antibiotic_id !== antibioticId);
      return { ...prev, [cultureResultId]: filtered };
    });
  };

  const updateCultureAntibioticZone = (cultureResultId, antibioticId, zoneSize) => {
    setCultureAntibiotics(prev => {
      const current = prev[cultureResultId] || [];
      const updated = current.map(item => 
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
      
      const response = await axios.post(`${apiUrl}/antibiotics`, newAntibioticData, { headers });
      const newAntibiotic = response.data;
      
      // Add to local antibiotics list
      setAntibiotics(prev => [...prev, newAntibiotic]);
      
      // Add to culture antibiotics
      updateCultureAntibiotic(cultureResultId, newAntibiotic.id, 'moderate');
      
      // Reset form and close modal
      setNewAntibioticData({ name: '', shortcut: '', commercial_name: '' });
      setShowAddAntibioticModal(prev => ({ ...prev, [cultureResultId]: false }));
      
      toast.success('Antibiotic added successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add antibiotic';
      toast.error(errorMessage);
    }
  };

  const filteredReports = reports.filter(report => {
    const searchMatch = searchQuery
      ? report.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.signatory_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const dateMatch =
      (!filters.startDate || new Date(report.date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(report.date) <= new Date(filters.endDate));

    const statusMatch = !filters.status || 
      (filters.status === 'done' && report.done === 1) ||
      (filters.status === 'pending' && report.pending === 1) ||
      (filters.status === 'unsigned' && report.done === 0 && report.pending === 0);

    const patientMatch = !filters.patient || report.patient_id === parseInt(filters.patient);

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
      <div className="d-flex gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => handleEdit(rowData)}
          title="Edit Report"
        >
          <Pencil size={16} />
        </Button>
        {rowData.done === 0 && (
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => handleSign(rowData)}
            title="Sign Report"
          >
            <CheckCircle size={16} />
          </Button>
        )}
        {rowData.bill_id && (
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => handleViewInvoice(rowData)}
            title="View Invoice"
          >
            <FileText size={16} />
          </Button>
        )}
        {(user.role === 'admin' || user.role === 'chemist') && (
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => handleEnterResults(rowData)}
            title="Enter Results"
          >
            <TestTube size={16} />
          </Button>
        )}
        {!rowData.collected_at && (
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => handleMarkCollected(rowData)}
            title="Mark as Collected"
          >
            <Save size={16} />
          </Button>
        )}
        {/* Direct PDF Download - fetch and download in one step */}
        <DirectPDFDownload 
          reportId={rowData.id} 
          patient={rowData.patient} 
          apiUrl={apiUrl} 
        />
        {/* PDF Preview Button */}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={async () => {
            try {
              const token = localStorage.getItem("token");
              const headers = { Authorization: `Bearer ${token}` };
              
              // Fetch the full report details for PDF preview
              const response = await axios.get(`${apiUrl}/medical-reports/${rowData.id}`, { headers });
              const fullReportData = response.data;
              
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
          size="sm"
          onClick={() => {
            setReportToDelete(rowData);
            setShowDeleteModal(true);
          }}
          title="Delete Report"
        >
          <Trash2 size={16} />
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
    "comment",
    "done",
    "pending",
    "signatory_name",
    "prints_number",
    "whatsapp_sends",
    "tests_count",
    "cultures_count",
    "test_groups_count",
    "invoice_id"
  ];

  // XLSX Export Handler
  const handleExportXLSX = () => {
    const exportData = filteredReports.map(report => ({
      'Date': formatDate(report.date),
      'Patient': report.patient?.name || '',
      'Registered At': report.registered_at ? formatDate(report.registered_at) : '-',
      'Collected At': report.collected_at ? formatDate(report.collected_at) : '-',
      'Received At': report.received_at ? formatDate(report.received_at) : '-',
      'Reported At': report.reported_at ? formatDate(report.reported_at) : '-',
      'Comment': report.comment || '',
      'Done': report.done ? 'Yes' : 'No',
      'Pending': report.pending ? 'Yes' : 'No',
      'Signatory': report.signatory_name || '',
      'Prints': report.prints_number || 0,
      'WhatsApp Sends': report.whatsapp_sends || 0,
      'Tests Count': report.tests_count || 0,
      'Cultures Count': report.cultures_count || 0,
      'Test Groups Count': report.test_groups_count || 0,
      'Invoice ID': report.invoice_id || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MedicalReports");
    XLSX.writeFile(wb, `medical_reports_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // XLSX Import Handler (now connected to backend)
  const handleImportXLSX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${apiUrl}/medical-reports/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(`Imported: ${response.data.imported}, Updated: ${response.data.updated}, Errors: ${response.data.errors.length}`);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to import medical reports');
    }
  };

  return (
    <Container fluid className="medical-reports-container">
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Medical Reports</h2>
            <div className="d-flex gap-2">
              <Button variant="outline-success" as="label">
                <Download size={16} className="me-2" />
                Export XLSX
                <input type="file" style={{ display: 'none' }} disabled />
              </Button>
              <Button variant="outline-info" as="label">
                <Upload size={16} className="me-2" />
                Import Excel
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportXLSX} />
              </Button>
              <Badge bg="success" className="d-flex align-items-center gap-1">
                Done: {reports.filter(r => r.done === 1).length}
              </Badge>
              <Badge bg="warning" className="d-flex align-items-center gap-1">
                Pending: {reports.filter(r => r.pending === 1).length}
              </Badge>
              <Badge bg="secondary" className="d-flex align-items-center gap-1">
                Unsigned: {reports.filter(r => r.done === 0 && r.pending === 0).length}
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
              { id: 'done', state: 'Done' },
              { id: 'pending', state: 'Pending' },
              { id: 'unsigned', state: 'Unsigned' }
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
            <Modal.Header closeButton>
              <Modal.Title>Edit Medical Report</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Comment</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData.comment}
                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={formData.done ? 'done' : formData.pending ? 'pending' : 'unsigned'}
                        onChange={(e) => {
                          const status = e.target.value;
                          setFormData({
                            ...formData,
                            done: status === 'done' ? 1 : 0,
                            pending: status === 'pending' ? 1 : 0
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
              >
                Update Report
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Are you sure you want to delete this medical report?
              This action cannot be undone.
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
              >
                Delete
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
            <Modal.Header closeButton>
              <Modal.Title>Invoice Details</Modal.Title>
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
                      <strong>Total:</strong> ${Number(selectedInvoice.total || 0).toFixed(2)}
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={6}>
                      <strong>Paid:</strong> ${Number(selectedInvoice.paid || 0).toFixed(2)}
                    </Col>
                    <Col md={6}>
                      <strong>Due:</strong> ${Number(selectedInvoice.due || 0).toFixed(2)}
                    </Col>
                  </Row>
                  
                  {selectedInvoice.tests && selectedInvoice.tests.length > 0 && (
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
                  
                  {selectedInvoice.cultures && selectedInvoice.cultures.length > 0 && (
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
                              <td>${Number(culture.price || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  
                  {selectedInvoice.packages && selectedInvoice.packages.length > 0 && (
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
                  
                  {selectedInvoice.test_groups && selectedInvoice.test_groups.length > 0 && (
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
              setResultsData({ test_results: [], culture_results: [] });
              setCultureAntibiotics({});
              setExpandedSections({});
              setAntibioticSearch({});
              setShowAddAntibioticModal({});
            }}
            size="xl"
          >
            <Modal.Header closeButton>
              <Modal.Title>Enter Test & Culture Results</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedReportForResults && (
                <div>
                  <Row className="mb-3">
                    <Col>
                      <h6>Patient: {selectedReportForResults?.patient?.name}</h6>
                      <h6>Report Date: {formatDate(selectedReportForResults.date)}</h6>
                    </Col>
                  </Row>

                  <Tabs
                    activeKey={activeTab}
                    onSelect={setActiveTab}
                    id="results-tabs"
                    className="mb-3"
                  >
                    <Tab eventKey="tests" title="Tests">
                      {selectedReportForResults.tests && selectedReportForResults.tests.length > 0 && (
                        <div className="mb-4">
                          <h5>Tests</h5>
                          {selectedReportForResults.tests.map((test, testIndex) => {
                            const comps = testComponents[test.id] || [];
                            const patientAge = calculateAge(selectedReportForResults.patient?.birth_date);
                            const patientGender = selectedReportForResults.patient?.gender;
                            let selectedComponent = null;
                            if (comps.length > 0) {
                              selectedComponent = comps.find(tc => {
                                const genderMatch = !tc.gender || tc.gender === patientGender;
                                const ageMatch = (tc.age_start == null || patientAge >= tc.age_start) &&
                                                 (tc.age_end == null || patientAge <= tc.age_end);
                                return genderMatch && ageMatch;
                              }) || comps[0];
                            }
                            return (
                              <div key={test.id} className="border rounded p-3 mb-3">
                                <h6>{test.name}</h6>
                                {selectedComponent ? (
                                  <Row className="mb-2">
                                    <Col md={3}><strong>{selectedComponent.name}</strong></Col>
                                    <Col md={2}><small className="text-muted">Normal: {selectedComponent.normal_from} - {selectedComponent.normal_to}</small></Col>
                                    <Col md={2}><small className="text-muted">Unit: {selectedComponent.unit}</small></Col>
                                    <Col md={3}>
                                      <Form.Control
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter result"
                                        value={resultsData.test_results.find(tr => tr.test_id === test.id)?.result || ''}
                                        onChange={e => updateTestResult(test.id, e.target.value)}
                                      />
                                    </Col>
                                    <Col md={2}>
                                      <Badge bg="secondary">{test.status || 'pending'}</Badge>
                                    </Col>
                                  </Row>
                                ) : (
                                  <Row className="mb-2">
                                    <Col md={3}><strong>{test.name}</strong></Col>
                                    <Col md={2}></Col>
                                    <Col md={2}></Col>
                                    <Col md={3}>
                                      <Form.Control
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter result"
                                        value={resultsData.test_results.find(tr => tr.test_id === test.id)?.result || ''}
                                        onChange={e => updateTestResult(test.id, e.target.value)}
                                      />
                                    </Col>
                                    <Col md={2}>
                                      <Badge bg="secondary">{test.status || 'pending'}</Badge>
                                    </Col>
                                  </Row>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Tab>

                    <Tab eventKey="cultures" title="Cultures">
                      {selectedReportForResults.cultures && selectedReportForResults.cultures.length > 0 && (
                        <div className="mb-4">
                          <h5>Cultures</h5>
                          {selectedReportForResults.cultures.map((culture, cultureIndex) => {
                            const cultureResult = resultsData.culture_results.find(cr => cr.culture_id === culture.id);
                            const cultureResultId = culture.medical_report_has_culture?.id;
                            const cultureAntibioticsList = cultureAntibiotics[cultureResultId] || [];
                            
                            return (
                              <div key={culture.id} className="border rounded p-3 mb-3">
                                <Row>
                                  <Col md={4}><h6>{culture.name}</h6></Col>
                                  <Col md={6}>
                                    <Form.Control
                                      as="textarea"
                                      rows={3}
                                      placeholder="Enter culture result"
                                      value={typeof cultureResult?.result === 'string' ? cultureResult.result : ''}
                                      onChange={e => updateCultureResult(culture.id, e.target.value)}
                                    />
                                  </Col>
                                  <Col md={2}>
                                    <Badge bg="secondary">{culture.status || 'pending'}</Badge>
                                  </Col>
                                </Row>
                                
                                {/* Antibiotic Sensitivity Section - Expandable */}
                                {cultureResultId && (
                                  <div className="mt-3">
                                    <div 
                                      className="d-flex align-items-center justify-content-between p-2 bg-light rounded cursor-pointer"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        const currentExpanded = expandedSections[cultureResultId] || false;
                                        setExpandedSections(prev => ({
                                          ...prev,
                                          [cultureResultId]: !currentExpanded
                                        }));
                                      }}
                                    >
                                      <h6 className="mb-0">
                                        <i className={`fas fa-chevron-${expandedSections[cultureResultId] ? 'up' : 'down'} me-2`}></i>
                                        Antibiotic Sensitivity Testing
                                      </h6>
                                      <Badge bg="info">{cultureAntibioticsList.length} antibiotics</Badge>
                                    </div>
                                    
                                    {expandedSections[cultureResultId] && (
                                      <div className="mt-3 p-3 border rounded">
                                        {/* Search and Add Antibiotics */}
                                        <Row className="mb-3">
                                          <Col md={6}>
                                            <Form.Control
                                              type="text"
                                              placeholder="Search antibiotics..."
                                              value={antibioticSearch[cultureResultId] || ''}
                                              onChange={(e) => setAntibioticSearch(prev => ({
                                                ...prev,
                                                [cultureResultId]: e.target.value
                                              }))}
                                              size="sm"
                                            />
                                          </Col>
                                          <Col md={6}>
                                            <div className="d-flex gap-2">
                                              <Form.Select
                                                size="sm"
                                                onChange={(e) => {
                                                  if (e.target.value) {
                                                    updateCultureAntibiotic(cultureResultId, parseInt(e.target.value), 'moderate');
                                                    e.target.value = '';
                                                  }
                                                }}
                                              >
                                                <option value="">Add from list...</option>
                                                {antibiotics
                                                  .filter(ab => {
                                                    const searchTerm = antibioticSearch[cultureResultId] || '';
                                                    const matchesSearch = !searchTerm || 
                                                      ab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                      (ab.shortcut && ab.shortcut.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                                      (ab.commercial_name && ab.commercial_name.toLowerCase().includes(searchTerm.toLowerCase()));
                                                    const notAlreadyAdded = !cultureAntibioticsList.find(ca => ca.antibiotic_id === ab.id);
                                                    return matchesSearch && notAlreadyAdded;
                                                  })
                                                  .slice(0, 10) // Limit to first 10 results
                                                  .map(ab => (
                                                    <option key={ab.id} value={ab.id}>
                                                      {ab.name} {ab.shortcut ? `(${ab.shortcut})` : ''}
                                                      {ab.commercial_name ? ` - ${ab.commercial_name}` : ''}
                                                    </option>
                                                  ))}
                                              </Form.Select>
                                              <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => setShowAddAntibioticModal(prev => ({
                                                  ...prev,
                                                  [cultureResultId]: true
                                                }))}
                                              >
                                                <Plus size={14} />
                                              </Button>
                                            </div>
                                          </Col>
                                        </Row>
                                        
                                        {/* Antibiotics List */}
                                        {cultureAntibioticsList.length > 0 && (
                                          <div className="table-responsive">
                                            <Table size="sm" bordered className="mb-0">
                                              <thead className="table-light">
                                                <tr>
                                                  <th style={{ width: '40%' }}>Antibiotic</th>
                                                  <th style={{ width: '35%' }}>Sensitivity</th>
                                                  <th style={{ width: '15%' }}>Zone (mm)</th>
                                                  <th style={{ width: '10%' }}>Action</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {cultureAntibioticsList.map((ca, index) => {
                                                  const antibiotic = antibiotics.find(ab => ab.id === ca.antibiotic_id);
                                                  return (
                                                    <tr key={index}>
                                                      <td>
                                                        <div>
                                                          <strong>{antibiotic?.name}</strong>
                                                          {antibiotic?.shortcut && (
                                                            <small className="text-muted d-block">({antibiotic.shortcut})</small>
                                                          )}
                                                          {antibiotic?.commercial_name && (
                                                            <small className="text-muted d-block">{antibiotic.commercial_name}</small>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <Form.Select
                                                          size="sm"
                                                          value={ca.sensitivity}
                                                          onChange={(e) => updateCultureAntibiotic(cultureResultId, ca.antibiotic_id, e.target.value)}
                                                          className={`border-${ca.sensitivity === 'sensitive' ? 'success' : ca.sensitivity === 'moderate' ? 'warning' : 'danger'}`}
                                                        >
                                                          <option value="sensitive">Sensitive (S)</option>
                                                          <option value="moderate">Intermediate (I)</option>
                                                          <option value="resistant">Resistant (R)</option>
                                                        </Form.Select>
                                                      </td>
                                                      <td>
                                                        <Form.Control
                                                          type="number"
                                                          size="sm"
                                                          placeholder="Zone"
                                                          value={ca.zone_size || ''}
                                                          onChange={(e) => updateCultureAntibioticZone(cultureResultId, ca.antibiotic_id, e.target.value)}
                                                          min="0"
                                                          max="50"
                                                        />
                                                      </td>
                                                      <td>
                                                        <Button
                                                          variant="outline-danger"
                                                          size="sm"
                                                          onClick={() => removeCultureAntibiotic(cultureResultId, ca.antibiotic_id)}
                                                          title="Remove antibiotic"
                                                        >
                                                          <Trash2 size={14} />
                                                        </Button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </Table>
                                          </div>
                                        )}
                                        
                                        {cultureAntibioticsList.length === 0 && (
                                          <div className="text-center text-muted py-3">
                                            <TestTube size={24} className="mb-2" />
                                            <p className="mb-0">No antibiotics added yet. Add antibiotics to test sensitivity.</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Tab>

                    {testGroups.length > 0 && (
                      <Tab eventKey="test-groups" title={`Test Groups (${testGroups.length})`}>
                      {testGroups.length > 0 && (
                        <div className="mb-4">
                          <h5>Test Groups</h5>
                          {testGroups.map((group) => {
                            // Combine direct components and categorized components
                            const allComponents = [
                              ...(group.direct_components || []).map(comp => ({ ...comp, _category: null })),
                              ...((group.categories || []).flatMap(cat => (cat.components || []).map(comp => ({ ...comp, _category: cat.name }))) || [])
                            ];
                            return (
                              <div key={group.id} className="border rounded p-3 mb-4">
                                <h5 className="mb-3">{group.name}</h5>
                                <div className="table-responsive">
                                  <Table bordered className="mb-0">
                                    <thead>
                                      <tr>
                                        <th>Component</th>
                                        <th>Category</th>
                                        {group.fields.map((field) => (
                                          <th key={field.id}>{field.name}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allComponents.map((component) => (
                                        <tr key={component.id}>
                                          <td className="fw-bold">{component.name}</td>
                                          <td>{component._category || '-'}</td>
                                          {group.fields.map((field) => {
                                            const options = field.field_comp_options
                                              ?.filter(opt => opt.tg_component_id === component.id && opt.tg_fields_id === field.id)
                                              .map(opt => ({
                                                value: opt.name,
                                                label: opt.name
                                              })) || [];
                                            const currentValue = testGroupValues[group.id]?.[component.id]?.[field.id] || '';
                                            return (
                                              <td key={`${component.id}-${field.id}`}> 
                                                {options.length > 0 ? (
                                                  addingOption[`${group.id}_${field.id}_${component.id}`] ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '150px' }}>
                                                      <Form.Control
                                                        ref={addOptionInputRef}
                                                        type="text"
                                                        value={newOptionValue[`${group.id}_${field.id}_${component.id}`] || ''}
                                                        onChange={e => setNewOptionValue(prev => ({ ...prev, [`${group.id}_${field.id}_${component.id}`]: e.target.value }))}
                                                        size="sm"
                                                        placeholder="New option"
                                                        style={{ minWidth: '100px', marginRight: 4 }}
                                                      />
                                                      <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => {
                                                          const value = newOptionValue[`${group.id}_${field.id}_${component.id}`]?.trim();
                                                          if (value) handleAddFieldCompOption(group.id, field.id, component.id, value);
                                                        }}
                                                      >
                                                        Add
                                                      </Button>
                                                      <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        style={{ marginLeft: 2 }}
                                                        onClick={() => setAddingOption(prev => ({ ...prev, [`${group.id}_${field.id}_${component.id}`]: false }))}
                                                      >
                                                        Cancel
                                                      </Button>
                                                    </div>
                                                  ) : (
                                                    <Form.Select
                                                      style={{ minWidth: '150px' }}
                                                      value={currentValue}
                                                      onChange={e => {
                                                        if (e.target.value === '__add_option__') {
                                                          setAddingOption(prev => ({ ...prev, [`${group.id}_${field.id}_${component.id}`]: true }));
                                                          setTimeout(() => addOptionInputRef.current?.focus(), 0);
                                                        } else {
                                                          handleTestGroupValueChange(group.id, component.id, field.id, e.target.value);
                                                        }
                                                      }}
                                                      size="sm"
                                                    >
                                                      <option value="">Select value</option>
                                                      {options.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                          {option.label}
                                                        </option>
                                                      ))}
                                                      <option value="__add_option__">+ Add option...</option>
                                                    </Form.Select>
                                                  )
                                                ) : (
                                                  <Form.Control
                                                    type="text"
                                                    value={currentValue}
                                                    onChange={(e) => handleTestGroupValueChange(group.id, component.id, field.id, e.target.value)}
                                                    size="sm"
                                                    placeholder="Enter value"
                                                    style={{ minWidth: '150px' }}
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                      </Tab>
                    )}
                  </Tabs>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResultsModal(false);
                  setSelectedReportForResults(null);
                  setResultsData({ test_results: [], culture_results: [] });
                  setCultureAntibiotics({});
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
              >
                Save Results
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
            <Modal.Header closeButton>
              <Modal.Title>PDF Preview</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedReportForPDF && selectedReportForPDF.patient && (
                <PrintPDF patient={selectedReportForPDF.patient} report={selectedReportForPDF} />
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
          {Object.keys(showAddAntibioticModal).map(cultureResultId => 
            showAddAntibioticModal[cultureResultId] && (
              <Modal
                key={cultureResultId}
                show={showAddAntibioticModal[cultureResultId]}
                onHide={() => setShowAddAntibioticModal(prev => ({ ...prev, [cultureResultId]: false }))}
                size="md"
              >
                <Modal.Header closeButton>
                  <Modal.Title>Add New Antibiotic</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Antibiotic Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter antibiotic name"
                        value={newAntibioticData.name}
                        onChange={(e) => setNewAntibioticData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Shortcut</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter shortcut (optional)"
                        value={newAntibioticData.shortcut}
                        onChange={(e) => setNewAntibioticData(prev => ({ ...prev, shortcut: e.target.value }))}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Commercial Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter commercial name (optional)"
                        value={newAntibioticData.commercial_name}
                        onChange={(e) => setNewAntibioticData(prev => ({ ...prev, commercial_name: e.target.value }))}
                      />
                    </Form.Group>
                  </Form>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddAntibioticModal(prev => ({ ...prev, [cultureResultId]: false }))}
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