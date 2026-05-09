import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Pagination,
  Chip,
} from '@mui/material';

import {
  Edit,
  Delete,
  Inbox as InboxIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

import DocumentTypeSearch from './DocumentTypeSearch';
import AddDocumentTypeDialog from './AddDocumentTypeDialog';
import EditDocumentTypeDialog from './EditDocumentTypeDialog';

const TYPE_API = `${API_BASE_URL}/api/document-types`;

const GW2_ITSM_LOGIN_URL = 'https://gw2.youngone.com/covicore/login.do?redirectItsm=Y';

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateTime = (value) => {
  if (!value) return '-';

  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute, second = 0] = value;
    return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
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

        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
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

export default function DocumentTypesPage() {
  const pageWrapSx = useMemo(() => ({
    bgcolor: '#f7f7f7',
    minHeight: '100vh',
    p: 1.5,
    position: 'relative',
  }), []);

  const tableHeaders = useMemo(() => ([
    { label: 'No', key: 'no', align: 'center' },
    { label: 'Type Name', key: 'name', align: 'left' },
    { label: 'Departments', key: 'departments', align: 'left', hideOnSmall: true },
    { label: 'Created At', key: 'createdAt', align: 'left', hideOnSmall: true },
    { label: 'Updated At', key: 'updatedAt', align: 'left', hideOnSmall: true },
    { label: 'Actions', key: 'actions', align: 'center' },
  ]), []);

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const [searchNameInput, setSearchNameInput] = useState('');
  const [searchNameFilter, setSearchNameFilter] = useState('');

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchData = useCallback(async (overrides = {}) => {
    setLoading(true);

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effName = overrides.name !== undefined ? overrides.name : searchNameFilter;

    try {
      const response = await axios.get(`${TYPE_API}/search`, {
        params: {
          name: effName,
          page: effPage,
          size: effSize,
        },
        headers: getAuthHeaders('*/*'),
      });

      const result = response?.data || {};
      const content = Array.isArray(result.content) ? result.content : [];

      setData(content);
      setTotalElements(Number(result.totalElements || 0));
    } catch (error) {
      console.error(error);
      setData([]);
      setTotalElements(0);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Failed to fetch document types.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchNameFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    const nextName = searchNameInput.trim();
    setSearchNameFilter(nextName);
    setPage(0);
  }, [searchNameInput]);

  const handleReset = useCallback(() => {
    setSearchNameInput('');
    setSearchNameFilter('');
    setPage(0);
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setCurrentItem(item);
    setOpenEditDialog(true);
  }, []);

  const handleDelete = useCallback((item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;

    setLoading(true);

    try {
      const response = await axios.delete(`${TYPE_API}/${selectedItem.id}`, {
        headers: getAuthHeaders('*/*'),
      });

      const nextPage = data.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      await fetchData({ page: nextPage });

      setNotification({
        open: true,
        message: response?.data?.message || 'Document Type deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Delete Document Type failed',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ open: false, message: '', severity: 'info' });
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (size) => {
    setRowsPerPage(size);
    setPage(0);
  };

  const handleOpenItsm = useCallback(() => {
    try {
      localStorage.setItem('portal_itsm_last_open_at', String(Date.now()));
    } catch (error) {
      // Ignore localStorage errors.
    }

    const openedWindow = window.open(GW2_ITSM_LOGIN_URL, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      window.location.href = GW2_ITSM_LOGIN_URL;
      return;
    }

    setNotification({
      open: true,
      message: 'Opened GW2 Login. If the ITSM extension is installed, it will redirect to ITSM after login.',
      severity: 'info',
    });
  }, []);

  return (
    <Box sx={pageWrapSx}>
      <Paper
        elevation={0}
        sx={{
          mb: 1,
          px: 1.25,
          py: 1,
          borderRadius: 1.5,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
              ITSM Access
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Click to open GW2 Login. After login, the client extension will redirect to ITSM.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<LaunchIcon fontSize="small" />}
            onClick={handleOpenItsm}
            disabled={loading}
            sx={{
              minHeight: 38,
              borderRadius: 1.4,
              textTransform: 'none',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #2749ff, #5ec6ff)',
              boxShadow: '0 12px 24px rgba(39, 73, 255, 0.22)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1734c8, #38bdf8)',
                boxShadow: '0 14px 28px rgba(39, 73, 255, 0.26)',
              },
            }}
          >
            Open ITSM
          </Button>
        </Stack>
      </Paper>

      <DocumentTypeSearch
        searchName={searchNameInput}
        setSearchName={setSearchNameInput}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={() => setOpenAddDialog(true)}
        disabled={loading}
      />

      <Paper elevation={0} sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                {tableHeaders.map(({ label, key, align, hideOnSmall }) => (
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
                      ...(key === 'actions' && { width: 120 }),
                      ...(hideOnSmall && { display: { xs: 'none', md: 'table-cell' } }),
                    }}
                  >
                    <Tooltip title={label} arrow>
                      <span>{label}</span>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tableHeaders.length} sx={{ py: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        Loading document types...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : data.length > 0 ? (
                data.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const departments = Array.isArray(item.departments) ? item.departments : [];

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

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 220 }}>
                        {item.name || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 260 }}>
                        {departments.length > 0 ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {departments.map((d) => (
                              <Chip
                                key={d.idDepartment || d.id || d.name}
                                label={d.name || d.departmentName || d.idDepartment || '-'}
                                size="small"
                                sx={{ height: 23, fontSize: '0.68rem', borderRadius: 999 }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            No departments
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.createdAt)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.updatedAt)}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip title="Edit Type" arrow>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete Type" arrow>
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading}
                                onClick={() => handleDelete(item)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
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
                      <Typography sx={{ fontSize: '0.85rem' }}>No Document Types Found</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
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
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Box>
      </Paper>

      <AddDocumentTypeDialog
        open={openAddDialog}
        disabled={loading}
        onCancel={() => setOpenAddDialog(false)}
        onOk={() => {
          setOpenAddDialog(false);
          setPage(0);
          fetchData({ page: 0 });
        }}
      />

      <EditDocumentTypeDialog
        open={openEditDialog}
        currentItem={currentItem}
        disabled={loading}
        onCancel={() => {
          setOpenEditDialog(false);
          setCurrentItem(null);
        }}
        onOk={() => {
          setOpenEditDialog(false);
          setCurrentItem(null);
          fetchData();
        }}
      />

      <Dialog open={deleteDialogOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>

        <DialogContent>
          <Typography>
            Delete document type <b>{selectedItem?.name || ''}</b> ?
          </Typography>
          {Array.isArray(selectedItem?.departments) && selectedItem.departments.length > 0 && (
            <Typography fontSize={12} color="warning.main" sx={{ mt: 1 }}>
              This type is linked to {selectedItem.departments.length} department(s). Please make sure the backend allows deletion.
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedItem(null); }} disabled={loading}>
            No
          </Button>

          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}
