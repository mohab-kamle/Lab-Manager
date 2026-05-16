import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Table, Form, Row, Col, Button, InputGroup, Badge } from 'react-bootstrap';
import { ArrowUpRight, ArrowDownLeft, Download, Funnel } from 'react-bootstrap-icons';
import api from '../../utils/api';
import TransactionSummaryRow from '../../components/ui/TransactionSummaryRow';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDateForInput, formatDateTime } from '../../utils/dateFormatter';
import { useToast } from '../../components/ui/ToastContext';
import { useNavigate } from 'react-router-dom';
import Toolbar from '../../components/layout/Toolbar';
import { Layers, User, MapPin, CreditCard, RotateCcw } from 'lucide-react';

const TransactionsVault = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination states for Toolbar
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filtering states
  const [filters, setFilters] = useState({
    search: '',
    processType: '',
    paidWith: '',
    branch: '',
    startDate: '',
    endDate: '',
    employee: ''
  });

  // Meta data for filters
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [transRes, branchRes, empRes, payRes] = await Promise.all([
        api.get('/admin/transactions'),
        api.get('/branches'),
        api.get('/emp'),
        api.get('/payment-methods')
      ]);

      setTransactions(transRes.data || []);
      setBranches(branchRes.data || []);
      setEmployees(empRes.data || []);
      setPaymentMethods(payRes.data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction data.');
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      processType: '',
      paidWith: '',
      branch: '',
      startDate: '',
      endDate: '',
      employee: ''
    });
    setCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(item => {
      const matchesSearch = !filters.search || 
        item.transactionId.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.summary?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.patientId?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesProcessType = !filters.processType || item.processType === filters.processType;
      const matchesPaidWith = !filters.paidWith || item.paidWith === filters.paidWith;
      const matchesBranch = !filters.branch || item.branchName === filters.branch;
      const matchesEmployee = !filters.employee || item.processedBy?.id === filters.employee;
      
      const itemDate = new Date(item.date).setHours(0,0,0,0);
      const matchesStartDate = !filters.startDate || itemDate >= new Date(filters.startDate).setHours(0,0,0,0);
      const matchesEndDate = !filters.endDate || itemDate <= new Date(filters.endDate).setHours(0,0,0,0);

      return matchesSearch && matchesProcessType && matchesPaidWith && 
             matchesBranch && matchesEmployee && matchesStartDate && matchesEndDate;
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      const amount = parseFloat(curr.amount) || 0;
      const change = parseFloat(curr.changeAmount) || 0;
      
      if (curr.processType?.toLowerCase() === 'refund') {
        acc.refunds += amount;
        acc.net -= amount;
      } else {
        acc.processed += amount;
        acc.net += (amount - change);
      }
      return acc;
    }, { processed: 0, refunds: 0, net: 0 });
  }, [filteredTransactions]);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Transaction ID', 'Date', 'Type', 'Method', 'Amount', 'Change', 'Net Amount', 'Patient', 'Branch', 'Processed By', 'Summary'];
    const rows = filteredTransactions.map(t => {
      const amount = parseFloat(t.amount) || 0;
      const change = parseFloat(t.changeAmount) || 0;
      return [
        t.transactionId,
        formatDateTime(t.date),
        t.processType,
        t.paidWith || 'N/A',
        amount,
        change,
        amount - change,
        t.patientId || 'N/A',
        t.branchName,
        t.processedBy?.name || 'N/A',
        t.summary || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToPatient = (id) => {
      navigate(`/admin/patients/${id}`);
  };

  const viewInvoice = (id) => {
      // Assuming there's a route or modal for invoice viewing
      toast.info(`Viewing invoice: ${id}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="mb-1">Transactions Vault</h2>
            <p className="text-muted mb-0">System-wide financial audit trail</p>
        </div>
        <Button variant="outline-success" onClick={exportToCSV}>
            <Download className="me-2" />
            Export to CSV
        </Button>
      </div>

      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm bg-primary text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <small className="text-white text-opacity-75 d-block">Total Processed</small>
                <h3 className="mb-0">{formatCurrency(totals.processed)}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm bg-danger text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                <ArrowDownLeft size={24} />
              </div>
              <div>
                <small className="text-white text-opacity-75 d-block">Total Refunds</small>
                <h3 className="mb-0">{formatCurrency(totals.refunds)}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm bg-success text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                <Funnel size={24} />
              </div>
              <div>
                <small className="text-white text-opacity-75 d-block">Net Revenue</small>
                <h3 className="mb-0">{formatCurrency(totals.net)}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Toolbar
        searchQuery={filters.search}
        setSearchQuery={(val) => setFilters(prev => ({ ...prev, search: val }))}
        dateFilter={{ startDate: filters.startDate, endDate: filters.endDate }}
        setDateFilter={(val) => setFilters(prev => ({ ...prev, startDate: val.startDate, endDate: val.endDate }))}
        showDateFilter={true}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
      >
        <div className="control-group">
          <Layers size={16} className="icon-primary" />
          <select 
            name="processType" 
            value={filters.processType} 
            onChange={handleFilterChange}
            className="ui-input ui-select"
          >
            <option value="">All Types</option>
            <option value="Payment">Payment</option>
            <option value="Refund">Refund</option>
            <option value="Due">Due</option>
            <option value="Credit">Credit</option>
            <option value="Due Settlement">Due Settlement</option>
          </select>
        </div>

        <div className="control-group">
          <CreditCard size={16} className="icon-primary" />
          <select 
            name="paidWith" 
            value={filters.paidWith} 
            onChange={handleFilterChange}
            className="ui-input ui-select"
          >
            <option value="">All Methods</option>
            {paymentMethods.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <MapPin size={16} className="icon-primary" />
          <select 
            name="branch" 
            value={filters.branch} 
            onChange={handleFilterChange}
            className="ui-input ui-select"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <User size={16} className="icon-primary" />
          <select 
            name="employee" 
            value={filters.employee} 
            onChange={handleFilterChange}
            className="ui-input ui-select"
          >
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={clearFilters} 
          className="btn btn-link btn-sm text-muted text-decoration-none d-flex align-items-center gap-1"
        >
          <RotateCcw size={14} /> Clear
        </button>
      </Toolbar>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="table-responsive" style={{ maxHeight: '600px' }}>
          <Table hover className="mb-0">
            <thead className="bg-white sticky-top shadow-sm" style={{ zIndex: 10 }}>
              <tr>
                <th>TXN ID</th>
                <th>Date</th>
                <th>Process Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Patient</th>
                <th>Branch</th>
                <th>Summary</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(transaction => (
                  <TransactionSummaryRow 
                    key={transaction.transactionId} 
                    transaction={transaction} 
                    isAdmin={true}
                    onPatientClick={navigateToPatient}
                    onInvoiceClick={viewInvoice}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </Container>
  );
};

export default TransactionsVault;
