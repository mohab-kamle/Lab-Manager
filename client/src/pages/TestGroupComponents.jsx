import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container } from 'react-bootstrap';
import Toolbar from '../components/Toolbar';
import TablePagination from '../components/TablePagination';
import DynamicTable from '../components/DynamicTable';

const TestGroupComponents = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${apiUrl}/test-groups/components`, { headers });
        setComponents(response.data || []);
      } catch (err) {
        console.error('Error fetching components:', err);
        setComponents([]); // Set empty array instead of error
      } finally {
        setLoading(false);
      }
    };
    fetchComponents();
  }, [apiUrl]);

  const filteredComponents = components.filter((comp) => {
    const search = searchQuery.toLowerCase();
    return (
      comp.name?.toLowerCase().includes(search) ||
      comp.test_group?.name?.toLowerCase().includes(search) ||
      comp.category?.name?.toLowerCase().includes(search)
    );
  });

  const sortedComponents = [...filteredComponents].sort((a, b) => {
    if (!sortConfig.field) return 0;
    const valueA = a[sortConfig.field] ?? '';
    const valueB = b[sortConfig.field] ?? '';
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortConfig.direction === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
    }
    return 0;
  });

  const pageCount = Math.ceil(sortedComponents.length / itemsPerPage);
  const currentComponents = sortedComponents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Component Name' },
    { key: 'test_group', label: 'Test Group Name' },
    { key: 'category', label: 'Category Name' }
  ];

  const formatCellData = (value, header, row) => {
    if (header === 'test_group') return row.test_group?.name || '-';
    if (header === 'category') return row.category?.name || '-';
    return value;
  };

  return (
    <Container fluid style={{ padding: '2rem' }}>
      <h2>Test Group Components</h2>
      <p>This page lists all test group components. You can search, filter, and sort, but not edit.</p>
      {loading ? (
        <div className="spinner-border text-primary" role="status"></div>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <Toolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            sortableFields={columns.map(col => col.key)}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
          />
          <DynamicTable
            data={currentComponents}
            columns={columns.map(col => col.key)}
            columnLabels={columns.reduce((acc, col) => { acc[col.key] = col.label; return acc; }, {})}
            formatCellData={formatCellData}
            ActionComponent={null}
          />
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            handlePageChange={setCurrentPage}
          />
        </>
      )}
    </Container>
  );
};

export default TestGroupComponents; 