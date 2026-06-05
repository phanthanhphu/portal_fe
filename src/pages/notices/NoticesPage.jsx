// NoticesPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
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
  useMediaQuery,
  Pagination,
} from '@mui/material';

import {
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

import { apiRawClient as axios } from '../../routes/globalApi';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

import AddNoticeDialog from './AddNoticeDialog';
import EditNoticeDialog from './EditNoticeDialog';
import NoticeSearch from './NoticeSearch';

// Import from utils
import {
  formatDateTime,
  getPinnedColor,
  pillSx,
  getNoticeFileUrl,
  getNoticeFileName,
  getFileTypeFromUrl,
  getPreviewKind,
  emptyPreviewState,
  sortRowsClient,
  headers as baseHeaders,
} from './noticesUtils';


// ==================== AUTH HELPERS ====================
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



const stripHtml = (html = '') =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const sanitizeNoticeHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

const isLongContent = (text = '') => String(text || '').trim().length > 180;

const getNoticeFileUrlsFromItem = (item) => {
  const urls = [];

  if (Array.isArray(item?.fileUrls)) {
    item.fileUrls.forEach((url) => {
      const cleanUrl = String(url || '').trim();
      if (cleanUrl && !urls.includes(cleanUrl)) urls.push(cleanUrl);
    });
  }

  if (urls.length === 0) {
    const singleUrl = getNoticeFileUrl(item);
    if (singleUrl) urls.push(singleUrl);
  }

  return urls;
};

const createNoticeFileItem = (item, fileUrl) => ({
  ...item,
  fileUrl,
  previewUrl: fileUrl || item?.previewUrl || '',
});

const normalizeNoticeRowForTable = (item, fallback = {}) => {
  const source = item || {};
  const base = fallback || {};

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const sourceHasFileUrls = Array.isArray(source.fileUrls);
  const sourceHasPreviewUrls = Array.isArray(source.previewUrls);
  const sourceHasFileUrl = hasOwn(source, 'fileUrl');
  const sourceHasPreviewUrl = hasOwn(source, 'previewUrl');

  const departmentName = source.departmentName ?? base.departmentName ?? '';
  const division = source.division ?? base.division ?? '';

  const fileUrls = sourceHasFileUrls
    ? source.fileUrls
    : Array.isArray(base.fileUrls)
      ? base.fileUrls
      : getNoticeFileUrlsFromItem(source);

  const previewUrls = sourceHasPreviewUrls
    ? source.previewUrls
    : sourceHasFileUrls
      ? fileUrls
      : Array.isArray(base.previewUrls)
        ? base.previewUrls
        : fileUrls;

  /*
   * IMPORTANT:
   * If Edit Notice sends fileUrls: [], it means the user removed all files.
   * Do NOT fallback to base.fileUrl, otherwise the old file appears again on UI.
   */
  const nextFileUrl = fileUrls[0]
    || (sourceHasFileUrl ? source.fileUrl : base.fileUrl)
    || null;

  const nextPreviewUrl = previewUrls[0]
    || (sourceHasPreviewUrl ? source.previewUrl : base.previewUrl)
    || nextFileUrl
    || null;

  return {
    ...base,
    ...source,
    departmentName,
    division,
    department: [departmentName, division].filter(Boolean).join(' '),
    fileUrl: nextFileUrl,
    previewUrl: nextPreviewUrl,
    fileUrls,
    previewUrls,
  };
};

const doesNoticeMatchCurrentFilters = (item, filters = {}) => {
  const title = String(item?.title || '').toLowerCase();
  const content = stripHtml(item?.content || '').toLowerCase();
  const department = String(item?.departmentName || item?.department || '').toLowerCase();
  const division = String(item?.division || '').toLowerCase();

  const filterTitle = String(filters.searchTitle || '').trim().toLowerCase();
  const filterContent = String(filters.searchContent || '').trim().toLowerCase();
  const filterDepartment = String(filters.searchDepartment || '').trim().toLowerCase();
  const filterDivision = String(filters.searchDivision || '').trim().toLowerCase();

  if (filterTitle && !title.includes(filterTitle)) return false;
  if (filterContent && !content.includes(filterContent)) return false;
  if (filterDepartment && !department.includes(filterDepartment)) return false;
  if (filterDivision && !division.includes(filterDivision)) return false;

  return true;
};

const normalizeApprovalStatus = (value) => {
  const status = String(value || '').trim().toUpperCase();

  if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
    return status;
  }

  // Legacy notices that were created before approval workflow are treated as approved.
  return 'APPROVED';
};

const isApprovedNotice = (item) => normalizeApprovalStatus(item?.status) === 'APPROVED';

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

const OFFICE_PREVIEW_TYPES = new Set(['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX']);
const DIRECT_PREVIEW_TYPES = new Set(['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'TXT']);

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const getFileExtensionFromUrl = (value) => {
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

const getNoticePreviewFileType = (item) => {
  const fileUrl = getNoticeFileUrl(item);
  const fileName = getNoticeFileName(item);

  const candidates = [
    item?.fileType,
    item?.type,
    fileName,
    fileUrl,
    item?.fileUrl,
    item?.previewUrl,
  ];

  for (const candidate of candidates) {
    const directType = String(candidate || '').trim().toUpperCase();

    if (OFFICE_PREVIEW_TYPES.has(directType) || DIRECT_PREVIEW_TYPES.has(directType)) {
      return directType;
    }

    const extension = getFileExtensionFromUrl(candidate);

    if (extension) {
      return extension;
    }
  }

  return '';
};

const shouldConvertNoticeFileToPdf = (item) => {
  return OFFICE_PREVIEW_TYPES.has(getNoticePreviewFileType(item));
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
  const gradientId = `notice-${app}-gradient`;
  const panelGradientId = `notice-${app}-panel-gradient`;
  const shadowId = `notice-${app}-shadow`;

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
      <linearGradient id="notice-pdf-file-gradient" x1="14" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FF2B33" />
        <stop offset="1" stopColor="#E91F2A" />
      </linearGradient>
      <filter id="notice-pdf-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.22" />
      </filter>
    </defs>

    <path
      d="M12 5h27l13 13v34c0 4.42-3.58 8-8 8H20c-4.42 0-8-3.58-8-8V5Z"
      fill="url(#notice-pdf-file-gradient)"
      filter="url(#notice-pdf-file-shadow)"
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
      <linearGradient id="notice-image-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#A78BFA" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
      <filter id="notice-image-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.20" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="13" fill="url(#notice-image-file-gradient)" filter="url(#notice-image-file-shadow)" />
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
      <linearGradient id="notice-generic-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#94A3B8" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
      <filter id="notice-generic-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.18" />
      </filter>
    </defs>
    <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#notice-generic-file-gradient)" filter="url(#notice-generic-file-shadow)" />
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
      <linearGradient id="notice-nofile-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#CBD5E1" />
        <stop offset="1" stopColor="#94A3B8" />
      </linearGradient>
    </defs>
    <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#notice-nofile-gradient)" />
    <path d="M41 5v10h10L41 5Z" fill="#E2E8F0" />
    <path d="m22 42 20-20M22 22l20 20" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
  </Box>
);

const getNoticeFileIconMeta = (type) => {
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

  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(normalizedType)) {
    return { title: 'Image file', icon: <ImageFileIcon /> };
  }

  if (normalizedType === 'NO FILE') {
    return { title: 'No file attached', icon: <NoFileIcon /> };
  }

  return { title: `${normalizedType || 'File'} file`, icon: <GenericFileIcon /> };
};

const NoticeFileIcon = ({ type }) => {
  const meta = getNoticeFileIconMeta(type);

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
    const next = baseHeaders
      .filter((header) => !['division', 'departmentName', 'userId', 'updatedAt'].includes(header.key));

    const hasDepartment = next.some((header) => header.key === 'department');
    const insertIndex = next.findIndex((header) => header.key === 'fileUrl');

    if (!hasDepartment) {
      const departmentHeader = {
        label: 'Department',
        key: 'department',
        sortable: true,
        hideOnSmall: true,
      };

      if (insertIndex >= 0) {
        next.splice(insertIndex, 0, departmentHeader);
      } else {
        next.push(departmentHeader);
      }
    }

    // Show updated date column right after created date.
    // The backend already returns updatedAt as a date array, so formatDateTime can render it directly.
    const hasUpdatedAt = next.some((header) => header.key === 'updatedAt');

    if (!hasUpdatedAt) {
      const updatedAtHeader = {
        label: 'Updated Date',
        key: 'updatedAt',
        sortable: true,
        hideOnSmall: true,
      };

      const createdAtIndex = next.findIndex((header) => header.key === 'createdAt');
      const actionsIndex = next.findIndex((header) => header.key === 'actions');

      if (createdAtIndex >= 0) {
        next.splice(createdAtIndex + 1, 0, updatedAtHeader);
      } else if (actionsIndex >= 0) {
        next.splice(actionsIndex, 0, updatedAtHeader);
      } else {
        next.push(updatedAtHeader);
      }
    }

    return next;
  }, []);

  // State variables
  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDepartmentId, setCurrentDepartmentId] = useState('');
  const [disableDepartmentSearch, setDisableDepartmentSearch] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
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
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [contentDialogItem, setContentDialogItem] = useState(null);
  const [previewState, setPreviewState] = useState(emptyPreviewState);

  // Realtime socket refs - same pattern as PageHome.
  // Keep the latest refresh function without reconnecting socket on every render.
  const noticeRealtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);

  // Fetch data function
  const fetchData = useCallback(async (overrides = {}) => {
    const silent = Boolean(overrides.silent);

    if (!silent) {
      setLoading(true);
    }

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effSearchDivision = overrides.searchDivision !== undefined ? overrides.searchDivision : searchDivisionFilter;
    const effSearchDepartment = overrides.searchDepartment !== undefined ? overrides.searchDepartment : searchDepartmentFilter;
    const effSearchTitle = overrides.searchTitle !== undefined ? overrides.searchTitle : searchTitleFilter;
    const effSearchContent = overrides.searchContent !== undefined ? overrides.searchContent : searchContentFilter;

    const userId = getCurrentUserId();

    if (!userId) {
      setData([]);
      setTotalElements(0);
      setTotalPages(1);
      setNotification({
        open: true,
        message: 'User ID not found. Please login again.',
        severity: 'error',
      });
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/notices/search`, {
        params: {
          userId,
          skipDepartmentFilter: true,
          division: effSearchDivision,
          departmentName: effSearchDepartment,
          title: effSearchTitle,
          content: effSearchContent,
          status: 'APPROVED',
          page: effPage,
          size: effSize,
        },
        headers: getAuthHeaders('*/*'),
      });

      const result = response?.data || {};
      const normalizedContent = (result.content || [])
        .map((item) => normalizeNoticeRowForTable(item))
        .filter(isApprovedNotice);
      const finalData = sortRowsClient(normalizedContent, sortConfig);

      setData(finalData);
      setTotalElements(result.totalElements || 0);
      setTotalPages(result.totalPages || 1);
      setIsAdmin(Boolean(result.isAdmin));
      setCurrentDepartmentId(result.currentDepartmentId || '');
      setDisableDepartmentSearch(Boolean(result.disableDepartmentSearch));
    } catch (error) {
      console.error(error);

      if (!silent) {
        setData([]);
        setTotalElements(0);
        setTotalPages(1);
        setNotification({
          open: true,
          message: error?.response?.data?.message || 'Failed to fetch notices.',
          severity: 'error',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [page, rowsPerPage, searchDivisionFilter, searchDepartmentFilter, searchTitleFilter, searchContentFilter, sortConfig, navigate]);

  const fetchNoticeByIdForSocket = useCallback(async (noticeId) => {
    if (!noticeId) return null;

    const response = await axios.get(`${API_BASE_URL}/api/notices/${noticeId}`, {
      headers: getAuthHeaders('*/*'),
    });

    return response?.data || null;
  }, []);

  const refreshNoticesBySocket = useCallback(async (event = {}) => {
    const module = String(event?.module || 'ALL').toUpperCase();
    const action = String(event?.action || 'UPDATED').toUpperCase();
    const noticeId = String(event?.id || '').trim();

    const shouldRefresh =
      module === 'ALL' ||
      module === 'NOTICE' ||
      module === 'NOTICES' ||
      module === 'DEPARTMENT';

    if (!shouldRefresh) return;

    console.log('Notices realtime event received:', event);

    /*
     * Do not refetch the whole page for normal Notice CRUD.
     * Update the visible table data in-place so the page does not flash, reset,
     * or change layout when another account saves a notice.
     */
    if ((module === 'NOTICE' || module === 'NOTICES') && noticeId) {
      if (action === 'DELETED') {
        setData((prev) => prev.filter((item) => String(item?.id) !== noticeId));
        setTotalElements((prev) => Math.max(Number(prev || 0) - 1, 0));
        setTotalPages((prev) => Math.max(Number(prev || 1), 1));

        setCurrentItem((prev) => (String(prev?.id || '') === noticeId ? null : prev));
        setContentDialogItem((prev) => (String(prev?.id || '') === noticeId ? null : prev));
        setOpenEditDialog((prev) => (String(currentItem?.id || '') === noticeId ? false : prev));
        setContentDialogOpen((prev) => (String(contentDialogItem?.id || '') === noticeId ? false : prev));

        console.log(`Notices data updated in-place by socket: ${module} ${action}`);
        return;
      }

      const latestNotice = await fetchNoticeByIdForSocket(noticeId);

      if (!latestNotice) return;

      setData((prev) => {
        const existingIndex = prev.findIndex((item) => String(item?.id) === noticeId);
        const existingItem = existingIndex >= 0 ? prev[existingIndex] : null;
        const normalizedNotice = normalizeNoticeRowForTable(latestNotice, existingItem || {});
        const approvedForIndex = isApprovedNotice(normalizedNotice);

        const filters = {
          searchDivision: searchDivisionFilter,
          searchDepartment: searchDepartmentFilter,
          searchTitle: searchTitleFilter,
          searchContent: searchContentFilter,
        };

        const matchesCurrentFilters = doesNoticeMatchCurrentFilters(normalizedNotice, filters);

        if (existingIndex >= 0) {
          if (!approvedForIndex || !matchesCurrentFilters) {
            return prev.filter((item) => String(item?.id) !== noticeId);
          }

          const next = prev.map((item) => (String(item?.id) === noticeId ? normalizedNotice : item));
          return sortRowsClient(next, sortConfig);
        }

        if (action === 'CREATED' && page === 0 && approvedForIndex && matchesCurrentFilters) {
          const next = [normalizedNotice, ...prev].slice(0, rowsPerPage);
          return sortRowsClient(next, sortConfig);
        }

        return prev;
      });

      if (action === 'CREATED' && isApprovedNotice(latestNotice)) {
        setTotalElements((prev) => Number(prev || 0) + 1);
        setTotalPages((prev) => Math.max(prev, Math.ceil((Number(totalElements || 0) + 1) / rowsPerPage)));
      }

      setCurrentItem((prev) => (String(prev?.id || '') === noticeId ? normalizeNoticeRowForTable(latestNotice, prev) : prev));
      setContentDialogItem((prev) => (String(prev?.id || '') === noticeId ? normalizeNoticeRowForTable(latestNotice, prev) : prev));

      console.log(`Notices data updated in-place by socket: ${module} ${action}`);
      return;
    }

    /*
     * Department/ALL events can affect displayed department names or permission data,
     * so use a silent list refresh without showing loading and without resetting page.
     */
    await fetchData({
      page,
      silent: true,
      searchDivision: searchDivisionFilter,
      searchDepartment: searchDepartmentFilter,
      searchTitle: searchTitleFilter,
      searchContent: searchContentFilter,
    });

    console.log(`Notices data silently refreshed by socket: ${module} ${action}`);
  }, [
    fetchNoticeByIdForSocket,
    fetchData,
    page,
    rowsPerPage,
    totalElements,
    sortConfig,
    searchDivisionFilter,
    searchDepartmentFilter,
    searchTitleFilter,
    searchContentFilter,
    currentItem,
    contentDialogItem,
  ]);

  useEffect(() => {
    noticeRealtimeRefreshRef.current = refreshNoticesBySocket;
  });

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        console.log('Notices realtime connected');

        client.subscribe('/topic/app-events', async (message) => {
          let event = {
            module: 'ALL',
            action: 'UPDATED',
            id: '',
          };

          try {
            event = JSON.parse(message.body);
          } catch {
            // Keep fallback event above.
          }

          const module = String(event?.module || 'ALL').toUpperCase();
          const shouldRefresh =
            module === 'ALL' ||
            module === 'NOTICE' ||
            module === 'NOTICES' ||
            module === 'DEPARTMENT';

          if (!shouldRefresh) return;

          console.log('Notices realtime event received:', event);

          if (socketRefreshingRef.current) return;

          socketRefreshingRef.current = true;

          try {
            await noticeRealtimeRefreshRef.current?.(event);
          } catch (error) {
            console.error('Notices realtime refresh failed:', error);
          } finally {
            socketRefreshingRef.current = false;
          }
        });
      },

      onDisconnect: () => {
        console.log('Notices realtime disconnected');
      },

      onStompError: (frame) => {
        console.error('Notices realtime STOMP error:', frame);
      },

      onWebSocketError: (error) => {
        console.error('Notices realtime socket error:', error);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  // Check token and fetch data on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = getCurrentUserId();

    if (!token || !userId) {
      setNotification({ open: true, message: 'Please login to access this page.', severity: 'error' });
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }

    fetchData();
  }, [fetchData, navigate]);

  // Keep page size stable. Browser zoom/responsive changes must not reset page size or page index.

  // Cleanup blob URL
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
    if (!canModifyItem(item, 'edit')) {
      setNotification({
        open: true,
        message: 'You can only edit notices from your primary department.',
        severity: 'error',
      });
      return;
    }

    setCurrentItem(item);
    setOpenEditDialog(true);
  }, [canModifyItem]);

  // Open single delete confirmation
  const handleDelete = useCallback((item) => {
    if (!canModifyItem(item, 'delete')) {
      setNotification({
        open: true,
        message: 'You can only delete notices from your primary department.',
        severity: 'error',
      });
      return;
    }

    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, [canModifyItem]);

  // Confirm single delete
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    if (!canModifyItem(selectedItem, 'delete')) {
      setNotification({
        open: true,
        message: 'You can only delete notices from your primary department.',
        severity: 'error',
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      return;
    }

    setLoading(true);

    try {
      const userId = getCurrentUserId();

      if (!userId) {
        throw new Error('User ID not found. Please login again.');
      }

      const response = await axios.delete(`${API_BASE_URL}/api/notices/${selectedItem.id}`, {
        params: {
          userId,
        },
        headers: getAuthHeaders('*/*'),
      });

      await fetchData();

      setNotification({
        open: true,
        message: response?.data?.message || 'Deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.message || error.message || 'Delete failed',
        severity: 'error',
      });
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

  const handleOpenContentDialog = useCallback((item) => {
    setContentDialogItem(item);
    setContentDialogOpen(true);
  }, []);

  const handleCloseContentDialog = useCallback(() => {
    setContentDialogOpen(false);
    setContentDialogItem(null);
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
      const shouldConvertToPdf = shouldConvertNoticeFileToPdf(item);

      const response = shouldConvertToPdf
        ? await axios.get(`${API_BASE_URL}/api/files/preview-pdf`, {
            params: {
              fileUrl,
            },
            responseType: 'blob',
            headers: getAuthHeaders('application/pdf'),
          })
        : await axios.get(fileUrl, {
            responseType: 'blob',
            headers: getAuthHeaders('*/*'),
          });

      const mimeType = shouldConvertToPdf
        ? 'application/pdf'
        : response?.data?.type || response?.headers?.['content-type'] || '';

      const previewKindValue = shouldConvertToPdf
        ? 'pdf'
        : getPreviewKind(item, mimeType);

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
      const errorMessage = await getBlobErrorMessage(error, 'Failed to load file for preview.');

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
      setNotification({ open: true, message: 'Failed to download file.', severity: 'error' });
    }
  }, []);

  const previewKind = useMemo(() => {
    return previewState.previewKind || getPreviewKind(previewState.item, previewState.mimeType);
  }, [previewState.previewKind, previewState.item, previewState.mimeType]);

  return (
    <Box sx={pageWrapSx}>
      {/* Filter Section + Add Button */}
      <NoticeSearch
        searchDivision={searchDivisionInput}
        setSearchDivision={setSearchDivisionInput}
        searchDepartment={searchDepartmentInput}
        setSearchDepartment={setSearchDepartmentInput}
        searchTitle={searchTitleInput}
        setSearchTitle={setSearchTitleInput}
        searchContent={searchContentInput}
        setSearchContent={setSearchContentInput}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={() => setOpenAddDialog(true)}
        disabled={loading}
        disableDepartmentSearch={disableDepartmentSearch}
      />

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
                            <span>
                              <IconButton
                                size="small"
                                disabled={loading}
                                onClick={(e) => { e.stopPropagation(); handleSort(key); }}
                                sx={{ p: 0.25 }}
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
                  const fileUrls = getNoticeFileUrlsFromItem(item);
                  const editEnabled = canModifyItem(item, 'edit');
                  const deleteEnabled = canModifyItem(item, 'delete');
                  const contentText = stripHtml(item.content);
                  const showMoreContent = isLongContent(contentText);

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

                      <TableCell sx={{ py: 0.55, px: 0.7, color: '#374151', minWidth: 240, maxWidth: 340 }}>
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              lineHeight: 1.45,
                              color: '#374151',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {contentText || '-'}
                          </Typography>

                          {contentText && showMoreContent && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleOpenContentDialog(item)}
                              sx={{
                                minWidth: 'auto',
                                p: 0,
                                mt: 0.2,
                                fontSize: '0.7rem',
                                textTransform: 'none',
                                fontWeight: 700,
                              }}
                            >
                              More
                            </Button>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 180 }}>
                        <Stack spacing={0.2}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
                            {item.departmentName || '-'}
                          </Typography>
                          {item.division && (
                            <Typography sx={{ fontSize: '0.68rem', color: '#6b7280' }}>
                              {item.division}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ py: 0.45, px: 0.7, minWidth: 320 }}>
                        {fileUrls.length > 0 ? (
                          <Stack spacing={0.8}>
                            {fileUrls.map((fileUrl, fileIndex) => {
                              const fileItem = createNoticeFileItem(item, fileUrl);
                              const fileName = getNoticeFileName(fileItem);
                              const fileType = getNoticePreviewFileType(fileItem) || getFileTypeFromUrl(fileItem);

                              return (
                                <Stack
                                  key={`${item.id}-${fileUrl}-${fileIndex}`}
                                  direction="row"
                                  spacing={1.1}
                                  alignItems="center"
                                  sx={{
                                    p: 0.7,
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 1.5,
                                    backgroundColor: '#fff',
                                  }}
                                >
                                  <NoticeFileIcon type={fileType} />

                                  <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                                    <Tooltip title={fileName || 'Attached file'} arrow>
                                      <Typography sx={{ fontSize: '0.75rem', color: '#111827', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {fileName || `File ${fileIndex + 1}`}
                                      </Typography>
                                    </Tooltip>

                                    <Stack direction="row" spacing={0.5}>
                                      <Button size="small" variant="outlined" startIcon={<Visibility fontSize="small" />} onClick={() => handleOpenPreview(fileItem)} sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}>
                                        View
                                      </Button>
                                      <Button size="small" variant="outlined" startIcon={<Download fontSize="small" />} onClick={() => handleDownloadFile(fileItem)} sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.68rem', textTransform: 'none' }}>
                                        Download
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </Stack>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <NoticeFileIcon type="NO FILE" />
                            <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>No file</Typography>
                          </Stack>
                        )}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Box sx={{ ...pillSx, backgroundColor: pinnedColor }}>
                          {item.pinned ? 'Pinned' : 'Normal'}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 140 }}>
                        {formatDateTime(item.createdAt) || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.75rem', py: 0.45, px: 0.7, color: '#374151', display: { xs: 'none', md: 'table-cell' }, minWidth: 140 }}>
                        {formatDateTime(item.updatedAt) || '-'}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip
                            title={editEnabled ? 'Edit Notice' : 'You can only edit notices from your primary department.'}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || !editEnabled}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={deleteEnabled ? 'Delete Notice' : 'You can only delete notices from your primary department.'}
                            arrow
                          >
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                sx={{ p: 0.25 }}
                                disabled={loading || !deleteEnabled}
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
        isAdmin={isAdmin}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSearch={disableDepartmentSearch}
        onCancel={() => setOpenAddDialog(false)}
        onOk={(createdNotice) => {
          setOpenAddDialog(false);

          if (isApprovedNotice(createdNotice)) {
            fetchData({ page: 0 });
            setPage(0);
          }
        }}
      />

      {/* Edit Notice Dialog */}
      <EditNoticeDialog
        open={openEditDialog}
        currentItem={currentItem}
        isAdmin={isAdmin}
        currentDepartmentId={currentDepartmentId}
        disableDepartmentSearch={disableDepartmentSearch}
        onCancel={() => {
          setOpenEditDialog(false);
          setCurrentItem(null);
        }}
        onOk={async (updatedItem) => {
          setOpenEditDialog(false);
          setCurrentItem(null);

          if (updatedItem?.id) {
            setData((prev) =>
              prev.map((item) => {
                if (item.id !== updatedItem.id) return item;

                const finalFileUrls = Array.isArray(updatedItem.fileUrls)
                  ? updatedItem.fileUrls
                  : getNoticeFileUrlsFromItem(updatedItem);

                const finalPreviewUrls = Array.isArray(updatedItem.previewUrls)
                  ? updatedItem.previewUrls
                  : finalFileUrls;

                return normalizeNoticeRowForTable(
                  {
                    ...updatedItem,
                    fileUrl: finalFileUrls[0] || null,
                    previewUrl: finalPreviewUrls[0] || finalFileUrls[0] || null,
                    fileUrls: finalFileUrls,
                    previewUrls: finalPreviewUrls,
                  },
                  item,
                );
              })
            );
          }

          /*
           * Force reload from backend after edit.
           * This is especially important when all files are removed because
           * the old table row may still contain the previous fileUrl fallback.
           */
          await fetchData({ page });
        }}
      />

      {/* Notice Content Dialog */}
      <Dialog
        open={contentDialogOpen}
        onClose={handleCloseContentDialog}
        fullScreen={previewFullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: previewFullScreen ? 0 : 2,
            maxHeight: previewFullScreen ? '100%' : '88vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>
                Notice Content
              </Typography>
              <Typography fontSize={12} color="text.secondary" noWrap>
                {contentDialogItem?.title || 'Full notice content'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseContentDialog}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, backgroundColor: '#f8fafc' }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              backgroundColor: '#fff',
              color: '#111827',
              fontSize: 14,
              lineHeight: 1.7,
              '& p': { my: 0.75 },
              '& ul, & ol': { pl: 3, my: 1 },
              '& table': { width: '100%', borderCollapse: 'collapse', my: 1.5 },
              '& th, & td': { border: '1px solid #d1d5db', p: 0.75, verticalAlign: 'top' },
              '& img': { maxWidth: '100%', height: 'auto' },
            }}
            dangerouslySetInnerHTML={{
              __html: sanitizeNoticeHtml(contentDialogItem?.content || '<p>No content</p>'),
            }}
          />
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 2, py: 1.5 }}>
          <Button onClick={handleCloseContentDialog}>Close</Button>
        </DialogActions>
      </Dialog>

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
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={loading || !canModifyItem(selectedItem, 'delete')}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
