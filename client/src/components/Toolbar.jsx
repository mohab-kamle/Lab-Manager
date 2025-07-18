import React from "react";
import "./Toolbar.css";

const Toolbar = ({
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  showDateFilter = false,
  dateFilter,
  setDateFilter,
  sortableFields = [],
  sortConfig = { field: "", direction: "asc" },
  setSortConfig,
  typeFilter = "all",
  setTypeFilter,
  showTypeFilter = false,
}) => {
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setItemsPerPage(value);
      setCurrentPage(1);
    }
  };

  const handleDateFilter = (range) => {
    const today = new Date();
    let startDate = today.toISOString().split("T")[0];
    let endDate = today.toISOString().split("T")[0];

    if (range === "lastWeek") {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      startDate = lastWeek.toISOString().split("T")[0];
    } else if (range === "lastMonth") {
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      startDate = lastMonth.toISOString().split("T")[0];
    }

    setDateFilter({ startDate, endDate });
  };

  const handleSortChange = (field) => {
    setSortConfig({
      field,
      direction: sortConfig.field === field && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const handleTypeFilterChange = (type) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar-wrapper">
        <div className="toolbar-section search-section">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="toolbar-section items-per-page-section">
          <div className="items-per-page-wrapper">
            <input 
              type="number" 
              value={itemsPerPage} 
              onChange={handleItemsPerPageChange} 
              min="1" 
              className="items-per-page-input"
            />
            <span className="items-per-page-label">Items per page</span>
          </div>
        </div>

        {showTypeFilter && (
          <div className="toolbar-section type-filter-section">
            <select 
              value={typeFilter || "all"} 
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="custom-select"
            >
              <option value="all">All Types</option>
              <option value="package">Packages</option>
              <option value="offer">Offers</option>
            </select>
          </div>
        )}

        <div className="toolbar-section sort-section">
          <select 
            value={sortConfig?.field || ""} 
            onChange={(e) => handleSortChange(e.target.value || "")}
            className="custom-select"
          >
            <option value="">No Sorting</option>
            {sortableFields.map((field) => (
              <option key={field} value={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {showDateFilter && (
          <div className="toolbar-section date-filter-section">
            <div className="date-inputs">
              <div className="date-input-group">
                <span>Start:</span>
                <input 
                  type="date" 
                  value={dateFilter.startDate} 
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <span>End:&nbsp;</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="date-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
