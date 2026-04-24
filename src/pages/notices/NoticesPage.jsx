// NoticesPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  IconButton,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Select,
  MenuItem,
  TextField,
  useMediaQuery,
  Pagination,
} from '@mui/material';

import {
  Add,
  Edit,
  Delete,
  Close,
  Inbox as InboxIcon,
  Visibility,
  Download,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

import AddNoticeDialog from './AddNoticeDialog';
import EditNoticeDialog from './EditNoticeDialog';

// Import từ utils
import {
  formatDateTime,
  getPinnedColor,
  pillSx,
  getNoticeFileUrl,
  getNoticeFileName,
  getFileTypeFromUrl,
  getFileTypeColor,
  getPreviewKind,
  emptyPreviewState,
  deleteNotice,
  sortRowsClient,
  headers as baseHeaders,
} from './noticesUtils';

// ==================== SORT INDICATOR COMPONENT ====================
const SortIndicator = ({ active, direction }) => {
  if (!active) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2, lineHeight: 0 }}>
        <ArrowUpward sx={{ fontSize: '0.7rem', color: '#9ca3af' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#9ca3af', mt: '-4px' }} />
      </Box>
    );
  }
  if (direction === 'asc') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2, lineHeight: 0 }}>
        <ArrowUpward sx={{ fontSize: '0.85rem', color: '#6b7280' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#d1d5db', mt: '-4px' }} />
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2, lineHeight: 0 }}>
      <ArrowUpward sx={{ fontSize: '0.7rem', color: '#d1d5db' }} />
      <ArrowDownward sx={{ fontSize: '0.85rem', color: '#6b7280', mt: '-4px' }} />
    </Box>
  );
};

function PaginationBar({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, loading }) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / (rowsPerPage || 1)));
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count || 0, (page + 1) * rowsPerPage);

  const btnSx = { textTransform: 'none', fontWeight: 400 };

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1,
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          Showing <span style={{ color: '#111827' }}>{from}</span>–<span style={{ color: '#111827' }}>{to}</span> of{' '}
          <span style={{ color: '#111827' }}>{count || 0}</span>
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          <Button
            variant="text"
            startIcon={<ChevronLeftIcon fontSize="small" />}
            disabled={loading || page <= 0}
            onClick={() => onPageChange(page - 1)}
            sx={btnSx}
          >
            Prev
          </Button>

          <Pagination
            size="small"
            page={page + 1}
            count={totalPages}
            onChange={(_, newPage) => onPageChange(newPage - 1)}
            disabled={loading}
            siblingCount={1}
            boundaryCount={1}
            sx={{ '& .MuiPaginationItem-root': { fontSize: '0.8rem', minWidth: 32, height: 32 } }}
          />

          <Button
            variant="text"
            endIcon={<ChevronRightIcon fontSize="small" />}
            disabled={loading || page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            sx={btnSx}
          >
            Next
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
        >
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Page size</Typography>
          <Select
            size="small"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            disabled={loading}
            sx={{
              height: 32,
              minWidth: 110,
              borderRadius: 1.2,
              '& .MuiSelect-select': { fontSize: '0.8rem' },
            }}
          >
            {[10, 12, 20, 50].map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
                {n} / page
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function NoticesPage() {
  const navigate = useNavigate();
  const isLargeScreen = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const previewFullScreen = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const pageWrapSx = useMemo(
    () => ({
      bgcolor: '#f7f7f7',
      minHeight: '100vh',
      p: 1.5,
      position: 'relative',
    }),
    []
  );

  const tableHeaders = useMemo(() => {
    const next = [...baseHeaders];

    const hasDivision = next.some((h) => h.key === 'division');
    const hasDepartmentName = next.some((h) => h.key === 'departmentName');
    const insertIndex = next.findIndex((h) => h.key === 'fileUrl');

    const extras = [];
    if (!hasDivision) {
      extras.push({ label: 'Division', key: 'division', sortable: true, hideOnSmall: true });
    }
    if (!hasDepartmentName) {
      extras.push({ label: 'Department', key: 'departmentName', sortable: true, hideOnSmall: true });
    }

    if (extras.length > 0) {
      if (insertIndex >= 0) {
        next.splice(insertIndex, 0, ...extras);
      } else {
        next.push(...extras);
      }
    }

    return next;
  }, []);

  // State variables
  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isLargeScreen ? 20 : 12);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const [searchDivisionInput, setSearchDivisionInput] = useState('');
  const [searchDepartmentInput, setSearchDepartmentInput] = useState('');
  const [searchTitleInput, setSearchTitleInput] = useState('');
  const [searchContentInput, setSearchContentInput] = useState('');

  const [searchDivisionFilter, setSearchDivisionFilter] = useState('');
  const [searchDepartmentFilter, setSearchDepartmentFilter] = useState('');
  const [searchTitleFilter, setSearchTitleFilter] = useState('');
  const [searchContentFilter, setSearchContentFilter] = useState('');

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [previewState, setPreviewState] = useState(emptyPreviewState);

  // Fetch data function
  const fetchData = useCallback(async (overrides = {}) => {
    setLoading(true);

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effSearchDivision = overrides.searchDivision !== undefined ? overrides.searchDivision : searchDivisionFilter;
    const effSearchDepartment = overrides.searchDepartment !== undefined ? overrides.searchDepartment : searchDepartmentFilter;
    const effSearchTitle = overrides.searchTitle !== undefined ? overrides.searchTitle : searchTitleFilter;
    const effSearchContent = overrides.searchContent !== undefined ? overrides.searchContent : searchContentFilter;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/notices/search`, {
        params: {
          division: effSearchDivision,
          departmentName: effSearchDepartment,
          title: effSearchTitle,
          content: effSearchContent,
          page: effPage,
          size: effSize,
          sort: 'createdAt,desc',
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: '*/*',
        },
      });

      const result = response?.data || {};
      const finalData = sortRowsClient(result.content || [], sortConfig);

      setData(finalData);
      setTotalElements(result.totalElements || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error(error);
      setData([]);
      setTotalElements(0);
      setTotalPages(1);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Failed to fetch notices.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchDivisionFilter, searchDepartmentFilter, searchTitleFilter, searchContentFilter, sortConfig]);

  // Check token and fetch data on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotification({ open: true, message: 'Please login to access this page.', severity: 'error' });
      navigate('/login');
      return;
    }
    fetchData();
  }, [fetchData, navigate]);

  // Update rowsPerPage when screen size changes
  useEffect(() => {
    setRowsPerPage(isLargeScreen ? 20 : 12);
    setPage(0);
  }, [isLargeScreen]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (previewState.blobUrl) {
        URL.revokeObjectURL(previewState.blobUrl);
      }
    };
  }, [previewState.blobUrl]);

  // Search handler
  const handleSearch = useCallback(() => {
    setSearchDivisionFilter(searchDivisionInput.trim());
    setSearchDepartmentFilter(searchDepartmentInput.trim());
    setSearchTitleFilter(searchTitleInput.trim());
    setSearchContentFilter(searchContentInput.trim());
    setPage(0);
  }, [searchDivisionInput, searchDepartmentInput, searchTitleInput, searchContentInput]);

  // Reset search handler
  const handleReset = useCallback(() => {
    setSearchDivisionInput('');
    setSearchDepartmentInput('');
    setSearchTitleInput('');
    setSearchContentInput('');
    setSearchDivisionFilter('');
    setSearchDepartmentFilter('');
    setSearchTitleFilter('');
    setSearchContentFilter('');
    setPage(0);
  }, []);

  // Open edit dialog
  const handleOpenEdit = useCallback((item) => {
    if (!item?.id) return;
    setCurrentItem(item);
    setOpenEditDialog(true);
  }, []);

  // Open single delete confirmation
  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  // Confirm single delete
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    setLoading(true);
    const { success, message } = await deleteNotice(selectedItem.id);

    if (success) {
      await fetchData();
    }

    setNotification({ open: true, message, severity: success ? 'success' : 'error' });
    setLoading(false);
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  // Sort handler
  const handleSort = useCallback((key) => {
    if (loading) return;

    const meta = tableHeaders.find((h) => h.key === key);
    if (!meta?.sortable) return;

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }

    const nextSort = { key: direction ? key : null, direction };
    setSortConfig(nextSort);
    setPage(0);
    fetchData({ page: 0 });
  }, [loading, sortConfig, fetchData, tableHeaders]);

  const handleCloseNotification = () => {
    setNotification({ open: false, message: '', severity: 'info' });
  };

  const closePreviewDialog = useCallback(() => {
    setPreviewState((prev) => {
      if (prev.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return emptyPreviewState;
    });
  }, []);

  const handleOpenPreview = useCallback(async (item) => {
    const fileUrl = getNoticeFileUrl(item);
    const fileName = getNoticeFileName(item);

    if (!fileUrl) {
      setNotification({ open: true, message: 'This notice has no file to preview.', severity: 'warning' });
      return;
    }

    setPreviewState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return { open: true, loading: true, error: '', item, blobUrl: '', mimeType: '', fileName };
    });

    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: '*/*',
        },
      });

      const mimeType = response?.data?.type || response?.headers?.['content-type'] || '';
      const blobUrl = URL.createObjectURL(response.data);

      setPreviewState({
        open: true,
        loading: false,
        error: '',
        item,
        blobUrl,
        mimeType,
        fileName,
      });
    } catch (error) {
      setPreviewState({
        open: true,
        loading: false,
        error: 'Failed to load file for preview.',
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
      });
    }
  }, []);

  const handleDownloadFile = useCallback(async (item) => {
    const fileUrl = getNoticeFileUrl(item);
    const fileName = getNoticeFileName(item) || 'file';

    if (!fileUrl) {
      setNotification({ open: true, message: 'This notice has no file to download.', severity: 'warning' });
      return;
    }

    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: '*/*',
        },
      });

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      setNotification({ open: true, message: 'File downloaded successfully.', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Failed to download file.', severity: 'error' });
    }
  }, []);

  const previewKind = useMemo(() => {
    return getPreviewKind(previewState.item, previewState.mimeType);
  }, [previewState.item, previewState.mimeType]);

  return (
    <Box sx={pageWrapSx}>
      {/* Filter Section + Add Button */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notices Filter
          </Typography>

          <Button
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={() => setOpenAddDialog(true)}
            disabled={loading}
            sx={{
              borderRadius: 1.2,
              height: 34,
              px: 1.25,
              textTransform: 'none',
              fontWeight: 400,
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Add Notice
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" alignItems={{ md: 'flex-end' }}>
          <TextField
            label="Division"
            size="small"
            value={searchDivisionInput}
            onChange={(e) => setSearchDivisionInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 200 }, '& .MuiInputBase-root': { height: 38 } }}
          />

          <TextField
            label="Department Name"
            size="small"
            value={searchDepartmentInput}
            onChange={(e) => setSearchDepartmentInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 220 }, '& .MuiInputBase-root': { height: 38 } }}
          />

          <TextField
            label="Title"
            size="small"
            value={searchTitleInput}
            onChange={(e) => setSearchTitleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 220 }, '& .MuiInputBase-root': { height: 38 } }}
          />

          <TextField
            label="Content"
            size="small"
            value={searchContentInput}
            onChange={(e) => setSearchContentInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 220 }, '& .MuiInputBase-root': { height: 38 } }}
          />

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              height: 34,
              minWidth: 92,
              px: 2.5,
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 400,
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Search
          </Button>

          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{
              height: 34,
              minWidth: 92,
              px: 2.5,
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 400,
              borderColor: '#111827',
              color: '#111827',
              '&:hover': {
                borderColor: '#0b1220',
                color: '#0b1220',
                backgroundColor: 'rgba(17, 24, 39, 0.04)',
              },
            }}
          >
            Reset
          </Button>
        </Stack>
        </Stack>
      </Paper>

      {/* Main Table */}
      <Paper elevation={0} sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                {tableHeaders.map(({ label, key, sortable, hideOnSmall }) => {
                  const align = ['No', 'Pinned', 'Actions'].includes(label) ? 'center' : 'left';
                  const active = sortConfig.key === key && !!sortConfig.direction;
                  const stickyNo = key === 'no';
                  const hideXs = hideOnSmall ? { display: { xs: 'none', md: 'table-cell' } } : {};

                  return (
                    <TableCell
                      key={key}
                      align={align}
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#111827',
                        backgroundColor: '#f3f4f6',
                        borderBottom: '1px solid #e5e7eb',
                        py: 0.6,
                        px: 0.7,
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        ...(stickyNo && { position: 'sticky', left: 0, zIndex: 3, width: 64 }),
                        ...(key === 'actions' && { width: 120 }),
                        ...hideXs,
                      }}
                    >
                      <Stack direction="row" spacing={0.6} alignItems="center" justifyContent={align === 'center' ? 'center' : 'flex-start'}>
                        <Tooltip title={label} arrow>
                          <span>{label}</span>
                        </Tooltip>
                        {sortable && (
                          <Tooltip title="Sort" arrow>
                            <IconButton
                              size="small"
                              disabled={loading}
                              onClick={(e) => { e.stopPropagation(); handleSort(key); }}
                              sx={{ p: 0.25 }}
                            >
                              <SortIndicator active={active} direction={sortConfig.direction} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tableHeaders.length} sx={{ py: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Loading data...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : data.length > 0 ? (
                data.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const pinnedColor = getPinnedColor(item.pinned);
                  const fileUrl = getNoticeFileUrl(item);
                  const fileName = getNoticeFileName(item);
                  const fileType = getFileTypeFromUrl(item);

                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: zebra,
                        '&:hover': { backgroundColor: '#f1f5f9' },
                        '& > *': { borderBottom: '1px solid #f3f4f6' },
                      }}
                    >
                      <TableCell align="center" sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, position: 'sticky', left: 0, zIndex: 2, backgroundColor: zebra }}>
                        {page * rowsPerPage + idx + 1}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 180 }}>
                        {item.title || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 220, maxWidth: 320 }}>
                        {item.content || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 120 }}>
                        {item.division || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 160 }}>
                        {item.departmentName || '-'}
                      </TableCell>

                      <TableCell sx={{ py: 0.45, px: 0.7, minWidth: 240 }}>
                        {fileUrl ? (
                          <Stack spacing={0.5}>
                            <Tooltip title={fileName || 'Attached file'} arrow>
                              <Typography sx={{ fontSize: '0.75rem', color: '#111827', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fileName || 'Attached file'}
                              </Typography>
                            </Tooltip>
                            <Box sx={{ ...pillSx, minWidth: 60, mx: 0, backgroundColor: getFileTypeColor(fileType) }}>
                              {fileType}
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="outlined" startIcon={<Visibility fontSize="small" />} onClick={() => handleOpenPreview(item)} sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}>
                                View
                              </Button>
                              <Button size="small" variant="outlined" startIcon={<Download fontSize="small" />} onClick={() => handleDownloadFile(item)} sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}>
                                Download
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>No file</Typography>
                        )}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Box sx={{ ...pillSx, backgroundColor: pinnedColor }}>
                          {item.pinned ? 'Pinned' : 'Normal'}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' } }}>
                        {item.userId || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 140 }}>
                        {formatDateTime(item.createdAt)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 140 }}>
                        {formatDateTime(item.updatedAt)}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip title="Edit Notice" arrow>
                            <IconButton color="primary" size="small" sx={{ p: 0.25 }} onClick={() => handleOpenEdit(item)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Notice" arrow>
                            <IconButton color="error" size="small" sx={{ p: 0.25 }} disabled={loading} onClick={() => handleDelete(item)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={tableHeaders.length} sx={{ py: 3 }}>
                    <Stack direction="column" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                      <InboxIcon sx={{ fontSize: 30, opacity: 0.6 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>No Notices Found</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />
        <Box sx={{ p: 1.0, backgroundColor: '#fff' }}>
          <PaginationBar
            count={totalElements}
            page={page}
            rowsPerPage={rowsPerPage}
            loading={loading}
            onPageChange={(p) => setPage(p)}
            onRowsPerPageChange={(size) => {
              setRowsPerPage(size);
              setPage(0);
            }}
          />
        </Box>
      </Paper>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4500}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ fontSize: '0.85rem' }}>
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Add Notice Dialog */}
      <AddNoticeDialog
        open={openAddDialog}
        onCancel={() => setOpenAddDialog(false)}
        onOk={() => {
          setOpenAddDialog(false);
          fetchData({ page: 0 });
          setPage(0);
        }}
      />

      {/* Edit Notice Dialog */}
      <EditNoticeDialog
        open={openEditDialog}
        currentItem={currentItem}
        onCancel={() => {
          setOpenEditDialog(false);
          setCurrentItem(null);
        }}
        onOk={() => {
          setOpenEditDialog(false);
          setCurrentItem(null);
          fetchData({ page });
        }}
      />

      {/* Preview Dialog */}
      <Dialog
        open={previewState.open}
        onClose={closePreviewDialog}
        fullScreen={previewFullScreen}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: previewFullScreen ? 0 : 2,
            minHeight: previewFullScreen ? '100%' : '80vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>
                {previewState.fileName || 'Preview file'}
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                {previewState.item?.title || 'Notice file'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {previewState.item && (
                <Button variant="outlined" startIcon={<Download />} onClick={() => handleDownloadFile(previewState.item)} sx={{ textTransform: 'none' }}>
                  Download
                </Button>
              )}
              <IconButton onClick={closePreviewDialog}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2, backgroundColor: '#f8fafc' }}>
          {previewState.loading ? (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh' }}>
              <CircularProgress />
              <Typography color="text.secondary">Loading file...</Typography>
            </Stack>
          ) : previewState.error ? (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh', textAlign: 'center' }}>
              <Typography color="error">{previewState.error}</Typography>
              {previewState.item && (
                <Button variant="contained" startIcon={<Download />} onClick={() => handleDownloadFile(previewState.item)} sx={{ textTransform: 'none' }}>
                  Download file
                </Button>
              )}
            </Stack>
          ) : previewState.blobUrl ? (
            <Box sx={{ minHeight: '65vh', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              {previewKind === 'image' ? (
                <Box component="img" src={previewState.blobUrl} alt={previewState.fileName} sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block', backgroundColor: '#fff' }} />
              ) : previewKind === 'pdf' ? (
                <Box component="iframe" src={previewState.blobUrl} title={previewState.fileName} sx={{ width: '100%', height: previewFullScreen ? '78vh' : '72vh', border: 0, display: 'block' }} />
              ) : (
                <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh', p: 3, textAlign: 'center' }}>
                  <Typography fontWeight={600}>This file does not support direct preview in the popup.</Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    You can still download the file to open it with the appropriate application.
                  </Typography>
                  <Button variant="contained" startIcon={<Download />} onClick={() => handleDownloadFile(previewState.item)} sx={{ textTransform: 'none' }}>
                    Download file
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh' }}>
              <Typography color="text.secondary">No preview data available.</Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 2, py: 1.5 }}>
          <Button onClick={closePreviewDialog}>Close</Button>
          {previewState.item && (
            <Button variant="contained" startIcon={<Download />} onClick={() => handleDownloadFile(previewState.item)} sx={{ textTransform: 'none' }}>
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Notice</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this notice?</Typography>
          {selectedItem && (
            <Typography sx={{ mt: 1, fontWeight: 500 }}>{selectedItem.title}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
