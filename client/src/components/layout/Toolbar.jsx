import React from "react";
import { Search, SortAsc, Calendar, Layers, ChevronRight, Hash } from "lucide-react";
import "../../styles/layout/Toolbar.css";

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
<<<<<<< HEAD
=======
  children,
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
}) => {
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setItemsPerPage(value);
      setCurrentPage(1);
    }
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

        {/* Left Side: Primary Search */}
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={18} className="icon-muted" />
            <input
              type="text"
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-input search-input"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right Side: Filters & Controls */}
        <div className="toolbar-right">
<<<<<<< HEAD
=======
          {children}
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e

          {showTypeFilter && (
            <div className="control-group">
              <Layers size={16} className="icon-primary" />
              <select
                value={typeFilter || "all"}
                onChange={(e) => handleTypeFilterChange(e.target.value)}
                className="ui-input ui-select"
                aria-label="Filter by type"
              >
                <option value="all">All Types</option>
                <option value="package">Packages</option>
                <option value="offer">Offers</option>
              </select>
            </div>
          )}

          {sortableFields.length > 0 && (
            <div className="control-group">
              <SortAsc size={16} className="icon-primary" />
              <select
                value={sortConfig?.field || ""}
                onChange={(e) => handleSortChange(e.target.value || "")}
                className="ui-input ui-select"
                aria-label="Sort by"
              >
                <option value="">Sort by...</option>
                {sortableFields.map((field) => (
                  <option key={field} value={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showDateFilter && (
            <div className="control-group date-range-group">
              <Calendar size={16} className="icon-primary" />
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="ui-input ui-date"
                  aria-label="Start date"
                />
                <ChevronRight size={14} className="icon-muted" />
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="ui-input ui-date"
                  aria-label="End date"
                />
              </div>
            </div>
          )}

          <div className="control-group limit-group">
            <span className="limit-label">Show</span>
            <input
              type="number"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              min="1"
              className="ui-input ui-number"
              aria-label="Items per page"
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Toolbar;