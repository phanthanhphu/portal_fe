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
  Pagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Select,
  MenuItem,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  Close,
  Inbox as InboxIcon,
  Visibility,
  Download,
} from '@mui/icons-material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import AddFormDialog from './AddFormDialog';
import EditFormDialog from './EditFormDialog';
import FormsSearchFilter from './FormsSearchFilter';

/* Axios client */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: '*/*',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/* Helpers */
const formatDate = (arr) => {
  if (!arr) return '-';
  const [y, m, d, hh = 0, mm = 0] = arr;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const getFileTypeFromUrl = (url) => {
  if (!url) return 'FILE';
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return 'IMAGE';
  if (lower.match(/\.(doc|docx)$/)) return 'DOC';
  return 'FILE';
};

const getFileTypeColor = (type) => ({
  PDF: '#dc2626',
  IMAGE: '#2563eb',
  DOC: '#16a34a',
  DOCX: '#16a34a',
  FILE: '#6b7280',
}[String(type || '').toUpperCase()] || '#6b7280');

const pillSx = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#fff',
  display: 'inline-flex',
  justifyContent: 'center',
  minWidth: 78,
};

const getFileName = (fileUrl) => {
  if (!fileUrl) return 'No file';
  try {
    return decodeURIComponent(fileUrl.split('/').pop().split('?')[0]) || 'file';
  } catch {
    return 'file';
  }
};

const getFullFileUrl = (fileUrl) => {
  if (!fileUrl) return '';
  let url = String(fileUrl).trim();
  if (!url.startsWith('http')) {
    url = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

const getPreviewKind = (fileName, mimeType = '') => {
  const name = String(fileName || '').toLowerCase();
  const lowerMime = String(mimeType || '').toLowerCase();
  if (lowerMime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (lowerMime.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf';
  if (/\.(doc|docx)$/i.test(name)) return 'doc';
  return 'other';
};

const emptyPreviewState = {
  open: false,
  loading: false,
  error: '',
  item: null,
  blobUrl: '',
  mimeType: '',
  fileName: '',
};

/* Headers */
const headers = [
  { label: 'No', key: 'no', sortable: false },
  { label: 'Department', key: 'department', sortable: true },
  { label: 'Title', key: 'title', sortable: true },
  { label: 'Description', key: 'description', sortable: true },
  { label: 'File', key: 'fileUrl', sortable: false },
  { label: 'Created At', key: 'createdAt', sortable: true },
  { label: 'Actions', key: 'actions', sortable: false },
];

/* Sort Indicator */
const SortIndicator = ({ active, direction }) => {
  if (!active) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2 }}>
        <ArrowUpward sx={{ fontSize: '0.7rem', color: '#9ca3af' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#9ca3af', mt: '-4px' }} />
      </Box>
    );
  }
  if (direction === 'asc') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2 }}>
        <ArrowUpward sx={{ fontSize: '0.85rem', color: '#6b7280' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#d1d5db', mt: '-4px' }} />
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.2 }}>
      <ArrowUpward sx={{ fontSize: '0.7rem', color: '#d1d5db' }} />
      <ArrowDownward sx={{ fontSize: '0.85rem', color: '#6b7280', mt: '-4px' }} />
    </Box>
  );
};

/* Pagination Bar */
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
          Showing <span style={{ color: '#111827' }}>{from}-{to}</span> of{' '}
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
            onChange={(_, p) => onPageChange(p - 1)}
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
            sx={{ height: 32, minWidth: 110, borderRadius: 1.2, '& .MuiSelect-select': { fontSize: '0.8rem' } }}
          >
            {[8, 12, 20, 50].map((n) => (
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

/* Main Component */
export default function FormListDialog() {
  const isLargeScreen = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const previewFullScreen = useMediaQuery((theme) => theme.breakpoints.down('md'));

  // Filter states
  const [searchDeptName, setSearchDeptName] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDesc, setSearchDesc] = useState('');

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isLargeScreen ? 20 : 12);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [previewState, setPreviewState] = useState(emptyPreviewState);

  const fetchData = useCallback(
    async (filters = {}, overrides = {}) => {
      setLoading(true);

      const effPage = overrides.page ?? page;
      const effSize = overrides.size ?? rowsPerPage;

      const params = {
        page: effPage,
        size: effSize,
        sort: `${sortConfig.key || 'createdAt'},${sortConfig.direction || 'desc'}`,
        ...filters,
      };

      console.log('API request params:', params);

      try {
        const response = await api.get('/api/forms/search', { params });
        const content = response.data?.content || [];
        const te = response.data?.totalElements || content.length;
        const tp = response.data?.totalPages || 1;

        setData(content);
        setTotalElements(te);
        setTotalPages(tp);
      } catch (error) {
        console.error('Error fetching forms:', error.response?.data || error.message);
        setNotification({ open: true, message: 'Failed to load forms', severity: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, sortConfig],
  );

  // Load dữ liệu ban đầu
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotification({ open: true, message: 'Please login to access this page.', severity: 'error' });
      window.location.href = '/login';
      return;
    }
    fetchData({}, { page: 0 });
  }, [fetchData]);

  useEffect(() => {
    setRowsPerPage(isLargeScreen ? 20 : 12);
    setPage(0);
  }, [isLargeScreen]);

  useEffect(() => {
    return () => {
      if (previewState.blobUrl) {
        URL.revokeObjectURL(previewState.blobUrl);
      }
    };
  }, [previewState.blobUrl]);

  const handleSort = useCallback(
    (key) => {
      if (loading) return;
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;

      setSortConfig({ key: direction ? key : null, direction });
      setPage(0);
    },
    [loading, sortConfig],
  );

  const sortLabel = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return 'default';
    return `${sortConfig.key},${sortConfig.direction}`;
  }, [sortConfig]);

  const handleSearch = useCallback(() => {
    setPage(0);
    const filters = {};
    if (searchDeptName?.trim()) filters.departmentName = searchDeptName.trim();
    if (searchTitle?.trim()) filters.title = searchTitle.trim();
    if (searchDesc?.trim()) filters.description = searchDesc.trim();

    fetchData(filters, { page: 0 });
  }, [fetchData, searchDeptName, searchTitle, searchDesc]);

  const handleResetFilter = useCallback(() => {
    setSearchDeptName('');
    setSearchTitle('');
    setSearchDesc('');
    setPage(0);
    fetchData({}, { page: 0 });
  }, [fetchData]);

  const handleCloseNotification = () => {
    setNotification({ open: false, message: '', severity: 'info' });
  };

  const closePreview = useCallback(() => {
    setPreviewState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return emptyPreviewState;
    });
  }, []);

  const handleOpenPreview = useCallback(async (item) => {
    const fullUrl = getFullFileUrl(item.fileUrl);
    const fileName = getFileName(item.fileUrl);

    if (!fullUrl) {
      setNotification({ open: true, message: 'No file to preview', severity: 'warning' });
      return;
    }

    setPreviewState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return { open: true, loading: true, error: '', item, blobUrl: '', mimeType: '', fileName };
    });

    try {
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: '*/*',
        },
      });

      const mimeType = response.headers['content-type'] || '';
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
      console.error('Preview error:', error);
      setPreviewState({
        open: true,
        loading: false,
        error: 'Unable to load file for preview. You can download it.',
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
      });
    }
  }, []);

  const handleDownload = useCallback(async (item) => {
    const fullUrl = getFullFileUrl(item.fileUrl);
    const fileName = getFileName(item.fileUrl) || 'file';

    if (!fullUrl) {
      setNotification({ open: true, message: 'No file to download', severity: 'warning' });
      return;
    }

    try {
      const response = await axios.get(fullUrl, {
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
      console.error('Download error:', error);
      setNotification({ open: true, message: 'Failed to download file.', severity: 'error' });
    }
  }, []);

  const previewKind = useMemo(
    () => getPreviewKind(previewState.fileName, previewState.mimeType),
    [previewState.fileName, previewState.mimeType],
  );

  return (
    <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', p: 1.5 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          mb: 1,
          borderRadius: 1.5,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack spacing={0.35}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              Forms
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Total: {totalElements} • Sort:{' '}
              <span style={{ color: '#111827' }}>{sortLabel}</span>
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={() => setOpenAdd(true)}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 999,               // bo tròn giống nút Add Notice
              px: 3,
              height: 38,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',  // gradient xanh - tím
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              '&:hover': {
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',  // hover sáng hơn
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Add Form
          </Button>
        </Stack>
      </Paper>

      {/* Search Filter */}
      <FormsSearchFilter
        searchDeptName={searchDeptName}
        setSearchDeptName={setSearchDeptName}
        searchTitle={searchTitle}
        setSearchTitle={setSearchTitle}
        searchDesc={searchDesc}
        setSearchDesc={setSearchDesc}
        onSearch={handleSearch}
        onReset={handleResetFilter}
        disabled={loading}
      />

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1.5,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        <TableContainer
          sx={{
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: '8px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: '8px' },
          }}
        >
          <Table stickyHeader size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                {headers.map(({ label, key, sortable }) => {
                  const align = ['No', 'Actions'].includes(label) ? 'center' : 'left';
                  const active = sortConfig.key === key && !!sortConfig.direction;

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
                        ...(key === 'no' && { position: 'sticky', left: 0, zIndex: 3, width: 64 }),
                        ...(key === 'actions' && { width: 110 }),
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="center"
                        justifyContent={align === 'center' ? 'center' : 'flex-start'}
                      >
                        <Tooltip title={label} arrow>
                          <span>{label}</span>
                        </Tooltip>
                        {sortable && (
                          <Tooltip title="Sort" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleSort(key)}
                              sx={{ p: 0.25 }}
                              disabled={loading}
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
                  <TableCell colSpan={headers.length} sx={{ py: 4 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <CircularProgress size={20} />
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        Loading...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} sx={{ py: 4 }}>
                    <Stack alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                      <InboxIcon sx={{ fontSize: 36, opacity: 0.5 }} />
                      <Typography>No Forms Found</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const fileName = getFileName(item.fileUrl);
                  const fileType = item.fileType || getFileTypeFromUrl(item.fileUrl);

                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: zebra,
                        '&:hover': { backgroundColor: '#f1f5f9' },
                        '& > *': { borderBottom: '1px solid #f3f4f6' },
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.45,
                          px: 0.7,
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          backgroundColor: zebra,
                        }}
                      >
                        {page * rowsPerPage + idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
                        {item.departmentName || '-'}
                        {item.division && (
                          <Typography component="span" sx={{ fontSize: '0.68rem', color: '#6b7280', ml: 1 }}>
                            ({item.division})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#111827' }}>
                        {item.title || '-'}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.75rem',
                          color: '#374151',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.description || '-'}
                      </TableCell>
                      <TableCell sx={{ py: 0.45, px: 0.7, minWidth: 240 }}>
                        {item.fileUrl ? (
                          <Stack spacing={0.5}>
                            <Tooltip title={fileName} arrow>
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: '#111827',
                                  fontWeight: 500,
                                  maxWidth: 220,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {fileName}
                              </Typography>
                            </Tooltip>
                            <Box sx={{ ...pillSx, minWidth: 60, mx: 0, backgroundColor: getFileTypeColor(fileType) }}>
                              {fileType}
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility fontSize="small" />}
                                onClick={() => handleOpenPreview(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Download fontSize="small" />}
                                onClick={() => handleDownload(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}
                              >
                                Download
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>No file</Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.75rem', color: '#374151', display: { xs: 'none', md: 'table-cell' } }}
                      >
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.3} justifyContent="center">
                          <Tooltip title="Edit Form" arrow>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => {
                                setCurrentItem(item);
                                setOpenEdit(true);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Form" arrow>
                            <IconButton color="error" size="small">
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />
        <Box sx={{ p: 1, backgroundColor: '#fff' }}>
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

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4500}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={notification.severity} onClose={handleCloseNotification}>
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Dialogs */}
      <AddFormDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={() => {
          setOpenAdd(false);
          fetchData({}, { page: 0 });
          setPage(0);
        }}
      />
      <EditFormDialog
        open={openEdit}
        form={currentItem}
        onClose={() => {
          setOpenEdit(false);
          setCurrentItem(null);
        }}
        onSuccess={() => {
          setOpenEdit(false);
          setCurrentItem(null);
          fetchData();
        }}
      />

      {/* Preview Dialog */}
      <Dialog
        open={previewState.open}
        onClose={closePreview}
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
                {previewState.fileName || 'Preview File'}
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                {previewState.item?.title || 'Form File'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {previewState.item && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownload(previewState.item)}
                  sx={{ textTransform: 'none' }}
                >
                  Download
                </Button>
              )}
              <IconButton onClick={closePreview}>
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
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleDownload(previewState.item)}
                  sx={{ textTransform: 'none' }}
                >
                  Download File
                </Button>
              )}
            </Stack>
          ) : previewState.blobUrl ? (
            <Box
              sx={{
                minHeight: '65vh',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
              }}
            >
              {previewKind === 'image' ? (
                <Box
                  component="img"
                  src={previewState.blobUrl}
                  alt={previewState.fileName}
                  sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
                />
              ) : previewKind === 'pdf' ? (
                <Box
                  component="iframe"
                  src={previewState.blobUrl}
                  title={previewState.fileName}
                  sx={{ width: '100%', height: previewFullScreen ? '78vh' : '72vh', border: 0 }}
                />
              ) : (
                <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh', p: 3, textAlign: 'center' }}>
                  <Typography fontWeight={600}>This file does not support direct preview.</Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    You can download the file to view it.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={() => handleDownload(previewState.item)}
                    sx={{ textTransform: 'none' }}
                  >
                    Download File
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
              <Typography color="text.secondary">No preview data available.</Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 2, py: 1.5 }}>
          <Button onClick={closePreview}>Close</Button>
          {previewState.item && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => handleDownload(previewState.item)}
              sx={{ textTransform: 'none' }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}