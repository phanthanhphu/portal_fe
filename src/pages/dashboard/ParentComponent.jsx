import React, { useState, useEffect } from 'react';
import GroupSearchBar from './GroupSearchBar';

const ParentComponent = () => {
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [pageSize, setPageSize] = useState(10); // Default page size
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(100); // Total items for pagination
  const [data, setData] = useState([]); // Your data for the table

  useEffect(() => {
    // Fetch data based on filters and pagination
    const fetchData = async () => {
      // Replace with your API logic
      const response = await fetch(
        `/api/data?page=${currentPage}&size=${pageSize}`
      );
      const result = await response.json();
      setData(result.data); // Set your table data
      setTotalItems(result.total); // Set the total number of items for pagination
    };

    fetchData();
  }, [currentPage, pageSize, nameFilter, statusFilter, createdByFilter, dateRange]);

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on search
  };

  const handleReset = () => {
    setNameFilter('');
    setStatusFilter('');
    setCreatedByFilter('');
    setDateRange([]);
    setCurrentPage(1); // Reset to first page on reset
  };

  const onPageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  return (
    <div>
      <GroupSearchBar
        nameFilter={nameFilter}
        statusFilter={statusFilter}
        createdByFilter={createdByFilter}
        dateRange={dateRange}
        setNameFilter={setNameFilter}
        setStatusFilter={setStatusFilter}
        setCreatedByFilter={setCreatedByFilter}
        setDateRange={setDateRange}
        handleSearch={handleSearch}
        handleReset={handleReset}
        totalItems={totalItems}
        onPageChange={onPageChange}
        pageSize={pageSize}
        setPageSize={setPageSize}
        data={data} // Pass the table data
      />
    </div>
  );
};

export default ParentComponent;
