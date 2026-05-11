import React, { useEffect, useState } from "react";
import {
  Container,
  Button,
  Modal,
  Form,
  Alert,
  Row,
  Col,
  Badge,
  Card,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import {
  Pencil,
  Trash2,
  Plus,
  Shield,
  Eye,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  CircleX,
  AlertTriangle,
  Info,
  UserX,
  EyeOff,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import "../../styles/EmployeeManagement.css";
import { useToast } from "../../components/ui/ToastContext";
import PhoneInput from "../../components/ui/PhoneInput";
const EmployeeManagement = () => {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [employee, setEmployee] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    gender: "",
    birth_date: "",
    national_id: "",
    nationality: "",
    passport_no: "",
    role: "",
    branch_id: "",
    phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
  });
  const [branches, setBranches] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const apiUrl = import.meta.env.VITE_API_URL;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [employeesRes, rolesRes, branchesRes] = await Promise.all([
          axios.get(`${apiUrl}/emp`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiUrl}/emp/roles/available`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiUrl}/branches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setEmployees(employeesRes.data.filter(e => e.role !== 'doctor'));
        setRoles(rolesRes.data.filter(r => r.value !== 'doctor'));
        setBranches(branchesRes.data);

        // Set up table headers
        const headers = [
          { field: "name", label: "Name", sortable: true },
          { field: "username", label: "Username", sortable: true },
          { field: "email", label: "Email", sortable: true },
          { field: "role", label: "Role", sortable: true },
          { field: "gender", label: "Gender", sortable: true },
          { field: "birth_date", label: "Birth Date", sortable: true },
          { field: "national_id", label: "National ID", sortable: true },
          { field: "nationality", label: "Nationality", sortable: true },
          { field: "phones", label: "Phones", sortable: false },
          { field: "branch", label: "Branch", sortable: false },
        ];

        setTableHeaders(headers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Unable to load employee data. Please refresh the page.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      // Clean up the employee object
      const cleanedEmployee = {
        ...employee,
        name: employee.name?.trim() || "",
        username: employee.username?.trim() || "",
        email: employee.email?.trim() || "",
        national_id: employee.national_id?.trim() || "",
        nationality: employee.nationality?.trim() || "",
        passport_no: employee.passport_no?.trim() || "",
        birth_date: employee.birth_date
          ? new Date(employee.birth_date).toISOString().split("T")[0]
          : null,
        phoneNumbers: employee.phoneNumbers.filter(p => p.phone && p.phone.trim() !== ""),
      };

      // Validate the cleaned employee
      const validationErrors = validateForm(cleanedEmployee);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        // Show the first validation error as a toast
        const firstErrorKey = Object.keys(validationErrors)[0];
        toast.error(validationErrors[firstErrorKey]);
        return;
      }

      const token = localStorage.getItem("token");
      setIsSubmitting(true);

      let response;
      if (editingEmployee) {
        // Update existing employee
        response = await axios.put(
          `${apiUrl}/emp/${editingEmployee.id}`,
          cleanedEmployee,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Update the employees state
        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) =>
            emp.id === editingEmployee.id ? response.data : emp
          )
        );
      } else {
        // Create new employee
        response = await axios.post(`${apiUrl}/emp`, cleanedEmployee, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Add the new employee to the employees state
        setEmployees((prevEmployees) => [...prevEmployees, response.data]);
      }
      const savedName = editingEmployee ? editingEmployee.name : employee.name;
      toast.success(
        editingEmployee
          ? `Changes to "${savedName}" saved successfully.`
          : `Employee "${savedName}" has been successfully created.`
      );
      setShowAddModal(false);
      handleResetForm();
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "An unexpected error occurred while saving the employee.";
      console.error("Error saving employee:", error);
      toast.error(errorMessage);
      if (errorMessage.toLowerCase().includes("username")) {
        setFormErrors({
          ...formErrors,
          username: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    try {
      const token = localStorage.getItem("token");
      setIsDeleting(true);

      await axios.delete(`${apiUrl}/emp/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the employees state
      setEmployees((prevEmployees) =>
        prevEmployees.filter((emp) => emp.id !== id)
      );
      toast.success(`Employee "${name}" has been removed.`);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Could not delete employee record. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleViewPermissions = async (role) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${apiUrl}/emp/roles/${role}/permissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRolePermissions(response.data);
      setSelectedRole(role);
      setShowPermissionsModal(true);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Unable to retrieve role permissions.");
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig.field) return 0;

    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const pageCount = Math.ceil(sortedEmployees.length / itemsPerPage);
  const currentEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const ActionComponent = ({ rowData }) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-info"
        size="sm"
        onClick={() => handleViewPermissions(rowData.role)}
        title="View Role Permissions"
      >
        <Shield size={16} />
      </Button>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => {
          setEditingEmployee(rowData);
          setEmployee({
            ...rowData,
            birth_date: rowData.birth_date
              ? new Date(rowData.birth_date)
              : null,
            password: "", // Don't show password
            phoneNumbers: rowData.phones && rowData.phones.length > 0 
              ? rowData.phones 
              : [{ phone: "", type: "personal", is_primary: true }],
          });
          setShowPassword(false);
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          confirm.delete(rowData.name, () =>
            handleDelete(rowData.id, rowData.name)
          );
        }}
        disabled={rowData.id === user?.id} // Prevent deleting own account
      >
        <UserX size={18} />
      </Button>
    </div>
  );

  const validateForm = (employee) => {
    const errors = {};
    if (!employee.name) errors.name = "Full name is required to create an employee account.";
    if (!employee.username) errors.username = "Please provide a unique username for login.";
    if (!editingEmployee && !employee.password)
      errors.password = "A secure password must be set for new accounts.";
    if (!employee.role) errors.role = "Please select a system role for this employee.";
    if (!employee.branch_id) errors.branch_id = "An employee must be assigned to a specific branch.";
    // Email validation
    if (!employee.email) {
      errors.email = "Email address is required for password recovery and notifications.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employee.email)) {
        errors.email = "The email format is incorrect. Example: name@domain.com";
      }
    }
    if (employee.username && employee.username.length < 3) {
      errors.username = "Username is too short (minimum 3 characters).";
    }
    if (!editingEmployee && employee.password && employee.password.length < 6) {
      errors.password = "Password is too weak (minimum 6 characters).";
    }
    return errors;
  };

  const formatCellData = (value, field, rowData) => {
    if (value === null || value === undefined) return "-";
    switch (field) {
      case "birth_date":
        return value ? new Date(value).toLocaleDateString() : "-";
      case "gender":
        if (value === "m" || value === "Male") {
          return "Male";
        } else if (value === "f" || value === "Female") {
          return "Female";
        } else {
          return "-";
        }
      case "role":
        return (
          <Badge
            bg={
              value === "admin"
                ? "danger"
                : value === "receptionist"
                  ? "primary"
                  : value === "chemist"
                    ? "success"
                    : value === "doctor"
                      ? "info"
                      : "secondary"
            }
          >
            {value?.charAt(0).toUpperCase() + value?.slice(1)}
          </Badge>
        );
      case "branch":
        if (!rowData) return "-";
        const branch = branches.find((b) => b.id === rowData.branch_id);
        return branch ? branch.name : "-";
      case "phones":
        if (!value || value.length === 0) return "-";
        const primary = value.find(p => p.is_primary) || value[0];
        return (
          <div className="d-flex flex-column gap-1">
            <span className="fw-bold">{primary.phone}</span>
            {value.length > 1 && (
              <Badge bg="secondary" pill style={{ fontSize: '10px', width: 'fit-content' }}>
                +{value.length - 1} more
              </Badge>
            )}
          </div>
        );
      default:
        return String(value || "-");
    }
  };

  const handleResetForm = () => {
    setEmployee({
      name: "",
      username: "",
      password: "",
      email: "",
      gender: "",
      birth_date: "",
      national_id: "",
      nationality: "",
      passport_no: "",
      role: "",
      branch_id: "",
      phoneNumbers: [{ phone: "", type: "personal", is_primary: true }],
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "danger";
      case "receptionist":
        return "primary";
      case "chemist":
        return "success";
      case "doctor":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <Container fluid className="employee-management-container">
      {loading ? (
        <LoadingSpinner message="Loading employee list..." />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Employee Management</h2>
            <Button
              variant="primary"
              onClick={() => {
                setEditingEmployee(null);
                handleResetForm();
                setShowAddModal(true);
              }}
            >
              <UserPlus size={16} className="me-2" />
              Add New Employee
            </Button>
          </div>

          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={tableHeaders
              .filter((h) => h.sortable)
              .map((h) => h.field)}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />

          <DynamicTable
            data={currentEmployees}
            columns={tableHeaders.map((header) => header.field)}
            formatCellData={formatCellData}
            ActionComponent={ActionComponent}
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
          <Modal
            show={showAddModal}
            onHide={() => {
              setShowAddModal(false);
              setFormErrors({});
              setShowPassword(false);
            }}
            size="lg"
          >
            <Modal.Header>
              <Modal.Title>
                {editingEmployee ? "Edit" : "Add"} Employee
              </Modal.Title>
              <button className="modal-close-btn" onClick={() => {
                setShowAddModal(false);
                setFormErrors({});
                setShowPassword(false);
              }}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleAddEmployee} noValidate id="employee-form">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter employee name"
                        value={employee.name}
                        onChange={(e) => {
                          setEmployee({ ...employee, name: e.target.value });
                          if (formErrors.name)
                            setFormErrors({ ...formErrors, name: null });
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
                      <Form.Label>Username *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter username"
                        value={employee.username}
                        onChange={(e) => {
                          setEmployee({
                            ...employee,
                            username: e.target.value,
                          });
                          if (formErrors.username)
                            setFormErrors({ ...formErrors, username: null });
                        }}
                        isInvalid={!!formErrors.username}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.username}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Branch *</Form.Label>
                      <Form.Select
                        value={employee.branch_id}
                        onChange={(e) => {
                          setEmployee({
                            ...employee,
                            branch_id: e.target.value,
                          });
                          if (formErrors.branch_id)
                            setFormErrors({ ...formErrors, branch_id: null });
                        }}
                        isInvalid={!!formErrors.branch_id}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.branch_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Password {!editingEmployee && "*"}
                      </Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            editingEmployee
                              ? "Leave blank to keep current"
                              : "Enter password"
                          }
                          value={employee.password}
                          onChange={(e) => {
                            setEmployee({
                              ...employee,
                              password: e.target.value,
                            });
                            if (formErrors.password)
                              setFormErrors({ ...formErrors, password: null });
                          }}
                          isInvalid={!!formErrors.password}
                          style={{ paddingRight: '40px' }}
                        />
                        <Button
                          variant="link"
                          className="position-absolute end-0 top-0 h-100 text-muted p-2 d-flex align-items-center justify-content-center border-0"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ zIndex: 5, textDecoration: 'none' }}
                          tabIndex="-1"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                      <Form.Control.Feedback type="invalid" style={{ display: formErrors.password ? 'block' : 'none' }}>
                        {formErrors.password}
                      </Form.Control.Feedback>
                      {editingEmployee && (
                        <Form.Text className="text-muted">
                          Leave blank to keep current password
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Role *</Form.Label>
                      <Form.Select
                        value={employee.role}
                        onChange={(e) => {
                          setEmployee({ ...employee, role: e.target.value });
                          if (formErrors.role)
                            setFormErrors({ ...formErrors, role: null });
                        }}
                        isInvalid={!!formErrors.role}
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label} - {role.description}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {formErrors.role}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Phone Numbers *</Form.Label>
                    {employee.phoneNumbers.map((phoneEntry, index) => (
<<<<<<< HEAD
                      <div key={index} className="d-flex gap-2 mb-2 align-items-start">
                        <div style={{ flex: 1 }}>
=======
                      <div key={index} className="d-flex flex-wrap gap-2 mb-2 align-items-center w-100">
                        <div style={{ flex: '1 1 200px', minWidth: '0' }}>
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
                          <PhoneInput
                            value={phoneEntry.phone}
                            onChange={(val) => {
                              const newPhones = [...employee.phoneNumbers];
                              newPhones[index].phone = val;
                              setEmployee({ ...employee, phoneNumbers: newPhones });
                            }}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <Form.Select
                          style={{ width: '130px' }}
                          value={phoneEntry.type}
                          onChange={(e) => {
                            const newPhones = [...employee.phoneNumbers];
                            newPhones[index].type = e.target.value;
                            setEmployee({ ...employee, phoneNumbers: newPhones });
                          }}
                        >
                          <option value="personal">Personal</option>
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                        </Form.Select>
                        <div className="d-flex flex-column align-items-center">
                          <Form.Check
                            type="radio"
                            name="primaryPhone"
                            checked={phoneEntry.is_primary}
                            onChange={() => {
                              const newPhones = employee.phoneNumbers.map((p, i) => ({
                                ...p,
                                is_primary: i === index
                              }));
                              setEmployee({ ...employee, phoneNumbers: newPhones });
                            }}
                            title="Set as primary"
                          />
                          <small className="text-muted" style={{ fontSize: '10px' }}>Primary</small>
                        </div>
                        {employee.phoneNumbers.length > 1 && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => {
                              const newPhones = employee.phoneNumbers.filter((_, i) => i !== index);
                              if (phoneEntry.is_primary && newPhones.length > 0) {
                                newPhones[0].is_primary = true;
                              }
                              setEmployee({ ...employee, phoneNumbers: newPhones });
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
                        setEmployee({
                          ...employee,
                          phoneNumbers: [
                            ...employee.phoneNumbers,
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={employee.email}
                        onChange={(e) => {
                          setEmployee({ ...employee, email: e.target.value });
                          if (formErrors.email)
                            setFormErrors({ ...formErrors, email: null });
                        }}
                        isInvalid={!!formErrors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        value={employee.gender}
                        onChange={(e) =>
                          setEmployee({ ...employee, gender: e.target.value })
                        }
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Birth Date</Form.Label>
                      <DatePicker
                        selected={employee.birth_date}
                        onChange={(date) =>
                          setEmployee({ ...employee, birth_date: date })
                        }
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                        maxDate={new Date()}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>National ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter national ID"
                        value={employee.national_id}
                        onChange={(e) =>
                          setEmployee({
                            ...employee,
                            national_id: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nationality</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter nationality"
                        value={employee.nationality}
                        onChange={(e) =>
                          setEmployee({
                            ...employee,
                            nationality: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Passport No</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter passport number"
                        value={employee.passport_no}
                        onChange={(e) =>
                          setEmployee({
                            ...employee,
                            passport_no: e.target.value,
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
                onClick={() => {
                  setShowAddModal(false);
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="employee-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingEmployee
                    ? "Update"
                    : "Add"}
              </Button>
            </Modal.Footer>
          </Modal>
          {/* Permissions Modal */}
          <Modal
            show={showPermissionsModal}
            onHide={() => setShowPermissionsModal(false)}
          >
            <Modal.Header>
              <Modal.Title>
                <Shield size={20} className="me-2" />
                Role Permissions:{" "}
                {selectedRole?.charAt(0).toUpperCase() + selectedRole?.slice(1)}
              </Modal.Title>
              <button className="modal-close-btn" onClick={() => setShowPermissionsModal(false)}>
                <CircleX size={24} />
              </button>
            </Modal.Header>
            <Modal.Body>
              {rolePermissions && (
                <div>
                  <Alert variant="info" className="mb-3">
                    <strong>{rolePermissions.description}</strong>
                  </Alert>
                  <h6>Permissions:</h6>
                  <ul className="list-unstyled">
                    {rolePermissions.permissions.map((permission, index) => (
                      <li key={index} className="mb-2">
                        <Badge bg="success" className="me-2">
                          ✓
                        </Badge>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowPermissionsModal(false)}
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

export default EmployeeManagement;
