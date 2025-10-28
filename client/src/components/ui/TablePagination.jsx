import React from "react";
import { Pagination } from "react-bootstrap";

const TablePagination = ({ currentPage, pageCount, handlePageChange }) => {
  // Ensure pageCount is a valid, non-negative integer
  const validPageCount = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1;
  
  if (validPageCount === 0) return null; // Avoid rendering pagination if no pages exist

  const maxPagesToShow = 5; // Number of pages to show before using "..."
  const pages = [];

  if (validPageCount <= maxPagesToShow) {
    // Show all pages if total count is within the limit
    for (let i = 1; i <= validPageCount; i++) {
      pages.push(i);
    }
  } else {
    // Always show first and last pages, with ellipsis in between
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(validPageCount - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < validPageCount - 2) pages.push("...");
    pages.push(validPageCount);
  }

  return (
    <Pagination className="m-3">
      <Pagination.Prev
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
      />
      {pages.map((page, index) => (
        <Pagination.Item
          key={index}
          active={page === currentPage}
          disabled={page === "..."}
          onClick={() => page !== "..." && handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      ))}
      <Pagination.Next
        disabled={currentPage === validPageCount}
        onClick={() => handlePageChange(currentPage + 1)}
      />
    </Pagination>
  );
};

export default TablePagination;
