import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
} from '@mui/material';

import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  Close,
  Inbox as InboxIcon,
} from '@mui/icons-material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import AddAppLinkDialog from './AddAppLinkDialog';
import EditAppLinkDialog from './EditAppLinkDialog';
import AppLinkSearch from './AppLinkSearch';

/* =========================
   Axios client
   ========================= */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: '*/*', 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/* =========================
   Helpers
   ========================= */
const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl) return '';
  const value = String(rawUrl).trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('data:image/')) return value;

  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${cleanBase}${cleanPath}`;
};

const getImageField = (item) => {
  return item?.icon || item?.image || item?.imageUrl || item?.filePath || item?.path || item?.thumbnail || '';
};

const getLoggedInUserId = () => {
  try {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id || user?.userId || user?._id || '';
    }
  } catch (e) {
    console.error('Cannot parse user from localStorage', e);
  }

  return localStorage.getItem('userId') || '';
};

const parseJsonSafely = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getStoredCurrentUser = () => {
  const userKeys = ['user', 'currentUser', 'authUser', 'userInfo'];

  for (const key of userKeys) {
    const user = parseJsonSafely(localStorage.getItem(key));
    if (user) return user;
  }

  return {};
};

const normalizeAccessText = (value) => String(value || '').trim().toUpperCase();

const isAdminRole = (roleValue) => {
  if (Array.isArray(roleValue)) {
    return roleValue.some((role) => isAdminRole(role));
  }

  if (roleValue && typeof roleValue === 'object') {
    return isAdminRole(roleValue.name || roleValue.role || roleValue.authority);
  }

  const role = normalizeAccessText(roleValue);
  return role === 'ADMIN' || role === 'ROLE_ADMIN';
};

const isUserAdmin = (user = {}) => {
  return (
    isAdminRole(user?.role) ||
    isAdminRole(user?.roleName) ||
    isAdminRole(user?.roles) ||
    isAdminRole(user?.authorities)
  );
};

const isITDepartmentName = (value) => {
  const department = normalizeAccessText(value);
  if (!department) return false;

  return (
    department === 'IT' ||
    department === 'IT DEPARTMENT' ||
    department === 'INFORMATION TECHNOLOGY' ||
    department === 'INFORMATION TECHNOLOGY DEPARTMENT'
  );
};

const isUserInITDepartment = (user = {}, accessInfo = {}) => {
  const departmentObject = user?.department && typeof user.department === 'object' ? user.department : {};

  const candidates = [
    user?.departmentName,
    user?.department,
    user?.deptName,
    user?.dept,
    user?.departmentCode,
    user?.departmentId,
    user?.idDepartment,
    departmentObject?.name,
    departmentObject?.departmentName,
    departmentObject?.code,
    departmentObject?.id,
    accessInfo?.currentDepartmentName,
    accessInfo?.currentDepartmentCode,
    accessInfo?.currentDepartmentId,
  ];

  return candidates.some((candidate) => isITDepartmentName(candidate));
};

const canUserManageAppLinks = (user = {}, accessInfo = {}) => {
  return Boolean(accessInfo?.isAdmin) || isUserAdmin(user) || isUserInITDepartment(user, accessInfo);
};

const APP_LINK_MANAGE_DENIED_MESSAGE = 'Only Admin or IT department users can add, edit, or delete App Links.';

/* =========================
   Headers
   ========================= */
const headers = [
  { label: 'No', key: 'no', sortable: false, hideOnSmall: false },
  { label: 'Icon', key: 'icon', sortable: false, hideOnSmall: false },
  { label: 'Name', key: 'name', sortable: true, hideOnSmall: false },
  { label: 'URL', key: 'url', sortable: true, hideOnSmall: false },
  { label: 'Description', key: 'desc', sortable: true, hideOnSmall: true },
  { label: 'Department', key: 'departmentName', sortable: true, hideOnSmall: true },
  { label: 'Actions', key: 'actions', sortable: false, hideOnSmall: false },
];

/* =========================
   API functions
   ========================= */
const fetchAppLinks = async (page = 0, size = 12, name = '', desc = '') => {
  try {
    const loggedInUserId = getLoggedInUserId();

    if (!loggedInUserId) {
      throw new Error('Logged-in user ID was not found.');
    }

    const params = new URLSearchParams();
    params.append('userId', loggedInUserId);
    params.append('skipDepartmentFilter', 'true');
    params.append('page', String(page));
    params.append('size', String(size));

    if (name?.trim()) params.append('name', name.trim());
    if (desc?.trim()) params.append('desc', desc.trim());

    const response = await apiClient.get(`/api/app-links/search?${params.toString()}`);

    const rawData = response.data;
    const content = Array.isArray(rawData) ? rawData : (rawData?.content || []);
    const totalElements = Array.isArray(rawData) ? rawData.length : (rawData?.totalElements || rawData?.length || 0);
    const totalPages = Array.isArray(rawData) ? 1 : (rawData?.totalPages || 1);

    return {
      content,
      totalElements,
      totalPages,
      isAdmin: Boolean(rawData?.isAdmin),
      currentDepartmentId: rawData?.currentDepartmentId || '',
      currentDepartmentName: rawData?.currentDepartmentName || rawData?.departmentName || '',
      currentDepartmentCode: rawData?.currentDepartmentCode || rawData?.departmentCode || '',
      disableDepartmentSelect: Boolean(rawData?.disableDepartmentSelect),
    };
  } catch (error) {
    console.error('Error fetching app links:', error.response?.data || error.message);

    return {
      content: [],
      totalElements: 0,
      totalPages: 1,
      isAdmin: false,
      currentDepartmentId: '',
      currentDepartmentName: '',
      currentDepartmentCode: '',
      disableDepartmentSelect: true,
    };
  }
};

const deleteAppLink = async (id) => {
  try {
    const loggedInUserId = getLoggedInUserId();

    if (!loggedInUserId) {
      throw new Error('Logged-in user ID was not found.');
    }

    const response = await apiClient.delete(`/api/app-links/${id}`, {
      params: {
        userId: loggedInUserId,
      },
    });

    return { success: true, message: response.data?.message || 'App Link deleted successfully' };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to delete App Link',
    };
  }
};

const fetchCurrentUserAccess = async () => {
  const loggedInUserId = getLoggedInUserId();
  const storedUser = getStoredCurrentUser();

  if (!loggedInUserId) return storedUser;

  try {
    const response = await apiClient.get(`/api/users/${loggedInUserId}`);
    const latestUser = response?.data?.data || response?.data?.user || response?.data || {};

    return {
      ...storedUser,
      ...latestUser,
    };
  } catch (error) {
    console.warn('Cannot load current user access info. Falling back to localStorage.', error);
    return storedUser;
  }
};

/* =========================
   Sorting helpers
   ========================= */
const getComparableValue = (row, key) => {
  const value = row?.[key];
  return value == null ? '' : String(value).trim().toLowerCase();
};

const sortRowsClient = (rows, sortConfig) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  if (!sortConfig?.key || !sortConfig?.direction) return rows;

  const dir = sortConfig.direction === 'desc' ? -1 : 1;
  const key = sortConfig.key;

  const withIndex = rows.map((r, i) => ({ r, i }));
  withIndex.sort((a, b) => {
    const va = getComparableValue(a.r, key);
    const vb = getComparableValue(b.r, key);
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp * dir;
    return a.i - b.i;
  });

  return withIndex.map((x) => x.r);
};

/* SortIndicator */
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

/* PaginationBar */
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
            onChange={(_, p1) => onPageChange(p1 - 1)}
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
            sx={{ height: 32, minWidth: 110, borderRadius: 1.2, '& .MuiSelect-select': { fontSize: '0.8rem' } }}
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

/* =========================
   Main Component
   ========================= */
export default function AppLinksPage() {
  const navigate = useNavigate();

  const btnSx = useMemo(() => ({ textTransform: 'none', fontWeight: 400 }), []);
  const pageWrapSx = useMemo(() => ({ bgcolor: '#f7f7f7', minHeight: '100vh', p: 1.5 }), []);

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isITDepartmentUser, setIsITDepartmentUser] = useState(false);
  const [canManageAppLinks, setCanManageAppLinks] = useState(() => canUserManageAppLinks(getStoredCurrentUser()));
  const [currentDepartmentId, setCurrentDepartmentId] = useState('');
  const [disableDepartmentSelect, setDisableDepartmentSelect] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Giá trị hiển thị trong input
  const [searchName, setSearchName] = useState('');
  const [searchDesc, setSearchDesc] = useState('');

  // Giá trị thực tế dùng để gọi API (chỉ cập nhật khi bấm Search)
  const [filterName, setFilterName] = useState('');
  const [filterDesc, setFilterDesc] = useState('');

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const appLinksRealtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);

  /* ====================== FETCH DATA ====================== */
  const fetchData = useCallback(
    async (overrides = {}, options = {}) => {
      const showLoading = options.showLoading !== false;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const effPage = overrides.page !== undefined ? overrides.page : page;
        const effSize = overrides.size !== undefined ? overrides.size : rowsPerPage;
        const effSort = overrides.sortConfig ?? sortConfig;
        const effName = overrides.name !== undefined ? overrides.name : filterName;
        const effDesc = overrides.desc !== undefined ? overrides.desc : filterDesc;

        const [latestUser, result] = await Promise.all([
          fetchCurrentUserAccess(),
          fetchAppLinks(effPage, effSize, effName, effDesc),
        ]);
        const finalData = sortRowsClient(result.content, effSort);
        const accessInfo = {
          isAdmin: Boolean(result.isAdmin),
          currentDepartmentId: result.currentDepartmentId || '',
          currentDepartmentName: result.currentDepartmentName || '',
          currentDepartmentCode: result.currentDepartmentCode || '',
        };
        const roleIsAdmin = Boolean(result.isAdmin) || isUserAdmin(latestUser);
        const userIsIT = isUserInITDepartment(latestUser, accessInfo);

        setData(finalData);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
        setIsAdmin(roleIsAdmin);
        setIsITDepartmentUser(userIsIT);
        setCanManageAppLinks(roleIsAdmin || userIsIT);
        setCurrentDepartmentId(result.currentDepartmentId || '');
        setDisableDepartmentSelect(Boolean(result.disableDepartmentSelect));
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [page, rowsPerPage, sortConfig, filterName, filterDesc]
  );


  const refreshAppLinksBySocket = useCallback(
    async (event) => {
      const module = String(event?.module || 'ALL').toUpperCase();

      const shouldRefresh =
        module === 'APP_LINK' ||
        module === 'APP_LINKS' ||
        module === 'APPLINK' ||
        module === 'APPLINKS' ||
        module === 'DEPARTMENT' ||
        module === 'DEPARTMENTS' ||
        module === 'ALL';

      if (!shouldRefresh) return;

      console.log('AppLinks page refreshing by socket:', event);

      await fetchData(
        {
          page,
          size: rowsPerPage,
          sortConfig,
          name: filterName,
          desc: filterDesc,
        },
        { showLoading: false }
      );

      console.log('AppLinks page data updated by socket:', `${module} ${event?.action || ''}`.trim());
    },
    [fetchData, page, rowsPerPage, sortConfig, filterName, filterDesc]
  );

  useEffect(() => {
    appLinksRealtimeRefreshRef.current = refreshAppLinksBySocket;
  });

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        console.log('AppLinks realtime connected');

        client.subscribe('/topic/app-events', async (message) => {
          let event = null;

          try {
            event = JSON.parse(message.body);
          } catch {
            event = {
              module: 'ALL',
              action: 'UPDATED',
              id: '',
            };
          }

          console.log('AppLinks realtime event received:', event);

          const module = String(event?.module || 'ALL').toUpperCase();
          const shouldRefresh =
            module === 'APP_LINK' ||
            module === 'APP_LINKS' ||
            module === 'APPLINK' ||
            module === 'APPLINKS' ||
            module === 'DEPARTMENT' ||
            module === 'DEPARTMENTS' ||
            module === 'ALL';

          if (!shouldRefresh) return;
          if (socketRefreshingRef.current) return;

          socketRefreshingRef.current = true;

          try {
            await appLinksRealtimeRefreshRef.current?.(event);
          } finally {
            socketRefreshingRef.current = false;
          }
        });
      },

      onStompError: (frame) => {
        console.error('AppLinks realtime STOMP error:', frame);
      },

      onWebSocketError: (error) => {
        console.error('AppLinks realtime socket error:', error);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  // Initial load + check token
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setNotification({ open: true, message: 'Please login to access this page.', severity: 'error' });
      navigate('/login');
      return;
    }

    fetchData();
  }, [fetchData, navigate]);


  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, fetchData]);

  /* ====================== HANDLERS ====================== */
  const handleOpenAdd = useCallback(() => {
    if (!canManageAppLinks) {
      setNotification({
        open: true,
        message: APP_LINK_MANAGE_DENIED_MESSAGE,
        severity: 'error',
      });
      return;
    }

    setOpenAddDialog(true);
  }, [canManageAppLinks]);

  const goToView = useCallback((item) => {
    if (!item?.id) return;
    navigate(`/app-links/${item.id}`);
  }, [navigate]);

  const canModifyItem = useCallback((item) => {
    if (!item?.id) return false;
    return canManageAppLinks;
  }, [canManageAppLinks]);

  const handleOpenEdit = useCallback((item) => {
    if (!canModifyItem(item, 'edit')) {
      setNotification({
        open: true,
        message: APP_LINK_MANAGE_DENIED_MESSAGE,
        severity: 'error',
      });
      return;
    }

    setCurrentItem(item);
    setOpenEditDialog(true);
  }, [canModifyItem]);

  const handleDelete = (item) => {
    if (!canModifyItem(item, 'delete')) {
      setNotification({
        open: true,
        message: APP_LINK_MANAGE_DENIED_MESSAGE,
        severity: 'error',
      });
      return;
    }

    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    if (!canModifyItem(selectedItem, 'delete')) {
      setNotification({
        open: true,
        message: APP_LINK_MANAGE_DENIED_MESSAGE,
        severity: 'error',
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      return;
    }

    setLoading(true);

    try {
      const { success, message } = await deleteAppLink(selectedItem.id);
      setNotification({ open: true, message, severity: success ? 'success' : 'error' });
      if (success) fetchData();
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSort = useCallback(
    (key) => {
      if (loading) return;
      const meta = headers.find((h) => h.key === key);
      if (!meta?.sortable) return;

      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;

      const nextSort = { key: direction ? key : null, direction };
      setSortConfig(nextSort);
      setPage(0);
      fetchData({ page: 0, sortConfig: nextSort });
    },
    [loading, sortConfig, fetchData]
  );

  // Chỉ gọi API khi nhấn nút Search
  const handleSearch = useCallback((filters) => {
    setFilterName(filters.name || '');
    setFilterDesc(filters.desc || '');
    setPage(0);
    fetchData({ page: 0, name: filters.name || '', desc: filters.desc || '' });
  }, [fetchData]);

  // Reset toàn bộ
  const handleReset = useCallback(() => {
    setSearchName('');
    setSearchDesc('');
    setFilterName('');
    setFilterDesc('');
    setPage(0);
    fetchData({ page: 0, name: '', desc: '' });
  }, [fetchData]);

  const sortLabel = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return 'default';
    return `${sortConfig.key},${sortConfig.direction}`;
  }, [sortConfig]);

  const handleCloseNotification = () => {
    setNotification({ open: false, message: '', severity: 'info' });
  };

  return (
    <Box sx={pageWrapSx}>
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
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>App Links</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Total: {totalElements} • Sort: <span style={{ color: '#111827' }}>{sortLabel}</span>
            </Typography>
          </Stack>

          <Button
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={handleOpenAdd}
            disabled={loading || !canManageAppLinks}
            sx={{
              ...btnSx,
              borderRadius: 1.2,
              height: 34,
              px: 1.25,
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Add App Link
          </Button>
        </Stack>
      </Paper>

      {/* Search Component - Chỉ search khi bấm nút */}
      <AppLinkSearch
        nameValue={searchName}
        descValue={searchDesc}
        onNameChange={setSearchName}
        onDescChange={setSearchDesc}
        onSearch={handleSearch}
        onReset={handleReset}
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
                {headers.map(({ label, key, sortable, hideOnSmall }) => {
                  const align = ['No', 'Icon', 'Actions'].includes(label) ? 'center' : 'left';
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
                  <TableCell colSpan={headers.length} sx={{ py: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Loading data...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : data.length > 0 ? (
                data.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const imageSrc = normalizeImageUrl(getImageField(item));
                  const editEnabled = canModifyItem(item, 'edit');
                  const deleteEnabled = canModifyItem(item, 'delete');

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => goToView(item)}
                      sx={{
                        backgroundColor: zebra,
                        cursor: 'pointer',
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
                          color: '#111827',
                        }}
                      >
                        {page * rowsPerPage + idx + 1}
                      </TableCell>

                      <TableCell align="center" onClick={(e) => e.stopPropagation()} sx={{ py: 0.45, px: 0.7 }}>
                        {imageSrc ? (
                          <Box
                            component="img"
                            src={imageSrc}
                            alt={item.name || 'icon'}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                            sx={{
                              width: 34,
                              height: 34,
                              objectFit: 'contain',
                              borderRadius: 1,
                              border: '1px solid #e5e7eb',
                              p: 0.25,
                              backgroundColor: '#fff',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 1,
                              border: '1px dashed #d1d5db',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.68rem',
                              color: '#9ca3af',
                              backgroundColor: '#fff',
                            }}
                          >
                            N/A
                          </Box>
                        )}
                      </TableCell>

                      <TableCell
                        onClick={(e) => {
                          e.stopPropagation();
                          goToView(item);
                        }}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.45,
                          px: 0.7,
                          color: '#111827',
                          fontWeight: 500,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {item.name || ''}
                      </TableCell>

                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.45,
                          px: 0.7,
                          color: '#2563eb',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {item.url}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.45,
                          px: 0.7,
                          color: '#374151',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          display: { xs: 'none', md: 'table-cell' },
                        }}
                      >
                        {item.desc || '-'}
                      </TableCell>

                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.45,
                          px: 0.7,
                          color: '#111827',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          display: { xs: 'none', md: 'table-cell' },
                        }}
                      >
                        <Stack spacing={0.2}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
                            {item.departmentName || '-'}
                          </Typography>
                          {item.division && (
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                              {item.division}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell align="center" onClick={(e) => e.stopPropagation()} sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip
                            title={editEnabled ? 'Edit App Link' : APP_LINK_MANAGE_DENIED_MESSAGE}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || !editEnabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(item);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip
                            title={deleteEnabled ? 'Delete App Link' : APP_LINK_MANAGE_DENIED_MESSAGE}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || !deleteEnabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item);
                                }}
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
                  <TableCell colSpan={headers.length} sx={{ py: 3 }}>
                    <Stack direction="column" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                      <InboxIcon sx={{ fontSize: 30, opacity: 0.6 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>No App Links Found</Typography>
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
            onPageChange={setPage}
            onRowsPerPageChange={(size) => {
              setRowsPerPage(size);
              setPage(0);
            }}
          />
        </Box>
      </Paper>

      {/* Snackbar */}
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

      {/* Dialogs */}
      <AddAppLinkDialog
        open={openAddDialog}
        isAdmin={isAdmin || isITDepartmentUser}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSelect={disableDepartmentSelect}
        onCancel={() => setOpenAddDialog(false)}
        onOk={() => {
          setOpenAddDialog(false);
          fetchData({ page: 0 });
          setPage(0);
        }}
      />

      <EditAppLinkDialog
        open={openEditDialog}
        currentItem={currentItem}
        isAdmin={isAdmin || isITDepartmentUser}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSelect={disableDepartmentSelect}
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

      <Dialog
        open={deleteDialogOpen}
        onClose={loading ? undefined : handleCancelDelete}
        PaperProps={{ sx: { borderRadius: 1.5, border: '1px solid #e5e7eb' } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Delete App Link</Typography>
            <IconButton
              size="small"
              onClick={handleCancelDelete}
              disabled={loading}
              sx={{ border: '1px solid #e5e7eb' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 1.5, backgroundColor: '#fff' }}>
          <Typography sx={{ fontSize: '0.9rem', color: '#111827' }}>
            Are you sure you want to delete <strong>{selectedItem?.name || 'Unknown'}</strong>?
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 1.5, py: 1.1, borderTop: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
          <Button onClick={handleCancelDelete} disabled={loading} sx={btnSx}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={loading || !canModifyItem(selectedItem, 'delete')}
            sx={btnSx}
          >
            {loading ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
