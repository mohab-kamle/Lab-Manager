import React, { useState, useEffect, useRef } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col, Badge } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import { Pencil, Trash2, Plus, Printer, Settings, Eye } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import InvoicePDF from "../../components/pdf/InvoicePDF";
import Select from 'react-select';
import '../../styles/select.css';
import { toast } from 'react-toastify';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);

  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [packages, setPackages] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [testGroups, setTestGroups] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [referrals, setReferrals] = useState([]); // Add referrals state
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    status: "",
    patient: ""
  });

  const [invoice, setInvoice] = useState({
    patient_id: "",
    date: new Date(),
    tests: [],
    cultures: [],
    packages: [],
    payments: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    paid: 0,
    due: 0,
    status_id: "",
    receptionist_id: "",
    test_groups: [],
    branch_id: ""
  });

  const [formErrors, setFormErrors] = useState({});
  const [showFormErrorAlert, setShowFormErrorAlert] = useState(false);
  const modalBodyRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [cultureSearchTerm, setCultureSearchTerm] = useState("");
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [testGroupSearchTerm, setTestGroupSearchTerm] = useState("");
  const [diseaseSearchTerm, setDiseaseSearchTerm] = useState("");

  // Status management states
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusFormData, setStatusFormData] = useState({ state: "", details: "" });
  const [statusFormErrors, setStatusFormErrors] = useState({});
  const [showStatusFormErrorAlert, setShowStatusFormErrorAlert] = useState(false);
  const [showStatusDeleteModal, setShowStatusDeleteModal] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [statusDetectionError, setStatusDetectionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modalSuccessMessage, setModalSuccessMessage] = useState("");

  // Helper function to determine automatic status based on payment conditions
  const determineAutomaticStatus = (due, paid, total) => {
    if (due < 0) {
      // Negative due means overpayment
      return statuses.find(s => s.state.toLowerCase().includes('overpaid') || s.state.toLowerCase().includes('refund'))?.id;
    } else if (due === 0 || due <= 0.01) {
      // Fully paid
      return statuses.find(s => s.state.toLowerCase().includes('paid') || s.state.toLowerCase().includes('done') || s.state.toLowerCase().includes('completed'))?.id;
    } else {
      // Has outstanding balance
      return statuses.find(s => s.state.toLowerCase().includes('pending') || s.state.toLowerCase().includes('unpaid') || s.state.toLowerCase().includes('due'))?.id;
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [
        invoicesRes,
        patientsRes,
        testsRes,
        culturesRes,
        packagesRes,
        paymentMethodsRes,
        statusesRes,
        receptionistsRes,
        testGroupsRes,
        contractsRes,
        diseasesRes,
        referralsRes,
        branchesRes
      ] = await Promise.all([
        axios.get(`${apiUrl}/invoices`, { headers }),
        axios.get(`${apiUrl}/patient`, { headers }),
        axios.get(`${apiUrl}/tests`, { headers }),
        axios.get(`${apiUrl}/cultures`, { headers }),
        axios.get(`${apiUrl}/packages-and-offers`, { headers }),
        axios.get(`${apiUrl}/payment-methods`, { headers }),
        axios.get(`${apiUrl}/statuses`, { headers }),
        user?.role === 'admin' ? axios.get(`${apiUrl}/receptionists`, { headers }) : Promise.resolve({ data: [] }),
        axios.get(`${apiUrl}/test-groups?includeDeleted=false`, { headers }),
        axios.get(`${apiUrl}/contracts`, { headers }),
        axios.get(`${apiUrl}/patient/diseases`, { headers }),
        axios.get(`${apiUrl}/referrals`, { headers }), // Add referrals fetching
        axios.get(`${apiUrl}/branches`, { headers })
      ]);

      setInvoices(invoicesRes.data || []);
      setPatients(patientsRes.data || []);
      setTests(testsRes.data || []);
      setCultures(culturesRes.data || []);
      setPackages(packagesRes.data || []);
      setPaymentMethods(paymentMethodsRes.data || []);
      setStatuses(statusesRes.data || []);
      setReceptionists(receptionistsRes.data || []);
      setTestGroups(testGroupsRes.data || []);
      setContracts(contractsRes.data || []);
      setDiseases(diseasesRes.data || []);
      setReferrals(referralsRes.data.referrals || []); // Set referrals data
      setBranches(branchesRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Set empty arrays instead of error to prevent crashes
      setInvoices([]);
      setPatients([]);
      setTests([]);
      setCultures([]);
      setPackages([]);
      setPaymentMethods([]);
      setStatuses([]);
      setReceptionists([]);
      setTestGroups([]);
      setContracts([]);
      setDiseases([]);
      setReferrals([]); // Set empty referrals array on error
      setBranches([]);
      setLoading(false);
    }
  };

  // Function to refresh patient data specifically
  const refreshPatientData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const patientsRes = await axios.get(`${apiUrl}/patient`, { headers });
      setPatients(patientsRes.data || []);
    } catch (error) {
      console.error("Error refreshing patient data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl, user?.role]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patientcode?.toString().includes(searchTerm) ||
        patient.national_id?.toString().includes(searchTerm) ||
        patient.phone?.toString().includes(searchTerm)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  const patientOptions = filteredPatients.map(patient => ({
    value: patient.id,
    label: `${patient.name} (${patient.patientcode}) - ${patient.national_id} - ${patient.phone}`
  }));

  // Helper function to calculate total from payment methods
  const calculatePaymentTotal = (payments) => {
    return payments.reduce((sum, payment) => sum + Number(payment.paid_amount || 0), 0);
  };

  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientForm, setPatientForm] = useState({
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
    primaryPhone: "",
    secondaryPhone: "",
    diseases: [], // This will store disease IDs
    contract_id: "",
    referral_id: "" // Add referral_id to patient form
  });
  const [patientFormErrors, setPatientFormErrors] = useState({});
  const [showDiseaseCreateModal, setShowDiseaseCreateModal] = useState(false);
  const [newDisease, setNewDisease] = useState({
    name: "",
    description: ""
  });

  // Helper function to calculate birth date from age
  const calculateBirthDateFromAge = (age) => {
    if (!age || isNaN(age)) return null;
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    return `${birthYear}-01-01`;
  };

  // Helper function to update birth_date when day/month/year change
  const updateBirthDateFromComponents = (day, month, year) => {
    if (day && month && year) {
      const formattedDay = day.toString().padStart(2, '0');
      const formattedMonth = month.toString().padStart(2, '0');
      return `${year}-${formattedMonth}-${formattedDay}`;
    }
    return "";
  };

  // Helper function to parse birth_date into components
  const parseBirthDate = (birthDate) => {
    if (!birthDate) return { day: "", month: "", year: "" };
    const date = new Date(birthDate);
    return {
      day: date.getDate().toString(),
      month: (date.getMonth() + 1).toString(),
      year: date.getFullYear().toString()
    };
  };
  // Referral modal states
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [newReferral, setNewReferral] = useState({
    doctor_name: "",
    specialization: "",
    phone: "",
    email: "",
    address: ""
  });

  const handleCreatePatient = async () => {
    try {
      // Validate required fields - only name is required
      if (!patientForm.name) {
        setPatientFormErrors({ name: 'Name is required' });
        return;
      }
      const token = localStorage.getItem("token");
      // Calculate birth_date based on input method
      let finalBirthDate = null;
      if (patientForm.use_age && patientForm.age) {
        finalBirthDate = calculateBirthDateFromAge(patientForm.age);
      } else if (patientForm.birth_day && patientForm.birth_month && patientForm.birth_year) {
        finalBirthDate = updateBirthDateFromComponents(patientForm.birth_day, patientForm.birth_month, patientForm.birth_year);
      } else if (patientForm.birth_date) {
        finalBirthDate = new Date(patientForm.birth_date).toISOString().split('T')[0];
      }

      const cleanedPatient = {
        ...patientForm,
        birth_date: finalBirthDate,
        primaryPhone: patientForm.primaryPhone || null,
        secondaryPhone: patientForm.secondaryPhone || null,
        diseases: patientForm.diseases || [], // This should be an array of disease IDs
        contract_id: patientForm.contract_id || null,
        referral_id: patientForm.referral_id || null // Include referral_id in patient creation
      };
      const response = await axios.post(`${apiUrl}/patient`, cleanedPatient, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Add the new patient to the patients list
      const newPatient = response.data;
      setPatients(prev => [...prev, newPatient]);
      
      // Set the new patient as selected in the invoice
      setInvoice(prev => ({ 
        ...prev, 
        patient_id: newPatient.id,
        patient_name: newPatient.name 
      }));
      
      // Close the patient creation form but keep the invoice modal open
      setShowCreatePatient(false);
      
      // Reset the patient form
      setPatientForm({
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
        primaryPhone: "",
        secondaryPhone: "",
        diseases: [],
        contract_id: "",
        referral_id: "" // Reset referral_id
      });
      setDiseaseSearchTerm("");
      setPatientFormErrors({});
      
      // Show success message in modal
      setModalSuccessMessage(`Patient "${newPatient.name}" created successfully and selected for this invoice!`);
      setTimeout(() => setModalSuccessMessage(""), 3000);
      
      // Apply contract discount if the patient has a contract
      if (newPatient.contract_id) {
        const patientContract = contracts.find(c => c.id === newPatient.contract_id);
        if (patientContract && patientContract.discount_type === 'percentage' && patientContract.discount_amount > 0) {
          setDiscountPercentage(patientContract.discount_amount);
        }
      }
      // Always refresh patient data after creating a patient
      await refreshPatientData();
    } catch (error) {
      console.error("Error creating patient:", error);
      setPatientFormErrors({ api: error.response?.data?.error || 'Failed to create patient' });
    }
  };

  const handleAddDisease = async () => {
    try {
      if (!newDisease.name.trim()) {
        setError('Disease name is required');
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      const response = await axios.post(`${apiUrl}/diseases`, newDisease, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new disease to the list (we need to fetch diseases list)
      const diseasesRes = await axios.get(`${apiUrl}/diseases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Note: We don't have diseases state in Invoices.jsx, so we'll just close the modal
      
      setShowDiseaseCreateModal(false);
      setNewDisease({
        name: "",
        details: ""
      });
      
      // Show success message in modal
      setModalSuccessMessage(`Disease "${newDisease.name}" created successfully!`);
      setTimeout(() => setModalSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error creating disease:', error);
      setError(error.response?.data?.error || 'Failed to create disease');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new referral
  const handleAddReferral = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      const response = await axios.post(`${apiUrl}/referrals`, newReferral, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new referral to the list
      setReferrals(prevReferrals => [...prevReferrals, response.data]);
      
      // Set the new referral as selected
      setPatientForm(prev => ({ ...prev, referral_id: response.data.id }));
      
      setShowReferralModal(false);
      setNewReferral({
        doctor_name: "",
        specialization: "",
        phone: "",
        email: "",
        address: ""
      });
      
      // Show success message
      setModalSuccessMessage(`Referral "${response.data.doctor_name}" created successfully and selected!`);
      setTimeout(() => setModalSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error creating referral:', error);
      setError(error.response?.data?.error || 'Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (selectedOption) => {
    setInvoice(prev => ({
      ...prev,
      patient_id: selectedOption?.value || "",
      patient_name: selectedOption?.label.split(" (")[0] || ""
    }));
    // Find the selected patient and apply contract discount if exists
    const selectedPatient = patients.find(p => p.id === selectedOption?.value);
    if (selectedPatient && selectedPatient.contract_id) {
      const patientContract = contracts.find(c => c.id === selectedPatient.contract_id);
      if (patientContract && patientContract.discount_type === 'percentage' && patientContract.discount_amount > 0) {
        setDiscountPercentage(patientContract.discount_amount);
      }
    } else {
      setDiscountPercentage(0);
    }
  };

  const calculateTotals = (items, selectedPackages = [], customDiscountPercentage = null) => {
    let subtotal = 0;
    
    // Calculate tests total
    items.tests.forEach(testId => {
      const test = tests.find(t => t.id === parseInt(testId));
      if (test) {
        // Check if test is part of an offer
        const hasOffer = selectedPackages.some(pkg => 
          pkg.type === 'offer' && 
          pkg.item_type === 'test' && 
          pkg.item_id === test.id
        );
        if (!hasOffer) {
          subtotal += test.price;
        }
      }
    });

    // Calculate cultures total
    items.cultures.forEach(cultureId => {
      const culture = cultures.find(c => c.id === parseInt(cultureId));
      if (culture) {
        // Check if culture is part of an offer
        const hasOffer = selectedPackages.some(pkg => 
          pkg.type === 'offer' && 
          pkg.item_type === 'culture' && 
          pkg.item_id === culture.id
        );
        if (!hasOffer) {
          subtotal += culture.price;
        }
      }
    });

    // Add packages and offers
    items.packages.forEach(packageId => {
      const pkg = packages.find(p => p.id === parseInt(packageId));
      if (pkg) {
        subtotal += pkg.price;
      }
    });

    // Add test groups
    if (items.test_groups && Array.isArray(items.test_groups)) {
      items.test_groups.forEach(tgId => {
        const tg = testGroups.find(tg => tg.id === parseInt(tgId));
        if (tg) subtotal += Number(tg.price) || 0;
      });
    }

    // Calculate discount amount from percentage (use custom percentage if provided, otherwise use state)
    const currentDiscountPercentage = customDiscountPercentage !== null ? customDiscountPercentage : discountPercentage;
    const discountAmount = (subtotal * (currentDiscountPercentage / 100)) || 0;
    
    // Calculate total: subtotal + tax - discount
    const total = subtotal + (items.tax || 0) - discountAmount;
    
    // Use the paid amount from the invoice object
    const paidAmount = Number(items.paid || 0);
    const due = total - paidAmount;

    return { subtotal, discount: discountAmount, total, due, paid: paidAmount };
  };

  const handleDiscountChange = (discountPercentage) => {
    const numericDiscount = Number(discountPercentage) || 0;
    setDiscountPercentage(numericDiscount);
    setInvoice(prev => {
      // Pass the new discount percentage directly to avoid stale state
      const { subtotal, discount, total, due, paid } = calculateTotals(prev, [], numericDiscount);
      return {
        ...prev,
        subtotal,
        discount,
        total,
        due,
        paid
      };
    });
  };

  // Auto-update calculations whenever invoice data changes
  const updateInvoiceCalculations = (newInvoice) => {
    const { subtotal, discount, total, due, paid } = calculateTotals(newInvoice);
    return {
      ...newInvoice,
      subtotal,
      discount,
      total,
      due,
      paid
    };
  };

  // Auto-update paid amount from payment methods
  const updatePaidFromPayments = (newInvoice) => {
    const paymentTotal = calculatePaymentTotal(newInvoice.payments);
    const updatedInvoice = { ...newInvoice, paid: paymentTotal };
    return updateInvoiceCalculations(updatedInvoice);
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      setStatusDetectionError("");
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Validate form
      const validationErrors = validateForm(invoice);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        setShowFormErrorAlert(true);
        setTimeout(() => {
          if (modalBodyRef.current) {
            modalBodyRef.current.scrollTop = 0;
          }
        }, 100);
        return;
      }
      setShowFormErrorAlert(false);

      // Filter out invalid IDs before sending
      const filteredTests = (invoice.tests || []).filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
      const filteredCultures = (invoice.cultures || []).filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
      const filteredPackages = (invoice.packages || []).filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
      const filteredTestGroups = (invoice.test_groups || []).filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
      
      // Determine automatic status if not manually set
      let finalStatusId = invoice.status_id;
      if (!finalStatusId) {
        const { due } = calculateTotals(invoice);
        finalStatusId = determineAutomaticStatus(due, invoice.paid, invoice.total);
        if (!finalStatusId) {
          setStatusDetectionError("No valid status found for this invoice. Please ensure you have at least one status for 'pending', 'paid', and 'overpaid'. You can add/manage statuses using the 'Manage Statuses' button.");
          return;
        }
      }

      const invoiceData = {
        ...invoice,
        tests: filteredTests,
        cultures: filteredCultures,
        packages: filteredPackages,
        test_groups: filteredTestGroups,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
        paid: invoice.paid || 0,
        due: invoice.due,
        date: new Date().toISOString(),
        status_id: finalStatusId,
        branch_id: invoice.branch_id && !isNaN(Number(invoice.branch_id)) ? Number(invoice.branch_id) : undefined
      };

      // Only add receptionist_id if it's a valid number
      if (invoice.receptionist_id && !isNaN(Number(invoice.receptionist_id))) {
        invoiceData.receptionist_id = Number(invoice.receptionist_id);
      }

      const headers = { Authorization: `Bearer ${token}` };
      let response;

      if (editingInvoice) {
        response = await axios.put(
          `${apiUrl}/invoices/${editingInvoice.id}`,
          invoiceData,
          { headers }
        );
        setInvoices(prevInvoices =>
          prevInvoices.map(inv =>
            inv.id === editingInvoice.id ? response.data : inv
          )
        );
      } else {
        response = await axios.post(`${apiUrl}/invoices`, invoiceData, { headers });
        await fetchData();
        if (invoiceData.receptionist_id) {
          try {
            await axios.post(
              `${apiUrl}/receptionists/${invoiceData.receptionist_id}/increment-bills`,
              {},
              { headers }
            );
          } catch (error) {
            console.error("Error incrementing receptionist bills:", error);
          }
        }
      }

      setShowAddModal(false);
      resetForm();
      // Refresh patient data to show updated financial information
      await refreshPatientData();
      // Show success message as a toast
      const action = editingInvoice ? "updated" : "created";
      toast.success(`Invoice ${action} successfully! Patient financial information has been updated.`, { autoClose: 5000 });
    } catch (error) {
      console.error("Error saving invoice:", error);
      if (error.response?.data?.error && error.response.data.error.toLowerCase().includes('status')) {
        setStatusDetectionError("Invoice could not be saved due to a status error. Please ensure you have at least one status for 'pending', 'paid', and 'overpaid'. You can add/manage statuses using the 'Manage Statuses' button.");
      } else {
        setError(error.response?.data?.error || "Failed to save invoice");
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${apiUrl}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== id));
        setShowDeleteModal(false);
        // Refresh patient data to show updated financial information
        await refreshPatientData();
        // Show success message as a toast
        toast.success("Invoice deleted successfully! Patient financial information has been updated.", { autoClose: 5000 });
      } else {
        setError(response.data.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      setError(error.response?.data?.error || "Failed to delete invoice");
    }
  };

  // Status management functions
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Validate form
      if (!statusFormData.state.trim()) {
        setStatusFormErrors({ state: "Status name is required" });
        setShowStatusFormErrorAlert(true);
        return;
      }
      setStatusFormErrors({});
      setShowStatusFormErrorAlert(false);

      const headers = { Authorization: `Bearer ${token}` };
      let response;

      if (editingStatus) {
        response = await axios.put(
          `${apiUrl}/statuses/${editingStatus.id}`,
          statusFormData,
          { headers }
        );
      } else {
        response = await axios.post(`${apiUrl}/statuses`, statusFormData, { headers });
      }

      // Refresh statuses
      const statusesRes = await axios.get(`${apiUrl}/statuses`, { headers });
      setStatuses(statusesRes.data);

      setShowStatusModal(false);
      setEditingStatus(null);
      setStatusFormData({ state: "", details: "" });
      setStatusFormErrors({});
      setShowStatusFormErrorAlert(false);
    } catch (error) {
      console.error("Error saving status:", error);
      setError(error.response?.data?.error || "Failed to save status");
    }
  };

  const createDefaultStatuses = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const headers = { Authorization: `Bearer ${token}` };
      
      const defaultStatuses = [
        { state: "Pending", details: "Payment pending or partial payment received" },
        { state: "Paid", details: "Invoice fully paid" },
        { state: "Overpaid", details: "Payment exceeds invoice total, refund may be needed" }
      ];

      // Check which statuses already exist
      const existingStatuses = statuses.map(s => s.state.toLowerCase());
      const statusesToCreate = defaultStatuses.filter(status => 
        !existingStatuses.includes(status.state.toLowerCase())
      );

      if (statusesToCreate.length === 0) {
        setError("Default statuses already exist");
        return;
      }

      // Create missing statuses
      for (const status of statusesToCreate) {
        await axios.post(`${apiUrl}/statuses`, status, { headers });
      }

      // Refresh statuses
      const statusesRes = await axios.get(`${apiUrl}/statuses`, { headers });
      setStatuses(statusesRes.data);
      setError(null);
      
      // Show success message
      if (statusesToCreate.length > 0) {
        setError(null);
        // You could add a success toast here if you have one
        console.log(`Created ${statusesToCreate.length} default statuses successfully`);
      }
    } catch (error) {
      console.error("Error creating default statuses:", error);
      setError(error.response?.data?.error || "Failed to create default statuses");
    }
  };

  const handleStatusDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${apiUrl}/statuses/${statusToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Refresh statuses
        const statusesRes = await axios.get(`${apiUrl}/statuses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatuses(statusesRes.data);
        setShowStatusDeleteModal(false);
        setStatusToDelete(null);
        setStatusFormErrors({});
        setShowStatusFormErrorAlert(false);
      } else {
        setError(response.data.error || "Failed to delete status");
      }
    } catch (error) {
      console.error("Error deleting status:", error);
      setError(error.response?.data?.error || "Failed to delete status");
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.patient_id) errors.patient_id = "Patient is required";
    if (!data.receptionist_id) errors.receptionist_id = "Receptionist is required";
    if (
      (!data.tests || data.tests.length === 0) &&
      (!data.cultures || data.cultures.length === 0) &&
      (!data.packages || data.packages.length === 0) &&
      (!data.test_groups || data.test_groups.length === 0)
    ) {
      errors.items = "At least one test, culture, package, or test group is required";
    }
    if (!data.payments || data.payments.length === 0) errors.payments = "At least one payment method is required";
    return errors;
  };

  const resetForm = () => {
    setInvoice({
      patient_id: "",
      date: new Date(),
      tests: [],
      cultures: [],
      packages: [],
      payments: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paid: 0,
      due: 0,
      status_id: "",
      receptionist_id: "",
      test_groups: [],
      branch_id: ""
    });
    setFormErrors({});
    setEditingInvoice(null);
    setModalSuccessMessage("");
    setDiseaseSearchTerm("");
  };

  const filteredInvoices = invoices.filter(invoice => {
    const searchMatch = searchQuery
      ? invoice.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.patientcode?.toString().includes(searchQuery) ||
        invoice.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const dateMatch =
      (!filters.startDate || new Date(invoice.date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(invoice.date) <= new Date(filters.endDate));

    const statusMatch = !filters.status || invoice.status_id === parseInt(filters.status);
    const patientMatch = !filters.patient || invoice.patient_id === parseInt(filters.patient);

    return searchMatch && dateMatch && statusMatch && patientMatch;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const valueA = a[sortConfig.field] ?? "";
    const valueB = b[sortConfig.field] ?? "";

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortConfig.direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    } else if (typeof valueA === "boolean" && typeof valueB === "boolean") {
      return sortConfig.direction === "asc"
        ? valueA === valueB
          ? 0
          : valueA
          ? -1
          : 1
        : valueA === valueB
        ? 0
        : valueA
        ? 1
        : -1;
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedInvoices.length / itemsPerPage);
  const currentInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // State to track expanded cells for each row and column
  const [expandedCells, setExpandedCells] = useState({});

  // Function to toggle cell expansion
  const toggleCellExpansion = (rowId, columnType) => {
    const cellKey = `${rowId}-${columnType}`;
    setExpandedCells(prev => ({
      ...prev,
      [cellKey]: !prev[cellKey]
    }));
  };

  const formatCellData = (value, header, rowData) => {
    if (value === null || value === undefined) return '-';
    
    switch (header) {
      case 'date':
        return new Date(value).toLocaleString();
      case 'patient_name':
        return value;
      case 'tests':
        if (!Array.isArray(value) || value.length === 0) return <span className="text-muted">No tests</span>;
        
        const testsExpanded = expandedCells[`${rowData.id}-tests`];
        
        if (value.length <= 3 || testsExpanded) {
          return (
            <div className="d-flex flex-wrap">
              {value.length > 3 && (
                <div className="mt-2">
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={() => toggleCellExpansion(rowData.id, 'tests')}
                    style={{fontSize: '0.7em', padding: '2px 6px'}}
                  >
                    {testsExpanded ? '▲ Show Less' : '▼ Show All'}
                  </Button>
                </div>
              )}
              {value.map((test, index) => (
                <Badge key={index} bg="success" className="me-1 mb-1" style={{fontSize: '0.75em'}}>
                  {test.name} (EGP {test.price})
                </Badge>
              ))}
              
            </div>
          );
        }
        
        return (
          <div>
            <Badge bg="success" className="me-2" style={{fontSize: '0.8em'}}>
              🧪 {value.length} Tests
            </Badge>
            <Button 
              variant="outline-success" 
              size="sm" 
              onClick={() => toggleCellExpansion(rowData.id, 'tests')}
              style={{fontSize: '0.7em', padding: '2px 6px', marginLeft: '5px'}}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP {value.reduce((sum, test) => sum + parseFloat(test.price || 0), 0).toFixed(2)}
            </small>
          </div>
        );
        
      case 'cultures':
        if (!Array.isArray(value) || value.length === 0) return <span className="text-muted">No cultures</span>;
        
        const culturesExpanded = expandedCells[`${rowData.id}-cultures`];
        
        if (value.length <= 3 || culturesExpanded) {
          return (
            <div className="d-flex flex-wrap">
              {value.length > 3 && (
                <div className="mt-2">
                  <Button 
                    variant="outline-info" 
                    size="sm" 
                    onClick={() => toggleCellExpansion(rowData.id, 'cultures')}
                    style={{fontSize: '0.7em', padding: '2px 6px'}}
                  >
                    {culturesExpanded ? '▲ Show Less' : '▼ Show All'}
                  </Button>
                </div>
              )}
              {value.map((culture, index) => (
                <Badge key={index} bg="info" className="me-1 mb-1" style={{fontSize: '0.75em'}}>
                  {culture.name} (EGP {culture.price})
                </Badge>
              ))}
              
            </div>
          );
        }
        
        return (
          <div>
            <Badge bg="info" className="me-2" style={{fontSize: '0.8em'}}>
              🦠 {value.length} Cultures
            </Badge>
            <Button 
              variant="outline-info" 
              size="sm" 
              onClick={() => toggleCellExpansion(rowData.id, 'cultures')}
              style={{fontSize: '0.7em', padding: '2px 6px', marginLeft: '5px'}}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP {value.reduce((sum, culture) => sum + parseFloat(culture.price || 0), 0).toFixed(2)}
            </small>
          </div>
        );
        
      case 'packages':
        if (!Array.isArray(value) || value.length === 0) return <span className="text-muted">No packages</span>;
        
        const packagesExpanded = expandedCells[`${rowData.id}-packages`];
        
        if (value.length <= 3 || packagesExpanded) {
          return (
            <div>
              {value.map((pkg, index) => (
                <Badge key={index} bg="warning" text="dark" className="me-1 mb-1" style={{fontSize: '0.75em'}}>
                  {pkg.name} (EGP {pkg.price})
                </Badge>
              ))}
              {value.length > 3 && (
                <div className="mt-2">
                  <Button 
                    variant="outline-warning" 
                    size="sm" 
                    onClick={() => toggleCellExpansion(rowData.id, 'packages')}
                    style={{fontSize: '0.7em', padding: '2px 6px'}}
                  >
                    {packagesExpanded ? '▲ Show Less' : '▼ Show All'}
                  </Button>
                </div>
              )}
            </div>
          );
        }
        
        return (
          <div>
            <Badge bg="warning" text="dark" className="me-2" style={{fontSize: '0.8em'}}>
              📦 {value.length} Packages
            </Badge>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={() => toggleCellExpansion(rowData.id, 'packages')}
              style={{fontSize: '0.7em', padding: '2px 6px', marginLeft: '5px'}}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP {value.reduce((sum, pkg) => sum + parseFloat(pkg.price || 0), 0).toFixed(2)}
            </small>
          </div>
        );
        
      case 'test_groups':
        if (!Array.isArray(value) || value.length === 0) return <span className="text-muted">No test groups</span>;
        
        const testGroupsExpanded = expandedCells[`${rowData.id}-test_groups`];
        
        if (value.length <= 3 || testGroupsExpanded) {
          return (
            <div>
              {value.map((tg, index) => (
                <Badge key={index} bg="secondary" className="me-1 mb-1" style={{fontSize: '0.75em'}}>
                  {tg.name} (EGP {tg.price})
                </Badge>
              ))}
              {value.length > 3 && (
                <div className="mt-2">
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => toggleCellExpansion(rowData.id, 'test_groups')}
                    style={{fontSize: '0.7em', padding: '2px 6px'}}
                  >
                    {testGroupsExpanded ? '▲ Show Less' : '▼ Show All'}
                  </Button>
                </div>
              )}
            </div>
          );
        }
        
        return (
          <div>
            <Badge bg="secondary" className="me-2" style={{fontSize: '0.8em'}}>
              🔬 {value.length} Test Groups
            </Badge>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={() => toggleCellExpansion(rowData.id, 'test_groups')}
              style={{fontSize: '0.7em', padding: '2px 6px', marginLeft: '5px'}}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP {value.reduce((sum, tg) => sum + parseFloat(tg.price || 0), 0).toFixed(2)}
            </small>
          </div>
        );
      case 'payments':
        if (!Array.isArray(value) || value.length === 0) return '-';
        return (
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Method</th>
                <th style={{ border: '1px solid #ddd', padding: '4px', background: '#f5f5f5' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {value.map((payment, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>{payment.payment_method_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>EGP {payment.paid_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'subtotal':
      case 'total':
      case 'paid':
      case 'due':
      case 'discount':
      case 'tax':
        return `EGP ${Number(value || 0).toFixed(2)}`;
      default:
        return String(value);
    }
  };

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => {
          setEditingInvoice(rowData);
          // Extract IDs from the nested objects for editing
          const testIds = rowData.tests ? rowData.tests.map(t => String(t.id)) : [];
          const cultureIds = rowData.cultures ? rowData.cultures.map(c => String(c.id)) : [];
          const packageIds = rowData.packages ? rowData.packages.map(p => String(p.id)) : [];
          const testGroupIds = rowData.test_groups ? rowData.test_groups.map(tg => String(tg.id)) : [];
          const paymentMethods = rowData.payments ? rowData.payments.map(p => ({
            payment_method_id: String(p.payment_method_id),
            paid_amount: String(p.paid_amount)
          })) : [];
          
          // Calculate discount percentage from discount amount and subtotal
          const calculatedDiscountPercentage = rowData.subtotal > 0 ? 
            ((Number(rowData.discount) || 0) / Number(rowData.subtotal)) * 100 : 0;
          
          setDiscountPercentage(calculatedDiscountPercentage);
          setInvoice({
            ...rowData,
            tests: testIds,
            cultures: cultureIds,
            packages: packageIds,
            test_groups: testGroupIds,
            payments: paymentMethods,
            subtotal: Number(rowData.subtotal) || 0,
            discount: Number(rowData.discount) || 0,
            tax: Number(rowData.tax) || 0,
            total: Number(rowData.total) || 0,
            paid: Number(rowData.paid) || 0,
            due: Number(rowData.due) || 0,
            date: new Date(rowData.date),
            branch_id: rowData.branch_id || "",
            patient_id: rowData.patient_id,
            status_id: rowData.status_id,
            receptionist_id: rowData.receptionist_id
          });
          setModalSuccessMessage("");
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          setItemToDelete(rowData);
          setShowDeleteModal(true);
        }}
      >
        <Trash2 size={16} />
      </Button>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => {
          setSelectedInvoiceForPDF(rowData);
          setShowPDFPreview(true);
        }}
        title="Preview PDF"
      >
        <Eye size={16} />
      </Button>
      <InvoicePDF invoiceData={rowData}/>
    </div>
  );

  return (
    <Container fluid className="invoices-container">
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Invoices</h2>
            <div className="d-flex gap-2">
              {user?.role === 'admin' && (
                <Button
                  variant="outline-primary"
                  onClick={() => {
                    setEditingStatus(null);
                    setStatusFormData({ state: "", details: "" });
                    setStatusFormErrors({});
                    setShowStatusFormErrorAlert(false);
                    setShowStatusModal(true);
                  }}
                >
                  <Settings size={16} className="me-2" />
                  Manage Statuses
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setModalSuccessMessage("");
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} className="me-2" />
                New Invoice
              </Button>
            </div>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={[
              "date",
              "patient_name", 
              "subtotal",
              "total",
              "paid",
              "due",
              "discount",
              "tax"
            ]}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            filters={filters}
            setFilters={setFilters}
            patients={patients}
            statuses={statuses}
          />

          <DynamicTable
            data={currentInvoices}
            columns={[
              "date",
              "patient_name",
              "tests",
              "cultures",
              "packages",
              "test_groups",
              "discount",
              "tax",
              "subtotal",
              "total",
              "payments",
              "paid",
              "due",
              "status"
            ]}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
          />

          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={setCurrentPage}
          />

          {/* Add/Edit Invoice Modal */}
                      <Modal
              show={showAddModal}
              onHide={() => {
                setShowAddModal(false);
                resetForm();
                setError(null);
                setSuccessMessage("");
                setStatusDetectionError("");
                setModalSuccessMessage("");
              }}
              size="lg"
            >
            <Modal.Header closeButton>
              <Modal.Title>
                {editingInvoice ? "Edit" : "New"} Invoice
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {showFormErrorAlert && Object.keys(formErrors).length > 0 && (
                <Alert variant="danger" onClose={() => setShowFormErrorAlert(false)} dismissible>
                  <ul className="mb-0">
                    {Object.entries(formErrors).map(([field, msg]) => (
                      <li key={field}>{msg}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {statusDetectionError && (
                <Alert variant="danger" onClose={() => setStatusDetectionError("")} dismissible>
                  {statusDetectionError}
                </Alert>
              )}
              {modalSuccessMessage && (
                <Alert variant="success" onClose={() => setModalSuccessMessage("")} dismissible>
                  {modalSuccessMessage}
                </Alert>
              )}
              <Alert variant="info" className="mb-3">
                <strong>Note:</strong> When you save this invoice, the patient's total, paid, and due amounts will be automatically updated in their profile.
              </Alert>
              <Form onSubmit={handleAddInvoice}>
                {/* Patient Selection and Creation - Full Width Row */}
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Patient</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <Select
                            value={patientOptions.find(option => option.value === invoice.patient_id)}
                            onChange={handlePatientSelect}
                            options={patientOptions}
                            isClearable
                            isSearchable
                            placeholder="Search patient by name, code, national ID, or phone"
                            onInputChange={(inputValue) => setSearchTerm(inputValue)}
                            className="react-select-container"
                            classNamePrefix="select"
                          />
                        </div>
                        <Button variant="outline-primary" size="sm" onClick={() => setShowCreatePatient(v => !v)}>
                          <Plus size={16} /> {showCreatePatient ? 'Cancel' : 'Create Patient'}
                        </Button>
                      </div>
                      {showCreatePatient && (
                        <div className="border rounded p-3 mt-2 bg-light" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Name *</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.name}
                                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                                    isInvalid={!!patientFormErrors.name}
                                    placeholder="e.g., John Doe"
                                  />
                                  <Form.Control.Feedback type="invalid">
                                    {patientFormErrors.name}
                                  </Form.Control.Feedback>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Email (Optional)</Form.Label>
                                  <Form.Control
                                    type="email"
                                    value={patientForm.email}
                                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                                    placeholder="e.g., john.doe@example.com"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Gender</Form.Label>
                                  <Form.Select
                                    value={patientForm.gender}
                                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                                  >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Birth Date / Age (Optional)</Form.Label>
                                  <div className="mb-2">
                                    <Form.Check
                                      type="radio"
                                      name="birthDateMethod"
                                      id="use-date"
                                      label="Enter Birth Date"
                                      checked={!patientForm.use_age}
                                      onChange={() => setPatientForm({ ...patientForm, use_age: false, age: "" })}
                                      inline
                                    />
                                    <Form.Check
                                      type="radio"
                                      name="birthDateMethod"
                                      id="use-age"
                                      label="Enter Age"
                                      checked={patientForm.use_age}
                                      onChange={() => setPatientForm({ ...patientForm, use_age: true, birth_day: "", birth_month: "", birth_year: "" })}
                                      inline
                                    />
                                  </div>
                                  {!patientForm.use_age ? (
                                    <Row>
                                      <Col xs={4}>
                                        <Form.Control
                                          type="number"
                                          placeholder="Day"
                                          value={patientForm.birth_day}
                                          onChange={(e) => {
                                            const day = e.target.value;
                                            const newForm = { ...patientForm, birth_day: day };
                                            if (day && patientForm.birth_month && patientForm.birth_year) {
                                              newForm.birth_date = updateBirthDateFromComponents(day, patientForm.birth_month, patientForm.birth_year);
                                            }
                                            setPatientForm(newForm);
                                          }}
                                          min="1"
                                          max="31"
                                        />
                                      </Col>
                                      <Col xs={4}>
                                        <Form.Control
                                          type="number"
                                          placeholder="Month"
                                          value={patientForm.birth_month}
                                          onChange={(e) => {
                                            const month = e.target.value;
                                            const newForm = { ...patientForm, birth_month: month };
                                            if (patientForm.birth_day && month && patientForm.birth_year) {
                                              newForm.birth_date = updateBirthDateFromComponents(patientForm.birth_day, month, patientForm.birth_year);
                                            }
                                            setPatientForm(newForm);
                                          }}
                                          min="1"
                                          max="12"
                                        />
                                      </Col>
                                      <Col xs={4}>
                                        <Form.Control
                                          type="number"
                                          placeholder="Year"
                                          value={patientForm.birth_year}
                                          onChange={(e) => {
                                            const year = e.target.value;
                                            const newForm = { ...patientForm, birth_year: year };
                                            if (patientForm.birth_day && patientForm.birth_month && year) {
                                              newForm.birth_date = updateBirthDateFromComponents(patientForm.birth_day, patientForm.birth_month, year);
                                            }
                                            setPatientForm(newForm);
                                          }}
                                          min="1900"
                                          max={new Date().getFullYear()}
                                        />
                                      </Col>
                                    </Row>
                                  ) : (
                                    <Form.Control
                                      type="number"
                                      placeholder="Enter age in years"
                                      value={patientForm.age}
                                      onChange={(e) => {
                                        const age = e.target.value;
                                        const newForm = { ...patientForm, age };
                                        if (age) {
                                          newForm.birth_date = calculateBirthDateFromAge(age);
                                        }
                                        setPatientForm(newForm);
                                      }}
                                      min="0"
                                      max="150"
                                    />
                                  )}
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>National ID (Optional)</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.national_id}
                                    onChange={(e) => setPatientForm({ ...patientForm, national_id: e.target.value })}
                                    placeholder="e.g., 1234567890123456789"
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Nationality (Optional)</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.nationality}
                                    onChange={(e) => setPatientForm({ ...patientForm, nationality: e.target.value })}
                                    placeholder="e.g., Egyptian"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Passport No (Optional)</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.passport_no}
                                    onChange={(e) => setPatientForm({ ...patientForm, passport_no: e.target.value })}
                                    placeholder="e.g., ABC123456"
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Address (Optional)</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.address}
                                    onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                                    placeholder="e.g., 123 Main St, Cairo"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Primary Phone *</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.primaryPhone}
                                    onChange={(e) => setPatientForm({ ...patientForm, primaryPhone: e.target.value })}
                                    isInvalid={!!patientFormErrors.primaryPhone}
                                    placeholder="e.g., +201234567890"
                                  />
                                  <Form.Control.Feedback type="invalid">
                                    {patientFormErrors.primaryPhone}
                                  </Form.Control.Feedback>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Secondary Phone (Optional)</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={patientForm.secondaryPhone}
                                    onChange={(e) => setPatientForm({ ...patientForm, secondaryPhone: e.target.value })}
                                    placeholder="e.g., +201234567891"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                                                         <Form.Group className="mb-3">
                               <Form.Label>Diseases (Optional)</Form.Label>
                               <div className="d-flex gap-2">
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
                               <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                                 {diseases
                                   .filter(disease => disease.name.toLowerCase().includes(diseaseSearchTerm.toLowerCase()))
                                   .map(disease => (
                                     <Form.Check
                                       key={disease.id}
                                       type="checkbox"
                                       label={disease.name}
                                       checked={patientForm.diseases.includes(disease.id)}
                                       onChange={(e) => {
                                         const selected = patientForm.diseases.includes(disease.id)
                                           ? patientForm.diseases.filter(id => id !== disease.id)
                                           : [...patientForm.diseases, disease.id];
                                         setPatientForm({ ...patientForm, diseases: selected });
                                       }}
                                     />
                                   ))}
                               </div>
                               <Form.Text className="text-muted">
                                 Select diseases from the list, or click the + button to create new diseases
                               </Form.Text>
                             </Form.Group>
                                                         <Form.Group className="mb-3">
                               <Form.Label>Contract (Optional)</Form.Label>
                               <Select
                                 value={patientForm.contract_id ? contracts.find(c => c.id === patientForm.contract_id) ? 
                                   { value: patientForm.contract_id, label: contracts.find(c => c.id === patientForm.contract_id).name || `${contracts.find(c => c.id === patientForm.contract_id).region} - ${contracts.find(c => c.id === patientForm.contract_id).governorate}` } : null : null}
                                 onChange={(selected) => setPatientForm({ ...patientForm, contract_id: selected ? selected.value : null })}
                                 options={[{ value: "", label: "No Contract" }].concat(
                                   contracts.map(contract => ({ value: contract.id, label: contract.name || `${contract.region} - ${contract.governorate}` }))
                                 )}
                                 isClearable
                                 isSearchable
                                 placeholder="Select a contract"
                               />
                             </Form.Group>
                             
                             {patientForm.contract_id && contracts.find(c => c.id === patientForm.contract_id) && (
                               <Alert variant="info" className="mt-2 p-2">
                                 Contract: <strong>{contracts.find(c => c.id === patientForm.contract_id).name || `${contracts.find(c => c.id === patientForm.contract_id).region} - ${contracts.find(c => c.id === patientForm.contract_id).governorate}`}</strong> | Discount: <strong>{contracts.find(c => c.id === patientForm.contract_id).discount_amount}%</strong>
                               </Alert>
                             )}
                            
                            {/* Referral Selection */}
                            <Form.Group className="mb-3">
                              <Form.Label>Referral (Optional)</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Select
                                  value={patientForm.referral_id || ""}
                                  onChange={(e) => setPatientForm({ ...patientForm, referral_id: e.target.value || null })}
                                >
                                  <option value="">Select Referral</option>
                                  {Array.isArray(referrals) && referrals.map(referral => (
                                    <option key={referral.id} value={referral.id}>
                                      {referral.doctor_name} - {referral.specialization}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => setShowReferralModal(true)}
                                  title="Add New Referral"
                                >
                                  <Plus size={16} />
                                </Button>
                              </div>
                              <Form.Text className="text-muted">
                                Select an existing referral or add a new one
                              </Form.Text>
                            </Form.Group>
                            
                            <Button 
                              type="button" 
                              variant="success" 
                              size="sm"
                              onClick={handleCreatePatient}
                            >
                              Save Patient
                            </Button>
                          </div>
                          {patientFormErrors.api && <Alert variant="danger" className="mt-2">{patientFormErrors.api}</Alert>}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                {/* Status and Receptionist Row */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={invoice.status_id}
                        onChange={(e) => {
                          setInvoice({ ...invoice, status_id: e.target.value });
                          if (formErrors.status_id) {
                            setFormErrors({ ...formErrors, status_id: null });
                          }
                        }}
                        isInvalid={!!formErrors.status_id}
                      >
                        <option value="">Auto-detect based on payment</option>
                        {statuses.map(status => (
                          <option key={status.id} value={status.id}>
                            {status.state}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted ">
                        Leave empty to automatically set: Pending (if due), Done (if fully paid), or Overpaid (if negative due)
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.status_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Receptionist <span style={{color: 'red'}}>*</span></Form.Label>
                      <Form.Select
                        value={invoice.receptionist_id || ''}
                        required
                        onChange={(e) => {
                          // Store as number or undefined
                          const val = e.target.value;
                          setInvoice({ ...invoice, receptionist_id: val && !isNaN(Number(val)) ? Number(val) : undefined });
                          if (formErrors.receptionist_id) {
                            setFormErrors({ ...formErrors, receptionist_id: null });
                          }
                        }}
                        isInvalid={!!formErrors.receptionist_id}
                      >
                        <option value="">Select Receptionist</option>
                        {receptionists.map(receptionist => (
                          <option key={receptionist.id} value={receptionist.id}>
                            {receptionist.name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.receptionist_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Branch and Date Selection */}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Branch (Optional)</Form.Label>
                      <Form.Select
                        value={invoice.branch_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvoice({ ...invoice, branch_id: val && !isNaN(Number(val)) ? Number(val) : "" });
                          if (formErrors.branch_id) {
                            setFormErrors({ ...formErrors, branch_id: null });
                          }
                        }}
                        isInvalid={!!formErrors.branch_id}
                      >
                        <option value="">Select Branch (Optional)</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Leave empty to use patient's branch or lab's main branch
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.branch_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <DatePicker
                        className="form-control"
                        selected={invoice.date}
                        onChange={(date) => setInvoice({ ...invoice, date })}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Tests, Cultures, Packages, and Test Groups Selection */}

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tests</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search tests..."
                        value={testSearchTerm}
                        onChange={e => setTestSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                        {tests
                          .filter(test => test.name.toLowerCase().includes(testSearchTerm.toLowerCase()))
                          .map(test => (
                            <Form.Check
                              key={test.id}
                              type="checkbox"
                              label={`${test.name} (EGP ${test.price})`}
                              checked={invoice.tests.includes(String(test.id))}
                              onChange={e => {
                                const selected = invoice.tests.includes(String(test.id))
                                  ? invoice.tests.filter(id => id !== String(test.id))
                                  : [...invoice.tests, String(test.id)];
                                setInvoice(prev => {
                                  const filtered = selected.filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
                                  const newInvoice = { ...prev, tests: filtered };
                                  return updateInvoiceCalculations(newInvoice);
                                });
                              }}
                            />
                          ))}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cultures</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search cultures..."
                        value={cultureSearchTerm}
                        onChange={e => setCultureSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                        {cultures
                          .filter(culture => culture.name.toLowerCase().includes(cultureSearchTerm.toLowerCase()))
                          .map(culture => (
                            <Form.Check
                              key={culture.id}
                              type="checkbox"
                              label={`${culture.name} (EGP ${culture.price})`}
                              checked={invoice.cultures.includes(String(culture.id))}
                              onChange={e => {
                                const selected = invoice.cultures.includes(String(culture.id))
                                  ? invoice.cultures.filter(id => id !== String(culture.id))
                                  : [...invoice.cultures, String(culture.id)];
                                setInvoice(prev => {
                                  const filtered = selected.filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
                                  const newInvoice = { ...prev, cultures: filtered };
                                  return updateInvoiceCalculations(newInvoice);
                                });
                              }}
                            />
                          ))}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Packages & Offers</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search packages & offers..."
                        value={packageSearchTerm}
                        onChange={e => setPackageSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                        {packages
                          .filter(pkg => pkg.name.toLowerCase().includes(packageSearchTerm.toLowerCase()))
                          .map(pkg => (
                            <Form.Check
                              key={pkg.id}
                              type="checkbox"
                              label={`${pkg.name} - ${pkg.type} (EGP ${pkg.price})`}
                              checked={invoice.packages.includes(String(pkg.id))}
                              onChange={e => {
                                const selected = invoice.packages.includes(String(pkg.id))
                                  ? invoice.packages.filter(id => id !== String(pkg.id))
                                  : [...invoice.packages, String(pkg.id)];
                                setInvoice(prev => {
                                  const filtered = selected.filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
                                  const newInvoice = { ...prev, packages: filtered };
                                  return updateInvoiceCalculations(newInvoice);
                                });
                              }}
                            />
                          ))}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Test Groups</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search test groups..."
                        value={testGroupSearchTerm}
                        onChange={e => setTestGroupSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                        {testGroups
                          .filter(tg => tg.name.toLowerCase().includes(testGroupSearchTerm.toLowerCase()))
                          .map(tg => (
                            <Form.Check
                              key={tg.id}
                              type="checkbox"
                              label={`${tg.name} (EGP ${tg.price})`}
                              checked={invoice.test_groups.includes(String(tg.id))}
                              onChange={e => {
                                const selected = invoice.test_groups.includes(String(tg.id))
                                  ? invoice.test_groups.filter(id => id !== String(tg.id))
                                  : [...invoice.test_groups, String(tg.id)];
                                // Filter out any accidental NaN/empty/null values
                                setInvoice(prev => {
                                  const filtered = selected.filter(id => !isNaN(Number(id)) && id !== '' && id !== null);
                                  const newInvoice = { ...prev, test_groups: filtered };
                                  return updateInvoiceCalculations(newInvoice);
                                });
                              }}
                            />
                          ))}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Selected Items Summary - Restructured with two rows for better visual layout */}
                {(invoice.tests.length > 0 || invoice.cultures.length > 0 || invoice.packages.length > 0 || invoice.test_groups.length > 0) && (
                  <Row className="mb-4">
                    <Col md={12}>
                      <div className="border rounded p-3 bg-light">
                        <h6 className="mb-3 text-primary">📋 Selected Items Summary</h6>
                        
                        {/* First Row: Tests and Cultures */}
                        <Row className="mb-3">
                          {invoice.tests.length > 0 && (
                            <Col md={6}>
                              <div className="mb-3">
                                <strong className="text-success">🧪 Tests ({invoice.tests.length})</strong>
                                <div className="mt-2">
                                  {invoice.tests.map(testId => {
                                    const test = tests.find(t => t.id === parseInt(testId));
                                    return test ? (
                                      <Badge key={testId} bg="success" className="me-1 mb-1 d-inline-flex align-items-center">
                                        {test.name} (EGP {test.price})
                                        <button 
                                          type="button" 
                                          className="btn-close btn-close-white ms-2" 
                                          style={{fontSize: '0.6em'}}
                                          onClick={() => {
                                            const filtered = invoice.tests.filter(id => id !== String(test.id));
                                            setInvoice(prev => {
                                              const newInvoice = { ...prev, tests: filtered };
                                              return updateInvoiceCalculations(newInvoice);
                                            });
                                          }}
                                        ></button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </Col>
                          )}
                          {invoice.cultures.length > 0 && (
                            <Col md={6}>
                              <div className="mb-3">
                                <strong className="text-info">🦠 Cultures ({invoice.cultures.length})</strong>
                                <div className="mt-2">
                                  {invoice.cultures.map(cultureId => {
                                    const culture = cultures.find(c => c.id === parseInt(cultureId));
                                    return culture ? (
                                      <Badge key={cultureId} bg="info" className="me-1 mb-1 d-inline-flex align-items-center">
                                        {culture.name} (EGP {culture.price})
                                        <button 
                                          type="button" 
                                          className="btn-close btn-close-white ms-2" 
                                          style={{fontSize: '0.6em'}}
                                          onClick={() => {
                                            const filtered = invoice.cultures.filter(id => id !== String(culture.id));
                                            setInvoice(prev => {
                                              const newInvoice = { ...prev, cultures: filtered };
                                              return updateInvoiceCalculations(newInvoice);
                                            });
                                          }}
                                        ></button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                        
                        {/* Second Row: Packages and Test Groups */}
                        <Row>
                          {invoice.packages.length > 0 && (
                            <Col md={6}>
                              <div className="mb-3">
                                <strong className="text-warning">📦 Packages ({invoice.packages.length})</strong>
                                <div className="mt-2">
                                  {invoice.packages.map(packageId => {
                                    const pkg = packages.find(p => p.id === parseInt(packageId));
                                    return pkg ? (
                                      <Badge key={packageId} bg="warning" text="dark" className="me-1 mb-1 d-inline-flex align-items-center">
                                        {pkg.name} (EGP {pkg.price})
                                        <button 
                                          type="button" 
                                          className="btn-close ms-2" 
                                          style={{fontSize: '0.6em'}}
                                          onClick={() => {
                                            const filtered = invoice.packages.filter(id => id !== String(pkg.id));
                                            setInvoice(prev => {
                                              const newInvoice = { ...prev, packages: filtered };
                                              return updateInvoiceCalculations(newInvoice);
                                            });
                                          }}
                                        ></button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </Col>
                          )}
                          {invoice.test_groups.length > 0 && (
                            <Col md={6}>
                              <div className="mb-3">
                                <strong className="text-secondary">🔬 Test Groups ({invoice.test_groups.length})</strong>
                                <div className="mt-2">
                                  {invoice.test_groups.map(tgId => {
                                    const tg = testGroups.find(t => t.id === parseInt(tgId));
                                    return tg ? (
                                      <Badge key={tgId} bg="secondary" className="me-1 mb-1 d-inline-flex align-items-center">
                                        {tg.name} (EGP {tg.price})
                                        <button 
                                          type="button" 
                                          className="btn-close btn-close-white ms-2" 
                                          style={{fontSize: '0.6em'}}
                                          onClick={() => {
                                            const filtered = invoice.test_groups.filter(id => id !== String(tg.id));
                                            setInvoice(prev => {
                                              const newInvoice = { ...prev, test_groups: filtered };
                                              return updateInvoiceCalculations(newInvoice);
                                            });
                                          }}
                                        ></button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </div>
                    </Col>
                  </Row>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Discount (%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discountPercentage}
                        onChange={(e) => {
                          handleDiscountChange(e.target.value);
                        }}
                      />
                      {discountPercentage > 0 && (
                        <Form.Text className="text-muted">
                          Discount Amount: EGP {invoice.discount?.toFixed(2) || "0.00"}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tax</Form.Label>
                      <Form.Control
                        type="number"
                        value={invoice.tax || ""}
                        onChange={(e) => {
                          const tax = Number(e.target.value) || 0;
                          setInvoice(prev => {
                            const newInvoice = { ...prev, tax };
                            return updateInvoiceCalculations(newInvoice);
                          });
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <div className="border rounded p-3 bg-light">
                      <h6 className="mb-3">Invoice Summary</h6>
                      <Row>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label>Subtotal</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.subtotal?.toFixed(2) || "0.00"}`}
                              disabled
                            />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label>Tax</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.tax?.toFixed(2) || "0.00"}`}
                              disabled
                            />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label>Discount ({discountPercentage}%)</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.discount?.toFixed(2) || "0.00"}`}
                              disabled
                            />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label>Total</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.total?.toFixed(2) || "0.00"}`}
                              disabled
                              className="fw-bold"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Paid</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.paid?.toFixed(2) || "0.00"}`}
                              disabled
                              className="fw-bold text-success"
                            />
                            {invoice.payments.length === 0 && (
                              <Form.Text className="text-muted">
                                Add payment methods below to automatically calculate paid amount
                              </Form.Text>
                            )}
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Due</Form.Label>
                            <Form.Control
                              type="text"
                              value={`EGP ${invoice.due?.toFixed(2) || "0.00"}`}
                              disabled
                              className={invoice.due > 0 ? "text-danger fw-bold" : "text-success fw-bold"}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>

                {/* Payment Methods Section - Final Step */}
                <Row className="mt-4">
                  <Col md={12}>
                    <div className="border rounded p-3 bg-light">
                      <h6 className="mb-3 text-primary">💳 Payment Methods - Final Step</h6>
                      <p className="text-muted mb-3">Now that you know the total amount (EGP {invoice.total?.toFixed(2) || "0.00"}), choose how the payment will be made:</p>
                      
                      {invoice.payments.map((payment, index) => (
                        <div key={index} className="d-flex gap-2 mb-2">
                          <Form.Select
                            value={payment.payment_method_id}
                            onChange={(e) => {
                              const newPayments = [...invoice.payments];
                              newPayments[index].payment_method_id = e.target.value;
                              const newInvoice = { ...invoice, payments: newPayments };
                              setInvoice(updatePaidFromPayments(newInvoice));
                            }}
                            style={{ minWidth: '200px' }}
                          >
                            <option value="">Select Payment Method</option>
                            {paymentMethods.map(method => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control
                            type="number"
                            placeholder="Amount to pay"
                            value={payment.paid_amount}
                            onChange={(e) => {
                              const newPayments = [...invoice.payments];
                              newPayments[index].paid_amount = e.target.value;
                              const newInvoice = { ...invoice, payments: newPayments };
                              setInvoice(updatePaidFromPayments(newInvoice));
                            }}
                            style={{ minWidth: '150px' }}
                          />
                          <Button
                            variant="outline-danger"
                            onClick={() => {
                              const newPayments = invoice.payments.filter((_, i) => i !== index);
                              const newInvoice = { ...invoice, payments: newPayments };
                              setInvoice(updatePaidFromPayments(newInvoice));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      
                      <div className="d-flex gap-2 align-items-center mt-3">
                        <Button
                          variant="outline-primary"
                          onClick={() => {
                            const newInvoice = {
                              ...invoice,
                              payments: [
                                ...invoice.payments,
                                { payment_method_id: "", paid_amount: "" }
                              ]
                            };
                            setInvoice(updatePaidFromPayments(newInvoice));
                          }}
                        >
                          + Add Payment Method
                        </Button>
                        
                        {invoice.payments.length > 0 && (
                          <div className="ms-3">
                            <Badge bg="info" className="fs-6">
                              Total Paid: EGP {calculatePaymentTotal(invoice.payments).toFixed(2)}
                            </Badge>
                            {calculatePaymentTotal(invoice.payments) < (invoice.total || 0) && (
                              <Badge bg="warning" text="dark" className="ms-2 fs-6">
                                Remaining: EGP {((invoice.total || 0) - calculatePaymentTotal(invoice.payments)).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {invoice.payments.length === 0 && (
                        <Alert variant="info" className="mt-3 mb-0">
                          <i className="fas fa-info-circle me-2"></i>
                          You can add multiple payment methods if the customer pays using different methods (e.g., cash + card).
                        </Alert>
                      )}
                    </div>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddInvoice}
                disabled={loading}
              >
                {loading ? "Saving..." : (editingInvoice ? "Update" : "Create")} Invoice
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
              Are you sure you want to delete this invoice?
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
                onClick={() => handleDelete(itemToDelete?.id)}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Manage Statuses Modal */}
          <Modal
            show={showStatusModal}
            onHide={() => {
              setShowStatusModal(false);
              setEditingStatus(null);
              setStatusFormData({ state: "", details: "" });
              setStatusFormErrors({});
              setShowStatusFormErrorAlert(false);
            }}
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>Manage Invoice Statuses</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {showStatusFormErrorAlert && Object.keys(statusFormErrors).length > 0 && (
                <Alert variant="danger" onClose={() => setShowStatusFormErrorAlert(false)} dismissible>
                  <ul className="mb-0">
                    {Object.entries(statusFormErrors).map(([field, msg]) => (
                      <li key={field}>{msg}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              <div className="mb-3 d-flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingStatus(null);
                    setStatusFormData({ state: "", details: "" });
                    setStatusFormErrors({});
                    setShowStatusFormErrorAlert(false);
                  }}
                >
                  <Plus size={16} className="me-2" />
                  Add New Status
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={createDefaultStatuses}
                >
                  <Settings size={16} className="me-2" />
                  Create Default Statuses
                </Button>
              </div>

              {/* Status Form */}
              {(editingStatus || (!editingStatus && statusFormData.state)) && (
                <div className="border rounded p-3 mb-3">
                  <h6>{editingStatus ? "Edit Status" : "New Status"}</h6>
                  <Form onSubmit={handleStatusSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Status Name *</Form.Label>
                          <Form.Control
                            type="text"
                            value={statusFormData.state}
                            onChange={(e) => setStatusFormData({ ...statusFormData, state: e.target.value })}
                            isInvalid={!!statusFormErrors.state}
                            placeholder="e.g., Pending, Paid, Overpaid"
                          />
                          <Form.Control.Feedback type="invalid">
                            {statusFormErrors.state}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Details (Optional)</Form.Label>
                          <Form.Control
                            type="text"
                            value={statusFormData.details}
                            onChange={(e) => setStatusFormData({ ...statusFormData, details: e.target.value })}
                            placeholder="e.g., Payment pending, Fully paid, Refund needed"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleStatusSubmit}
                        disabled={loading}
                      >
                        {loading ? "Saving..." : (editingStatus ? "Update" : "Create")} Status
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingStatus(null);
                          setStatusFormData({ state: "", details: "" });
                          setStatusFormErrors({});
                          setShowStatusFormErrorAlert(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Form>
                </div>
              )}

              {/* Statuses Table */}
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status Name</th>
                      <th>Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map(status => (
                      <tr key={status.id}>
                        <td>{status.id}</td>
                        <td>{status.state}</td>
                        <td>{status.details || '-'}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                                                             onClick={() => {
                                 setEditingStatus(status);
                                 setStatusFormData({
                                   state: status.state,
                                   details: status.details || ""
                                 });
                                 setStatusFormErrors({});
                                 setShowStatusFormErrorAlert(false);
                               }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setStatusToDelete(status);
                                setShowStatusDeleteModal(true);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Alert variant="info">
                  <strong>Automatic Status Detection:</strong><br />
                  • <strong>Pending:</strong> When invoice has outstanding balance<br />
                  • <strong>Done/Paid:</strong> When invoice is fully paid (due = 0)<br />
                  • <strong>Overpaid:</strong> When payment exceeds total (negative due)
                </Alert>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusModal(false);
                  setEditingStatus(null);
                  setStatusFormData({ state: "", details: "" });
                  setStatusFormErrors({});
                  setShowStatusFormErrorAlert(false);
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Delete Status Confirmation Modal */}
          <Modal
            show={showStatusDeleteModal}
            onHide={() => setShowStatusDeleteModal(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Are you sure you want to delete this status?
              This action cannot be undone.
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowStatusDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleStatusDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Add Disease Modal */}
          <Modal show={showDiseaseCreateModal} onHide={() => setShowDiseaseCreateModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Add New Disease</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
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
          <Modal
            show={showReferralModal}
            onHide={() => {
              setShowReferralModal(false);
              setNewReferral({ doctor_name: "", specialization: "", phone: "", email: "" });
            }}
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>Add New Referral</Modal.Title>
            </Modal.Header>
            <Modal.Body>
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter phone number"
                        value={newReferral.phone}
                        onChange={(e) => setNewReferral({ ...newReferral, phone: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email (Optional)</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={newReferral.email}
                        onChange={(e) => setNewReferral({ ...newReferral, email: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowReferralModal(false);
                  setNewReferral({ doctor_name: "", specialization: "", phone: "", email: "" });
                }}
              >
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

          {/* PDF Preview Modal */}
          <Modal
            show={showPDFPreview}
            onHide={() => {
              setShowPDFPreview(false);
              setSelectedInvoiceForPDF(null);
            }}
            size="xl"
          >
            <Modal.Header closeButton>
              <Modal.Title>Invoice PDF Preview</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedInvoiceForPDF && (
                <InvoicePDF invoiceData={selectedInvoiceForPDF} previewMode />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPDFPreview(false);
                  setSelectedInvoiceForPDF(null);
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default Invoices;
