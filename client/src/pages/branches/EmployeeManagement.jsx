import React, { useEffect, useState } from "react";
import { Container, Button, Modal, Form, Alert, Row, Col, Badge, Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import Toolbar from "../../components/layout/Toolbar";
import TablePagination from "../../components/ui/TablePagination";
import DynamicTable from "../../components/ui/DynamicTable";
import axios from "axios";
import { Pencil, Trash2, Plus, Shield, Eye, UserPlus } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(null);
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
    branch_id: ""
  });
  const [branches, setBranches] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [employeesRes, rolesRes, branchesRes] = await Promise.all([
          axios.get(`${apiUrl}/emp`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/emp/roles/available`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${apiUrl}/branches`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setEmployees(employeesRes.data);
        setRoles(rolesRes.data);
        setBranches(branchesRes.data);

        // Set up table headers
        const headers = [
          { field: 'name', label: 'Name', sortable: true },
          { field: 'username', label: 'Username', sortable: true },
          { field: 'email', label: 'Email', sortable: true },
          { field: 'role', label: 'Role', sortable: true },
          { field: 'gender', label: 'Gender', sortable: true },
          { field: 'birth_date', label: 'Birth Date', sortable: true },
          { field: 'national_id', label: 'National ID', sortable: true },
          { field: 'nationality', label: 'Nationality', sortable: true },
          { field: 'branch', label: 'Branch', sortable: false }
        ];

        setTableHeaders(headers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please try again later.");
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
        birth_date: employee.birth_date ? new Date(employee.birth_date).toISOString().split('T')[0] : null
      };

      // Validate the cleaned employee
      const validationErrors = validateForm(cleanedEmployee);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      let response;
      if (editingEmployee) {
        // Update existing employee
        response = await axios.put(`${apiUrl}/emp/${editingEmployee.id}`, cleanedEmployee, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Update the employees state
        setEmployees(prevEmployees => prevEmployees.map(emp => 
          emp.id === editingEmployee.id ? response.data : emp
        ));
      } else {
        // Create new employee
        response = await axios.post(`${apiUrl}/emp`, cleanedEmployee, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Add the new employee to the employees state
        setEmployees(prevEmployees => [...prevEmployees, response.data]);
      }

      setShowAddModal(false);
      handleResetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
      setError(error.response?.data?.error || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      await axios.delete(`${apiUrl}/emp/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the employees state
      setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== id));
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      setError("Failed to delete employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPermissions = async (role) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${apiUrl}/emp/roles/${role}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRolePermissions(response.data);
      setSelectedRole(role);
      setShowPermissionsModal(true);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setError("Failed to fetch permissions");
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig.field) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
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
            birth_date: rowData.birth_date ? new Date(rowData.birth_date) : null,
            password: "" // Don't show password
          });
          setShowAddModal(true);
        }}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => {
          setEmployeeToDelete(rowData);
          setShowDeleteModal(true);
        }}
        disabled={rowData.id === user?.id} // Prevent deleting own account
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  const validateForm = (employee) => {
    const errors = {};
    if (!employee.name) errors.name = 'Name is required';
    if (!employee.username) errors.username = 'Username is required';
    if (!editingEmployee && !employee.password) errors.password = 'Password is required';
    if (!employee.role) errors.role = 'Role is required';
    if (!employee.branch_id) errors.branch_id = 'Branch is required';
    // Email validation
    if (employee.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employee.email)) {
        errors.email = 'Invalid email format';
      }
    }
    if (employee.username && employee.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    if (!editingEmployee && employee.password && employee.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    return errors;
  };

  const formatCellData = (value, field, rowData) => {
    if (value === null || value === undefined) return '-';
    switch (field) {
      case 'birth_date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'gender':
        if (value === 'm' || value === 'Male') {
          return 'Male';
        } else if (value === 'f' || value === 'Female') {
          return 'Female';
        } else {
          return '-';
        }
      case 'role':
        return (
          <Badge 
            bg={
              value === 'admin' ? 'danger' :
              value === 'receptionist' ? 'primary' :
              value === 'chemist' ? 'success' :
              value === 'doctor' ? 'info' :
              'secondary'
            }
          >
            {value?.charAt(0).toUpperCase() + value?.slice(1)}
          </Badge>
        );
      case 'branch':
        if (!rowData) return '-';
        const branch = branches.find(b => b.id === rowData.branch_id);
        return branch ? branch.name : '-';
      default:
        return String(value || '-');
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
      branch_id: ""
    });
    setFormErrors({});
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'receptionist': return 'primary';
      case 'chemist': return 'success';
      case 'doctor': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid className="employee-management-container">
      {loading ? (
        <LoadingSpinner message="Loading employee list..." />
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
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
            sortableFields={tableHeaders.filter(h => h.sortable).map(h => h.field)}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          
          <DynamicTable
            data={currentEmployees}
            columns={tableHeaders.map(header => header.field)}
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
          <Modal show={showAddModal} onHide={() => {
            setShowAddModal(false);
            setError(null);
            setFormErrors({});
          }} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>
                {editingEmployee ? "Edit" : "Add"} Employee
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
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
                      <Form.Label>Username *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter username"
                        value={employee.username}
                        onChange={(e) => {
                          setEmployee({ ...employee, username: e.target.value });
                          if (formErrors.username) setFormErrors({ ...formErrors, username: null });
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
                        onChange={e => {
                          setEmployee({ ...employee, branch_id: e.target.value });
                          if (formErrors.branch_id) setFormErrors({ ...formErrors, branch_id: null });
                        }}
                        isInvalid={!!formErrors.branch_id}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
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
                      <Form.Label>Password {!editingEmployee && '*'}</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder={editingEmployee ? "Leave blank to keep current" : "Enter password"}
                        value={employee.password}
                        onChange={(e) => {
                          setEmployee({ ...employee, password: e.target.value });
                          if (formErrors.password) setFormErrors({ ...formErrors, password: null });
                        }}
                        isInvalid={!!formErrors.password}
                      />
                      <Form.Control.Feedback type="invalid">
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
                          if (formErrors.role) setFormErrors({ ...formErrors, role: null });
                        }}
                        isInvalid={!!formErrors.role}
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
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

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={employee.email}
                        onChange={(e) => {
                          setEmployee({ ...employee, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: null });
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
                        onChange={(e) => setEmployee({ ...employee, gender: e.target.value })}
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
                        onChange={(date) => setEmployee({ ...employee, birth_date: date })}
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
                        onChange={(e) => setEmployee({ ...employee, national_id: e.target.value })}
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
                        onChange={(e) => setEmployee({ ...employee, nationality: e.target.value })}
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
                        onChange={(e) => setEmployee({ ...employee, passport_no: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {
                setShowAddModal(false);
                setError(null);
                setFormErrors({});
              }}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                form="employee-form"
                disabled={loading}
              >
                {loading ? "Saving..." : (editingEmployee ? "Update" : "Add")}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="warning">
                Are you sure you want to delete this employee?
                This action cannot be undone.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleDelete(employeeToDelete?.id)}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Permissions Modal */}
          <Modal show={showPermissionsModal} onHide={() => setShowPermissionsModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>
                <Shield size={20} className="me-2" />
                Role Permissions: {selectedRole?.charAt(0).toUpperCase() + selectedRole?.slice(1)}
              </Modal.Title>
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
                        <Badge bg="success" className="me-2">✓</Badge>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowPermissionsModal(false)}>
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