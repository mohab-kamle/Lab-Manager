import React from 'react';
import { Table, Form } from 'react-bootstrap';
import { formatDate } from '../../utils/dateFormatter';
import PropTypes from 'prop-types';

const DynamicTable = ({ 
  data, 
  columns, 
  formatCellData, 
  ActionComponent,
  showCheckboxes = false,
  selectedItems = [],
  onSelectAll = null,
  onSelectItem = null,
  customHeaders = {},
  getItemLabel = null
}) => {
  const defaultFormatCellData = (value, header) => {
    // Handle null/undefined values
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // Handle date fields
    if (header.toLowerCase().includes('date') && value) {
      try {
        const date = new Date(value);
        return date instanceof Date && !isNaN(date) 
          ? formatDate(date)
          : '-';
      } catch {
        return '-';
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      return value.map(item => {
        if (item === null || item === undefined) return '-';
        if (typeof item === 'object') {
          return item.name || item.title || JSON.stringify(item);
        }
        return String(item);
      }).filter(Boolean).join(', ') || '-';
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return value.name || value.title || JSON.stringify(value);
    }

    // Handle numbers
    if (typeof value === 'number') {
      return isNaN(value) ? '-' : String(value);
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Default string conversion
    return String(value) || '-';
  };

  const formatter = formatCellData || defaultFormatCellData;

  const formatColumnHeader = (column) => {
    if (!column) return '';
    
    // Use custom header if provided, otherwise format the column name
    if (customHeaders[column]) {
      return customHeaders[column];
    }
    
    // Convert snake_case or camelCase to Title Case
    return column
      .split(/[_\s]|(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getRowLabel = (item, index) => {
    if (getItemLabel) return getItemLabel(item);
    // Smart fallback
    return item.name || item.title || item.patient_name || item.test_name || `Item ${index + 1}`;
  };

  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < data.length;

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            {showCheckboxes && (
              <th>
                <Form.Check
                  type="checkbox"
                  aria-label="Select all items"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th key={`header-${column}-${index}`}>
                {formatColumnHeader(column)}
              </th>
            ))}
            {ActionComponent && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr key={`row-${rowIndex}-${item.id || rowIndex}`}>
              {showCheckboxes && (
                <td>
                  <Form.Check
                    type="checkbox"
                    aria-label={`Select ${getRowLabel(item, rowIndex)}`}
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => onSelectItem && onSelectItem(item.id, e.target.checked)}
                  />
                </td>
              )}
              {columns.map((column, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}-${column}`}>
                  {formatter(item[column], column, item)}
                </td>
              ))}
              {ActionComponent && (
                <td>
                  <ActionComponent rowData={item} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

DynamicTable.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  formatCellData: PropTypes.func,
  ActionComponent: PropTypes.elementType,
  showCheckboxes: PropTypes.bool,
  selectedItems: PropTypes.array,
  onSelectAll: PropTypes.func,
  onSelectItem: PropTypes.func,
  customHeaders: PropTypes.object,
  getItemLabel: PropTypes.func
};

export default DynamicTable;
