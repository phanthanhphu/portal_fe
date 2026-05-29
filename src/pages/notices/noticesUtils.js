// noticesUtils.js
import axios from 'axios';
import { API_ROOT, FILE_ROOT } from '../../config';

export const apiClient = axios.create({
  baseURL: API_ROOT,
  headers: {
    Accept: '*/*',
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

/* ====================== HELPERS ====================== */
export const formatDateTime = (value) => {
  if (!value) return '-';

  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    const dt = new Date(y, m - 1, d, hh, mm, ss);

    if (Number.isNaN(dt.getTime())) return '-';

    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  const dt = new Date(value);

  if (Number.isNaN(dt.getTime())) return '-';

  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export const getPinnedColor = (pinned) => (pinned ? '#dc2626' : '#6b7280');

export const pillSx = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#fff',
  display: 'inline-flex',
  justifyContent: 'center',
  minWidth: 78,
  mx: 'auto',
};

export const getNoticeFileUrl = (item) => {
  const rawUrl = item?.fileUrl || '';

  if (!rawUrl) return '';

  if (/^(https?:|blob:|data:)/i.test(rawUrl)) {
    return rawUrl;
  }

  const cleanPath = String(rawUrl).replace(/^\.?\//, '').replace(/^\/+/, '');

  return `${FILE_ROOT}/${cleanPath}`;
};

export const getNoticeFileName = (item) => {
  const fileUrl = getNoticeFileUrl(item);

  if (!fileUrl) return '';

  try {
    const cleanUrl = fileUrl.split('?')[0];
    return decodeURIComponent(cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1)) || 'file';
  } catch {
    return 'file';
  }
};

export const getFileTypeFromUrl = (item) => {
  const name = String(getNoticeFileName(item) || '').toLowerCase();

  if (name.endsWith('.pdf')) return 'PDF';
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name)) return 'IMAGE';
  if (name.endsWith('.doc')) return 'DOC';
  if (name.endsWith('.docx')) return 'DOCX';

  return 'FILE';
};

export const getFileTypeColor = (fileType) =>
  ({
    PDF: '#dc2626',
    IMAGE: '#2563eb',
    DOC: '#16a34a',
    DOCX: '#16a34a',
    FILE: '#6b7280',
  }[String(fileType || '').toUpperCase()] || '#6b7280');

export const getPreviewKind = (item, mimeType = '') => {
  const lowerMime = String(mimeType || '').toLowerCase();
  const fileType = String(getFileTypeFromUrl(item) || '').toUpperCase();

  if (lowerMime.startsWith('image/') || fileType === 'IMAGE') return 'image';
  if (lowerMime.includes('pdf') || fileType === 'PDF') return 'pdf';
  if (fileType === 'DOC' || fileType === 'DOCX') return 'doc';

  return 'other';
};

export const emptyPreviewState = {
  open: false,
  loading: false,
  error: '',
  item: null,
  blobUrl: '',
  mimeType: '',
  fileName: '',
};

/* ====================== HEADERS ====================== */
export const headers = [
  { label: 'No', key: 'no', sortable: false, hideOnSmall: false },
  { label: 'Title', key: 'title', sortable: true, hideOnSmall: false },
  { label: 'Content', key: 'content', sortable: true, hideOnSmall: false },
  { label: 'File', key: 'fileUrl', sortable: false, hideOnSmall: false },
  { label: 'Pinned', key: 'pinned', sortable: true, hideOnSmall: false },
  { label: 'User ID', key: 'userId', sortable: true, hideOnSmall: true },
  { label: 'Created At', key: 'createdAt', sortable: true, hideOnSmall: true },
  { label: 'Updated At', key: 'updatedAt', sortable: true, hideOnSmall: true },
  { label: 'Actions', key: 'actions', sortable: false, hideOnSmall: false },
];

/* ====================== API FUNCTIONS ====================== */
export const fetchNotices = async (page = 0, size = 12, searchTitle = '', searchContent = '') => {
  try {
    const response = await apiClient.get('/notices/search', {
      params: {
        page,
        size,
        title: searchTitle,
        content: searchContent,
      },
    });

    return {
      content: response.data?.content || [],
      totalElements: response.data?.totalElements || 0,
      totalPages: response.data?.totalPages || 1,
    };
  } catch (error) {
    console.error('Error fetching notices:', error);

    return {
      content: [],
      totalElements: 0,
      totalPages: 1,
    };
  }
};

export const deleteNotice = async (id) => {
  try {
    const response = await apiClient.delete(`/notices/${id}`);

    return {
      success: true,
      message: response.data?.message || 'Notice deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting notice:', error);

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete Notice',
    };
  }
};

export const deleteNotices = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      message: 'No IDs provided',
    };
  }

  try {
    const response = await apiClient.delete('/notices', {
      data: ids,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      success: true,
      message: response.data?.message || `${ids.length} notice(s) deleted successfully`,
    };
  } catch (error) {
    console.error('Error bulk deleting notices:', error);

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete selected notices',
    };
  }
};

/* ====================== SORTING ====================== */
const toTimestamp = (v) => {
  if (!v) return 0;

  if (Array.isArray(v)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = v;
    const dt = new Date(y, m - 1, d, hh, mm, ss);

    return Number.isFinite(dt.getTime()) ? dt.getTime() : 0;
  }

  const t = new Date(v).getTime();

  return Number.isFinite(t) ? t : 0;
};

const getComparableValue = (row, key) => {
  const dateKeys = new Set(['createdAt', 'updatedAt']);

  if (dateKeys.has(key)) return toTimestamp(row?.[key]);
  if (key === 'pinned') return row?.pinned ? 1 : 0;

  const value = row?.[key];

  return value == null ? '' : String(value).trim().toLowerCase();
};

export const sortRowsClient = (rows, sortConfig) => {
  if (!Array.isArray(rows) || rows.length === 0 || !sortConfig?.key || !sortConfig?.direction) {
    return rows;
  }

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

    const cmp = String(va).localeCompare(String(vb), undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    if (cmp !== 0) return cmp * dir;

    return a.i - b.i;
  });

  return withIndex.map((x) => x.r);
};