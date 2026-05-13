import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Container,
  Button,
  Modal,
  Form,
  Alert,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import {
  Pencil,
  Trash2,
  Plus,
  Printer,
  Settings,
  Eye,
  CircleX,
  AlertTriangle,
  Wallet2,
  History,
  RotateCcw,
} from "lucide-react";
import SettlementModal from "../../components/settlement/SettlementModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import InvoicePDF from "../../components/pdf/InvoicePDF";
import Select from "react-select";
import "../../styles/select.css";
import { useToast } from "../../components/ui/ToastContext";
import { formatDateTime } from "../../utils/dateFormatter";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PhoneInput from "../../components/ui/PhoneInput";
import RefundModal from "../../components/invoices/RefundModal";
import InvoiceHistoryDrawer from "../../components/invoices/InvoiceHistoryDrawer";

const Invoices = () => {
  const { toast, confirm } = useToast();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [taxRateInput, setTaxRateInput] = useState("");
  const [taxAmountInput, setTaxAmountInput] = useState("");

  // Refund and History states
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoiceForRefund, setSelectedInvoiceForRefund] =
    useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedInvoiceIdForHistory, setSelectedInvoiceIdForHistory] =
    useState(null);

  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);

  const [packages, setPackages] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [doctors, setDoctors] = useState([]); // Doctors replacing referrals
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    status: "",
    patient: "",
  });

  const [invoice, setInvoice] = useState({
    patient_id: "",
    date: new Date(),
    tests: [],
    packages: [],
    payments: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    tax_rate: 0,
    total: 0,
    paid: 0,
    due: 0,
    status_id: "",
    receptionist_id: user?.id || "",
    branch_id: "",
    referred_doctor_id: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [showFormErrorAlert, setShowFormErrorAlert] = useState(false);
  const modalBodyRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState([]); // Kept for backward compatibility if used elsewhere, but we'll use a memoized version for the Select
  const [testSearchTerm, setTestSearchTerm] = useState("");

  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [diseaseSearchTerm, setDiseaseSearchTerm] = useState("");

  // Status management states
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusFormData, setStatusFormData] = useState({
    state: "",
    details: "",
  });
  const [statusFormErrors, setStatusFormErrors] = useState({});
  const [showStatusFormErrorAlert, setShowStatusFormErrorAlert] =
    useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);

  // Sync tax inputs with invoice state when it changes from other sources (like test selection)
  useEffect(() => {
    // Only update if the numeric value is different to avoid overwriting user typing (e.g. trailing zeros or dots)
    const currentRatePercent = (invoice.tax_rate || 0) * 100;
    if (Math.abs((Number(taxRateInput) || 0) - currentRatePercent) > 0.0001) {
      setTaxRateInput(
        invoice.tax_rate ? (invoice.tax_rate * 100).toString() : "",
      );
    }

    if (Math.abs((Number(taxAmountInput) || 0) - (invoice.tax || 0)) > 0.01) {
      setTaxAmountInput(invoice.tax ? invoice.tax.toString() : "");
    }

    if (Math.abs((Number(discountInput) || 0) - discountPercentage) > 0.0001) {
      setDiscountInput(discountPercentage ? discountPercentage.toString() : "");
    }
  }, [invoice.tax, invoice.tax_rate, discountPercentage]);

  const handleNumericKeyDown = (e) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const formatInputOnBlur = (value, inputSetter) => {
    if (value === "" || isNaN(parseFloat(value))) {
      inputSetter("");
      return;
    }
    inputSetter(parseFloat(value).toFixed(2));
  };
  const [showStatusDeleteModal, setShowStatusDeleteModal] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [statusDetectionError, setStatusDetectionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [modalSuccessMessage, setModalSuccessMessage] = useState("");

  // Limit warning modal support
  const [limitWarningModal, setLimitWarningModal] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementPatientId, setSettlementPatientId] = useState(null);
  const [settlementPatientName, setSettlementPatientName] = useState("");
  const [settlementPatientCode, setSettlementPatientCode] = useState("");
  const [giveChange, setGiveChange] = useState(false);

  // Helper function to determine automatic status based on payment conditions
  const determineAutomaticStatus = (due, paid, total) => {
    if (due < 0) {
      // Negative due means overpayment
      return statuses.find(
        (s) =>
          s.state.toLowerCase().includes("overpaid") ||
          s.state.toLowerCase().includes("refund"),
      )?.id;
    } else if (due === 0 || due <= 0.01) {
      // Fully paid
      return statuses.find(
        (s) =>
          s.state.toLowerCase().includes("paid") ||
          s.state.toLowerCase().includes("done") ||
          s.state.toLowerCase().includes("completed"),
      )?.id;
    } else {
      // Has outstanding balance
      return statuses.find(
        (s) =>
          s.state.toLowerCase().includes("pending") ||
          s.state.toLowerCase().includes("unpaid") ||
          s.state.toLowerCase().includes("due"),
      )?.id;
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
        packagesRes,
        paymentMethodsRes,
        statusesRes,
        receptionistsRes,
        contractsRes,
        diseasesRes,
        doctorsRes,
        branchesRes,
      ] = await Promise.all([
        axios.get(`${apiUrl}/invoices`, { headers }),
        axios.get(`${apiUrl}/patient`, { headers }),
        axios.get(`${apiUrl}/tests`, { headers }),
        axios.get(`${apiUrl}/packages-and-offers`, { headers }),
        axios.get(`${apiUrl}/payment-methods`, { headers }),
        axios.get(`${apiUrl}/statuses`, { headers }),
        user?.role === "admin"
          ? axios.get(`${apiUrl}/receptionists`, { headers })
          : Promise.resolve({ data: [] }),
        axios.get(`${apiUrl}/contracts`, { headers }),
        axios.get(`${apiUrl}/patient/diseases`, { headers }),
        axios.get(`${apiUrl}/doctor`, { headers }), // Fetch doctors
        axios.get(`${apiUrl}/branches`, { headers }),
      ]);

      setInvoices(invoicesRes.data || []);
      setPatients(patientsRes.data || []);
      setTests(testsRes.data || []);
      setPackages(packagesRes.data || []);
      setPaymentMethods(paymentMethodsRes.data || []);
      setStatuses(statusesRes.data || []);
      setReceptionists(receptionistsRes.data || []);
      setContracts(contractsRes.data || []);
      setDiseases(diseasesRes.data || []);
      setDoctors(doctorsRes.data || []); // Set doctors data
      setBranches(branchesRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Set empty arrays instead of error to prevent crashes
      setInvoices([]);
      setPatients([]);
      setTests([]);
      setPackages([]);
      setPaymentMethods([]);
      setStatuses([]);
      setReceptionists([]);
      setContracts([]);
      setDiseases([]);
      setDoctors([]); // Set empty doctors array on error
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

  const memoizedFilteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    const searchLower = searchTerm.toLowerCase();
    const searchDigits = searchTerm.replace(/\D/g, "");

    return patients.filter((patient) => {
      const phones = patient.phones || [];
      const phoneMatch = phones.some((p) => {
        const pNum = (p.phone_number || p.phone || "").toString();
        const pDigits = pNum.replace(/\D/g, "");
        return (
          pNum.includes(searchTerm) ||
          (searchDigits && pDigits.includes(searchDigits))
        );
      });

      return (
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.patientcode?.toString().includes(searchTerm) ||
        patient.national_id?.toString().includes(searchTerm) ||
        phoneMatch
      );
    });
  }, [searchTerm, patients]);

  // Sync state for any other parts of the component using filteredPatients
  useEffect(() => {
    setFilteredPatients(memoizedFilteredPatients);
  }, [memoizedFilteredPatients]);

  useEffect(() => {
    if (giveChange) {
      setGiveChange(false);
    }
  }, [invoice.total, invoice.paid, invoice.payments]);

  useEffect(() => {
    if (showFormErrorAlert) {
      setShowFormErrorAlert(false);
    }
  }, [invoice]);

  const patientOptions = useMemo(() => {
    return memoizedFilteredPatients.map((patient) => {
      const parts = [];
      if (patient.name) {
        parts.push(
          `${patient.name}${patient.patientcode ? ` (${patient.patientcode})` : ""}`,
        );
      }
      if (patient.national_id) parts.push(patient.national_id);

      const phones = patient.phones || [];
      phones.forEach((p) => {
        const pNum = p.phone_number || p.phone;
        if (pNum) parts.push(pNum);
      });

      return {
        value: patient.id,
        label: parts.join(" - "),
      };
    });
  }, [memoizedFilteredPatients]);

  // Helper function to calculate total from payment methods
  const calculatePaymentTotal = (payments) => {
    return payments.reduce(
      (sum, payment) => sum + Number(payment.paid_amount || 0),
      0,
    );
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
  });
  const [patientFormErrors, setPatientFormErrors] = useState({});
  const [showDiseaseCreateModal, setShowDiseaseCreateModal] = useState(false);
  const [newDisease, setNewDisease] = useState({
    name: "",
    description: "",
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
      const formattedDay = day.toString().padStart(2, "0");
      const formattedMonth = month.toString().padStart(2, "0");
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
      year: date.getFullYear().toString(),
    };
  };

  // Doctor modal states
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    specialization: "",
    phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
    email: "",
    commission: 0,
  });

  const handleCreatePatient = async () => {
    try {
      // Validate required fields - only name is required
      if (!patientForm.name) {
        setPatientFormErrors({ name: "Name is required" });
        return;
      }
      const token = localStorage.getItem("token");

      // Calculate birth_date based on input method
      let finalBirthDate = null;
      if (patientForm.use_age && patientForm.age) {
        finalBirthDate = calculateBirthDateFromAge(patientForm.age);
      } else if (
        patientForm.birth_day &&
        patientForm.birth_month &&
        patientForm.birth_year
      ) {
        finalBirthDate = updateBirthDateFromComponents(
          patientForm.birth_day,
          patientForm.birth_month,
          patientForm.birth_year,
        );
      } else if (patientForm.birth_date) {
        finalBirthDate = new Date(patientForm.birth_date)
          .toISOString()
          .split("T")[0];
      }

      const phoneNumbers = [];
      if (patientForm.primaryPhone) {
        phoneNumbers.push({
          phone: patientForm.primaryPhone,
          type: "personal",
          is_primary: true,
        });
      }
      if (patientForm.secondaryPhone) {
        phoneNumbers.push({
          phone: patientForm.secondaryPhone,
          type: "personal",
          is_primary: false,
        });
      }

      const cleanedPatient = {
        ...patientForm,
        birth_date: finalBirthDate,
        phoneNumbers,
        diseases: patientForm.diseases || [], // This should be an array of disease IDs
        contract_id: patientForm.contract_id || null,
      };

      const response = await axios.post(`${apiUrl}/patient`, cleanedPatient, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Add the new patient to the patients list
      const newPatient = response.data;
      setPatients((prev) => [...prev, newPatient]);

      // Set the new patient as selected in the invoice
      setInvoice((prev) => ({
        ...prev,
        patient_id: newPatient.id,
        patient_name: newPatient.name,
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
      });
      setDiseaseSearchTerm("");
      setPatientFormErrors({});

      // Show success message in modal
      setModalSuccessMessage(
        `Patient "${newPatient.name}" created successfully and selected for this invoice!`,
      );
      setTimeout(() => setModalSuccessMessage(""), 3000);

      // Apply contract discount if the patient has a contract
      if (newPatient.contract_id) {
        const patientContract = contracts.find(
          (c) => c.id === newPatient.contract_id,
        );
        if (
          patientContract &&
          patientContract.discount_type === "percentage" &&
          patientContract.discount_amount > 0
        ) {
          setDiscountPercentage(patientContract.discount_amount);
        }
      }
      // Always refresh patient data after creating a patient
      await refreshPatientData();
    } catch (error) {
      console.error("Error creating patient:", error);
      setPatientFormErrors({
        api: error.response?.data?.error || "Failed to create patient",
      });
    }
  };

  const handleAddDisease = async () => {
    try {
      if (!newDisease.name.trim()) {
        setError("Disease name is required");
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      const response = await axios.post(`${apiUrl}/diseases`, newDisease, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Add new disease to the list
      const diseasesRes = await axios.get(`${apiUrl}/patient/diseases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedDiseases = diseasesRes.data || [];
      console.log("Updated diseases list:", updatedDiseases);
      setDiseases(updatedDiseases);

      // Automatically select the new disease
      const newDiseaseId = response.data.id;
      if (!patientForm.diseases.includes(newDiseaseId)) {
        setPatientForm((prev) => ({
          ...prev,
          diseases: [...prev.diseases, newDiseaseId],
        }));
      }

      setShowDiseaseCreateModal(false);
      setDiseaseSearchTerm(""); // Clear search term to show the new disease
      setNewDisease({
        name: "",
        details: "",
      });

      // Show success message in modal
      setModalSuccessMessage(
        `Disease "${newDisease.name}" created successfully!`,
      );
      setTimeout(() => setModalSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creating disease:", error);
      toast.error(error.response?.data?.error || "Failed to create disease");
    } finally {
      setLoading(false);
    }
  };

  const updateAutoDiscount = (patientId, doctorId, currentInvoice) => {
    let patientDiscount = 0;
    let doctorDiscount = 0;

    const selectedPatient = patients.find((p) => p.id === patientId);
    if (selectedPatient && selectedPatient.contract_id) {
      const patientContract = contracts.find(
        (c) => c.id === selectedPatient.contract_id,
      );
      if (
        patientContract &&
        patientContract.discount_type === "percentage" &&
        patientContract.discount_amount > 0
      ) {
        patientDiscount = patientContract.discount_amount;
      }
    }

    const selectedDoctor = doctors.find((d) => d.id === doctorId);
    if (selectedDoctor && selectedDoctor.contract_id) {
      const doctorContract = contracts.find(
        (c) => c.id === selectedDoctor.contract_id,
      );
      if (
        doctorContract &&
        doctorContract.discount_type === "percentage" &&
        doctorContract.discount_amount > 0
      ) {
        doctorDiscount = doctorContract.discount_amount;
      }
    }

    // Higher discount applies
    const bestDiscount = Math.max(patientDiscount, doctorDiscount);
    setDiscountPercentage(bestDiscount);
    setInvoice((prev) => {
      const workingInvoice = currentInvoice || prev;
      const { subtotal, discount, total, due, paid } = calculateTotals(
        workingInvoice,
        [],
        bestDiscount,
      );
      return {
        ...workingInvoice,
        subtotal,
        discount,
        total,
        due,
        paid,
      };
    });
  };

  const handlePatientSelect = (selectedOption) => {
    const pId = selectedOption?.value || "";
    setSearchTerm("");
    setInvoice((prev) => {
      const updatedInvoice = {
        ...prev,
        patient_id: pId,
        patient_name: selectedOption?.label.split(" (")[0] || "",
      };

      // Update discount based on new patient and existing doctor
      updateAutoDiscount(
        pId,
        updatedInvoice.referred_doctor_id,
        updatedInvoice,
      );
      return updatedInvoice;
    });
  };
  const handleAddDoctor = async () => {
    try {
      const token = localStorage.getItem("token");
      const payload = { ...newDoctor, lab_id: user.lab_id };
      const res = await axios.post(`${apiUrl}/doctor`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors([...doctors, res.data]);
      handleDoctorSelect(res.data.id);
      setShowDoctorModal(false);
      setNewDoctor({
        name: "",
        specialization: "",
        phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
        email: "",
        commission: 0,
      });
    } catch (err) {
      console.error("Error creating doctor:", err);
      // Optional: Handle error display
    }
  };

  const handleDoctorSelect = (val) => {
    const dId = val && !isNaN(Number(val)) ? Number(val) : "";
    setInvoice((prev) => {
      const updatedInvoice = {
        ...prev,
        referred_doctor_id: dId,
      };
      if (formErrors.referred_doctor_id) {
        setFormErrors({ ...formErrors, referred_doctor_id: null });
      }

      // Update discount based on existing patient and new doctor
      updateAutoDiscount(updatedInvoice.patient_id, dId, updatedInvoice);
      return updatedInvoice;
    });
  };

  const calculateTotals = (
    items,
    selectedPackages = [],
    customDiscountPercentage = null,
  ) => {
    let subtotal = 0;

    // Calculate tests total
    items.tests.forEach((testId) => {
      const test = tests.find((t) => t.id === parseInt(testId));
      if (test) {
        // Check if test is part of an offer
        const hasOffer = selectedPackages.some(
          (pkg) =>
            pkg.type === "offer" &&
            pkg.item_type === "test" &&
            pkg.item_id === test.id,
        );
        if (!hasOffer) {
          subtotal += test.price;
        }
      }
    });

    // Add packages and offers
    items.packages.forEach((packageId) => {
      const pkg = packages.find((p) => p.id === parseInt(packageId));
      if (pkg) {
        subtotal += pkg.price;
      }
    });

    // Calculate discount amount from percentage (use custom percentage if provided, otherwise use state)
    const currentDiscountPercentage =
      customDiscountPercentage !== null
        ? customDiscountPercentage
        : discountPercentage;
    const discountAmount = subtotal * (currentDiscountPercentage / 100) || 0;

    // Calculate tax amount from percentage if tax_rate is present
    const taxAmount = items.tax_rate
      ? subtotal * items.tax_rate
      : items.tax || 0;

    // Calculate total: subtotal + tax - discount
    const total = subtotal + taxAmount - discountAmount;

    // Use the paid amount from the invoice object
    const paidAmount = Number(items.paid || 0);
    const due = total - paidAmount;

    return {
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      due,
      paid: paidAmount,
    };
  };

  const handleDiscountChange = (discountPercentage) => {
    const numericDiscount = Number(discountPercentage) || 0;
    setDiscountPercentage(numericDiscount);
    setInvoice((prev) => {
      // Pass the new discount percentage directly to avoid stale state
      const { subtotal, discount, total, due, paid } = calculateTotals(
        prev,
        [],
        numericDiscount,
      );
      return {
        ...prev,
        subtotal,
        discount,
        total,
        due,
        paid,
      };
    });
  };

  // Auto-update calculations whenever invoice data changes
  const updateInvoiceCalculations = (newInvoice) => {
    const { subtotal, discount, tax, total, due, paid } =
      calculateTotals(newInvoice);
    return {
      ...newInvoice,
      subtotal,
      discount,
      tax,
      total,
      due,
      paid,
    };
  };

  // Auto-update paid amount from payment methods
  const updatePaidFromPayments = (newInvoice) => {
    const paymentTotal = calculatePaymentTotal(newInvoice.payments);
    const updatedInvoice = { ...newInvoice, paid: paymentTotal };
    return updateInvoiceCalculations(updatedInvoice);
  };

  const handleAddInvoice = async (e, bypass = false) => {
    if (e && e.preventDefault) e.preventDefault();
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

      // Filter out invalid numbers
      const filteredTests = (invoice.tests || []).filter(
        (id) => !isNaN(Number(id)) && id !== "" && id !== null,
      );
      const filteredPackages = (invoice.packages || []).filter(
        (id) => !isNaN(Number(id)) && id !== "" && id !== null,
      );

      // Adjust payments if give change is active
      let finalPayments = invoice.payments || [];
      if (giveChange && invoice.due < 0) {
        const totalReduction = Math.abs(invoice.due);
        let remainingReduction = totalReduction;

        // Copy and adjust payments starting from the last one
        const adjustedPayments = JSON.parse(JSON.stringify(finalPayments));
        for (
          let i = adjustedPayments.length - 1;
          i >= 0 && remainingReduction > 0;
          i--
        ) {
          const currentAmount =
            parseFloat(adjustedPayments[i].paid_amount) || 0;
          const reduction = Math.min(currentAmount, remainingReduction);
          adjustedPayments[i].paid_amount = (currentAmount - reduction).toFixed(
            2,
          );
          remainingReduction -= reduction;
        }
        finalPayments = adjustedPayments;
      }

      // Determine automatic status
      let finalStatusId = invoice.status_id;
      if (!finalStatusId) {
        let { due, total } = calculateTotals(invoice);
        let paid = invoice.paid || 0;

        // If give change is active, adjust values for status detection
        if (giveChange && due < 0) {
          due = 0;
          paid = total;
        }

        finalStatusId = determineAutomaticStatus(due, paid, total);
        if (!finalStatusId) {
          setStatusDetectionError(
            "No valid status found for this invoice. Please ensure you have at least one status for 'pending', 'paid', and 'overpaid'. You can add/manage statuses using the 'Manage Statuses' button.",
          );
          return;
        }
      }

      const invoiceData = {
        ...invoice,
        tests: filteredTests,
        packages: filteredPackages,
        payments: finalPayments,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
        paid: giveChange && invoice.due < 0 ? invoice.total : invoice.paid || 0,
        due: giveChange && invoice.due < 0 ? 0 : invoice.due,
        give_change: giveChange,
        original_paid:
          giveChange && invoice.due < 0 ? invoice.paid || 0 : undefined,
        change_amount:
          giveChange && invoice.due < 0 ? Math.abs(invoice.due) : undefined,
        date: invoice.date
          ? new Date(invoice.date).toISOString()
          : new Date().toISOString(),
        status_id: finalStatusId,
        branch_id:
          invoice.branch_id && !isNaN(Number(invoice.branch_id))
            ? Number(invoice.branch_id)
            : undefined,
        bypass_due_limit: bypass,
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
          { headers },
        );
        await fetchData();
      } else {
        response = await axios.post(`${apiUrl}/invoices`, invoiceData, {
          headers,
        });
        await fetchData();
        if (invoiceData.receptionist_id) {
          try {
            await axios.post(
              `${apiUrl}/receptionists/${invoiceData.receptionist_id}/increment-bills`,
              {},
              { headers },
            );
          } catch (error) {
            console.error("Error incrementing receptionist bills:", error);
          }
        }
      }

      setShowAddModal(false);
      resetForm();
      await refreshPatientData();
      const action = editingInvoice ? "updated" : "created";
      toast.success(
        `Invoice ${action} successfully! Patient financial information has been updated.`,
        { duration: 5000 },
      );
    } catch (error) {
      console.error("Error saving invoice:", error);

      // Handle Patient Due Limit Logic
      if (
        error.response?.status === 403 &&
        error.response?.data?.requires_bypass
      ) {
        setLimitWarningData(error.response.data);
        setLimitWarningModal(true);
        return;
      }

      if (
        error.response?.data?.error &&
        error.response.data.error.toLowerCase().includes("status")
      ) {
        setStatusDetectionError(
          "Invoice could not be saved due to a status error. Please ensure you have at least one status for 'pending', 'paid', and 'overpaid'. You can add/manage statuses using the 'Manage Statuses' button.",
        );
      } else {
        toast.error(error.response?.data?.error || "Failed to save invoice");
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${apiUrl}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setInvoices((prevInvoices) =>
          prevInvoices.filter((inv) => inv.id !== id),
        );
        // Refresh patient data to show updated financial information
        await refreshPatientData();
        // Show success message as a toast
        toast.success(
          "Invoice deleted successfully! Patient financial information has been updated.",
          { duration: 5000 },
        );
      } else {
        toast.error(response.data.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(error.response?.data?.error || "Failed to delete invoice");
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
          { headers },
        );
      } else {
        response = await axios.post(`${apiUrl}/statuses`, statusFormData, {
          headers,
        });
      }

      // Refresh statuses
      const statusesRes = await axios.get(`${apiUrl}/statuses`, { headers });
      setStatuses(statusesRes.data);

      setShowStatusForm(false);
      setEditingStatus(null);
      setStatusFormData({ state: "", details: "" });
      setStatusFormErrors({});
      setShowStatusFormErrorAlert(false);
      toast.success(
        `Status ${editingStatus ? "updated" : "created"} successfully!`,
      );
    } catch (error) {
      console.error("Error saving status:", error);
      toast.error(error.response?.data?.error || "Failed to save status");
    }
  };

  const createDefaultStatuses = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const headers = { Authorization: `Bearer ${token}` };

      const defaultStatuses = [
        {
          state: "Pending",
          details: "Payment pending or partial payment received",
        },
        { state: "Paid", details: "Invoice fully paid" },
        {
          state: "Overpaid",
          details: "Payment exceeds invoice total, refund may be needed",
        },
      ];

      // Check which statuses already exist
      const existingStatuses = statuses.map((s) => s.state.toLowerCase());
      const statusesToCreate = defaultStatuses.filter(
        (status) => !existingStatuses.includes(status.state.toLowerCase()),
      );

      if (statusesToCreate.length === 0) {
        toast.info("Default statuses already exist");
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
        // Add a success toast
        toast.success(
          `Created ${statusesToCreate.length} default statuses successfully`,
        );
      }
    } catch (error) {
      console.error("Error creating default statuses:", error);
      toast.error(
        error.response?.data?.error || "Failed to create default statuses",
      );
    }
  };

  const handleStatusDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${apiUrl}/statuses/${statusToDelete.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        // Refresh statuses
        const statusesRes = await axios.get(`${apiUrl}/statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatuses(statusesRes.data);
        setShowStatusDeleteModal(false);
        setStatusToDelete(null);
        setStatusFormErrors({});
        setShowStatusFormErrorAlert(false);
        toast.success("Status deleted successfully!");
      } else {
        toast.error(response.data.error || "Failed to delete status");
      }
    } catch (error) {
      console.error("Error deleting status:", error);
      toast.error(error.response?.data?.error || "Failed to delete status");
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.patient_id) errors.patient_id = "Patient is required";
    if (!data.receptionist_id)
      errors.receptionist_id = "Receptionist is required";
    if (
      (!data.tests || data.tests.length === 0) &&
      (!data.packages || data.packages.length === 0)
    ) {
      errors.items = "At least one test or package is required";
    }
    if (!data.payments || data.payments.length === 0)
      errors.payments = "At least one payment method is required";
    return errors;
  };

  const resetForm = () => {
    setInvoice({
      patient_id: "",
      date: new Date(),
      tests: [],
      packages: [],
      payments: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paid: 0,
      due: 0,
      status_id: "",
      receptionist_id: user?.id || "",
      branch_id: "",
    });
    setFormErrors({});
    setEditingInvoice(null);
    setSearchTerm("");
    setModalSuccessMessage("");
    setDiseaseSearchTerm("");
    setGiveChange(false);
    setTaxRateInput("");
    setTaxAmountInput("");
    setDiscountInput("");
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchQuery?.toLowerCase();
    const searchDigits = searchQuery?.replace(/\D/g, "");

    const searchMatch = searchQuery
      ? invoice.patient_name?.toLowerCase().includes(searchLower) ||
        invoice.patientcode?.toString().includes(searchQuery) ||
        invoice.patient_phones?.some(
          (pNum) =>
            pNum?.includes(searchQuery) ||
            (searchDigits && pNum.replace(/\D/g, "").includes(searchDigits)),
        )
      : true;

    const dateMatch =
      (!filters.startDate ||
        new Date(invoice.date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(invoice.date) <= new Date(filters.endDate));

    const statusMatch =
      !filters.status || invoice.status_id === parseInt(filters.status);
    const patientMatch =
      !filters.patient || invoice.patient_id === parseInt(filters.patient);

    return searchMatch && dateMatch && statusMatch && patientMatch;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!sortConfig.field) return 0;

    let valueA = a[sortConfig.field];
    let valueB = b[sortConfig.field];

    // Handle null/undefined
    if (valueA === null || valueA === undefined) valueA = "";
    if (valueB === null || valueB === undefined) valueB = "";

    // Handle numeric fields specifically
    const numericFields = [
      "subtotal",
      "total",
      "paid",
      "due",
      "discount",
      "tax",
      "patientcode",
    ];
    if (numericFields.includes(sortConfig.field)) {
      const numA = parseFloat(valueA) || 0;
      const numB = parseFloat(valueB) || 0;
      return sortConfig.direction === "asc" ? numA - numB : numB - numA;
    }

    // Default string comparison (case-insensitive, numeric-aware)
    const strA = String(valueA).toLowerCase();
    const strB = String(valueB).toLowerCase();

    return sortConfig.direction === "asc"
      ? strA.localeCompare(strB, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      : strB.localeCompare(strA, undefined, {
          numeric: true,
          sensitivity: "base",
        });
  });

  const pageCount = Math.ceil(sortedInvoices.length / itemsPerPage);
  const currentInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // State to track expanded cells for each row and column
  const [expandedCells, setExpandedCells] = useState({});

  // Function to toggle cell expansion
  const toggleCellExpansion = (rowId, columnType) => {
    const cellKey = `${rowId}-${columnType}`;
    setExpandedCells((prev) => ({
      ...prev,
      [cellKey]: !prev[cellKey],
    }));
  };

  const formatCellData = (value, header, rowData) => {
    if (
      (value === null || value === undefined) &&
      !["amount_due", "credit"].includes(header)
    )
      return "-";

    switch (header) {
      case "id":
        return (
          <Button
            variant="link"
            className="p-0 text-decoration-none fw-bold"
            onClick={() => {
              toast.info("Full advanced audit feature is coming soon");
            }}
            title="View Audit Trail"
          >
            #{value}
          </Button>
        );
      case "date":
        return formatDateTime(value);
      case "patient_name":
        return value;
      case "tests":
        if (!Array.isArray(value) || value.length === 0)
          return <span className="text-muted">No tests</span>;

        const testsExpanded = expandedCells[`${rowData.id}-tests`];

        if (value.length <= 3 || testsExpanded) {
          return (
            <div className="d-flex flex-wrap">
              {value.length > 3 && (
                <div className="mt-2">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => toggleCellExpansion(rowData.id, "tests")}
                    style={{ fontSize: "0.7em", padding: "2px 6px" }}
                  >
                    {testsExpanded ? "▲ Show Less" : "▼ Show All"}
                  </Button>
                </div>
              )}
              {value.map((test, index) => (
                <Badge
                  key={index}
                  bg="success"
                  className="me-1 mb-1"
                  style={{ fontSize: "0.75em" }}
                >
                  {test.name} (EGP {test.price})
                </Badge>
              ))}
            </div>
          );
        }

        return (
          <div>
            <Badge bg="success" className="me-2" style={{ fontSize: "0.8em" }}>
              🧪 {value.length} Tests
            </Badge>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => toggleCellExpansion(rowData.id, "tests")}
              style={{
                fontSize: "0.7em",
                padding: "2px 6px",
                marginLeft: "5px",
              }}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP{" "}
              {value
                .reduce((sum, test) => sum + parseFloat(test.price || 0), 0)
                .toFixed(2)}
            </small>
          </div>
        );

      case "packages":
        if (!Array.isArray(value) || value.length === 0)
          return <span className="text-muted">No packages</span>;

        const packagesExpanded = expandedCells[`${rowData.id}-packages`];

        if (value.length <= 3 || packagesExpanded) {
          return (
            <div>
              {value.map((pkg, index) => (
                <Badge
                  key={index}
                  bg="warning"
                  text="dark"
                  className="me-1 mb-1"
                  style={{ fontSize: "0.75em" }}
                >
                  {pkg.name} (EGP {pkg.price})
                </Badge>
              ))}
              {value.length > 3 && (
                <div className="mt-2">
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => toggleCellExpansion(rowData.id, "packages")}
                    style={{ fontSize: "0.7em", padding: "2px 6px" }}
                  >
                    {packagesExpanded ? "▲ Show Less" : "▼ Show All"}
                  </Button>
                </div>
              )}
            </div>
          );
        }

        return (
          <div>
            <Badge
              bg="warning"
              text="dark"
              className="me-2"
              style={{ fontSize: "0.8em" }}
            >
              📦 {value.length} Packages
            </Badge>
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => toggleCellExpansion(rowData.id, "packages")}
              style={{
                fontSize: "0.7em",
                padding: "2px 6px",
                marginLeft: "5px",
              }}
            >
              ▼ Expand
            </Button>
            <br />
            <small className="text-muted">
              Total: EGP{" "}
              {value
                .reduce((sum, pkg) => sum + parseFloat(pkg.price || 0), 0)
                .toFixed(2)}
            </small>
          </div>
        );
      case "payments":
        if (!Array.isArray(value) || value.length === 0) return "-";
        return (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              border: "1px solid #ddd",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "4px",
                    background: "#f5f5f5",
                  }}
                >
                  Method
                </th>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "4px",
                    background: "#f5f5f5",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {value.map((payment, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                    {payment.payment_method_name}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                    EGP {payment.paid_amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "amount_due":
        const dueAmount = Number(rowData.due || 0);
        if (dueAmount > 0.01) {
          return (
            <span className="text-danger fw-bold">
              EGP {dueAmount.toFixed(2)}
            </span>
          );
        }
        return <span className="text-muted">-</span>;

      case "credit":
        const creditAmount = Number(rowData.due || 0);
        if (creditAmount < -0.01) {
          return (
            <span className="text-success fw-bold">
              EGP {Math.abs(creditAmount).toFixed(2)}
            </span>
          );
        }
        return <span className="text-muted">-</span>;

      case "age":
        const invoiceDate = new Date(rowData.date);
        const now = new Date();
        const diffInTime = now.getTime() - invoiceDate.getTime();
        const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
        return (
          <Badge bg={diffInDays === 0 ? "info" : "secondary"}>
            {diffInDays === 0 ? "Today" : `${diffInDays} days`}
          </Badge>
        );

      case "subtotal":
      case "total":
      case "paid":
      case "due":
      case "discount":
      case "tax":
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
          const testIds = rowData.tests
            ? rowData.tests.map((t) => String(t.id))
            : [];
          const packageIds = rowData.packages
            ? rowData.packages.map((p) => String(p.id))
            : [];
          const paymentMethods = rowData.payments
            ? rowData.payments.map((p) => ({
                payment_method_id: String(p.payment_method_id),
                paid_amount: String(p.paid_amount),
              }))
            : [];

          // Calculate discount percentage from discount amount and subtotal
          const calculatedDiscountPercentage =
            rowData.subtotal > 0
              ? ((Number(rowData.discount) || 0) / Number(rowData.subtotal)) *
                100
              : 0;

          setDiscountPercentage(calculatedDiscountPercentage);
          setDiscountInput(
            calculatedDiscountPercentage
              ? calculatedDiscountPercentage.toString()
              : "",
          );
          setTaxRateInput(
            rowData.tax_rate ? (rowData.tax_rate * 100).toString() : "",
          );
          setTaxAmountInput(rowData.tax ? rowData.tax.toString() : "");
          setInvoice({
            ...rowData,
            tests: testIds,
            packages: packageIds,
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
            receptionist_id: user?.id || "",
            referred_doctor_id: rowData.referred_doctor_id
              ? Number(rowData.referred_doctor_id)
              : "",
          });
          setModalSuccessMessage("");
          setGiveChange(false);
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          const rawDue = Number(rowData.due || 0);
          const balanceAmount = Math.abs(rawDue);
          if (balanceAmount > 0.01) {
            const balanceType = rawDue > 0 ? "due" : "credit";
            confirm.custom(
              {
                title: "High Financial Impact Warning",
                message: `Deleting this invoice will permanently erase the associated ${balanceType} of EGP ${balanceAmount.toFixed(2)}.`,
                type: "danger",
                confirmText: "Yes, Delete Permanently",
                requireMatch: "confirm delete",
              },
              () => handleDelete(rowData.id)
            );
          } else {
            confirm.delete(`Invoice #${rowData.id}`, () =>
              handleDelete(rowData.id),
            );
          }
        }}
      >
        <Trash2 size={16} />
      </Button>
      <Button
        variant="outline-info"
        size="sm"
        onClick={() => {
          setSelectedInvoiceIdForHistory(rowData.id);
          setShowHistoryDrawer(true);
        }}
        title="View Audit Trail"
      >
        <History size={16} />
      </Button>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => {
          setSelectedInvoiceForRefund(rowData);
          setShowRefundModal(true);
        }}
        disabled={rowData.status?.toLowerCase().includes("refunded")}
        title="Process Refund"
      >
        <RotateCcw size={16} />
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
      <Button
        variant="outline-warning"
        size="sm"
        onClick={() => {
          const patient = patients.find((p) => p.id === rowData.patient_id);
          setSettlementPatientId(rowData.patient_id);
          setSettlementPatientName(rowData.patient_name || "Unknown Patient");
          setSettlementPatientCode(patient?.patientcode || "");
          setShowSettlementModal(true);
        }}
        disabled={parseFloat(rowData.due || 0) <= 0}
        title="Reconcile Account"
      >
        <Wallet2 size={16} />
      </Button>
      <InvoicePDF invoiceData={rowData} />
    </div>
  );

  return (
    <>
      <Container fluid className="invoices-container">
        {loading ? (
          <LoadingSpinner message="Loading invoices..." />
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2>Invoices</h2>
              <div className="d-flex gap-2">
                {user?.role === "admin" && (
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
                "tax",
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
                "id",
                "date",
                "age",
                "patient_name",
                "tests",
                "packages",
                "discount",
                "tax",
                "subtotal",
                "total",
                "payments",
                "paid",
                "amount_due",
                "credit",
                "status",
              ]}
              customHeaders={{
                id: "Invoice ID",
                age: "Age",
                amount_due: "Due",
                patient_name: "Patient",
                status: "Status",
              }}
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
              <Modal.Header>
                <Modal.Title>
                  {editingInvoice ? "Edit" : "New"} Invoice
                </Modal.Title>
                <button
                  className="modal-close-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setError(null);
                    setSuccessMessage("");
                    setStatusDetectionError("");
                    setModalSuccessMessage("");
                  }}
                >
                  <CircleX size={24} />
                </button>
              </Modal.Header>
              <Modal.Body>
                {showFormErrorAlert && Object.keys(formErrors).length > 0 && (
                  <Alert
                    variant="danger"
                    onClose={() => setShowFormErrorAlert(false)}
                    dismissible
                  >
                    <ul className="mb-0">
                      {Object.entries(formErrors).map(([field, msg]) => (
                        <li key={field}>{msg}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {statusDetectionError && (
                  <Alert
                    variant="danger"
                    onClose={() => setStatusDetectionError("")}
                    dismissible
                  >
                    {statusDetectionError}
                  </Alert>
                )}
                {modalSuccessMessage && (
                  <Alert
                    variant="success"
                    onClose={() => setModalSuccessMessage("")}
                    dismissible
                  >
                    {modalSuccessMessage}
                  </Alert>
                )}
                <Alert variant="info" className="mb-3">
                  <strong>Note:</strong> When you save this invoice, the
                  patient's total, paid, and due amounts will be automatically
                  updated in their profile.
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
                              value={patientOptions.find(
                                (option) => option.value === invoice.patient_id,
                              )}
                              onChange={handlePatientSelect}
                              options={patientOptions}
                              isClearable
                              isSearchable
                              placeholder="Search patient by name, code, national ID, or phone"
                              onInputChange={(inputValue) =>
                                setSearchTerm(inputValue)
                              }
                              filterOption={() => true} // We are already filtering via filteredPatients
                              className="react-select-container"
                              classNamePrefix="select"
                            />
                          </div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => setShowCreatePatient((v) => !v)}
                          >
                            <Plus size={16} />{" "}
                            {showCreatePatient ? "Cancel" : "Create Patient"}
                          </Button>
                        </div>

                        {/* Patient Financial Summary */}
                        {invoice.patient_id &&
                          !showCreatePatient &&
                          (() => {
                            const selectedPatient = patients.find(
                              (p) => p.id === invoice.patient_id,
                            );
                            if (!selectedPatient) return null;

                            const pDue = parseFloat(selectedPatient.due || 0);
                            const hasDebt = pDue > 0.01;
                            const hasCredit = pDue < -0.01;

                            return (
                              <div className="mt-2 d-flex gap-2">
                                <div
                                  className="flex-fill p-2 rounded border d-flex align-items-center justify-content-between"
                                  style={{
                                    background: hasDebt
                                      ? "var(--toast-error-bg)"
                                      : "var(--bg-inset)",
                                    borderColor: hasDebt
                                      ? "var(--color-danger)"
                                      : "var(--border-default)",
                                    transition: "all 0.3s ease",
                                  }}
                                >
                                  <div className="d-flex align-items-center text-truncate">
                                    <AlertTriangle
                                      size={14}
                                      className={`me-2 ${hasDebt ? "text-danger" : "text-muted"}`}
                                    />
                                    <span className="small fw-semibold text-truncate">
                                      Patient Due
                                    </span>
                                  </div>
                                  <span
                                    className={`fw-bold small ms-2 ${hasDebt ? "text-danger" : ""}`}
                                  >
                                    EGP {Math.max(0, pDue).toFixed(2)}
                                  </span>
                                </div>
                                <div
                                  className="flex-fill p-2 rounded border d-flex align-items-center justify-content-between"
                                  style={{
                                    background: hasCredit
                                      ? "var(--toast-success-bg)"
                                      : "var(--bg-inset)",
                                    borderColor: hasCredit
                                      ? "var(--color-success)"
                                      : "var(--border-default)",
                                    transition: "all 0.3s ease",
                                  }}
                                >
                                  <div className="d-flex align-items-center text-truncate">
                                    <Wallet2
                                      size={14}
                                      className={`me-2 ${hasCredit ? "text-success" : "text-muted"}`}
                                    />
                                    <span className="small fw-semibold text-truncate">
                                      Patient Credit
                                    </span>
                                  </div>
                                  <span
                                    className={`fw-bold small ms-2 ${hasCredit ? "text-success" : ""}`}
                                  >
                                    EGP {Math.max(0, -pDue).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        {showCreatePatient && (
                          <div
                            className="border rounded p-3 mt-2 bg-theme-surface"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Name *</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={patientForm.name}
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          name: e.target.value,
                                        })
                                      }
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
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          email: e.target.value,
                                        })
                                      }
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
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          gender: e.target.value,
                                        })
                                      }
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
                                    <Form.Label>
                                      Birth Date / Age (Optional)
                                    </Form.Label>
                                    <div className="mb-2">
                                      <Form.Check
                                        type="radio"
                                        name="birthDateMethod"
                                        id="use-date"
                                        label="Enter Birth Date"
                                        checked={!patientForm.use_age}
                                        onChange={() =>
                                          setPatientForm({
                                            ...patientForm,
                                            use_age: false,
                                            age: "",
                                          })
                                        }
                                        inline
                                      />
                                      <Form.Check
                                        type="radio"
                                        name="birthDateMethod"
                                        id="use-age"
                                        label="Enter Age"
                                        checked={patientForm.use_age}
                                        onChange={() =>
                                          setPatientForm({
                                            ...patientForm,
                                            use_age: true,
                                            birth_day: "",
                                            birth_month: "",
                                            birth_year: "",
                                          })
                                        }
                                        inline
                                      />
                                    </div>
                                    {!patientForm.use_age ? (
                                      <Row>
                                        <Col xs={4}>
                                          <Form.Control
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Day"
                                            value={patientForm.birth_day}
                                            onChange={(e) => {
                                              const day = e.target.value;
                                              // Strictly allow only digits and validate range (1-31)
                                              if (
                                                day === "" ||
                                                (/^\d+$/.test(day) &&
                                                  Number(day) <= 31 &&
                                                  day.length <= 2)
                                              ) {
                                                const newForm = {
                                                  ...patientForm,
                                                  birth_day: day,
                                                };
                                                if (
                                                  day &&
                                                  patientForm.birth_month &&
                                                  patientForm.birth_year
                                                ) {
                                                  newForm.birth_date =
                                                    updateBirthDateFromComponents(
                                                      day,
                                                      patientForm.birth_month,
                                                      patientForm.birth_year,
                                                    );
                                                }
                                                setPatientForm(newForm);
                                              }
                                            }}
                                          />
                                        </Col>
                                        <Col xs={4}>
                                          <Form.Control
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Month"
                                            value={patientForm.birth_month}
                                            onChange={(e) => {
                                              const month = e.target.value;
                                              // Strictly allow only digits and validate range (1-12)
                                              if (
                                                month === "" ||
                                                (/^\d+$/.test(month) &&
                                                  Number(month) <= 12 &&
                                                  month.length <= 2)
                                              ) {
                                                const newForm = {
                                                  ...patientForm,
                                                  birth_month: month,
                                                };
                                                if (
                                                  patientForm.birth_day &&
                                                  month &&
                                                  patientForm.birth_year
                                                ) {
                                                  newForm.birth_date =
                                                    updateBirthDateFromComponents(
                                                      patientForm.birth_day,
                                                      month,
                                                      patientForm.birth_year,
                                                    );
                                                }
                                                setPatientForm(newForm);
                                              }
                                            }}
                                          />
                                        </Col>
                                        <Col xs={4}>
                                          <Form.Control
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Year"
                                            value={patientForm.birth_year}
                                            onChange={(e) => {
                                              const year = e.target.value;
                                              // Strictly allow only digits and max 4 digits
                                              if (
                                                year === "" ||
                                                (/^\d+$/.test(year) &&
                                                  year.length <= 4)
                                              ) {
                                                const newForm = {
                                                  ...patientForm,
                                                  birth_year: year,
                                                };
                                                if (
                                                  patientForm.birth_day &&
                                                  patientForm.birth_month &&
                                                  year
                                                ) {
                                                  newForm.birth_date =
                                                    updateBirthDateFromComponents(
                                                      patientForm.birth_day,
                                                      patientForm.birth_month,
                                                      year,
                                                    );
                                                }
                                                setPatientForm(newForm);
                                              }
                                            }}
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
                                          const newForm = {
                                            ...patientForm,
                                            age,
                                          };
                                          if (age) {
                                            newForm.birth_date =
                                              calculateBirthDateFromAge(age);
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
                                    <Form.Label>
                                      National ID (Optional)
                                    </Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={patientForm.national_id}
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          national_id: e.target.value,
                                        })
                                      }
                                      placeholder="e.g., 1234567890123456789"
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>
                                      Nationality (Optional)
                                    </Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={patientForm.nationality}
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          nationality: e.target.value,
                                        })
                                      }
                                      placeholder="e.g., Egyptian"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>
                                      Passport No (Optional)
                                    </Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={patientForm.passport_no}
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          passport_no: e.target.value,
                                        })
                                      }
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
                                      onChange={(e) =>
                                        setPatientForm({
                                          ...patientForm,
                                          address: e.target.value,
                                        })
                                      }
                                      placeholder="e.g., 123 Main St, Cairo"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Primary Phone *</Form.Label>
                                    <PhoneInput
                                      value={patientForm.primaryPhone}
                                      onChange={(val) =>
                                        setPatientForm({
                                          ...patientForm,
                                          primaryPhone: val,
                                        })
                                      }
                                      placeholder="e.g., +201234567890"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                      {patientFormErrors.primaryPhone}
                                    </Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>
                                      Secondary Phone (Optional)
                                    </Form.Label>
                                    <PhoneInput
                                      value={patientForm.secondaryPhone}
                                      onChange={(val) =>
                                        setPatientForm({
                                          ...patientForm,
                                          secondaryPhone: val,
                                        })
                                      }
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
                                    onChange={(e) =>
                                      setDiseaseSearchTerm(e.target.value)
                                    }
                                    className="flex-grow-1"
                                  />
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() =>
                                      setShowDiseaseCreateModal(true)
                                    }
                                    title="Add New Disease"
                                  >
                                    <Plus size={16} />
                                  </Button>
                                </div>
                                <div
                                  style={{
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    border: "1px solid var(--border-default)",
                                    borderRadius: 4,
                                    padding: 8,
                                  }}
                                >
                                  {diseases
                                    .filter((disease) =>
                                      disease.name
                                        .toLowerCase()
                                        .includes(
                                          diseaseSearchTerm.toLowerCase(),
                                        ),
                                    )
                                    .map((disease) => (
                                      <Form.Check
                                        key={disease.id}
                                        type="checkbox"
                                        label={disease.name}
                                        checked={patientForm.diseases.includes(
                                          disease.id,
                                        )}
                                        onChange={(e) => {
                                          const selected =
                                            patientForm.diseases.includes(
                                              disease.id,
                                            )
                                              ? patientForm.diseases.filter(
                                                  (id) => id !== disease.id,
                                                )
                                              : [
                                                  ...patientForm.diseases,
                                                  disease.id,
                                                ];
                                          setPatientForm({
                                            ...patientForm,
                                            diseases: selected,
                                          });
                                        }}
                                      />
                                    ))}
                                </div>
                                <Form.Text className="text-muted">
                                  Select diseases from the list, or click the +
                                  button to create new diseases
                                </Form.Text>
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Contract (Optional)</Form.Label>
                                <Select
                                  value={
                                    patientForm.contract_id
                                      ? contracts.find(
                                          (c) =>
                                            c.id === patientForm.contract_id,
                                        )
                                        ? {
                                            value: patientForm.contract_id,
                                            label:
                                              contracts.find(
                                                (c) =>
                                                  c.id ===
                                                  patientForm.contract_id,
                                              ).name ||
                                              `${contracts.find((c) => c.id === patientForm.contract_id).region} - ${contracts.find((c) => c.id === patientForm.contract_id).governorate}`,
                                          }
                                        : null
                                      : null
                                  }
                                  onChange={(selected) =>
                                    setPatientForm({
                                      ...patientForm,
                                      contract_id: selected
                                        ? selected.value
                                        : null,
                                    })
                                  }
                                  options={[
                                    { value: "", label: "No Contract" },
                                  ].concat(
                                    contracts.map((contract) => ({
                                      value: contract.id,
                                      label:
                                        contract.name ||
                                        `${contract.region} - ${contract.governorate}`,
                                    })),
                                  )}
                                  isClearable
                                  isSearchable
                                  placeholder="Select a contract"
                                />
                              </Form.Group>

                              {patientForm.contract_id &&
                                contracts.find(
                                  (c) => c.id === patientForm.contract_id,
                                ) && (
                                  <Alert variant="info" className="mt-2 p-2">
                                    Contract:{" "}
                                    <strong>
                                      {contracts.find(
                                        (c) => c.id === patientForm.contract_id,
                                      ).name ||
                                        `${contracts.find((c) => c.id === patientForm.contract_id).region} - ${contracts.find((c) => c.id === patientForm.contract_id).governorate}`}
                                    </strong>{" "}
                                    | Discount:{" "}
                                    <strong>
                                      {
                                        contracts.find(
                                          (c) =>
                                            c.id === patientForm.contract_id,
                                        ).discount_amount
                                      }
                                      %
                                    </strong>
                                  </Alert>
                                )}

                              <Button
                                type="button"
                                variant="success"
                                size="sm"
                                onClick={handleCreatePatient}
                              >
                                Save Patient
                              </Button>
                            </div>
                            {patientFormErrors.api && (
                              <Alert variant="danger" className="mt-2">
                                {patientFormErrors.api}
                              </Alert>
                            )}
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
                            setInvoice({
                              ...invoice,
                              status_id: e.target.value,
                            });
                            if (formErrors.status_id) {
                              setFormErrors({ ...formErrors, status_id: null });
                            }
                          }}
                          isInvalid={!!formErrors.status_id}
                        >
                          <option value="">Auto-detect based on payment</option>
                          {statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.state}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted ">
                          Leave empty to automatically set: Pending (if
                          outstanding balance), Paid (if fully paid), or
                          Overpaid (if positive credits)
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                          {formErrors.status_id}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Receptionist <span style={{ color: "red" }}>*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={
                            user?.role === "admin"
                              ? `${user?.name} (Admin)`
                              : user?.name || ""
                          }
                          readOnly
                          disabled
                          className="bg-light"
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.receptionist_id}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Referring Doctor Selection */}
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Referring Doctor (Optional)</Form.Label>
                        <div className="d-flex gap-2">
                          <Form.Select
                            value={invoice.referred_doctor_id || ""}
                            onChange={(e) => handleDoctorSelect(e.target.value)}
                            isInvalid={!!formErrors.referred_doctor_id}
                          >
                            <option value="">No Referring Doctor</option>
                            {doctors.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.name}{" "}
                                {doctor.specialization
                                  ? `- ${doctor.specialization}`
                                  : ""}
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            title="Add New Doctor"
                            onClick={() => setShowDoctorModal(true)}
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                        <Form.Control.Feedback type="invalid">
                          {formErrors.referred_doctor_id}
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
                          value={invoice.branch_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvoice({
                              ...invoice,
                              branch_id:
                                val && !isNaN(Number(val)) ? Number(val) : "",
                            });
                            if (formErrors.branch_id) {
                              setFormErrors({ ...formErrors, branch_id: null });
                            }
                          }}
                          isInvalid={!!formErrors.branch_id}
                        >
                          <option value="">Select Branch (Optional)</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Leave empty to use patient's branch or lab's main
                          branch
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
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Select date"
                          minDate={
                            new Date(
                              new Date().setFullYear(
                                new Date().getFullYear() - 5,
                              ),
                            )
                          }
                          maxDate={
                            new Date(
                              new Date().setFullYear(
                                new Date().getFullYear() + 1,
                              ),
                            )
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Tests and Packages Selection */}

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Tests
                          {editingInvoice && (
                            <small
                              className="text-muted ms-1 fw-normal"
                              style={{ fontSize: "0.75em" }}
                            >
                              (Original cannot be removed)
                            </small>
                          )}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Search tests..."
                          value={testSearchTerm}
                          onChange={(e) => setTestSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        <div
                          style={{
                            maxHeight: 200,
                            overflowY: "auto",
                            border: "1px solid var(--border-default)",
                            borderRadius: 4,
                            padding: 8,
                          }}
                        >
                          {tests
                            .filter((test) =>
                              test.name
                                .toLowerCase()
                                .includes(testSearchTerm.toLowerCase()),
                            )
                            .map((test) => {
                              const isOriginallySelected =
                                editingInvoice &&
                                editingInvoice.tests?.some(
                                  (t) => String(t.id) === String(test.id),
                                );
                              return (
                                <Form.Check
                                  key={test.id}
                                  type="checkbox"
                                  label={`${test.name} (EGP ${test.price})`}
                                  checked={invoice.tests.includes(
                                    String(test.id),
                                  )}
                                  disabled={isOriginallySelected}
                                  onChange={(e) => {
                                    if (isOriginallySelected) return;
                                    const selected = invoice.tests.includes(
                                      String(test.id),
                                    )
                                      ? invoice.tests.filter(
                                          (id) => id !== String(test.id),
                                        )
                                      : [...invoice.tests, String(test.id)];
                                    setInvoice((prev) => {
                                      const filtered = selected.filter(
                                        (id) =>
                                          !isNaN(Number(id)) &&
                                          id !== "" &&
                                          id !== null,
                                      );
                                      const newInvoice = {
                                        ...prev,
                                        tests: filtered,
                                      };
                                      return updateInvoiceCalculations(
                                        newInvoice,
                                      );
                                    });
                                  }}
                                />
                              );
                            })}
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Packages & Offers
                          {editingInvoice && (
                            <small
                              className="text-muted ms-1 fw-normal"
                              style={{ fontSize: "0.75em" }}
                            >
                              (Original cannot be removed)
                            </small>
                          )}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Search packages & offers..."
                          value={packageSearchTerm}
                          onChange={(e) => setPackageSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        <div
                          style={{
                            maxHeight: 200,
                            overflowY: "auto",
                            border: "1px solid var(--border-default)",
                            borderRadius: 4,
                            padding: 8,
                          }}
                        >
                          {packages
                            .filter((pkg) =>
                              pkg.name
                                .toLowerCase()
                                .includes(packageSearchTerm.toLowerCase()),
                            )
                            .map((pkg) => {
                              const isOriginallySelected =
                                editingInvoice &&
                                editingInvoice.packages?.some(
                                  (p) => String(p.id) === String(pkg.id),
                                );
                              return (
                                <Form.Check
                                  key={pkg.id}
                                  type="checkbox"
                                  label={`${pkg.name} - ${pkg.type} (EGP ${pkg.price})`}
                                  checked={invoice.packages.includes(
                                    String(pkg.id),
                                  )}
                                  disabled={isOriginallySelected}
                                  onChange={(e) => {
                                    if (isOriginallySelected) return;
                                    const selected = invoice.packages.includes(
                                      String(pkg.id),
                                    )
                                      ? invoice.packages.filter(
                                          (id) => id !== String(pkg.id),
                                        )
                                      : [...invoice.packages, String(pkg.id)];
                                    setInvoice((prev) => {
                                      const filtered = selected.filter(
                                        (id) =>
                                          !isNaN(Number(id)) &&
                                          id !== "" &&
                                          id !== null,
                                      );
                                      const newInvoice = {
                                        ...prev,
                                        packages: filtered,
                                      };
                                      return updateInvoiceCalculations(
                                        newInvoice,
                                      );
                                    });
                                  }}
                                />
                              );
                            })}
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Selected Items Summary - Restructured with two rows for better visual layout */}
                  {(invoice.tests.length > 0 ||
                    invoice.packages.length > 0) && (
                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="border rounded p-3 bg-theme-surface">
                          <h6 className="mb-3 text-primary">
                            📋 Selected Items Summary
                          </h6>

                          {/* Tests Selection */}
                          <Row className="mb-3">
                            {invoice.tests.length > 0 && (
                              <Col md={6}>
                                <div className="mb-3">
                                  <strong className="text-success">
                                    🧪 Tests ({invoice.tests.length})
                                  </strong>
                                  <div className="mt-2">
                                    {invoice.tests.map((testId) => {
                                      const test = tests.find(
                                        (t) => t.id === parseInt(testId),
                                      );
                                      if (!test) return null;
                                      const isOriginallySelected =
                                        editingInvoice &&
                                        editingInvoice.tests?.some(
                                          (t) =>
                                            String(t.id) === String(test.id),
                                        );
                                      return (
                                        <Badge
                                          key={testId}
                                          bg="success"
                                          className="me-1 mb-1 d-inline-flex align-items-center"
                                        >
                                          {test.name} (EGP {test.price})
                                          {!isOriginallySelected && (
                                            <button
                                              type="button"
                                              className="btn-close btn-close-white ms-2"
                                              style={{ fontSize: "0.6em" }}
                                              onClick={() => {
                                                const filtered =
                                                  invoice.tests.filter(
                                                    (id) =>
                                                      id !== String(test.id),
                                                  );
                                                setInvoice((prev) => {
                                                  const newInvoice = {
                                                    ...prev,
                                                    tests: filtered,
                                                  };
                                                  return updateInvoiceCalculations(
                                                    newInvoice,
                                                  );
                                                });
                                              }}
                                            ></button>
                                          )}
                                        </Badge>
                                      );
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
                                  <strong className="text-warning">
                                    📦 Packages ({invoice.packages.length})
                                  </strong>
                                  <div className="mt-2">
                                    {invoice.packages.map((packageId) => {
                                      const pkg = packages.find(
                                        (p) => p.id === parseInt(packageId),
                                      );
                                      if (!pkg) return null;
                                      const isOriginallySelected =
                                        editingInvoice &&
                                        editingInvoice.packages?.some(
                                          (p) => String(p.id) === String(pkg.id),
                                        );
                                      return (
                                        <Badge
                                          key={packageId}
                                          bg="warning"
                                          text="dark"
                                          className="me-1 mb-1 d-inline-flex align-items-center"
                                        >
                                          {pkg.name} (EGP {pkg.price})
                                          {!isOriginallySelected && (
                                            <button
                                              type="button"
                                              className="btn-close ms-2"
                                              style={{ fontSize: "0.6em" }}
                                              onClick={() => {
                                                const filtered =
                                                  invoice.packages.filter(
                                                    (id) =>
                                                      id !== String(pkg.id),
                                                  );
                                                setInvoice((prev) => {
                                                  const newInvoice = {
                                                    ...prev,
                                                    packages: filtered,
                                                  };
                                                  return updateInvoiceCalculations(
                                                    newInvoice,
                                                  );
                                                });
                                              }}
                                            ></button>
                                          )}
                                        </Badge>
                                      );
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
                          type="text"
                          value={discountInput}
                          placeholder="0"
                          onKeyDown={handleNumericKeyDown}
                          onBlur={(e) =>
                            formatInputOnBlur(e.target.value, setDiscountInput)
                          }
                          onChange={(e) => {
                            // Allow only digits and a single decimal point
                            const val = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/(\..*)\./g, "$1");
                            setDiscountInput(val);
                            handleDiscountChange(val);
                          }}
                        />
                        {discountPercentage > 0 && (
                          <Form.Text className="text-muted">
                            Discount Amount: EGP{" "}
                            {invoice.discount?.toFixed(2) || "0.00"}
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tax (%)</Form.Label>
                        <Form.Control
                          type="text"
                          value={taxRateInput}
                          placeholder="0"
                          onKeyDown={handleNumericKeyDown}
                          onBlur={(e) =>
                            formatInputOnBlur(e.target.value, setTaxRateInput)
                          }
                          onChange={(e) => {
                            // Allow only digits and a single decimal point
                            const val = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/(\..*)\./g, "$1");
                            setTaxRateInput(val);
                            const rate = (Number(val) || 0) / 100;
                            setInvoice((prev) => {
                              const newInvoice = { ...prev, tax_rate: rate };
                              return updateInvoiceCalculations(newInvoice);
                            });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tax (Amount)</Form.Label>
                        <Form.Control
                          type="text"
                          value={taxAmountInput}
                          placeholder="0"
                          onKeyDown={handleNumericKeyDown}
                          onBlur={(e) =>
                            formatInputOnBlur(e.target.value, setTaxAmountInput)
                          }
                          onChange={(e) => {
                            // Allow only digits and a single decimal point
                            const val = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/(\..*)\./g, "$1");
                            setTaxAmountInput(val);
                            const taxAmount = Number(val) || 0;
                            const rate =
                              invoice.subtotal > 0
                                ? taxAmount / invoice.subtotal
                                : 0;
                            setInvoice((prev) => {
                              const newInvoice = {
                                ...prev,
                                tax: taxAmount,
                                tax_rate: rate,
                              };
                              return updateInvoiceCalculations(newInvoice);
                            });
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={12}>
                      <div className="border rounded p-3 bg-theme-surface">
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
                              <Form.Label>
                                Discount ({discountPercentage}%)
                              </Form.Label>
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
                                  Add payment methods below to automatically
                                  calculate paid amount
                                </Form.Text>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <Form.Label className="mb-0">
                                  {(invoice.due || 0) < -0.01
                                    ? "Credit / Refund"
                                    : "Amount Due"}
                                </Form.Label>
                                {(invoice.due || 0) < -0.01 && (
                                  <Button
                                    variant={
                                      giveChange ? "success" : "outline-primary"
                                    }
                                    size="sm"
                                    onClick={() => setGiveChange(!giveChange)}
                                    className="py-0 px-2"
                                    style={{ fontSize: "0.8rem" }}
                                  >
                                    {giveChange
                                      ? "✓ Change Given"
                                      : "Give Change"}
                                  </Button>
                                )}
                              </div>
                              <Form.Control
                                type="text"
                                value={`EGP ${Math.abs(invoice.due || 0).toFixed(2)}`}
                                disabled
                                className={
                                  (invoice.due || 0) > 0.01
                                    ? "text-danger fw-bold"
                                    : "text-success fw-bold"
                                }
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
                      <div className="border rounded p-3 bg-theme-surface">
                        <h6 className="mb-3 text-primary">
                          💳 Payment Methods - Final Step
                        </h6>
                        <p className="text-muted mb-3">
                          Now that you know the total amount (EGP{" "}
                          {invoice.total?.toFixed(2) || "0.00"}), choose how the
                          payment will be made:
                        </p>

                        {invoice.payments.map((payment, index) => (
                          <div key={index} className="d-flex gap-2 mb-2">
                            <Form.Select
                              value={payment.payment_method_id}
                              onChange={(e) => {
                                const newPayments = [...invoice.payments];
                                newPayments[index].payment_method_id =
                                  e.target.value;
                                const newInvoice = {
                                  ...invoice,
                                  payments: newPayments,
                                };
                                setInvoice(updatePaidFromPayments(newInvoice));
                              }}
                              style={{ minWidth: "200px" }}
                            >
                              <option value="">Select Payment Method</option>
                              {paymentMethods.map((method) => (
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
                                const newInvoice = {
                                  ...invoice,
                                  payments: newPayments,
                                };
                                setInvoice(updatePaidFromPayments(newInvoice));
                              }}
                              disabled={!payment.payment_method_id}
                              style={{ minWidth: "150px" }}
                            />
                            <Button
                              variant="outline-danger"
                              onClick={() => {
                                const newPayments = invoice.payments.filter(
                                  (_, i) => i !== index,
                                );
                                const newInvoice = {
                                  ...invoice,
                                  payments: newPayments,
                                };
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
                                  { payment_method_id: "", paid_amount: "" },
                                ],
                              };
                              setInvoice(updatePaidFromPayments(newInvoice));
                            }}
                          >
                            + Add Payment Method
                          </Button>

                          {invoice.payments.length > 0 && (
                            <div className="ms-3">
                              <Badge bg="info" className="fs-6">
                                Total Paid: EGP{" "}
                                {calculatePaymentTotal(
                                  invoice.payments,
                                ).toFixed(2)}
                              </Badge>
                              {calculatePaymentTotal(invoice.payments) <
                                (invoice.total || 0) && (
                                <Badge
                                  bg="warning"
                                  text="dark"
                                  className="ms-2 fs-6"
                                >
                                  Remaining: EGP{" "}
                                  {(
                                    (invoice.total || 0) -
                                    calculatePaymentTotal(invoice.payments)
                                  ).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {invoice.payments.length === 0 && (
                          <Alert variant="info" className="mt-3 mb-0">
                            <i className="fas fa-info-circle me-2"></i>
                            You can add multiple payment methods if the customer
                            pays using different methods (e.g., cash + card).
                          </Alert>
                        )}
                      </div>
                    </Col>
                  </Row>

                  {showFormErrorAlert && Object.keys(formErrors).length > 0 && (
                    <Alert
                      variant="danger"
                      className="mt-3 mb-0"
                      onClose={() => setShowFormErrorAlert(false)}
                      dismissible
                    >
                      <ul className="mb-0">
                        {Object.entries(formErrors).map(([field, msg]) => (
                          <li key={field}>{msg}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
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
                  {loading ? "Saving..." : editingInvoice ? "Update" : "Create"}{" "}
                  Invoice
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
                setShowStatusForm(false);
              }}
              size="lg"
            >
              <Modal.Header>
                <Modal.Title>Manage Invoice Statuses</Modal.Title>
                <button
                  className="modal-close-btn"
                  onClick={() => {
                    setShowStatusModal(false);
                    setEditingStatus(null);
                    setStatusFormData({ state: "", details: "" });
                    setStatusFormErrors({});
                    setShowStatusFormErrorAlert(false);
                    setShowStatusForm(false);
                  }}
                >
                  <CircleX size={24} />
                </button>
              </Modal.Header>
              <Modal.Body>
                {showStatusFormErrorAlert &&
                  Object.keys(statusFormErrors).length > 0 && (
                    <Alert
                      variant="danger"
                      onClose={() => setShowStatusFormErrorAlert(false)}
                      dismissible
                    >
                      <ul className="mb-0">
                        {Object.entries(statusFormErrors).map(
                          ([field, msg]) => (
                            <li key={field}>{msg}</li>
                          ),
                        )}
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
                      setShowStatusForm(true);
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
                {(editingStatus || showStatusForm) && (
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
                              onChange={(e) =>
                                setStatusFormData({
                                  ...statusFormData,
                                  state: e.target.value,
                                })
                              }
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
                              onChange={(e) =>
                                setStatusFormData({
                                  ...statusFormData,
                                  details: e.target.value,
                                })
                              }
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
                          {loading
                            ? "Saving..."
                            : editingStatus
                              ? "Update"
                              : "Create"}{" "}
                          Status
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingStatus(null);
                            setStatusFormData({ state: "", details: "" });
                            setStatusFormErrors({});
                            setShowStatusFormErrorAlert(false);
                            setShowStatusForm(false);
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
                      {statuses.map((status) => (
                        <tr key={status.id}>
                          <td>{status.id}</td>
                          <td>{status.state}</td>
                          <td>{status.details || "-"}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  setEditingStatus(status);
                                  setStatusFormData({
                                    state: status.state,
                                    details: status.details || "",
                                  });
                                  setStatusFormErrors({});
                                  setShowStatusFormErrorAlert(false);
                                  setShowStatusForm(true);
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
                    <strong>Automatic Status Detection:</strong>
                    <br />• <strong>Pending:</strong> When invoice has
                    outstanding balance (due {">"} 0)
                    <br />• <strong>Paid:</strong> When invoice is fully paid
                    (due = 0)
                    <br />• <strong>Overpaid:</strong> When payment exceeds
                    total (positive credits )
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
                    setShowStatusForm(false);
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
              <Modal.Header>
                <Modal.Title>Confirm Delete</Modal.Title>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowStatusDeleteModal(false)}
                >
                  <CircleX size={24} />
                </button>
              </Modal.Header>
              <Modal.Body>
                Are you sure you want to delete this status? This action cannot
                be undone.
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
            <Modal
              show={showDiseaseCreateModal}
              onHide={() => setShowDiseaseCreateModal(false)}
            >
              <Modal.Header>
                <Modal.Title>Add New Disease</Modal.Title>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowDiseaseCreateModal(false)}
                >
                  <CircleX size={24} />
                </button>
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
                          onChange={(e) =>
                            setNewDisease({
                              ...newDisease,
                              name: e.target.value,
                            })
                          }
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
                          onChange={(e) =>
                            setNewDisease({
                              ...newDisease,
                              details: e.target.value,
                            })
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setShowDiseaseCreateModal(false)}
                >
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

            {/* PDF Preview Modal */}
            <Modal
              show={showPDFPreview}
              onHide={() => {
                setShowPDFPreview(false);
                setSelectedInvoiceForPDF(null);
              }}
              size="xl"
            >
              <Modal.Header>
                <Modal.Title>Invoice PDF Preview</Modal.Title>
                <button
                  className="modal-close-btn"
                  onClick={() => {
                    setShowPDFPreview(false);
                    setSelectedInvoiceForPDF(null);
                  }}
                >
                  <CircleX size={24} />
                </button>
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

            {/* Add Doctor Modal */}
            <Modal
              show={showDoctorModal}
              onHide={() => {
                setShowDoctorModal(false);
                setNewDoctor({
                  name: "",
                  specialization: "",
                  phoneNumbers: [
                    { phone: "", type: "personal", is_primary: true },
                  ],
                  email: "",
                  commission: 0,
                });
              }}
              size="lg"
            >
              <Modal.Header closeButton>
                <Modal.Title>Add New Referring Doctor</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Doctor Name *</Form.Label>
                        <Form.Control
                          type="text"
                          required
                          value={newDoctor.name}
                          onChange={(e) =>
                            setNewDoctor({ ...newDoctor, name: e.target.value })
                          }
                          placeholder="Enter doctor's name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Specialization</Form.Label>
                        <Form.Control
                          type="text"
                          value={newDoctor.specialization}
                          onChange={(e) =>
                            setNewDoctor({
                              ...newDoctor,
                              specialization: e.target.value,
                            })
                          }
                          placeholder="Enter specialization"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Commission (%)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          max="100"
                          value={newDoctor.commission}
                          onChange={(e) =>
                            setNewDoctor({
                              ...newDoctor,
                              commission: e.target.value,
                            })
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <PhoneInput
                          value={newDoctor.phoneNumbers[0].phone}
                          onChange={(val) => {
                            const newPhones = [...newDoctor.phoneNumbers];
                            newPhones[0].phone = val;
                            setNewDoctor({
                              ...newDoctor,
                              phoneNumbers: newPhones,
                            });
                          }}
                          placeholder="Enter phone number"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={newDoctor.email}
                          onChange={(e) =>
                            setNewDoctor({
                              ...newDoctor,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter email address"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setShowDoctorModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddDoctor}
                  disabled={!newDoctor.name.trim()}
                >
                  Create Doctor
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Due Limit Warning Modal */}
            <Modal
              show={limitWarningModal}
              onHide={() => {
                setLimitWarningModal(false);
                setLimitWarningData(null);
              }}
              backdrop="static"
              keyboard={false}
              centered
            >
              <Modal.Header className="border-0 pb-0 bg-theme-surface justify-content-center">
                <Modal.Title className="d-flex align-items-center text-danger">
                  <AlertTriangle size={24} className="me-2" />
                  Limit Exceeded
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="pt-0 px-4 pb-4">
                {limitWarningData && (
                  <div className="text-center">
                    <p className="text-muted mb-4">
                      This action will increase the patient's due balance beyond
                      the allowed limit.
                    </p>

                    <div className="bg-theme-surface rounded-3 p-3 mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Current Due</span>
                        <span className="fw-medium">
                          {limitWarningData.current_due?.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">+ New Invoice</span>
                        <span className="fw-medium text-danger">
                          +{limitWarningData.invoice_due?.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 border-top pt-2">
                        <span className="fw-bold">Total New Due</span>
                        <span className="fw-bold fs-5">
                          {limitWarningData.new_due?.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-dashed">
                        <span className="text-muted small">Allowed Limit</span>
                        <Badge
                          bg="secondary"
                          className="px-3 py-2 fw-normal"
                          style={{ fontSize: "0.9em" }}
                        >
                          {limitWarningData.limit?.toFixed(2)}
                        </Badge>
                      </div>
                    </div>

                    <p className="small text-muted mb-0">
                      You can bypass this check if necessary. This event will be
                      logged.
                    </p>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLimitWarningModal(false);
                    setLimitWarningData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setLimitWarningModal(false);
                    handleAddInvoice(null, true);
                  }}
                >
                  Bypass & Create Invoice
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        )}
      </Container>

      {/* Settlement Modal */}
      <SettlementModal
        show={showSettlementModal}
        onHide={() => setShowSettlementModal(false)}
        initialPatientId={settlementPatientId}
        patientName={settlementPatientName}
        patientCode={settlementPatientCode}
      />

      {/* Refund Modal */}
      <RefundModal
        show={showRefundModal}
        onHide={() => {
          setShowRefundModal(false);
          setSelectedInvoiceForRefund(null);
        }}
        invoice={selectedInvoiceForRefund}
        onRefundProcessed={fetchData}
      />

      {/* Invoice History Drawer */}
      <InvoiceHistoryDrawer
        show={showHistoryDrawer}
        onHide={() => {
          setShowHistoryDrawer(false);
          setSelectedInvoiceIdForHistory(null);
        }}
        invoiceId={selectedInvoiceIdForHistory}
      />
    </>
  );
};

export default Invoices;
