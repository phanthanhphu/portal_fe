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
  Checkbox,
  TextField,
  Chip,
} from '@mui/material';

import {
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  Settings,
  Save,
  Inbox as InboxIcon,
} from '@mui/icons-material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../../config';
import { isStoredViewRole } from '../../utils/accessRole';

import RoomBookingSearch from './RoomBookingSearch';
import AddRoomBookingDialog from './AddRoomBookingDialog';
import EditRoomBookingDialog from './EditRoomBookingDialog';
import { exportRoomBookingReport } from './roomBookingExcelExport';

const BOOKING_API = `${API_BASE_URL}/api/room-bookings`;
const ROOM_API = `${API_BASE_URL}/api/rooms`;
const LOCATION_API = `${API_BASE_URL}/api/locations`;
const DISPLAY_CONFIG_API = `${API_BASE_URL}/api/index-room-display-config`;

const DEFAULT_DISPLAY_CONFIG = {
  eyebrowText: 'Room Reservation Display',
  welcomeText: 'Welcome to',
  titleText: 'Broadpeak Soc Trang',
  statusText: 'Reserved',
};

const normalizeDisplayConfig = (value = {}) => ({
  eyebrowText: value.eyebrowText || DEFAULT_DISPLAY_CONFIG.eyebrowText,
  welcomeText: value.welcomeText || DEFAULT_DISPLAY_CONFIG.welcomeText,
  titleText: value.titleText || DEFAULT_DISPLAY_CONFIG.titleText,
  statusText: value.statusText || DEFAULT_DISPLAY_CONFIG.statusText,
});

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const pad2 = (value) => String(value).padStart(2, '0');

const toDateParts = (value) => {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return { year, month, day };
  }

  if (typeof value === 'string') {
    const parts = value.slice(0, 10).split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      return { year, month, day };
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const toTimeParts = (value) => {
  if (!value) return { hour: 0, minute: 0, second: 0 };

  if (Array.isArray(value) && value.length >= 2) {
    const [hour, minute, second = 0] = value;
    return { hour, minute, second };
  }

  if (typeof value === 'string') {
    const parts = value.split(':').map(Number);
    return {
      hour: Number.isFinite(parts[0]) ? parts[0] : 0,
      minute: Number.isFinite(parts[1]) ? parts[1] : 0,
      second: Number.isFinite(parts[2]) ? parts[2] : 0,
    };
  }

  return { hour: 0, minute: 0, second: 0 };
};

const formatDateOnly = (value) => {
  const parts = toDateParts(value);
  if (!parts) return '-';

  return `${pad2(parts.month)}/${pad2(parts.day)}/${parts.year}`;
};

const formatTimeOnly = (value) => {
  const { hour, minute } = toTimeParts(value);
  return `${pad2(hour)}:${pad2(minute)}`;
};

const formatBookingDateTime = (dateValue, timeValue) => {
  const dateText = formatDateOnly(dateValue);
  const timeText = formatTimeOnly(timeValue);

  if (dateText === '-') return '-';

  return `${dateText} ${timeText}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';

  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute, second = 0] = value;
    return `${pad2(month)}/${pad2(day)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const getBookingDateTimeMs = (dateValue, timeValue) => {
  const dateParts = toDateParts(dateValue);
  if (!dateParts) return 0;

  const { hour, minute, second } = toTimeParts(timeValue);
  return new Date(dateParts.year, Number(dateParts.month) - 1, dateParts.day, hour, minute, second).getTime();
};

const isPastIndexRoomBooking = (item) => {
  if (!item) return false;

  /*
   * Index Room chỉ nên hiển thị booking còn hiệu lực.
   * Khi check-out date/time đã qua hiện tại thì tự bỏ check Index Room.
   */
  const checkOutMs = getBookingDateTimeMs(item.checkOutDate, item.checkOutTime);

  if (!checkOutMs) {
    return false;
  }

  return checkOutMs < Date.now();
};

const normalizeIndexRoomFlag = (item) => {
  if (!item) return item;

  if (isPastIndexRoomBooking(item)) {
    return {
      ...item,
      showOnIndexRoom: false,
    };
  }

  return item;
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '-';

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const dateKeys = new Set(['createdAt', 'updatedAt', 'checkInDate', 'checkOutDate']);
const numberKeys = new Set(['roomCharged']);

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

  if (key === 'checkInDate') {
    return getBookingDateTimeMs(row.checkInDate, row.checkInTime);
  }

  if (key === 'checkOutDate') {
    return getBookingDateTimeMs(row.checkOutDate, row.checkOutTime);
  }

  const value = row?.[key];

  if (dateKeys.has(key)) {
    return getDateComparableValue(value);
  }

  if (numberKeys.has(key)) {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
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

export default function RoomBookingsPage() {
  const readOnly = isStoredViewRole();
  const pageWrapSx = useMemo(() => ({
    bgcolor: '#f7f7f7',
    minHeight: '100vh',
    p: 1.5,
    position: 'relative',
  }), []);

  const tableHeaders = useMemo(() => ([
    { label: 'No', key: 'no', align: 'center', sortable: false },
    { label: 'Name', key: 'title', align: 'left', sortable: true },
    { label: 'Room', key: 'roomName', align: 'left', sortable: true },
    { label: 'Check-in', key: 'checkInDate', align: 'left', sortable: true },
    { label: 'Check-out', key: 'checkOutDate', align: 'left', sortable: true },
    { label: 'People in Charge', key: 'peopleInCharge', align: 'left', sortable: true },
    { label: 'Based Location', key: 'basedLocation', align: 'left', sortable: true },
    { label: 'Index Room', key: 'showOnIndexRoom', align: 'center', sortable: true },
    { label: 'Room Charged (USD)', key: 'roomCharged', align: 'right', sortable: true },
    { label: 'Created By', key: 'createdBy', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Created At', key: 'createdAt', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Updated At', key: 'updatedAt', align: 'left', sortable: true, hideOnSmall: true },
    { label: 'Actions', key: 'actions', align: 'center', sortable: false },
  ]), []);

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' });

  const [searchNameInput, setSearchNameInput] = useState('');
  const [searchNameFilter, setSearchNameFilter] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomIdFilter, setRoomIdFilter] = useState('');
  const [locationIdInput, setLocationIdInput] = useState('');
  const [locationIdFilter, setLocationIdFilter] = useState('');
  const [fromDateInput, setFromDateInput] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateInput, setToDateInput] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [roomOptions, setRoomOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [indexRoomOrderMap, setIndexRoomOrderMap] = useState({});

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const realtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [displayDialogOpen, setDisplayDialogOpen] = useState(false);
  const [displayConfig, setDisplayConfig] = useState(DEFAULT_DISPLAY_CONFIG);
  const [loadingDisplayConfig, setLoadingDisplayConfig] = useState(false);
  const [savingDisplayConfig, setSavingDisplayConfig] = useState(false);

  const fetchRoomOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${ROOM_API}/options`, {
        headers: getAuthHeaders('*/*'),
      });

      const options = Array.isArray(response?.data) ? response.data : [];

      setRoomOptions(
        [...options].sort((a, b) =>
          String(a.roomName || a.id || '').localeCompare(String(b.roomName || b.id || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      );
    } catch (error) {
      console.error('Cannot load room options for export:', error);
      setRoomOptions([]);
    }
  }, []);

  const fetchLocationOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${LOCATION_API}/options`, {
        headers: getAuthHeaders('*/*'),
      });

      const options = Array.isArray(response?.data) ? response.data : [];

      setLocationOptions(
        [...options].sort((a, b) =>
          String(a.location || a.id || '').localeCompare(String(b.location || b.id || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      );
    } catch (error) {
      console.error('Cannot load location options for filter/export:', error);
      setLocationOptions([]);
    }
  }, []);

  const fetchIndexRoomOrderMap = useCallback(async () => {
    try {
      const response = await axios.get(`${BOOKING_API}/index-room`, {
        headers: getAuthHeaders('*/*'),
      });

      const content = Array.isArray(response?.data?.content) ? response.data.content : [];
      const nextMap = content.reduce((acc, item, index) => {
        if (item?.id) acc[item.id] = index + 1;
        return acc;
      }, {});

      setIndexRoomOrderMap(nextMap);
      return nextMap;
    } catch (error) {
      console.error('Cannot load Index Room display order:', error);
      setIndexRoomOrderMap({});
      return {};
    }
  }, []);

  const fetchData = useCallback(async (overrides = {}) => {
    const silent = Boolean(overrides.silent);

    if (!silent) {
      setLoading(true);
    }

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effName = overrides.name !== undefined ? overrides.name : searchNameFilter;
    const effRoomId = overrides.roomId !== undefined ? overrides.roomId : roomIdFilter;
    const effLocationId = overrides.locationId !== undefined ? overrides.locationId : locationIdFilter;
    const effFromDate = overrides.fromDate !== undefined ? overrides.fromDate : fromDateFilter;
    const effToDate = overrides.toDate !== undefined ? overrides.toDate : toDateFilter;

    try {
      const response = await axios.get(`${BOOKING_API}/search`, {
        params: {
          name: effName,
          roomId: effRoomId,
          locationId: effLocationId,
          fromDate: effFromDate,
          toDate: effToDate,
          page: effPage,
          size: effSize,
        },
        headers: getAuthHeaders('*/*'),
      });

      const result = response?.data || {};
      const content = Array.isArray(result.content) ? result.content : [];
      const normalizedContent = content.map(normalizeIndexRoomFlag);

      setData(normalizedContent);
      setTotalElements(Number(result.totalElements || 0));

      /*
       * Nếu booking đã quá check-out nhưng DB vẫn còn showOnIndexRoom = true,
       * UI sẽ tự gọi API để bỏ check trên backend.
       */
      const expiredIndexRoomItems = content.filter((item) => (
        item?.id &&
        Boolean(item.showOnIndexRoom) &&
        isPastIndexRoomBooking(item)
      ));

      if (expiredIndexRoomItems.length > 0) {
        Promise.allSettled(
          expiredIndexRoomItems.map((item) => (
            axios.patch(
              `${BOOKING_API}/${item.id}/index-room-display`,
              null,
              {
                params: { enabled: false },
                headers: getAuthHeaders('*/*'),
              }
            )
          ))
        ).catch((error) => {
          console.error('Auto uncheck expired Index Room booking failed:', error);
        });
      }
    } catch (error) {
      console.error(error);

      if (!silent) {
        setData([]);
        setTotalElements(0);
        setNotification({
          open: true,
          message: error?.response?.data?.message || 'Failed to fetch room bookings.',
          severity: 'error',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [page, rowsPerPage, searchNameFilter, roomIdFilter, locationIdFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    fetchRoomOptions();
    fetchLocationOptions();
  }, [fetchRoomOptions, fetchLocationOptions]);

  const refreshBySocket = useCallback(async (event) => {
    const module = String(event?.module || 'ALL').toUpperCase();

    const shouldRefresh =
      module === 'ROOM' ||
      module === 'ROOMS' ||
      module === 'ROOM_BOOKING' ||
      module === 'ROOM_BOOKINGS' ||
      module === 'ALL';

    if (!shouldRefresh) return;

    await Promise.all([
      fetchData({ silent: true }),
      fetchIndexRoomOrderMap(),
    ]);
  }, [fetchData, fetchIndexRoomOrderMap]);

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
        console.error('RoomBookings realtime STOMP error:', frame);
      },

      onWebSocketError: (error) => {
        console.error('RoomBookings realtime socket error:', error);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  useEffect(() => {
    fetchData();
    fetchIndexRoomOrderMap();
  }, [fetchData, fetchIndexRoomOrderMap]);

  const handleSearch = useCallback(() => {
    const nextName = searchNameInput.trim();
    const nextRoomId = roomIdInput;
    const nextLocationId = locationIdInput;
    const nextFromDate = fromDateInput;
    const nextToDate = toDateInput;

    if (nextFromDate && nextToDate && nextToDate < nextFromDate) {
      setNotification({
        open: true,
        message: 'To Date must be after or equal to From Date',
        severity: 'error',
      });
      return;
    }

    setSearchNameFilter(nextName);
    setRoomIdFilter(nextRoomId);
    setLocationIdFilter(nextLocationId);
    setFromDateFilter(nextFromDate);
    setToDateFilter(nextToDate);
    setPage(0);
  }, [searchNameInput, roomIdInput, locationIdInput, fromDateInput, toDateInput]);

  const handleReset = useCallback(() => {
    setSearchNameInput('');
    setSearchNameFilter('');
    setRoomIdInput('');
    setRoomIdFilter('');
    setLocationIdInput('');
    setLocationIdFilter('');
    setFromDateInput('');
    setFromDateFilter('');
    setToDateInput('');
    setToDateFilter('');
    setPage(0);
  }, []);


  const fetchAllRowsForExport = useCallback(async () => {
    const exportPageSize = 100;
    let exportPage = 0;
    let totalPages = 1;
    const allRows = [];

    do {
      const response = await axios.get(`${BOOKING_API}/search`, {
        params: {
          name: searchNameFilter,
          roomId: roomIdFilter,
          locationId: locationIdFilter,
          fromDate: fromDateFilter,
          toDate: toDateFilter,
          page: exportPage,
          size: exportPageSize,
        },
        headers: getAuthHeaders('*/*'),
      });

      const result = response?.data || {};
      const content = Array.isArray(result.content) ? result.content : [];
      allRows.push(...content);

      totalPages = Number(result.totalPages || 1);
      exportPage += 1;
    } while (exportPage < totalPages);

    return allRows;
  }, [searchNameFilter, roomIdFilter, locationIdFilter, fromDateFilter, toDateFilter]);

  const selectedRoomName = useMemo(() => {
    if (!roomIdFilter) return '';

    const matchedRoom = roomOptions.find((room) =>
      String(room?.id || '').trim() === String(roomIdFilter || '').trim()
    );

    return matchedRoom?.roomName || matchedRoom?.name || '';
  }, [roomIdFilter, roomOptions]);

  const selectedLocationName = useMemo(() => {
    if (!locationIdFilter) return '';

    const matchedLocation = locationOptions.find((item) =>
      String(item?.id || '').trim() === String(locationIdFilter || '').trim()
    );

    return matchedLocation?.location || matchedLocation?.name || '';
  }, [locationIdFilter, locationOptions]);

  const handleExportExcel = useCallback(async () => {
    if (totalElements <= 0) {
      setNotification({
        open: true,
        message: 'No room booking data to export.',
        severity: 'warning',
      });
      return;
    }

    setExporting(true);

    try {
      const exportRows = await fetchAllRowsForExport();
      const sortedExportRows = sortRowsClient(exportRows, sortConfig);

      const rowRoomName = roomIdFilter
        ? sortedExportRows.find((row) => String(row?.roomId || '').trim() === String(roomIdFilter).trim())?.roomName
        : '';

      const rowLocationName = locationIdFilter
        ? sortedExportRows.find((row) => String(row?.locationId || '').trim() === String(locationIdFilter).trim())?.basedLocation
        : '';

      await exportRoomBookingReport({
        rows: sortedExportRows,
        filters: {
          name: searchNameFilter,
          roomId: roomIdFilter,
          roomName: roomIdFilter ? (selectedRoomName || rowRoomName || roomIdFilter) : '',
          locationId: locationIdFilter,
          locationName: locationIdFilter ? (selectedLocationName || rowLocationName || locationIdFilter) : '',
          fromDate: fromDateFilter,
          toDate: toDateFilter,
        },
      });

      setNotification({
        open: true,
        message: `Exported ${sortedExportRows.length} room booking row(s) successfully.`,
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || error?.message || 'Export room booking report failed.',
        severity: 'error',
      });
    } finally {
      setExporting(false);
    }
  }, [totalElements, fetchAllRowsForExport, sortConfig, searchNameFilter, roomIdFilter, selectedRoomName, locationIdFilter, selectedLocationName, fromDateFilter, toDateFilter]);

  const handleToggleIndexRoomDisplay = useCallback(async (item, checked) => {
    if (readOnly || !item?.id) return;

    if (checked && isPastIndexRoomBooking(item)) {
      setData((prev) => (
        prev.map((row) => (row.id === item.id ? { ...row, showOnIndexRoom: false } : row))
      ));

      setNotification({
        open: true,
        message: 'This booking is already past check-out time, so it cannot be shown on Index Room.',
        severity: 'warning',
      });

      return;
    }

    setLoading(true);

    try {
      const response = await axios.patch(
        `${BOOKING_API}/${item.id}/index-room-display`,
        null,
        {
          params: { enabled: checked },
          headers: getAuthHeaders('*/*'),
        }
      );

      const updatedItem = normalizeIndexRoomFlag(response?.data || {});

      setData((prev) => (
        prev.map((row) => (row.id === item.id ? normalizeIndexRoomFlag({ ...row, ...updatedItem }) : row))
      ));

      await fetchIndexRoomOrderMap();

      setNotification({
        open: true,
        message: checked ? 'This booking is now shown on Index Room' : 'This booking is hidden from Index Room',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Update Index Room display failed',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchIndexRoomOrderMap, readOnly]);

  const fetchDisplayConfig = useCallback(async () => {
    setLoadingDisplayConfig(true);

    try {
      const response = await axios.get(DISPLAY_CONFIG_API, {
        headers: getAuthHeaders('application/json'),
      });

      setDisplayConfig(normalizeDisplayConfig(response?.data || {}));
    } catch (error) {
      console.error(error);
      setDisplayConfig(DEFAULT_DISPLAY_CONFIG);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Failed to load display config.',
        severity: 'error',
      });
    } finally {
      setLoadingDisplayConfig(false);
    }
  }, []);

  const handleOpenDisplayDialog = useCallback(async () => {
    if (readOnly) return;
    setDisplayDialogOpen(true);
    await fetchDisplayConfig();
  }, [fetchDisplayConfig, readOnly]);

  const handleCloseDisplayDialog = useCallback(() => {
    if (savingDisplayConfig) return;
    setDisplayDialogOpen(false);
  }, [savingDisplayConfig]);

  const handleChangeDisplayConfig = useCallback((field, value) => {
    setDisplayConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSaveDisplayConfig = useCallback(async () => {
    if (readOnly) return;
    setSavingDisplayConfig(true);

    try {
      const payload = {
        eyebrowText: displayConfig.eyebrowText?.trim() || DEFAULT_DISPLAY_CONFIG.eyebrowText,
        welcomeText: displayConfig.welcomeText?.trim() || DEFAULT_DISPLAY_CONFIG.welcomeText,
        titleText: displayConfig.titleText?.trim() || DEFAULT_DISPLAY_CONFIG.titleText,
        statusText: displayConfig.statusText?.trim() || DEFAULT_DISPLAY_CONFIG.statusText,
      };

      const response = await axios.put(DISPLAY_CONFIG_API, payload, {
        headers: {
          ...getAuthHeaders('application/json'),
          'Content-Type': 'application/json',
        },
      });

      setDisplayConfig(normalizeDisplayConfig(response?.data || payload));
      setDisplayDialogOpen(false);
      setNotification({
        open: true,
        message: 'Display information updated successfully.',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Update display information failed.',
        severity: 'error',
      });
    } finally {
      setSavingDisplayConfig(false);
    }
  }, [displayConfig, readOnly]);

  const handleOpenEdit = useCallback((item) => {
    if (readOnly) return;
    setCurrentItem(item);
    setOpenEditDialog(true);
  }, [readOnly]);

  const handleDelete = useCallback((item) => {
    if (readOnly) return;
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, [readOnly]);

  const handleConfirmDelete = async () => {
    if (readOnly || !selectedItem?.id) return;

    setLoading(true);

    try {
      const response = await axios.delete(`${BOOKING_API}/${selectedItem.id}`, {
        headers: getAuthHeaders('*/*'),
      });

      const nextPage = data.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      await fetchData({ page: nextPage });

      setNotification({
        open: true,
        message: response?.data?.message || 'Room booking deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || 'Delete room booking failed',
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
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
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
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
              Index Room Display
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Edit the header text shown on the Room Reservation Display screen.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Settings fontSize="small" />}
            onClick={handleOpenDisplayDialog}
            disabled={loading || exporting || readOnly}
            sx={{
              height: 36,
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#111827',
              color: '#111827',
              '&:hover': {
                borderColor: '#0b1220',
                color: '#0b1220',
                backgroundColor: 'rgba(17, 24, 39, 0.04)',
              },
            }}
          >
            Edit Display
          </Button>
        </Stack>
      </Paper>

      <RoomBookingSearch
        searchName={searchNameInput}
        setSearchName={setSearchNameInput}
        roomId={roomIdInput}
        setRoomId={setRoomIdInput}
        locationId={locationIdInput}
        setLocationId={setLocationIdInput}
        fromDate={fromDateInput}
        setFromDate={setFromDateInput}
        toDate={toDateInput}
        setToDate={setToDateInput}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={() => !readOnly && setOpenAddDialog(true)}
        onExport={handleExportExcel}
        exporting={exporting}
        canExport={totalElements > 0}
        disabled={loading || exporting}
        addDisabled={readOnly}
      />

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
                        ...(key === 'title' && { minWidth: 180 }),
                        ...(key === 'actions' && { width: 120, position: 'sticky', right: 0, zIndex: 3 }),
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
                        Loading room bookings...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : sortedData.length > 0 ? (
                sortedData.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const pastIndexRoomBooking = isPastIndexRoomBooking(item);
                  const indexRoomChecked = pastIndexRoomBooking ? false : Boolean(item.showOnIndexRoom);
                  const indexRoomOrder = indexRoomOrderMap[item.id];

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

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 180 }}>
                        {item.title || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 150 }}>
                        {item.roomName || item.roomId || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 135 }}>
                        {formatBookingDateTime(item.checkInDate, item.checkInTime)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 135 }}>
                        {formatBookingDateTime(item.checkOutDate, item.checkOutTime)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 160 }}>
                        {item.peopleInCharge || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 170 }}>
                        {item.basedLocation || '-'}
                      </TableCell>

                      <TableCell align="center" sx={{ fontSize: '0.75rem', py: 0.35, px: 0.7, minWidth: 120 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <Tooltip
                            title={
                              pastIndexRoomBooking
                                ? 'Past check-out time. Index Room is automatically unchecked.'
                                : indexRoomChecked
                                  ? `Hide from Index Room. Display order: ${indexRoomOrder || '-'}`
                                  : 'Show on Index Room. It will be added to the last display position.'
                            }
                            arrow
                          >
                            <span>
                              <Checkbox
                                size="small"
                                checked={indexRoomChecked}
                                disabled={loading || pastIndexRoomBooking || readOnly}
                                onChange={(e) => handleToggleIndexRoomDisplay(item, e.target.checked)}
                                sx={{ p: 0.25 }}
                              />
                            </span>
                          </Tooltip>

                          {indexRoomChecked && (
                            <Chip
                              size="small"
                              label={`No. ${indexRoomOrder || '-'}`}
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                              }}
                            />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, minWidth: 130 }}>
                        {formatMoney(item.roomCharged)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 130 }}>
                        {item.createdBy || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.createdAt)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
                        {formatDateTime(item.updatedAt)}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7, position: 'sticky', right: 0, zIndex: 2, backgroundColor: zebra }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip title="Edit Booking" arrow>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || readOnly}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete Booking" arrow>
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || readOnly}
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
                      <Typography sx={{ fontSize: '0.85rem' }}>No Room Bookings Found</Typography>
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

      <AddRoomBookingDialog
        open={openAddDialog && !readOnly}
        disabled={loading || readOnly}
        onCancel={() => setOpenAddDialog(false)}
        onOk={() => {
          setOpenAddDialog(false);
          setPage(0);
          fetchData({ page: 0 });
        }}
      />

      <EditRoomBookingDialog
        open={openEditDialog && !readOnly}
        currentItem={currentItem}
        disabled={loading || readOnly}
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
            Delete room booking <b>{selectedItem?.title || ''}</b> ?
          </Typography>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 1 }}>
            Room: {selectedItem?.roomName || selectedItem?.roomId || '-'}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedItem(null); }} disabled={loading}>
            No
          </Button>

          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading || readOnly}>
            {loading ? <CircularProgress size={20} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={displayDialogOpen}
        onClose={handleCloseDisplayDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>
                Edit Room Reservation Display
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                This popup edits only one display configuration.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {loadingDisplayConfig ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 5 }}>
              <CircularProgress size={20} />
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Loading display config...
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>
                    Edit Information
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      label="Small Label"
                      size="small"
                      value={displayConfig.eyebrowText}
                      onChange={(e) => handleChangeDisplayConfig('eyebrowText', e.target.value)}
                      disabled={savingDisplayConfig || readOnly}
                      fullWidth
                      helperText="Example: Room Reservation Display"
                    />

                    <TextField
                      label="Welcome Text"
                      size="small"
                      value={displayConfig.welcomeText}
                      onChange={(e) => handleChangeDisplayConfig('welcomeText', e.target.value)}
                      disabled={savingDisplayConfig || readOnly}
                      fullWidth
                      helperText="Example: Welcome to"
                    />

                    <TextField
                      label="Main Title"
                      size="small"
                      value={displayConfig.titleText}
                      onChange={(e) => handleChangeDisplayConfig('titleText', e.target.value)}
                      disabled={savingDisplayConfig || readOnly}
                      fullWidth
                      helperText="Example: Broadpeak Soc Trang"
                    />

                    <TextField
                      label="Status Text"
                      size="small"
                      value={displayConfig.statusText}
                      onChange={(e) => handleChangeDisplayConfig('statusText', e.target.value)}
                      disabled={savingDisplayConfig || readOnly}
                      fullWidth
                      helperText="Example: Reserved"
                    />
                  </Stack>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>
                    Preview
                  </Typography>

                  <Box
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 2,
                      p: 2,
                      minHeight: 170,
                      border: '1px solid #164e63',
                      background: 'linear-gradient(135deg, #0f3a5d, #183f42)',
                      color: '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        px: 1.4,
                        py: 0.35,
                        mb: 0.8,
                        borderRadius: 999,
                        bgcolor: '#facc15',
                        color: '#111827',
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {displayConfig.eyebrowText || DEFAULT_DISPLAY_CONFIG.eyebrowText}
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 18,
                        letterSpacing: 4,
                        textTransform: 'uppercase',
                        opacity: 0.9,
                        fontWeight: 500,
                        lineHeight: 1.1,
                      }}
                    >
                      {displayConfig.welcomeText || DEFAULT_DISPLAY_CONFIG.welcomeText}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: { xs: 30, md: 38 },
                        lineHeight: 1.05,
                        fontWeight: 1000,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        mb: 2,
                      }}
                    >
                      {displayConfig.titleText || DEFAULT_DISPLAY_CONFIG.titleText}
                    </Typography>

                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.8,
                        borderRadius: 2,
                        bgcolor: '#facc15',
                        color: '#111827',
                        fontWeight: 900,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          bgcolor: '#22c55e',
                          mr: 0.8,
                          boxShadow: '0 0 8px rgba(34,197,94,0.85)',
                        }}
                      />
                      {displayConfig.statusText || DEFAULT_DISPLAY_CONFIG.statusText}
                    </Box>

                    <Divider sx={{ mt: 2, borderColor: '#facc15', borderBottomWidth: 2 }} />
                  </Box>
                </Box>
              </Stack>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={handleCloseDisplayDialog}
            disabled={savingDisplayConfig || readOnly}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={savingDisplayConfig ? <CircularProgress size={16} color="inherit" /> : <Save fontSize="small" />}
            onClick={handleSaveDisplayConfig}
            disabled={loadingDisplayConfig || savingDisplayConfig || readOnly}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Save
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
