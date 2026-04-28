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
import DocumentsSearchFilter from './FormsSearchFilter';

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

  try {
    const cleanUrl = decodeURIComponent(String(url))
      .split('?')[0]
      .split('#')[0]
      .toLowerCase();

    if (cleanUrl.endsWith('.pdf')) return 'PDF';
    if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return 'IMAGE';
    if (cleanUrl.endsWith('.doc')) return 'DOC';
    if (cleanUrl.endsWith('.docx')) return 'DOCX';
    if (cleanUrl.endsWith('.xls')) return 'XLS';
    if (cleanUrl.endsWith('.xlsx')) return 'XLSX';
    if (cleanUrl.endsWith('.ppt')) return 'PPT';
    if (cleanUrl.endsWith('.pptx')) return 'PPTX';
  } catch {
    return 'FILE';
  }

  return 'FILE';
};

const getFileTypeColor = (type) => ({
  PDF: '#dc2626',
  IMAGE: '#2563eb',
  DOC: '#16a34a',
  DOCX: '#16a34a',
  XLS: '#15803d',
  XLSX: '#15803d',
  PPT: '#ea580c',
  PPTX: '#ea580c',
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

const OFFICE_PREVIEW_TYPES = new Set(['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX']);
const DIRECT_PREVIEW_TYPES = new Set(['PDF', 'IMAGE', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'TXT']);

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const getFileExtensionFromValue = (value) => {
  if (!value) return '';

  try {
    const decodedValue = decodeURIComponent(String(value));
    const cleanValue = decodedValue
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    const fileName = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex < 0 || dotIndex === fileName.length - 1) {
      return '';
    }

    return fileName.substring(dotIndex + 1).toUpperCase();
  } catch {
    const cleanValue = String(value)
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    const fileName = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toUpperCase() : '';
  }
};

const getFormFileTypeForPreview = (item) => {
  const fullUrl = getFullFileUrl(item?.fileUrl);
  const fileName = getFileName(item?.fileUrl);

  const candidates = [
    item?.fileType,
    item?.type,
    fileName,
    fullUrl,
    item?.fileUrl,
    item?.previewUrl,
  ];

  for (const candidate of candidates) {
    const directType = String(candidate || '').trim().toUpperCase();

    if (OFFICE_PREVIEW_TYPES.has(directType) || DIRECT_PREVIEW_TYPES.has(directType)) {
      return directType;
    }

    const extension = getFileExtensionFromValue(candidate);

    if (extension) {
      return extension;
    }
  }

  return '';
};

const shouldConvertFormFileToPdf = (item) => {
  return OFFICE_PREVIEW_TYPES.has(getFormFileTypeForPreview(item));
};

const getBlobErrorMessage = async (error, fallbackMessage) => {
  try {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      if (!text) return fallbackMessage;

      try {
        const json = JSON.parse(text);
        return json?.message || fallbackMessage;
      } catch {
        return text || fallbackMessage;
      }
    }

    return error?.response?.data?.message || error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const OfficeAppIcon = ({ app, colorStart, colorMid, colorEnd, panelColor, letter, size = 46 }) => {
  const gradientId = `form-${app}-gradient`;
  const panelGradientId = `form-${app}-panel-gradient`;
  const shadowId = `form-${app}-shadow`;

  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colorStart} />
          <stop offset="0.52" stopColor={colorMid} />
          <stop offset="1" stopColor={colorEnd} />
        </linearGradient>
        <linearGradient id={panelGradientId} x1="14" y1="18" x2="34" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={panelColor} />
          <stop offset="1" stopColor={colorEnd} />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect
        x="8"
        y="7"
        width="48"
        height="50"
        rx="13"
        fill={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
      />
      <path
        d="M8 20C8 12.82 13.82 7 21 7h22c7.18 0 13 5.82 13 13v5H8v-5Z"
        fill="#ffffff"
        opacity="0.22"
      />
      <path d="M32 7h11c7.18 0 13 5.82 13 13v37H32V7Z" fill="#ffffff" opacity="0.12" />
      <path d="M8 38h48v6H8v-6Z" fill="#000000" opacity="0.10" />

      <rect
        x="5"
        y="18"
        width="33"
        height="31"
        rx="6"
        fill={`url(#${panelGradientId})`}
        filter={`url(#${shadowId})`}
      />

      <text
        x="21.5"
        y="39.5"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {letter}
      </text>
    </Box>
  );
};

const WordFileIcon = ({ size = 46 }) => (
  <OfficeAppIcon
    app="word"
    colorStart="#41A5FF"
    colorMid="#185ABD"
    colorEnd="#0F3D91"
    panelColor="#256FE6"
    letter="W"
    size={size}
  />
);

const ExcelFileIcon = ({ size = 46 }) => (
  <OfficeAppIcon
    app="excel"
    colorStart="#33C481"
    colorMid="#107C41"
    colorEnd="#0B5C2E"
    panelColor="#168D4A"
    letter="X"
    size={size}
  />
);

const PowerPointFileIcon = ({ size = 46 }) => (
  <OfficeAppIcon
    app="powerpoint"
    colorStart="#FF8A65"
    colorMid="#D24726"
    colorEnd="#B33116"
    panelColor="#C43E1C"
    letter="P"
    size={size}
  />
);

const PdfFileIcon = ({ size = 46 }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    aria-hidden="true"
    sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="form-pdf-file-gradient" x1="14" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FF2B33" />
        <stop offset="1" stopColor="#E91F2A" />
      </linearGradient>
      <filter id="form-pdf-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.22" />
      </filter>
    </defs>

    <path
      d="M12 5h27l13 13v34c0 4.42-3.58 8-8 8H20c-4.42 0-8-3.58-8-8V5Z"
      fill="url(#form-pdf-file-gradient)"
      filter="url(#form-pdf-file-shadow)"
    />
    <path d="M39 5v13h13L39 5Z" fill="#FF8A8F" opacity="0.88" />
    <path d="M39 18h13v1.5c0 1.2-1 2.2-2.2 2.2H41.2c-1.2 0-2.2-1-2.2-2.2V18Z" fill="#C71925" opacity="0.22" />
    <text
      x="32"
      y="40"
      textAnchor="middle"
      fontSize="16"
      fontWeight="900"
      fill="#ffffff"
      fontFamily="Arial, Helvetica, sans-serif"
      letterSpacing="0.5"
    >
      PDF
    </text>
  </Box>
);

const ImageFileIcon = ({ size = 46 }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    aria-hidden="true"
    sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="form-image-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#A78BFA" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
      <filter id="form-image-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.20" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="13" fill="url(#form-image-file-gradient)" filter="url(#form-image-file-shadow)" />
    <circle cx="24" cy="23" r="5" fill="#ffffff" opacity="0.95" />
    <path d="M15 46 28 33l8 8 5-5 9 10H15Z" fill="#ffffff" opacity="0.95" />
  </Box>
);

const GenericFileIcon = ({ size = 46 }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    aria-hidden="true"
    sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="form-generic-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#94A3B8" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
      <filter id="form-generic-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.18" />
      </filter>
    </defs>
    <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#form-generic-file-gradient)" filter="url(#form-generic-file-shadow)" />
    <path d="M41 5v10h10L41 5Z" fill="#CBD5E1" opacity="0.9" />
    <path d="M22 28h20M22 37h20M22 46h14" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
  </Box>
);

const NoFileIcon = ({ size = 38 }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    aria-hidden="true"
    sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="form-nofile-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#CBD5E1" />
        <stop offset="1" stopColor="#94A3B8" />
      </linearGradient>
    </defs>
    <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#form-nofile-gradient)" />
    <path d="M41 5v10h10L41 5Z" fill="#E2E8F0" />
    <path d="m22 42 20-20M22 22l20 20" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
  </Box>
);

const getFormFileIconMeta = (type) => {
  const normalizedType = String(type || '').toUpperCase();

  if (['DOC', 'DOCX'].includes(normalizedType)) {
    return { title: 'Word file', icon: <WordFileIcon /> };
  }

  if (['XLS', 'XLSX', 'CSV'].includes(normalizedType)) {
    return { title: 'Excel file', icon: <ExcelFileIcon /> };
  }

  if (['PPT', 'PPTX'].includes(normalizedType)) {
    return { title: 'PowerPoint file', icon: <PowerPointFileIcon /> };
  }

  if (normalizedType === 'PDF') {
    return { title: 'PDF file', icon: <PdfFileIcon /> };
  }

  if (['IMAGE', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(normalizedType)) {
    return { title: 'Image file', icon: <ImageFileIcon /> };
  }

  if (normalizedType === 'NO FILE') {
    return { title: 'No file attached', icon: <NoFileIcon /> };
  }

  return { title: `${normalizedType || 'File'} file`, icon: <GenericFileIcon /> };
};

const FormFileIcon = ({ type }) => {
  const meta = getFormFileIconMeta(type);

  return (
    <Tooltip title={meta.title} arrow>
      <Box
        component="span"
        sx={{
          width: 50,
          height: 50,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        {meta.icon}
      </Box>
    </Tooltip>
  );
};

const deleteForm = async (id) => {
  const userId = getCurrentUserId();

  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  const response = await api.delete(`/api/forms/${id}`, {
    params: {
      userId,
    },
  });

  return response.data;
};

const parseJsonSafely = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;

    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getCurrentUserId = () => {
  const directUserId = localStorage.getItem('userId');
  if (directUserId) return directUserId;

  const userKeys = ['user', 'currentUser', 'authUser', 'userInfo'];

  for (const key of userKeys) {
    const user = parseJsonSafely(localStorage.getItem(key));

    if (user?.id) return user.id;
    if (user?.userId) return user.userId;
    if (user?._id) return user._id;
  }

  const tokenPayload = decodeJwtPayload(localStorage.getItem('token'));

  return tokenPayload?.id
    || tokenPayload?.userId
    || tokenPayload?._id
    || tokenPayload?.sub
    || '';
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
  previewKind: '',
};

/* Headers */
const headers = [
  { label: 'No', key: 'no', sortable: false },
  { label: 'Department', key: 'department', sortable: true },
  { label: 'Type', key: 'typeName', sortable: true },
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
  const [searchTypeId, setSearchTypeId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDesc, setSearchDesc] = useState('');

  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDepartmentId, setCurrentDepartmentId] = useState('');
  const [disableDepartmentSearch, setDisableDepartmentSearch] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isLargeScreen ? 20 : 12);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' });

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);
  const [previewState, setPreviewState] = useState(emptyPreviewState);

  const typeNameMap = useMemo(() => {
    return documentTypes.reduce((map, type) => {
      if (type?.id) {
        map[type.id] = type.name || '-';
      }

      return map;
    }, {});
  }, [documentTypes]);

  const getTypeName = useCallback((typeId) => {
    if (!typeId) return '-';
    return typeNameMap[typeId] || '-';
  }, [typeNameMap]);

  const fetchDocumentTypes = useCallback(async () => {
    setLoadingTypes(true);

    try {
      const response = await api.get('/api/document-types');
      const list = Array.isArray(response.data) ? response.data : [];
      setDocumentTypes(list);
    } catch (error) {
      console.error('Error fetching document types:', error.response?.data || error.message);
      setDocumentTypes([]);
      setNotification({
        open: true,
        message: 'Failed to load document types',
        severity: 'error',
      });
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const fetchData = useCallback(
    async (filters = {}, overrides = {}) => {
      const userId = getCurrentUserId();

      if (!userId) {
        setNotification({
          open: true,
          message: 'User ID not found. Please login again.',
          severity: 'error',
        });

        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      setLoading(true);

      const effPage = overrides.page ?? page;
      const effSize = overrides.size ?? rowsPerPage;

      const params = {
        userId,
        skipDepartmentFilter: true,
        page: effPage,
        size: effSize,
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
        setIsAdmin(Boolean(response.data?.isAdmin));
        setCurrentDepartmentId(response.data?.currentDepartmentId || '');
        setDisableDepartmentSearch(Boolean(response.data?.disableDepartmentSearch));
      } catch (error) {
        console.error('Error fetching forms:', error.response?.data || error.message);
        setNotification({ open: true, message: 'Failed to load documents', severity: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, sortConfig],
  );

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = getCurrentUserId();

    if (!token || !userId) {
      setNotification({ open: true, message: 'Please login to access this page.', severity: 'error' });
      localStorage.removeItem('token');
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

  const canModifyItem = useCallback((item, action = 'edit') => {
    if (!item?.id) return false;
    if (isAdmin) return true;

    const key = action === 'delete' ? 'canDelete' : 'canEdit';

    if (typeof item?.[key] === 'boolean') {
      return item[key];
    }

    return Boolean(
      currentDepartmentId &&
      item?.departmentId &&
      String(currentDepartmentId).trim() === String(item.departmentId).trim()
    );
  }, [isAdmin, currentDepartmentId]);

  const handleOpenEdit = useCallback((item) => {
    if (!canModifyItem(item, 'edit')) {
      setNotification({
        open: true,
        message: 'Bạn chỉ được edit document thuộc phòng ban chính của bạn.',
        severity: 'error',
      });
      return;
    }

    setCurrentItem(item);
    setOpenEdit(true);
  }, [canModifyItem]);

  const handleOpenDelete = useCallback((item) => {
    if (!canModifyItem(item, 'delete')) {
      setNotification({
        open: true,
        message: 'Bạn chỉ được delete document thuộc phòng ban chính của bạn.',
        severity: 'error',
      });
      return;
    }

    setSelectedDeleteItem(item);
    setDeleteDialogOpen(true);
  }, [canModifyItem]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedDeleteItem(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedDeleteItem?.id) return;

    if (!canModifyItem(selectedDeleteItem, 'delete')) {
      setNotification({
        open: true,
        message: 'Bạn chỉ được delete document thuộc phòng ban chính của bạn.',
        severity: 'error',
      });
      handleCancelDelete();
      return;
    }

    setLoading(true);

    try {
      const result = await deleteForm(selectedDeleteItem.id);
      setNotification({
        open: true,
        message: result?.message || 'Deleted successfully',
        severity: 'success',
      });

      handleCancelDelete();
      fetchData({}, { page });
    } catch (error) {
      console.error('Delete document error:', error);
      setNotification({
        open: true,
        message: error?.response?.data?.message || error.message || 'Delete failed',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDeleteItem, canModifyItem, handleCancelDelete, fetchData, page]);

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
    if (searchTypeId?.trim()) filters.typeId = searchTypeId.trim();
    if (searchTitle?.trim()) filters.title = searchTitle.trim();
    if (searchDesc?.trim()) filters.description = searchDesc.trim();

    fetchData(filters, { page: 0 });
  }, [fetchData, searchDeptName, searchTypeId, searchTitle, searchDesc]);

  const handleResetFilter = useCallback(() => {
    setSearchDeptName('');
    setSearchTypeId('');
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

      return {
        ...emptyPreviewState,
        open: true,
        loading: true,
        error: '',
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
        previewKind: '',
      };
    });

    try {
      const shouldConvertToPdf = shouldConvertFormFileToPdf(item);

      const response = shouldConvertToPdf
        ? await axios.get(`${API_BASE_URL}/api/files/preview-pdf`, {
            params: {
              fileUrl: fullUrl,
            },
            responseType: 'blob',
            headers: getAuthHeaders('application/pdf'),
          })
        : await axios.get(fullUrl, {
            responseType: 'blob',
            headers: getAuthHeaders('*/*'),
          });

      const mimeType = shouldConvertToPdf
        ? 'application/pdf'
        : response.headers['content-type'] || response?.data?.type || '';

      const previewKindValue = shouldConvertToPdf
        ? 'pdf'
        : getPreviewKind(fileName, mimeType);

      const blobUrl = URL.createObjectURL(response.data);

      setPreviewState({
        ...emptyPreviewState,
        open: true,
        loading: false,
        error: '',
        item,
        blobUrl,
        mimeType,
        fileName,
        previewKind: previewKindValue,
      });
    } catch (error) {
      console.error('Preview error:', error);
      const errorMessage = await getBlobErrorMessage(error, 'Unable to load file for preview. You can download it.');

      setPreviewState({
        ...emptyPreviewState,
        open: true,
        loading: false,
        error: errorMessage,
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
        previewKind: '',
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
        headers: getAuthHeaders('*/*'),
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
    () => previewState.previewKind || getPreviewKind(previewState.fileName, previewState.mimeType),
    [previewState.previewKind, previewState.fileName, previewState.mimeType],
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
              Documents
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
              fontWeight: 400,
              borderRadius: 1.2,
              px: 1.25,
              height: 34,
              backgroundColor: '#111827',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#0b1220',
                boxShadow: 'none',
              },
            }}
          >
            Add Document
          </Button>
        </Stack>
      </Paper>

      {/* Search Filter */}
      <DocumentsSearchFilter
        searchDeptName={searchDeptName}
        setSearchDeptName={setSearchDeptName}
        searchTypeId={searchTypeId}
        setSearchTypeId={setSearchTypeId}
        documentTypes={documentTypes}
        loadingTypes={loadingTypes}
        searchTitle={searchTitle}
        setSearchTitle={setSearchTitle}
        searchDesc={searchDesc}
        setSearchDesc={setSearchDesc}
        onSearch={handleSearch}
        onReset={handleResetFilter}
        disabled={loading}
        disableDepartmentSearch={disableDepartmentSearch}
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
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleSort(key)}
                                sx={{ p: 0.25 }}
                                disabled={loading}
                              >
                                <SortIndicator active={active} direction={sortConfig.direction} />
                              </IconButton>
                            </span>
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
                      <Typography>No Documents Found</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, idx) => {
                  const zebra = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  const fileName = getFileName(item.fileUrl);
                  const fileType = getFormFileTypeForPreview(item) || item.fileType || getFileTypeFromUrl(item.fileUrl);
                  const editEnabled = canModifyItem(item, 'edit');
                  const deleteEnabled = canModifyItem(item, 'delete');

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
                      <TableCell sx={{ fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
                        {getTypeName(item.typeId)}
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
                      <TableCell sx={{ py: 0.45, px: 0.7, minWidth: 280 }}>
                        {item.fileUrl ? (
                          <Stack direction="row" spacing={1.1} alignItems="center">
                            <FormFileIcon type={fileType} />

                            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
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
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <FormFileIcon type="NO FILE" />
                            <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>No file</Typography>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.75rem', color: '#374151', display: { xs: 'none', md: 'table-cell' } }}
                      >
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.3} justifyContent="center">
                          <Tooltip
                            title={editEnabled ? 'Edit Document' : 'Bạn chỉ được edit document thuộc phòng ban chính của bạn'}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                disabled={loading || !editEnabled}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={deleteEnabled ? 'Delete Document' : 'Bạn chỉ được delete document thuộc phòng ban chính của bạn'}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                disabled={loading || !deleteEnabled}
                                onClick={() => handleOpenDelete(item)}
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
        isAdmin={isAdmin}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSearch={disableDepartmentSearch}
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
        isAdmin={isAdmin}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSearch={disableDepartmentSearch}
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

      <Dialog
        open={deleteDialogOpen}
        onClose={loading ? undefined : handleCancelDelete}
        PaperProps={{ sx: { borderRadius: 1.5, border: '1px solid #e5e7eb' } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
              Delete Document
            </Typography>
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
            Are you sure you want to delete <strong>{selectedDeleteItem?.title || 'Unknown'}</strong>?
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 1.5, py: 1.1, borderTop: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
          <Button onClick={handleCancelDelete} disabled={loading} sx={{ textTransform: 'none', fontWeight: 400 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={loading || !canModifyItem(selectedDeleteItem, 'delete')}
            sx={{ textTransform: 'none', fontWeight: 400 }}
          >
            {loading ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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
                {previewState.item?.title || 'Document File'}
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