import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Table, Form, Row, Col, Button, InputGroup, Badge } from 'react-bootstrap';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Download, Funnel, Trash } from 'react-bootstrap-icons';
import api from '../../utils/api';
import TransactionSummaryRow from '../../components/ui/TransactionSummaryRow';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDateForInput } from '../../utils/dateFormatter';
import { useToast } from '../../components/ui/ToastContext';
import { useNavigate } from 'react-router-dom';

const TransactionsVault = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
        api.get('/employees'),
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
      if (curr.processType?.toLowerCase() === 'refund') {
        acc.refunds += amount;
        acc.net -= amount;
      } else {
        acc.processed += amount;
        acc.net += amount;
      }
      return acc;
    }, { processed: 0, refunds: 0, net: 0 });
  }, [filteredTransactions]);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Transaction ID', 'Date', 'Type', 'Method', 'Amount', 'Patient', 'Branch', 'Processed By', 'Summary'];
    const rows = filteredTransactions.map(t => [
      t.transactionId,
      new Date(t.date).toLocaleString(),
      t.processType,
      t.paidWith || 'N/A',
      t.amount,
      t.patientId || 'N/A',
      t.branchName,
      t.processedBy?.name || 'N/A',
      t.summary || ''
    ]);

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

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="bg-light rounded">
          <Form>
            <Row className="g-3">
              <Col md={4}>
                <InputGroup>
                  <InputGroup.Text className="bg-white border-end-0">
                    <Search className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by ID, summary, or patient..."
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="border-start-0"
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Select name="processType" value={filters.processType} onChange={handleFilterChange}>
                  <option value="">All Types</option>
                  <option value="Payment">Payment</option>
                  <option value="Refund">Refund</option>
                  <option value="Due">Due</option>
                  <option value="Credit">Credit</option>
                  <option value="Due Settlement">Due Settlement</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select name="paidWith" value={filters.paidWith} onChange={handleFilterChange}>
                  <option value="">All Payment Methods</option>
                  {paymentMethods.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select name="branch" value={filters.branch} onChange={handleFilterChange}>
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select name="employee" value={filters.employee} onChange={handleFilterChange}>
                  <option value="">All Employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                  <InputGroup size="sm">
                    <InputGroup.Text>From</InputGroup.Text>
                    <Form.Control 
                        type="date" 
                        name="startDate" 
                        value={filters.startDate} 
                        onChange={handleFilterChange} 
                    />
                  </InputGroup>
              </Col>
              <Col md={3}>
                  <InputGroup size="sm">
                    <InputGroup.Text>To</InputGroup.Text>
                    <Form.Control 
                        type="date" 
                        name="endDate" 
                        value={filters.endDate} 
                        onChange={handleFilterChange} 
                    />
                  </InputGroup>
              </Col>
              <Col md={6} className="text-end">
                  <Button variant="link" className="text-muted text-decoration-none small" onClick={clearFilters}>
                      <Trash className="me-1" /> Clear All Filters
                  </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

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
