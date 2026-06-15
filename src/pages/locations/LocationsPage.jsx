import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '@mui/material';

import {
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  Inbox as InboxIcon,
} from '@mui/icons-material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../../config';

import LocationSearch from './LocationSearch';
import AddLocationDialog from './AddLocationDialog';
import EditLocationDialog from './EditLocationDialog';

const LOCATION_API = `${API_BASE_URL}/api/locations`;

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const parseStoredJson = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};


const decodeJwtPayload = (token) => {
  if (!token || !String(token).includes('.')) return null;

  try {
    const base64Url = String(token).split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getCurrentUserFromStorage = () => {
  const directKeys = ['user', 'currentUser', 'authUser', 'loginUser'];

  for (const key of directKeys) {
    const parsed = parseStoredJson(localStorage.getItem(key));

    if (parsed) {
      const user = parsed.user || parsed.data || parsed;

      return {
        ...user,
        role: user?.role || localStorage.getItem('role') || '',
        bookingPermission: user?.bookingPermission || localStorage.getItem('bookingPermission') || 'NONE',
        canManageBooking:
          user?.canManageBooking ??
          user?.can_manage_booking ??
          (localStorage.getItem('canManageBooking') === 'true'),
      };
    }
  }

  return {
    id: localStorage.getItem('userId') || '',
    userId: localStorage.getItem('userId') || '',
    role: localStorage.getItem('role') || '',
    bookingPermission: localStorage.getItem('bookingPermission') || 'NONE',
    canManageBooking: localStorage.getItem('canManageBooking') === 'true',
  };
};

const getCurrentUserId = (user) => (
  user?.id ||
  user?.userId ||
  user?._id ||
  localStorage.getItem('userId') ||
  ''
);


const isMongoObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());


const getCurrentUserEmail = (user) => {
  const tokenPayload = decodeJwtPayload(localStorage.getItem('token'));

  const candidates = [
    user?.email,
    user?.mail,
    user?.emailAddress,
    localStorage.getItem('email'),
    localStorage.getItem('mail'),
    localStorage.getItem('emailAddress'),
    tokenPayload?.email,
    tokenPayload?.mail,
    tokenPayload?.emailAddress,
    tokenPayload?.preferred_username,
    tokenPayload?.sub,
  ];

  const email = candidates
    .map((item) => String(item || '').trim())
    .find((item) => item && item.includes('@') && !isMongoObjectId(item));

  return email || 'SYSTEM';
};

const isAdminRole = (role) => {
  const normalized = String(role || '').trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'ROLE_ADMIN';
};

const canManageBookingByUser = (user) => {
  if (!user) return false;

  return Boolean(user.canManageBooking)
    || String(user.bookingPermission || '').trim().toUpperCase() === 'BOOKING'
    || isAdminRole(user.role);
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

/* =========================
   Sorting helpers
   ========================= */
const dateKeys = new Set(['createdAt', 'updatedAt']);

const getDateComparableValue = (value) => {
  if (!value) return 0;

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, Number(month) - 1, day, hour, minute, second).getTime();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getComparableValue = (row, key) => {
  if (!row || !key) return '';

  const value = row?.[key];

  if (dateKeys.has(key)) {
    return getDateComparableValue(value);
  }

  return value == null ? '' : String(value).trim().toLowerCase();
};

const sortRowsClient = (rows, sortConfig) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!sortConfig?.key || !sortConfig?.direction) return rows;

  const dir = sortConfig.direction === 'desc' ? -1 : 1;
  const key = sortConfig.key;

  const withIndex = rows.map((r, i) => ({ r, i }));

  withIndex.sort((a, b) => {
    const va = getComparableValue(a.r, key);
    const vb = getComparableValue(b.r, key);

    let cmp = 0;

    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }

    if (cmp !== 0) return cmp * dir;
    return a.i - b.i;
  });

  return withIndex.map((x) => x.r);
};

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

export default function LocationsPage() {
  const pageWrapSx = useMemo(() => ({
    bgcolor: '#f7f7f7',
    minHeight: '100vh',
    p: 1.5,
    position: 'relative',
  }), []);

  const tableHeaders = useMemo(() => ([
    { label: 'No', key: 'no', align: 'center', sortable: false },
    { label: 'Location', key: 'location', align: 'left', sortable: true },
    { label: 'Created By', key: 'userIdCreate', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Created At', key: 'createdAt', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Updated At', key: 'updatedAt', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Actions', key: 'actions', align: 'center', sortable: false },
  ]), []);

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const [searchLocationInput, setSearchLocationInput] = useState('');
  const [searchLocationFilter, setSearchLocationFilter] = useState('');

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const realtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const currentUser = useMemo(() => getCurrentUserFromStorage(), []);
  const currentUserId = useMemo(() => getCurrentUserId(currentUser), [currentUser]);
  const currentUserEmail = useMemo(() => getCurrentUserEmail(currentUser), [currentUser]);
  const canManageLocationAction = useMemo(() => canManageBookingByUser(currentUser), [currentUser]);
  const actionDisabled = loading || !canManageLocationAction;

  const notifyNoPermission = useCallback((action = 'manage locations') => {
    setNotification({
      open: true,
      message: `You do not have permission to ${action}.`,
      severity: 'warning',
    });
  }, []);

  const fetchData = useCallback(async (overrides = {}) => {
    const silent = Boolean(overrides.silent);

    if (!silent) {
      setLoading(true);
    }

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effKeyword = overrides.keyword !== undefined ? overrides.keyword : searchLocationFilter;

    try {
      const response = await axios.get(LOCATION_API, {
        params: {
          keyword: effKeyword,
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

      if (!silent) {
        setData([]);
        setTotalElements(0);
        setNotification({
          open: true,
          message: error?.response?.data?.message || 'Failed to fetch locations.',
          severity: 'error',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [page, rowsPerPage, searchLocationFilter]);

  const refreshBySocket = useCallback(async (event) => {
    const module = String(event?.module || 'ALL').toUpperCase();

    const shouldRefresh =
      module === 'LOCATION' ||
      module === 'LOCATIONS' ||
      module === 'ROOM_BOOKING' ||
      module === 'ROOM_BOOKINGS' ||
      module === 'ALL';

    if (!shouldRefresh) return;

    await fetchData({ silent: true });
  }, [fetchData]);

  useEffect(() => {
    realtimeRefreshRef.current = refreshBySocket;
  });

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        client.subscribe('/topic/app-events', async (message) => {
          let event = null;

          try {
            event = JSON.parse(message.body);
          } catch {
            event = { module: 'ALL', action: 'UPDATED', id: '' };
          }

          if (socketRefreshingRef.current) return;

          socketRefreshingRef.current = true;

          try {
            await realtimeRefreshRef.current?.(event);
          } finally {
            socketRefreshingRef.current = false;
          }
        });
      },

      onStompError: (frame) => {
        console.error('Locations realtime STOMP error:', frame);
      },

      onWebSocketError: (error) => {
        console.error('Locations realtime socket error:', error);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    const nextKeyword = searchLocationInput.trim();
    setSearchLocationFilter(nextKeyword);
    setPage(0);
  }, [searchLocationInput]);

  const handleReset = useCallback(() => {
    setSearchLocationInput('');
    setSearchLocationFilter('');
    setPage(0);
  }, []);

  const handleOpenEdit = useCallback((item) => {
    if (!canManageLocationAction) {
      notifyNoPermission('edit location');
      return;
    }

    setCurrentItem(item);
    setOpenEditDialog(true);
  }, [canManageLocationAction, notifyNoPermission]);

  const handleDelete = useCallback((item) => {
    if (!canManageLocationAction) {
      notifyNoPermission('delete location');
      return;
    }

    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, [canManageLocationAction, notifyNoPermission]);

  const handleConfirmDelete = async () => {
    if (!canManageLocationAction) {
      notifyNoPermission('delete location');
      return;
    }

    if (!selectedItem?.id) return;

    setLoading(true);

    try {
      const response = await axios.delete(`${LOCATION_API}/${selectedItem.id}`, {
        headers: getAuthHeaders('*/*'),
      });

      const nextPage = data.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      await fetchData({ page: nextPage });

      setNotification({
        open: true,
        message: response?.data?.message || 'Location deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Delete location failed',
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

    setSortConfig({
      key: direction ? key : null,
      direction,
    });
  }, [loading, sortConfig, tableHeaders]);

  const sortedData = useMemo(() => (
    sortRowsClient(data, sortConfig)
  ), [data, sortConfig]);

  return (
    <Box sx={pageWrapSx}>
      <LocationSearch
        searchLocation={searchLocationInput}
        setSearchLocation={setSearchLocationInput}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={() => {
          if (!canManageLocationAction) {
            notifyNoPermission('add location');
            return;
          }

          setOpenAddDialog(true);
        }}
        addDisabled={!canManageLocationAction}
        canManageLocationAction={canManageLocationAction}
        disabled={loading}
      />

      {!canManageLocationAction && (
        <Alert severity="info" sx={{ mb: 1, borderRadius: 1.5 }}>
          You are in view-only mode. Location actions are disabled.
        </Alert>
      )}

      <Paper elevation={0} sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                {tableHeaders.map(({ label, key, align, sortable, hideOnSmall }) => {
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
                        userSelect: 'none',
                        ...(key === 'no' && { position: 'sticky', left: 0, zIndex: 3, width: 64 }),
                        ...(key === 'actions' && { width: 120 }),
                        ...(hideOnSmall && { display: { xs: 'none', md: 'table-cell' } }),
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="center"
                        justifyContent={align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'}
                      >
                        <Tooltip title={label} arrow>
                          <span>{label}</span>
                        </Tooltip>

                        {sortable && (
                          <Tooltip title="Sort" arrow>
                            <IconButton
                              size="small"
                              disabled={loading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSort(key);
                              }}
                              sx={{
                                p: 0.25,
                                border: '1px solid transparent',
                                '&:hover': { borderColor: '#e5e7eb', backgroundColor: '#eef2f7' },
                              }}
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
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        Loading locations...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : sortedData.length > 0 ? (
                sortedData.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';

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
                        {item.location || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 130 }}>
                        {item.userIdCreate || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.createdAt)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.updatedAt)}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip title={canManageLocationAction ? "Edit Location" : "No permission to edit location"} arrow>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={actionDisabled}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title={canManageLocationAction ? "Delete Location" : "No permission to delete location"} arrow>
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={actionDisabled}
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
                      <Typography sx={{ fontSize: '0.85rem' }}>No Locations Found</Typography>
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
            onPageChange={setPage}
            onRowsPerPageChange={(size) => {
              setRowsPerPage(size);
              setPage(0);
            }}
          />
        </Box>
      </Paper>

      <AddLocationDialog
        open={openAddDialog}
        disabled={actionDisabled}
        userIdCreate={currentUserEmail || currentUserId}
        onCancel={() => setOpenAddDialog(false)}
        onOk={() => {
          setOpenAddDialog(false);
          setPage(0);
          fetchData({ page: 0 });
        }}
      />

      <EditLocationDialog
        open={openEditDialog}
        currentItem={currentItem}
        disabled={actionDisabled}
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
            Delete location <b>{selectedItem?.location || ''}</b> ?
          </Typography>
          <Typography fontSize={12} color="warning.main" sx={{ mt: 1 }}>
            If this location is being used by room bookings, backend will block deletion.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedItem(null); }} disabled={loading}>
            No
          </Button>

          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={actionDisabled}>
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
