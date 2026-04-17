// src/pages/users/UserManagementPage.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Container,
  useTheme,
  Snackbar,
  Alert,
  Divider,
  Pagination,
  Select,
  MenuItem,
  Popover,
  CircularProgress,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import LockResetIcon from '@mui/icons-material/LockReset';
import InboxIcon from '@mui/icons-material/Inbox';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';

import AddUserDialog from './AddUserDialog';
import EditUserDialog from './EditUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import UserSearch from './UserSearch';
import { API_BASE_URL } from '../../config';

/* =========================
   Headers (giống Group: có backendKey)
   ========================= */
const headers = [
  { label: 'No', key: 'no', sortable: false, backendKey: 'no' },
  { label: 'Username', key: 'username', sortable: true, backendKey: 'username' },
  { label: 'Email', key: 'email', sortable: true, backendKey: 'email' },
  { label: 'Address', key: 'address', sortable: true, backendKey: 'address' },
  { label: 'Phone', key: 'phone', sortable: true, backendKey: 'phone' },
  { label: 'Role', key: 'role', sortable: true, backendKey: 'role' },
  // ✅ backend thường là enabled, không phải isEnabled
  { label: 'Status', key: 'isEnabled', sortable: true, backendKey: 'enabled' },
  { label: 'Profile Image', key: 'profileImage', sortable: false, backendKey: 'profileImage' },
  { label: 'Actions', key: 'actions', sortable: false, backendKey: 'actions' },
];

/* =========================
   ✅ Sorting helpers (CLIENT fallback) — giống Group
   ========================= */
const toTimestamp = (v) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getComparableValue = (row, key) => {
  // date keys nếu bạn có (ví dụ createdDate) thì add vào đây
  const dateKeys = new Set(['createdDate', 'updatedDate']);
  if (dateKeys.has(key)) return toTimestamp(row?.[key]);

  // boolean keys
  if (key === 'isEnabled') {
    const b = row?.enabled ?? row?.isEnabled ?? row?.is_enabled;
    return b ? 1 : 0;
  }

  // mặc định string
  const s = row?.[key];
  return (s == null ? '' : String(s)).trim().toLowerCase();
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

    if (typeof va === 'number' && typeof vb === 'number') {
      if (va !== vb) return (va - vb) * dir;
      return a.i - b.i;
    }

    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp * dir;
    return a.i - b.i;
  });

  return withIndex.map((x) => x.r);
};

/* =========================
   Sort indicator (tri-state like Group)
   ========================= */
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

/* =========================
   PaginationBar (giữ nguyên style)
   ========================= */
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
            {[5, 10, 25, 50].map((n) => (
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

export default function UserManagementPage() {
  const theme = useTheme();
  const btnSx = useMemo(() => ({ textTransform: 'none', fontWeight: 400 }), []);

  const cacheBust = useMemo(() => Date.now(), []);
  const imageCacheRef = useRef(new Map());

  const [searchUsername, setSearchUsername] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchRole, setSearchRole] = useState('');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [imageErrors, setImageErrors] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // popover preview ảnh
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverImgSrc, setPopoverImgSrc] = useState('');
  const isPopoverOpen = Boolean(anchorEl);

  const API_BASE_URL_FULL = useMemo(() => API_BASE_URL.replace(/\/$/, ''), []);
  const DEFAULT_IMAGE_URL = useMemo(
    () => `${API_BASE_URL}/uploads/users/default-user.png?v=${cacheBust}`,
    [cacheBust]
  );

  const normalizeImageUrl = useCallback(
    (url) => {
      if (!url) return null;
      const cacheKey = `url_${url}`;
      if (imageCacheRef.current.has(cacheKey)) return imageCacheRef.current.get(cacheKey);

      let normalized = url.replace(/\\/g, '/');
      let finalUrl;

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        finalUrl = `${normalized}?v=${cacheBust}`;
      } else if (normalized.startsWith('/uploads/users/')) {
        finalUrl = `${API_BASE_URL}${normalized}?v=${cacheBust}`;
      } else {
        const cleanPath = normalized.replace(/^\/?[Uu]ploads\/users\//i, '');
        finalUrl = `${API_BASE_URL_FULL}/Uploads/users/${cleanPath}?v=${cacheBust}`;
      }

      imageCacheRef.current.set(cacheKey, finalUrl);
      return finalUrl;
    },
    [cacheBust, API_BASE_URL_FULL]
  );

  const processedUsers = useMemo(() => {
    return users.map((user) => {
      const imageUrl = normalizeImageUrl(user.profileImageUrl);
      const finalImageUrl = imageUrl || DEFAULT_IMAGE_URL;
      return {
        ...user,
        profileImageUrl: imageUrl,
        displayImageUrl: finalImageUrl,
        isEnabled: user.enabled,
      };
    });
  }, [users, normalizeImageUrl, DEFAULT_IMAGE_URL]);

  /* =========================
     ✅ Fetch data (support overrides like Group)
     ========================= */
  const fetchData = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
        const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
        const effSort = overrides.sortConfig ?? sortConfig;

        const effUsername = overrides.searchUsername ?? searchUsername;
        const effAddress = overrides.searchAddress ?? searchAddress;
        const effPhone = overrides.searchPhone ?? searchPhone;
        const effEmail = overrides.searchEmail ?? searchEmail;
        const effRole = overrides.searchRole ?? searchRole;

        const url = new URL(`${API_BASE_URL}/users`);
        url.searchParams.append('page', String(effPage));
        url.searchParams.append('size', String(effSize));

        if (effUsername) url.searchParams.append('username', effUsername);
        if (effAddress) url.searchParams.append('address', effAddress);
        if (effPhone) url.searchParams.append('phone', effPhone);
        if (effEmail) url.searchParams.append('email', effEmail);
        if (effRole) url.searchParams.append('role', effRole);

        // ✅ sort param
        if (effSort?.key && effSort?.direction) {
          const backendKey = headers.find((h) => h.key === effSort.key)?.backendKey || effSort.key;
          url.searchParams.append('sort', `${backendKey},${effSort.direction}`);
        }

        const res = await fetch(url, { headers: { accept: '*/*' }, credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);

        const data = await res.json();
        const content = data.users || [];

        // ✅ client fallback sort: đảm bảo UI đổi thứ tự ngay trong page
        const finalContent = sortRowsClient(content, effSort);

        setUsers(finalContent);
        setTotalRows(data.totalItems || 0);
      } catch (error) {
        console.error('Fetch users error:', error);
        setSnackbarMessage('Failed to fetch users: ' + error.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setUsers([]);
        setTotalRows(0);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      rowsPerPage,
      sortConfig,
      searchUsername,
      searchAddress,
      searchPhone,
      searchEmail,
      searchRole,
    ]
  );

  // mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // page/rowsPerPage đổi -> fetch
  useEffect(() => {
    fetchData({ page, size: rowsPerPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleImageError = (userId) => {
    if (imageErrors[userId]) return;
    setImageErrors((prev) => ({ ...prev, [userId]: true }));
  };

  const openPopover = (event, src) => {
    setAnchorEl(event.currentTarget);
    setPopoverImgSrc(src || '');
  };

  const closePopover = () => {
    setAnchorEl(null);
    setPopoverImgSrc('');
  };

  const handleSearch = useCallback(() => {
    setPage(0);
    fetchData({ page: 0 });
  }, [fetchData]);

  const handleReset = useCallback(() => {
    const cleared = {
      searchUsername: '',
      searchAddress: '',
      searchPhone: '',
      searchEmail: '',
      searchRole: '',
    };

    setSearchUsername('');
    setSearchAddress('');
    setSearchPhone('');
    setSearchEmail('');
    setSearchRole('');
    setSortConfig({ key: null, direction: null });
    setPage(0);

    fetchData({
      page: 0,
      sortConfig: { key: null, direction: null },
      ...cleared,
    });
  }, [fetchData]);

  const handleAdd = useCallback(
    async (data) => {
      setAddDialogOpen(false);
      await fetchData({ page, size: rowsPerPage });
      setSnackbarMessage(data?.message || 'User added successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    [fetchData, page, rowsPerPage]
  );

  const handleUpdate = useCallback(
    async (data) => {
      setEditDialogOpen(false);
      await fetchData({ page, size: rowsPerPage });
      setSnackbarMessage(data?.message || 'User updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    [fetchData, page, rowsPerPage]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { accept: '*/*' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to delete user: ${res.status}`);

      setImageErrors((prev) => {
        const next = { ...prev };
        delete next[selectedUser.id];
        return next;
      });

      setSnackbarMessage('User deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      setDeleteDialogOpen(false);
      setSelectedUser(null);

      // giữ đúng trang nếu còn hợp lệ
      const maxPage = Math.max(0, Math.ceil((totalRows - 1) / rowsPerPage) - 1);
      const nextPage = page > maxPage ? maxPage : page;
      if (nextPage !== page) setPage(nextPage);
      await fetchData({ page: nextPage, size: rowsPerPage });
    } catch (error) {
      setSnackbarMessage('Failed to delete user: ' + error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, fetchData, page, rowsPerPage, totalRows]);

  const handleEdit = useCallback((user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleResetPassword = useCallback((user) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }, []);

  const handlePasswordUpdate = useCallback(
    (datadir) => {
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      fetchData({ page, size: rowsPerPage });
      setSnackbarMessage(datadir?.message || 'Password reset successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    [fetchData, page, rowsPerPage]
  );

  const hasActiveSearch = useMemo(
    () => [searchUsername, searchAddress, searchPhone, searchEmail, searchRole].some((v) => v?.trim?.()),
    [searchUsername, searchAddress, searchPhone, searchEmail, searchRole]
  );

  /* =========================
     ✅ Sort: bấm icon (asc -> desc -> none) + fetch ngay
     ========================= */
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

      // ✅ fetch ngay (không chờ render)
      fetchData({ page: 0, sortConfig: nextSort });
    },
    [loading, sortConfig, fetchData]
  );

  const sortLabel = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return 'none';
    const backendKey = headers.find((h) => h.key === sortConfig.key)?.backendKey || sortConfig.key;
    return `${backendKey},${sortConfig.direction}`;
  }, [sortConfig]);

  const cellEllipsisSx = {
    fontSize: '0.75rem',
    py: 0.4,
    px: 0.6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 0, // quan trọng để ellipsis hoạt động trong tableLayout=fixed
  };

  const roleBadge = (roleRaw) => {
    const role = (roleRaw || '').toString();
    const up = role.toUpperCase();

    let bg = '#dcfce7';
    let color = '#166534';

    if (up === 'ADMIN' || role === 'Admin') {
      bg = '#fee2e2';
      color = '#991b1b';
    } else if (up === 'LEADER' || role === 'Leader') {
      bg = '#ffedd5';
      color = '#9a3412';
    }

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          py: 0.3,
          borderRadius: 999,
          border: '1px solid #e5e7eb',
          backgroundColor: bg,
          color,
          fontSize: '0.72rem',
          fontWeight: 800,
          width: '100%',
          maxWidth: 120,
          mx: 'auto',
        }}
        title={role || 'User'}
      >
        {role || 'User'}
      </Box>
    );
  };

  const enabledBadge = (enabled) => {
    const bg = enabled ? '#dcfce7' : '#fee2e2';
    const color = enabled ? '#166534' : '#991b1b';
    const label = enabled ? 'Enabled' : 'Disabled';

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          py: 0.3,
          borderRadius: 999,
          border: '1px solid #e5e7eb',
          backgroundColor: bg,
          color,
          fontSize: '0.72rem',
          fontWeight: 800,
          width: '100%',
          maxWidth: 120,
          mx: 'auto',
        }}
      >
        {label}
      </Box>
    );
  };

  // thumbnail hover preview
  const UserImageCell = ({ u }) => {
    const hasError = imageErrors[u.id];

    return (
      <Tooltip title={hasError ? 'Image error' : 'Hover to preview'}>
        <Box
          onMouseEnter={(e) => {
            if (!hasError) openPopover(e, u.displayImageUrl);
          }}
          onMouseLeave={closePopover}
          sx={{
            width: 30,
            height: 30,
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af',
            mx: 'auto',
            cursor: hasError ? 'not-allowed' : 'zoom-in',
          }}
        >
          {hasError ? (
            '?'
          ) : (
            <img
              src={u.displayImageUrl}
              alt={u.username}
              width={30}
              height={30}
              style={{ objectFit: 'cover', display: 'block' }}
              loading="lazy"
              onError={() => handleImageError(u.id)}
            />
          )}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ p: 1.5, minHeight: '100vh', backgroundColor: '#f7f7f7' }}>
      <Container maxWidth={false} disableGutters sx={{ px: 1.5 }}>
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
            <Stack spacing={0.4}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                User Management
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                Total: {totalRows} • {hasActiveSearch ? 'Filter: active' : 'Filter: none'} • Sort:{' '}
                <span style={{ color: '#111827' }}>{sortLabel}</span>
              </Typography>
            </Stack>

            <Button
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setAddDialogOpen(true)}
              disabled={loading}
              sx={btnSx}
            >
              Add User
            </Button>
          </Stack>
        </Paper>

        {/* Search */}
        <UserSearch
          searchUsername={searchUsername}
          setSearchUsername={setSearchUsername}
          searchAddress={searchAddress}
          setSearchAddress={setSearchAddress}
          searchPhone={searchPhone}
          setSearchPhone={setSearchPhone}
          searchEmail={searchEmail}
          setSearchEmail={setSearchEmail}
          searchRole={searchRole}
          setSearchRole={setSearchRole}
          setPage={setPage}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 1.5,
            border: '1px solid #e5e7eb',
            maxHeight: 560,
            overflowX: 'hidden',
            backgroundColor: '#fff',
          }}
        >
          <Table stickyHeader size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {headers.map(({ label, key, sortable }) => {
                  const align = ['no', 'profileImage', 'actions', 'isEnabled', 'role'].includes(key) ? 'center' : 'left';
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

                        {/* ✅ Chỉ bấm icon sort mới đổi sort */}
                        {sortable ? (
                          <Tooltip title="Sort" arrow>
                            <span>
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
                                aria-label={`sort-${key}`}
                              >
                                <SortIndicator active={active} direction={sortConfig.direction} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <CircularProgress size={18} />
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Loading data...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : processedUsers.length > 0 ? (
                processedUsers.map((u, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';

                  return (
                    <TableRow
                      key={u.id}
                      sx={{
                        backgroundColor: zebra,
                        '&:hover': { backgroundColor: '#f1f5f9' },
                        '& > *': { borderBottom: '1px solid #f3f4f6' },
                      }}
                    >
                      <TableCell align="center" sx={{ fontSize: '0.75rem', py: 0.4, px: 0.6 }}>
                        {idx + 1 + page * rowsPerPage}
                      </TableCell>

                      <TableCell sx={cellEllipsisSx} title={u.username || ''}>
                        {u.username || ''}
                      </TableCell>

                      <TableCell sx={cellEllipsisSx} title={u.email || ''}>
                        {u.email || ''}
                      </TableCell>

                      <TableCell sx={cellEllipsisSx} title={u.address || ''}>
                        {u.address || ''}
                      </TableCell>

                      <TableCell sx={cellEllipsisSx} title={u.phone || ''}>
                        {u.phone || ''}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.4, px: 0.6 }}>
                        {roleBadge(u.role)}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.4, px: 0.6 }}>
                        {enabledBadge(Boolean(u.isEnabled))}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.4, px: 0.6 }}>
                        <UserImageCell u={u} />
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.4, px: 0.6 }}>
                        <Stack direction="row" spacing={0.3} justifyContent="center">
                          <Tooltip title="Edit">
                            <span>
                              <IconButton color="primary" size="small" onClick={() => handleEdit(u)} sx={{ p: 0.25 }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete">
                            <span>
                              <IconButton color="error" size="small" onClick={() => handleDelete(u)} sx={{ p: 0.25 }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Reset password">
                            <span>
                              <IconButton
                                color="warning"
                                size="small"
                                onClick={() => handleResetPassword(u)}
                                sx={{ p: 0.25 }}
                              >
                                <LockResetIcon fontSize="small" />
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
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Stack direction="column" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                      <InboxIcon fontSize="small" />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        {hasActiveSearch ? 'No users found matching your search criteria.' : 'No users found.'}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <PaginationBar
          count={totalRows}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onPageChange={(p) => setPage(p)}
          onRowsPerPageChange={(size) => {
            setRowsPerPage(size);
            setPage(0);
          }}
        />

        {/* dialogs */}
        <EditUserDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onUpdate={handleUpdate}
          user={selectedUser}
        />

        <AddUserDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onAdd={handleAdd} />

        {/* Delete dialog giống style Group (đỡ thô) */}
        <Dialog
          open={deleteDialogOpen}
          onClose={loading ? undefined : () => setDeleteDialogOpen(false)}
          PaperProps={{ sx: { borderRadius: 1.5, border: '1px solid #e5e7eb' } }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Delete User</Typography>
              <IconButton
                size="small"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={loading}
                sx={{ border: '1px solid #e5e7eb' }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 1.5, backgroundColor: '#fff' }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#111827' }}>
              Are you sure you want to delete <strong>{selectedUser?.username || 'Unknown'}</strong>?
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 1.5, py: 1.1, borderTop: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading} sx={btnSx}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading} sx={btnSx}>
              {loading ? <CircularProgress size={18} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onClose={() => setResetPasswordDialogOpen(false)}
          onUpdate={handlePasswordUpdate}
          user={selectedUser}
        />

        {/* popover ảnh (preview-only) */}
        <Popover
          id="user-image-popover"
          sx={{ pointerEvents: 'none' }}
          open={isPopoverOpen}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          onClose={closePopover}
          disableRestoreFocus
        >
          <Box sx={{ p: 1, maxWidth: 280, maxHeight: 300, overflowY: 'auto' }}>
            {popoverImgSrc ? (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={popoverImgSrc}
                  alt="Profile"
                  style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, objectFit: 'contain' }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.alt = 'Failed to load';
                  }}
                />
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>Preview</Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No image</Typography>
            )}
          </Box>
        </Popover>

        {/* snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4500}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ fontSize: '0.85rem' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
