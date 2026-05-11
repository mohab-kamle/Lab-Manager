import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Container, Button, Modal, Form, Alert, Row, Col, Badge } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import { Pencil, Trash2, Plus, Download, Upload, CircleX } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { exportToExcel, importFromExcel, validateExcelFile } from '../../utils/excelUtils';
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useToast } from "../../components/ui/ToastContext";
import PhoneInput from "../../components/ui/PhoneInput";



const PatientsAdminView = () => {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null); // Removed blocking error state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [patient, setPatient] = useState({
    lab_id: user.lab_id,
    name: "",
    email: "",
    gender: "",
    birth_date: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    age: "",
    use_age: false,
    national_id: "",
    nationality: "",
    passport_no: "",
    address: "",
    phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
    diseases: [],
    total: "",
    paid: "",
    due: "",
    contract_id: "",
    referral_id: null
  });

  // Helper function to calculate birth date from age
  const calculateBirthDateFromAge = (age) => {
    const currentDate = new Date();
    const birthYear = currentDate.getFullYear() - parseInt(age);
    return `${birthYear}-01-01`; // Default to January 1st
  };

  // Helper function to update birth_date when day/month/year change
  const updateBirthDateFromComponents = (day, month, year) => {
    if (day && month && year) {
      const formattedDay = day.toString().padStart(2, '0');
      const formattedMonth = month.toString().padStart(2, '0');
      return `${year}-${formattedMonth}-${formattedDay}`;
    }
    return null;
  };

  // Helper function to parse birth_date into components
  const parseBirthDate = (birthDate) => {
    if (birthDate) {
      const date = new Date(birthDate);
      return {
        day: date.getDate().toString(),
        month: (date.getMonth() + 1).toString(),
        year: date.getFullYear().toString()
      };
    }
    return { day: "", month: "", year: "" };
  };
  const [formErrors, setFormErrors] = useState({});
  // Removed retry logic states as they are no longer needed
  const [importFile, setImportFile] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    nationality: "",
    diseases: []
  });
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showDiseaseCreateModal, setShowDiseaseCreateModal] = useState(false);
  const [newContract, setNewContract] = useState({
    name: "",
    region: "",
    governorate: "",
    discount_type: "none",
    discount_amount: 0,
    details: ""
  });
  const [diseaseSearchTerm, setDiseaseSearchTerm] = useState("");
  const [newDisease, setNewDisease] = useState({
    name: "",
    details: ""
  });
  const [newReferral, setNewReferral] = useState({
    doctor_name: "",
    specialization: "",
    phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
    email: "",
    address: ""
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [patientsRes, diseasesRes, contractsRes, referralsRes] = await Promise.all([
          axios.get(`${apiUrl}/patient`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/patient/diseases`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/contracts`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/doctor`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
        setDiseases(Array.isArray(diseasesRes.data) ? diseasesRes.data : []);
        setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : []);
        setReferrals(Array.isArray(referralsRes.data) ? referralsRes.data : []);

        // Set up table headers
        const headers = [
          { field: 'patientcode', label: 'Patient Code', sortable: true },
          { field: 'name', label: 'Name', sortable: true },
          { field: 'email', label: 'Email', sortable: true },
          { field: 'gender', label: 'Gender', sortable: true },
          { field: 'birth_date', label: 'Birth Date', sortable: true },
          { field: 'national_id', label: 'National ID', sortable: true },
          { field: 'nationality', label: 'Nationality', sortable: true },
          { field: 'passport_no', label: 'Passport No', sortable: true },
          { field: 'address', label: 'Address', sortable: true },
          { field: 'phones', label: 'Phones', sortable: false },
          { field: 'total', label: 'Total', sortable: true },
          { field: 'paid', label: 'Paid', sortable: true },

          { field: 'amount_due', label: 'Amount Due', sortable: false },
          { field: 'credit', label: 'Credit', sortable: false },
          { field: 'contract_id', label: 'Contract', sortable: true },
          { field: 'diseases_id_diseases', label: 'Diseases', sortable: false }
        ];

        setTableHeaders(headers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      // Calculate birth_date based on input method
      let finalBirthDate = null;
      if (patient.use_age && patient.age) {
        finalBirthDate = calculateBirthDateFromAge(patient.age);
      } else if (patient.birth_day && patient.birth_month && patient.birth_year) {
        finalBirthDate = updateBirthDateFromComponents(patient.birth_day, patient.birth_month, patient.birth_year);
      } else if (patient.birth_date) {
        finalBirthDate = new Date(patient.birth_date).toISOString().split('T')[0];
      }

      // Clean up the patient object
      const cleanedPatient = {
        ...patient,
        birth_date: finalBirthDate,
        phoneNumbers: patient.phoneNumbers.filter(p => p.phone && p.phone.trim() !== ""),
        diseases: patient.diseases || [],
        total: patient.total ? parseFloat(patient.total) : null,
        paid: patient.paid ? parseFloat(patient.paid) : null,
        due: patient.due ? parseFloat(patient.due) : null,
        contract_id: patient.contract_id || null
      };

      // Validate the cleaned patient
      const validationErrors = validateForm(cleanedPatient);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        console.log('Validation errors:', validationErrors);
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);

      let response;
      if (editingPatient) {
        // Update existing patient
        response = await axios.put(`${apiUrl}/patient/${editingPatient.id}`, cleanedPatient, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Update the patients state by replacing the old patient with the updated one
        setPatients(prevPatients => prevPatients.map(p =>
          p.id === editingPatient.id ? response.data : p
        ));
      } else {
        // Create new patient
        response = await axios.post(`${apiUrl}/patient`, cleanedPatient, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Add the new patient to the patients state
        setPatients(prevPatients => [...prevPatients, response.data]);
      }

      console.log('Server response:', response.data);
      toast.success(editingPatient ? "Patient updated successfully!" : "Patient added successfully!");
      setShowAddModal(false);
      handleResetForm();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error(error.response?.data?.error || 'Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  // handleRetry removed


  const handleAddReferral = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!newReferral.doctor_name.trim() || !newReferral.specialization.trim()) {
        toast.error('Doctor name and specialization are required');
        return;
      }
      const token = localStorage.getItem("token");
      setLoading(true);

      const payload = {
        name: newReferral.doctor_name,
        specialization: newReferral.specialization,
        phoneNumbers: newReferral.phoneNumbers,
        email: newReferral.email,
        address: newReferral.address,
        lab_id: user.lab_id
      };

      const response = await axios.post(`${apiUrl}/doctor`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Backend returns a doctor object, frontend maps it to referral keys if needed
      const addedReferral = {
        ...response.data,
        doctor_name: response.data.name
      };

      setReferrals(prev => [...prev, addedReferral]);
      setPatient(prev => ({ ...prev, referral_id: response.data.id }));
      setShowReferralModal(false);
      setNewReferral({
        doctor_name: "",
        specialization: "",
        phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
        email: "",
        address: ""
      });
      toast.success("Referral added successfully");
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error(error.response?.data?.error || 'Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      await axios.delete(`${apiUrl}/patient/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the patients state by removing the deleted patient
      setPatients(prevPatients => prevPatients.filter(p => p.id !== id));
      toast.success("Patient deleted successfully!");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Failed to delete patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = patients.map(patient => ({
        'Patient Code': patient.patientcode,
        'Name': patient.name,
        'Email': patient.email,
        'Gender': patient.gender ? patient.gender : '',
        'Birth Date': patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : '',
        'National ID': patient.national_id,
        'Nationality': patient.nationality,
        'Passport No': patient.passport_no,
        'Address': patient.address,
        'Primary Phone': (patient.phones?.[0]?.phone || patient.phones?.[0]?.phone_number) || '',
        'Secondary Phone': (patient.phones?.[1]?.phone || patient.phones?.[1]?.phone_number) || '',
        'Total': patient.total ? `EGP ${parseFloat(patient.total).toFixed(2)}` : '',
        'Paid': patient.paid ? `EGP ${parseFloat(patient.paid).toFixed(2)}` : '',
        'Due': patient.due ? `EGP ${parseFloat(patient.due).toFixed(2)}` : '',
        'Contract': patient.contract_id ? (() => {
          const selectedContract = contracts.find(c => c.id === patient.contract_id);
          return selectedContract ? (selectedContract.name || `${selectedContract.region} - ${selectedContract.governorate}`) : patient.contract_id;
        })() : '',
        'Diseases': patient.diseases_id_diseases?.map(d => d.name).join(', ') || ''
      }));

      const result = await exportToExcel(exportData, 'patients', 'Patients');
      if (result.success) {
        toast.success("Patients exported successfully");
      } else {
        toast.error(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export patients');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    const loadingToast = toast.loading("Importing patients...");
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const token = localStorage.getItem("token");
      setLoading(true);

      const response = await axios.post(`${apiUrl}/patient/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { summary, errorDetails, message } = response.data;

      // Refresh patients list
      const patientsRes = await axios.get(`${apiUrl}/patient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(patientsRes.data);

      setShowImportModal(false);
      setImportFile(null);
      
      if (summary.errors > 0) {
        toast.warning(message);
        console.log('Import errors:', errorDetails);
      } else {
        toast.success(message);
      }
    } catch (error) {
      console.error('Error importing patients:', error);
      toast.error(error.response?.data?.error || 'Failed to import patients');
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPatients.length === 0) {
      toast.error("Please select patients to delete");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      await axios.delete(`${apiUrl}/patient/bulk`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { patientIds: selectedPatients }
      });

      // Update the patients state by removing the deleted patients
      setPatients(prevPatients => prevPatients.filter(p => !selectedPatients.includes(p.id)));
      const count = selectedPatients.length;
      setSelectedPatients([]);
      toast.success(`Successfully deleted ${count} patients`);
    } catch (error) {
      console.error("Error bulk deleting patients:", error);
      toast.error("Failed to delete patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedPatients.length === 0) {
      toast.error("Please select patients to update");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      setLoading(true);

    const updateData = {};
    if (bulkUpdateData.nationality) updateData.nationality = bulkUpdateData.nationality;
    if (bulkUpdateData.diseases.length > 0) updateData.diseases = bulkUpdateData.diseases;

    try {
      await axios.put(`${apiUrl}/patient/bulk`, {
        patientIds: selectedPatients,
        updateData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh patients list
      const patientsRes = await axios.get(`${apiUrl}/patient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(patientsRes.data);

      setSelectedPatients([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ nationality: "", diseases: [] });
      toast.success(`Successfully updated ${selectedPatients.length} patients`);
    } catch (error) {
      console.error("Error bulk updating patients:", error);
      toast.error("Failed to update patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPatients(currentPatients.map(p => p.id));
    } else {
      setSelectedPatients([]);
    }
  };

  const handleSelectPatient = (patientId, checked) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchQuery.toLowerCase();
    const searchDigits = searchQuery.replace(/\D/g, "");
    
    const phones = patient.phones || [];
    const phoneMatch = phones.some(p => {
        const pNum = p.phone_number || p.phone || "";
        return pNum.includes(searchQuery) || (searchDigits && pNum.replace(/\D/g, "").includes(searchDigits));
    });

    const matchesSearch = patient.name?.toLowerCase().includes(searchLower) ||
      patient.patientcode?.toString().includes(searchQuery) ||
      patient.email?.toLowerCase().includes(searchLower) ||
      patient.national_id?.includes(searchQuery) ||
      phoneMatch;
      
    return matchesSearch;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (!sortConfig.field) return 0;

    let aValue = a[sortConfig.field];
    let bValue = b[sortConfig.field];

    // Handle null/undefined
    if (aValue === null || aValue === undefined) aValue = "";
    if (bValue === null || bValue === undefined) bValue = "";

    // Special handling for numeric fields (total, paid, due)
    const numericFields = ["total", "paid", "due", "patientcode", "national_id"];
    if (numericFields.includes(sortConfig.field)) {
      const aNum = parseFloat(aValue) || 0;
      const bNum = parseFloat(bValue) || 0;
      return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Default string comparison (case-insensitive)
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    return sortConfig.direction === "asc"
      ? aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
      : bStr.localeCompare(aStr, undefined, { numeric: true, sensitivity: 'base' });
  });

  const pageCount = Math.ceil(sortedPatients.length / itemsPerPage);
  const currentPatients = sortedPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        aria-label={`Edit patient ${rowData?.name || 'unknown'}`}
        onClick={() => {
          setEditingPatient(rowData);

          // Parse birth date components if birth_date exists
          let birthComponents = { birth_day: "", birth_month: "", birth_year: "", age: "", use_age: false };
          if (rowData.birth_date) {
            const parsed = parseBirthDate(rowData.birth_date);
            birthComponents = {
              birth_day: parsed.day,
              birth_month: parsed.month,
              birth_year: parsed.year,
              age: "",
              use_age: false
            };
          }

          setPatient({
            ...rowData,
            name: rowData.name || "",
            email: rowData.email || "",
            gender: rowData.gender || "",
            birth_date: rowData.birth_date ? new Date(rowData.birth_date) : null,
            ...birthComponents,
            national_id: rowData.national_id || "",
            nationality: rowData.nationality || "",
            passport_no: rowData.passport_no || "",
            address: rowData.address || "",
            phoneNumbers: rowData.phones && rowData.phones.length > 0 
              ? rowData.phones.map(p => ({ ...p, phone: p.phone_number || p.phone })) 
              : [{ phone: "", type: "personal", is_primary: true }],
            diseases: rowData.diseases_id_diseases?.map(d => d.id) || [],
            total: rowData.total || "",
            paid: rowData.paid || "",
            due: rowData.due || "",
            contract_id: rowData.contract_id || ""
          });
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        aria-label={`Delete patient ${rowData?.name || 'unknown'}`}
        onClick={() => {
          confirm.delete(rowData.name, () => handleDelete(rowData.id));
        }}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  const validateForm = (patient) => {
    const errors = {};

    if (!patient.name) errors.name = 'Name is required';

    // Email validation (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (patient.email && !emailRegex.test(patient.email)) {
      errors.email = 'Invalid email format';
    }

    if (patient.email && !emailRegex.test(patient.email)) {
      errors.email = 'Invalid email format';
    }


    return errors;
  };

  const formatCellData = (value, field, rowData) => {
    // Determine if we should skip the check for computed columns
    const isComputedColumn = ['amount_due', 'credit'].includes(field);

    if ((value === null || value === undefined) && !isComputedColumn) return '-';

    switch (field) {
      case 'birth_date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'gender':
        return value;
      case 'phones':
        if (!value || value.length === 0) return "-";
        const primary = value.find(p => p.is_primary) || value[0];
        return (
          <div className="d-flex flex-column gap-1">
            <span className="fw-bold">{primary.phone || primary.phone_number}</span>
            {value.length > 1 && (
              <Badge bg="secondary" pill style={{ fontSize: '10px', width: 'fit-content' }}>
                +{value.length - 1} more
              </Badge>
            )}
          </div>
        );
      case 'patientcode':
        return value ? (
          <span 
            className="text-primary fw-bold cursor-pointer hover-underline" 
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${user.role}/patients/${rowData.id}`);
            }}
          >
            {value.toString()}
          </span>
        ) : '-';

      case 'total':
        return value ? `EGP ${parseFloat(value).toFixed(2)}` : '-';
      case 'paid':
        return value ? `EGP ${parseFloat(value).toFixed(2)}` : '-';
      case 'amount_due':
        // Use rowData.due if available since amount_due is computed from it
        const dueAmount = rowData && rowData.due ? parseFloat(rowData.due) : 0;
        if (dueAmount > 0.01) {
          return <span className="text-danger fw-bold">EGP {dueAmount.toFixed(2)}</span>;
        }
        return <span className="text-muted">-</span>;
      case 'credit':
        // Use rowData.due if available since credit is computed from it (negative due)
        const creditAmount = rowData && rowData.due ? parseFloat(rowData.due) : 0;
        if (creditAmount < -0.01) {
          return <span className="text-success fw-bold">EGP {Math.abs(creditAmount).toFixed(2)}</span>;
        }
        return <span className="text-muted">-</span>;
      case 'due': // keeping for backward compatibility if needed elsewhere
        return value ? `EGP ${parseFloat(value).toFixed(2)}` : '-';
      case 'contract_id':
        if (!value) return '-';
        const selectedContract = contracts.find(c => c.id === value);
        return selectedContract ? (selectedContract.name || `${selectedContract.region} - ${selectedContract.governorate}`) : value;
      case 'diseases_id_diseases':
        if (!Array.isArray(value) || value.length === 0) return '-';
        return (
          <div className="d-flex flex-wrap gap-1">
            {value.map((disease, index) => (
              <Badge
                key={index}
                bg="primary"
                className="text-wrap cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedDisease(disease);
                  setShowDiseaseModal(true);
                }}
              >
                {disease.name}
              </Badge>
            ))}
          </div>
        );
      default:
        return String(value || '-');
    }
  };

  const handleResetForm = () => {
    setPatient({
      lab_id: user.lab_id,
      name: "",
      email: "",
      gender: "",
      birth_date: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      age: "",
      use_age: false,
      national_id: "",
      nationality: "",
      passport_no: "",
      address: "",
      phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
      diseases: [],
      total: "",
      paid: "",
      due: "",
      contract_id: ""
    });
    setFormErrors({});
  };
  const handleAddContract = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      const response = await axios.post(`${apiUrl}/contracts`, newContract, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new contract to the list
      setContracts(prevContracts => [...prevContracts, response.data]);

      // Set the new contract as selected
      setPatient(prev => ({ ...prev, contract_id: response.data.id }));

      setShowContractModal(false);
      setNewContract({
        name: "",
        region: "",
        governorate: "",
        discount_type: "none",
        discount_amount: 0,
        details: ""
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error(error.response?.data?.error || 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDisease = async () => {
    try {
      if (!newDisease.name.trim()) {
        toast.error('Disease name is required');
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);

      const response = await axios.post(`${apiUrl}/diseases`, newDisease, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refetch diseases from server to ensure full synchronization
      const diseasesRes = await axios.get(`${apiUrl}/patient/diseases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedDiseases = diseasesRes.data || [];
      setDiseases(updatedDiseases);

      // Set the new disease as selected (using the ID from the POST response)
      const newDiseaseId = response.data.id;
      if (!patient.diseases.includes(newDiseaseId)) {
        setPatient(prev => ({ ...prev, diseases: [...prev.diseases, newDiseaseId] }));
      }

      setShowDiseaseCreateModal(false);
      setNewDisease({
        name: "",
        details: ""
      });
      setDiseaseSearchTerm(""); // Clear search to show the new disease
      toast.success("Disease added and selected");
    } catch (error) {
      console.error('Error creating disease:', error);
      toast.error(error.response?.data?.error || 'Failed to create disease');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="patients-admin-container">
      {loading ? (
        <LoadingSpinner message="Loading patients..." />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h2>Patients Management</h2>
            <div className="d-flex gap-2 flex-wrap">
              {selectedPatients.length > 0 && (
                <>
                  <Button
                    variant="outline-warning"
                    onClick={() => setShowBulkUpdateModal(true)}
                  >
                    <Pencil size={16} className="me-2" />
                    Bulk Update ({selectedPatients.length})
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => {
                      confirm.delete(`${selectedPatients.length} selected patients`, handleBulkDelete);
                    }}
                  >
                    <Trash2 size={16} className="me-2" />
                    Bulk Delete ({selectedPatients.length})
                  </Button>
                </>
              )}
              <Button
                variant="outline-success"
                onClick={handleExport}
              >
                <Download size={16} className="me-2" />
                Export XLSX
              </Button>
              <Button
                variant="outline-info"
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={16} className="me-2" />
                Import Excel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingPatient(null);
                  handleResetForm();
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} className="me-2" />
                Add New Patient
              </Button>
            </div>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={tableHeaders.filter(h => h.sortable).map(h => h.field)}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />

          <DynamicTable
            data={currentPatients}
            columns={tableHeaders.map(header => header.field)}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
            showCheckboxes={true}
            selectedItems={selectedPatients}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectPatient}
            customHeaders={tableHeaders.reduce((acc, header) => {
              acc[header.field] = header.label;
              return acc;
            }, {})}
          />

          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={setCurrentPage}
          />

          {/* Add/Edit Modal */}
          <Modal show={showAddModal} onHide={() => {
            setShowAddModal(false);
            setFormErrors({});
          }} size="lg">
            <Modal.Header>
              <Modal.Title>
                {editingPatient ? "Edit" : "Add"} Patient
              </Modal.Title>
              <button className="modal-close-btn" aria-label="Close modal" onClick={() => {
                setShowAddModal(false);
                setFormErrors({});
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {/* Error alert removed, using toast instead */}
              <Form onSubmit={handleAddPatient} noValidate id="patient-form">
                {editingPatient && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Patient Code</Form.Label>
                        <Form.Control
                          type="text"
                          value={editingPatient.patientcode || ''}
                          readOnly
                          className="bg-theme-surface"
                        />
                        <Form.Text className="text-muted">
                          Patient code is auto-generated and cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter patient name"
                        value={patient.name || ''}
                        onChange={(e) => {
                          setPatient({ ...patient, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                        }}
                        isInvalid={!!formErrors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={patient.email || ''}
                        onChange={(e) => {
                          setPatient({ ...patient, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                        }}
                        isInvalid={!!formErrors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender *</Form.Label>
                      <Form.Select
                        value={patient.gender}
                        onChange={(e) => {
                          setPatient({ ...patient, gender: e.target.value });
                          if (formErrors.gender) setFormErrors({ ...formErrors, gender: null });
                        }}
                        isInvalid={!!formErrors.gender}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.gender}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Birth Date / Age *</Form.Label>
                      <div className="mb-2">
                        <Form.Check
                          type="radio"
                          name="birthDateMethod"
                          id="use-date"
                          label="Enter Birth Date"
                          checked={!patient.use_age}
                          onChange={() => setPatient({ ...patient, use_age: false, age: "" })}
                          inline
                        />
                        <Form.Check
                          type="radio"
                          name="birthDateMethod"
                          id="use-age"
                          label="Enter Age"
                          checked={patient.use_age}
                          onChange={() => setPatient({ ...patient, use_age: true, birth_day: "", birth_month: "", birth_year: "" })}
                          inline
                        />
                      </div>
                      {!patient.use_age ? (
                        <Row>
                          <Col xs={4}>
                            <Form.Control
                              type="text"
                              inputMode="numeric"
                              placeholder="Day"
                              value={patient.birth_day}
                              onChange={(e) => {
                                const day = e.target.value;
                                // Strictly allow only digits and validate range (1-31)
                                if (day === "" || (/^\d+$/.test(day) && Number(day) <= 31 && day.length <= 2)) {
                                  const newPatient = { ...patient, birth_day: day };
                                  if (day && patient.birth_month && patient.birth_year) {
                                    newPatient.birth_date = new Date(updateBirthDateFromComponents(day, patient.birth_month, patient.birth_year));
                                  }
                                  setPatient(newPatient);
                                  if (formErrors.birth_date) setFormErrors({ ...formErrors, birth_date: null });
                                }
                              }}
                            />
                          </Col>
                          <Col xs={4}>
                            <Form.Control
                              type="text"
                              inputMode="numeric"
                              placeholder="Month"
                              value={patient.birth_month}
                              onChange={(e) => {
                                const month = e.target.value;
                                // Strictly allow only digits and validate range (1-12)
                                if (month === "" || (/^\d+$/.test(month) && Number(month) <= 12 && month.length <= 2)) {
                                  const newPatient = { ...patient, birth_month: month };
                                  if (patient.birth_day && month && patient.birth_year) {
                                    newPatient.birth_date = new Date(updateBirthDateFromComponents(patient.birth_day, month, patient.birth_year));
                                  }
                                  setPatient(newPatient);
                                  if (formErrors.birth_date) setFormErrors({ ...formErrors, birth_date: null });
                                }
                              }}
                            />
                          </Col>
                          <Col xs={4}>
                            <Form.Control
                              type="text"
                              inputMode="numeric"
                              placeholder="Year"
                              value={patient.birth_year}
                              onChange={(e) => {
                                const year = e.target.value;
                                // Strictly allow only digits and max 4 digits
                                if (year === "" || (/^\d+$/.test(year) && year.length <= 4)) {
                                  const newPatient = { ...patient, birth_year: year };
                                  if (patient.birth_day && patient.birth_month && year) {
                                    newPatient.birth_date = new Date(updateBirthDateFromComponents(patient.birth_day, patient.birth_month, year));
                                  }
                                  setPatient(newPatient);
                                  if (formErrors.birth_date) setFormErrors({ ...formErrors, birth_date: null });
                                }
                              }}
                              className={formErrors.birth_date ? 'is-invalid' : ''}
                            />
                          </Col>
                        </Row>
                      ) : (
                        <Form.Control
                          type="number"
                          placeholder="Enter age in years"
                          value={patient.age}
                          onChange={(e) => {
                            const age = e.target.value;
                            const newPatient = { ...patient, age };
                            if (age) {
                              newPatient.birth_date = new Date(calculateBirthDateFromAge(age));
                            }
                            setPatient(newPatient);
                            if (formErrors.birth_date) setFormErrors({ ...formErrors, birth_date: null });
                          }}
                          min="0"
                          max="150"
                          className={formErrors.birth_date ? 'is-invalid' : ''}
                        />
                      )}
                      {formErrors.birth_date && (
                        <div className="invalid-feedback d-block">
                          {formErrors.birth_date}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>National ID *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter national ID"
                        value={patient.national_id || ''}
                        onChange={(e) => {
                          setPatient({ ...patient, national_id: e.target.value });
                          if (formErrors.national_id) setFormErrors({ ...formErrors, national_id: null });
                        }}
                        isInvalid={!!formErrors.national_id}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.national_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nationality</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter nationality"
                        value={patient.nationality || ''}
                        onChange={(e) => setPatient({ ...patient, nationality: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Passport No</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter passport number"
                        value={patient.passport_no || ''}
                        onChange={(e) => setPatient({ ...patient, passport_no: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter address"
                        value={patient.address || ''}
                        onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Phone Numbers *</Form.Label>
                    {patient.phoneNumbers.map((phoneEntry, index) => (
                      <div key={index} className="d-flex flex-wrap gap-2 mb-2 align-items-center w-100">
                        <div style={{ flex: '1 1 200px', minWidth: '0' }}>
                          <PhoneInput
                            value={phoneEntry.phone}
                            onChange={(val) => {
                              const newPhones = [...patient.phoneNumbers];
                              newPhones[index].phone = val;
                              setPatient({ ...patient, phoneNumbers: newPhones });
                            }}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <Form.Select
                          style={{ width: 'auto', flex: '0 1 120px' }}
                          value={phoneEntry.type}
                          onChange={(e) => {
                            const newPhones = [...patient.phoneNumbers];
                            newPhones[index].type = e.target.value;
                            setPatient({ ...patient, phoneNumbers: newPhones });
                          }}
                        >
                          <option value="personal">Personal</option>
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                        </Form.Select>
                        <div className="d-flex flex-column align-items-center justify-content-center" style={{ width: '40px' }}>
                          <Form.Check
                            type="radio"
                            name="primaryPhone"
                            checked={phoneEntry.is_primary}
                            onChange={() => {
                              const newPhones = patient.phoneNumbers.map((p, i) => ({
                                ...p,
                                is_primary: i === index
                              }));
                              setPatient({ ...patient, phoneNumbers: newPhones });
                            }}
                            title="Set as primary"
                            className="m-0"
                          />
                          <small className="text-muted" style={{ fontSize: '10px' }}>Primary</small>
                        </div>
                        {patient.phoneNumbers.length > 1 && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="mt-1 mt-md-0"
                            onClick={() => {
                              const newPhones = patient.phoneNumbers.filter((_, i) => i !== index);
                              if (phoneEntry.is_primary && newPhones.length > 0) {
                                newPhones[0].is_primary = true;
                              }
                              setPatient({ ...patient, phoneNumbers: newPhones });
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="mt-1"
                      onClick={() => {
                        setPatient({
                          ...patient,
                          phoneNumbers: [
                            ...patient.phoneNumbers,
                            { phone: "", type: "personal", is_primary: false }
                          ]
                        });
                      }}
                    >
                      <Plus size={14} className="me-1" /> Add Another Phone
                    </Button>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Diseases</Form.Label>
                  <div className="mb-2">
                    <div className="d-flex gap-2 mb-2">
                      <Form.Control
                        type="text"
                        placeholder="Search diseases..."
                        value={diseaseSearchTerm}
                        onChange={(e) => setDiseaseSearchTerm(e.target.value)}
                        className="flex-grow-1"
                      />
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowDiseaseCreateModal(true)}
                        title="Add New Disease"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    <div style={{ 
                      maxHeight: "150px", 
                      overflowY: "auto", 
                      border: "1px solid var(--border-default)", 
                      borderRadius: "4px", 
                      padding: "8px",
                      backgroundColor: "var(--bg-secondary)"
                    }}>
                      {Array.isArray(diseases) && diseases
                        .filter(d => d.name.toLowerCase().includes(diseaseSearchTerm.toLowerCase()))
                        .map(disease => (
                          <Form.Check
                            key={disease.id}
                            type="checkbox"
                            id={`disease-${disease.id}`}
                            label={`${disease.name}${disease.details ? ` (${disease.details})` : ""}`}
                            checked={patient.diseases.includes(disease.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const currentDiseases = patient.diseases || [];
                              const updatedDiseases = isChecked
                                ? [...currentDiseases, disease.id]
                                : currentDiseases.filter(id => id !== disease.id);
                              setPatient({ ...patient, diseases: updatedDiseases });
                            }}
                          />
                        ))}
                      {Array.isArray(diseases) && diseases.filter(d => d.name.toLowerCase().includes(diseaseSearchTerm.toLowerCase())).length === 0 && (
                        <div className="text-muted small text-center py-2">No diseases found</div>
                      )}
                    </div>
                  </div>

                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Total Amount</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder="Enter total amount"
                        value={patient.total || ''}
                        onChange={(e) => {
                          const total = e.target.value;
                          const paid = patient.paid || 0;
                          const calculatedDue = (parseFloat(total) || 0) - (parseFloat(paid) || 0);
                          setPatient({ ...patient, total, due: calculatedDue.toString() });
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Paid Amount</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder="Enter paid amount"
                        value={patient.paid || ''}
                        onChange={(e) => {
                          const paid = e.target.value;
                          const total = patient.total || 0;
                          const calculatedDue = (parseFloat(total) || 0) - (parseFloat(paid) || 0);
                          setPatient({ ...patient, paid, due: calculatedDue.toString() });
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Due Amount</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder={(!editingPatient || !patient.due || parseFloat(patient.due) === 0) ? "Enter due amount" : "0.00"}
                        value={parseFloat(patient.due) > 0 ? patient.due : ''}
                        onChange={(e) => setPatient({ ...patient, due: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Credit Amount</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder={(!editingPatient || !patient.due || parseFloat(patient.due) === 0) ? "Enter credit amount" : "0.00"}
                        value={parseFloat(patient.due) < 0 ? Math.abs(parseFloat(patient.due)) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPatient({ ...patient, due: val ? (-(Math.abs(parseFloat(val)))).toString() : "0" });
                        }}
                      />
                    </Form.Group>
                  </Col>

                </Row>
                <Row><Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contract</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Select
                        value={patient.contract_id || ""}
                        onChange={(e) => setPatient({ ...patient, contract_id: e.target.value || null })}
                      >
                        <option value="">Select Contract</option>
                        {Array.isArray(contracts) && contracts.map(contract => (
                          <option key={contract.id} value={contract.id}>
                            {contract.name || `${contract.region} - ${contract.governorate}`} ({contract.discount_type})
                          </option>
                        ))}
                      </Form.Select>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowContractModal(true)}
                        title="Add New Contract"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      Select an existing contract or add a new one
                    </Form.Text>
                  </Form.Group>
                </Col></Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowAddModal(false);
                setShowRetryButton(false);
                setLastAttemptedPatient(null);
                setFormErrors({});
              }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="patient-form"
                disabled={loading}
              >
                {loading ? "Saving..." : (editingPatient ? "Update" : "Add")}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Import Modal */}
          <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
            <Modal.Header>
              <Modal.Title>Import Patients</Modal.Title>
              <button className="modal-close-btn" aria-label="Close modal" onClick={() => setShowImportModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Select Excel/CSV File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
                <Form.Text className="text-muted">
                  File should contain columns: Name (required), Primary Phone (required), Email, Gender (Male/Female), Birth Date (YYYY-MM-DD), National ID, Nationality, Passport No, Address, Secondary Phone, Total, Paid, Due, Contract (format: "Region - Governorate"), Diseases (comma-separated disease names)
                </Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!importFile || loading}
              >
                {loading ? "Importing..." : "Import"}
              </Button>
            </Modal.Footer>
          </Modal>





          {/* Bulk Update Modal */}
          <Modal show={showBulkUpdateModal} onHide={() => setShowBulkUpdateModal(false)} size="lg">
            <Modal.Header>
              <Modal.Title>Bulk Update Patients</Modal.Title>
              <button className="modal-close-btn" aria-label="Close modal" onClick={() => setShowBulkUpdateModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="info">
                You are updating {selectedPatients.length} selected patients. Leave fields empty to keep current values.
              </Alert>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nationality</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter nationality"
                        value={bulkUpdateData.nationality}
                        onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, nationality: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Diseases</Form.Label>
                      <Form.Select
                        multiple
                        value={bulkUpdateData.diseases}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                          setBulkUpdateData({ ...bulkUpdateData, diseases: selected });
                        }}
                      >
                        {Array.isArray(diseases) && diseases.map(disease => (
                          <option key={disease.id} value={disease.id}>
                            {disease.name} {disease.details && `(${disease.details})`}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Hold Ctrl (or Cmd on Mac) to select multiple diseases
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowBulkUpdateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkUpdate}
                disabled={loading}
              >
                {loading ? "Updating..." : `Update ${selectedPatients.length} Patients`}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Disease Details Modal */}
          <Modal show={showDiseaseModal} onHide={() => setShowDiseaseModal(false)}>
            <Modal.Header>
              <Modal.Title>Disease Details</Modal.Title>
              <button className="modal-close-btn" aria-label="Close modal" onClick={() => setShowDiseaseModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {selectedDisease && (
                <div>
                  <h5 className="text-primary mb-3">{selectedDisease.name}</h5>
                  {selectedDisease.details ? (
                    <p className="mb-0">{selectedDisease.details}</p>
                  ) : (
                    <p className="text-muted mb-0">No additional details available for this disease.</p>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDiseaseModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Add Contract Modal */}
          <Modal show={showContractModal} onHide={() => setShowContractModal(false)}>
            <Modal.Header>
              <Modal.Title>Add New Contract</Modal.Title>
              <button className="modal-close-btn" aria-label="Close modal" onClick={() => setShowContractModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {/* Error alert removed */}
              <Form>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contract Name (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter contract name (auto-generated if left empty)"
                        value={newContract.name}
                        onChange={(e) => setNewContract({ ...newContract, name: e.target.value })}
                      />
                      <Form.Text className="text-muted">
                        Leave empty to auto-generate from region and governorate
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Region *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter region"
                        value={newContract.region}
                        onChange={(e) => setNewContract({ ...newContract, region: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Governorate *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter governorate"
                        value={newContract.governorate}
                        onChange={(e) => setNewContract({ ...newContract, governorate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Discount Type</Form.Label>
                      <Form.Select
                        value={newContract.discount_type}
                        onChange={(e) => setNewContract({ ...newContract, discount_type: e.target.value })}
                      >
                        <option value="none">None</option>
                        <option value="percentage">Percentage</option>
                        <option value="custom price">Custom Price</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Discount Amount (%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="Enter discount percentage"
                        value={newContract.discount_amount}
                        onChange={e => setNewContract({ ...newContract, discount_amount: e.target.value })}
                      />
                      <Form.Text className="text-muted">
                        Enter the discount percentage for this contract (e.g., 10 for 10%)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Details</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter contract details"
                        value={newContract.details}
                        onChange={(e) => setNewContract({ ...newContract, details: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowContractModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddContract}
                disabled={loading || !newContract.region || !newContract.governorate}
              >
                {loading ? "Creating..." : "Create Contract"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Add Disease Modal */}
          <Modal show={showDiseaseCreateModal} onHide={() => setShowDiseaseCreateModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Add New Disease</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* Error alert removed */}
              <Form>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Disease Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter disease name"
                        value={newDisease.name}
                        onChange={(e) => setNewDisease({ ...newDisease, name: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Details (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter disease details"
                        value={newDisease.details}
                        onChange={(e) => setNewDisease({ ...newDisease, details: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDiseaseCreateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddDisease}
                disabled={loading || !newDisease.name.trim()}
              >
                {loading ? "Creating..." : "Create Disease"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Add Referral Modal */}
          <Modal show={showReferralModal} onHide={() => setShowReferralModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Add New Referral</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* Error alert removed */}
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Doctor Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter doctor name"
                        value={newReferral.doctor_name}
                        onChange={(e) => setNewReferral({ ...newReferral, doctor_name: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Specialization *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter specialization"
                        value={newReferral.specialization}
                        onChange={(e) => setNewReferral({ ...newReferral, specialization: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Label>Phone Numbers *</Form.Label>
                    {newReferral.phoneNumbers.map((phoneEntry, index) => (
                      <div key={index} className="d-flex flex-wrap gap-2 mb-2 align-items-center w-100">
                        <div style={{ flex: '1 1 200px', minWidth: '0' }}>
                          <PhoneInput
                            value={phoneEntry.phone}
                            onChange={(val) => {
                              const newPhones = [...newReferral.phoneNumbers];
                              newPhones[index].phone = val;
                              setNewReferral({ ...newReferral, phoneNumbers: newPhones });
                            }}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <Form.Select
                          style={{ width: 'auto', flex: '0 1 120px' }}
                          value={phoneEntry.type}
                          onChange={(e) => {
                            const newPhones = [...newReferral.phoneNumbers];
                            newPhones[index].type = e.target.value;
                            setNewReferral({ ...newReferral, phoneNumbers: newPhones });
                          }}
                        >
                          <option value="personal">Personal</option>
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                        </Form.Select>
                        <div className="d-flex flex-column align-items-center justify-content-center" style={{ width: '40px' }}>
                          <Form.Check
                            type="radio"
                            name="referralPrimaryPhone"
                            checked={phoneEntry.is_primary}
                            onChange={() => {
                              const newPhones = newReferral.phoneNumbers.map((p, i) => ({
                                ...p,
                                is_primary: i === index
                              }));
                              setNewReferral({ ...newReferral, phoneNumbers: newPhones });
                            }}
                            title="Set as primary"
                            className="m-0"
                          />
                          <small className="text-muted" style={{ fontSize: '10px' }}>Primary</small>
                        </div>
                        {newReferral.phoneNumbers.length > 1 && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="mt-1 mt-md-0"
                            onClick={() => {
                              const newPhones = newReferral.phoneNumbers.filter((_, i) => i !== index);
                              if (phoneEntry.is_primary && newPhones.length > 0) {
                                newPhones[0].is_primary = true;
                              }
                              setNewReferral({ ...newReferral, phoneNumbers: newPhones });
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="mt-1"
                      onClick={() => {
                        setNewReferral({
                          ...newReferral,
                          phoneNumbers: [
                            ...newReferral.phoneNumbers,
                            { phone: "", type: "personal", is_primary: false }
                          ]
                        });
                      }}
                    >
                      <Plus size={14} className="me-1" /> Add Another Phone
                    </Button>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={newReferral.email}
                        onChange={(e) => setNewReferral({ ...newReferral, email: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter address"
                        value={newReferral.address}
                        onChange={(e) => setNewReferral({ ...newReferral, address: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowReferralModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddReferral}
                disabled={loading || !newReferral.doctor_name.trim() || !newReferral.specialization.trim()}
              >
                {loading ? "Creating..." : "Create Referral"}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default PatientsAdminView;

