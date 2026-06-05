export const headers = [
  { label: 'No', key: 'no', sortable: false },
  { label: 'Title', key: 'title', sortable: true },
  { label: 'Content', key: 'content', sortable: true },
  { label: 'File', key: 'fileUrl', sortable: false, hideOnSmall: true },
  { label: 'Pinned', key: 'pinned', sortable: true },
  { label: 'Created Date', key: 'createdAt', sortable: true, hideOnSmall: true },
  { label: 'Actions', key: 'actions', sortable: false },
];

export const pillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 68,
  height: 24,
  px: 1,
  borderRadius: 999,
  fontSize: '0.7rem',
  fontWeight: 800,
  color: '#111827',
  border: '1px solid rgba(17, 24, 39, 0.08)',
};

export const emptyPreviewState = {
  open: false,
  loading: false,
  url: '',
  title: '',
  kind: 'unsupported',
  fileName: '',
  error: '',
  item: null,
  blobUrl: '',
  mimeType: '',
  previewKind: '',
};

export const formatDateTime = (value) => {
  if (!value) return '';

  try {
    let date;

    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value;
      date = new Date(year, month - 1, day, hour, minute, second);
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return String(value);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return String(value || '');
  }
};

export const getPinnedColor = (pinned) => (pinned ? '#fde68a' : '#e5e7eb');

export const getNoticeFileUrl = (item = {}) => {
  const safeItem = item || {};

  if (Array.isArray(safeItem.fileUrls) && safeItem.fileUrls.length > 0) {
    return safeItem.fileUrls[0] || '';
  }

  return safeItem.fileUrl || safeItem.previewUrl || '';
};

export const getNoticeFileName = (item = {}) => {
  const safeItem = item || {};

  const candidates = [
    safeItem.fileName,
    safeItem.originalFileName,
    safeItem.name,
    getNoticeFileUrl(safeItem),
  ];

  const value = candidates.find((x) => String(x || '').trim());

  if (!value) return '';

  try {
    const cleanValue = decodeURIComponent(
      String(value)
        .split('?')[0]
        .split('#')[0]
        .replace(/\\/g, '/')
    );

    return cleanValue.split('/').pop() || cleanValue;
  } catch {
    const cleanValue = String(value)
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    return cleanValue.split('/').pop() || cleanValue;
  }
};

export const getFileTypeFromUrl = (value = '') => {
  if (!value) return '';

  const raw =
    typeof value === 'object'
      ? getNoticeFileName(value || {}) || getNoticeFileUrl(value || {})
      : value;

  if (!raw) return '';

  try {
    const cleanValue = decodeURIComponent(String(raw))
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    const fileName = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex < 0 || dotIndex === fileName.length - 1) return '';

    return fileName.substring(dotIndex + 1).toUpperCase();
  } catch {
    return '';
  }
};

const getFileTypeFromMimeType = (mimeType = '') => {
  const mime = String(mimeType || '').toLowerCase();

  if (!mime) return '';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG';
  if (mime.includes('webp')) return 'WEBP';
  if (mime.includes('gif')) return 'GIF';
  if (mime.includes('bmp')) return 'BMP';
  if (mime.includes('svg')) return 'SVG';
  if (mime.includes('text/plain')) return 'TXT';
  if (mime.includes('csv')) return 'CSV';
  if (mime.includes('json')) return 'JSON';
  if (mime.includes('xml')) return 'XML';
  if (mime.includes('word')) return 'DOCX';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLSX';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'PPTX';

  return '';
};

export const getPreviewKind = (itemOrUrl = {}, mimeType = '') => {
  const type = (
    getFileTypeFromUrl(itemOrUrl || {}) ||
    getFileTypeFromMimeType(mimeType)
  ).toUpperCase();

  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP', 'SVG'].includes(type)) return 'image';
  if (type === 'PDF') return 'pdf';
  if (['TXT', 'CSV', 'JSON', 'XML'].includes(type)) return 'text';
  if (['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].includes(type)) return 'office';

  return 'unsupported';
};

const getSortValue = (row, key) => {
  if (!row || !key) return '';

  if (key === 'department') {
    return [row.departmentName, row.division].filter(Boolean).join(' ');
  }

  if (key === 'createdAt' || key === 'updatedAt') {
    const value = row[key];

    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  return row[key] ?? '';
};

export const sortRowsClient = (rows = [], sortConfig = {}) => {
  const key = sortConfig?.key;
  const direction = sortConfig?.direction;

  if (!key || !direction) return rows;

  const sign = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = getSortValue(a, key);
    const bv = getSortValue(b, key);

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * sign;
    }

    return String(av).localeCompare(String(bv), undefined, {
      numeric: true,
      sensitivity: 'base',
    }) * sign;
  });
};
