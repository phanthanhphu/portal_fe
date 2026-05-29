// ==============================|| THEME CONSTANT ||============================== //

export const APP_DEFAULT_PATH = '/dashboard';
export const HORIZONTAL_MAX_ITEM = 6;
export const DRAWER_WIDTH = 267;
export const MINI_DRAWER_WIDTH = 0;
export const HEADER_HEIGHT = 74;
export const GRID_COMMON_SPACING = { xs: 2, md: 2.5 };

// ==============================|| API CONFIG ||============================== //

export const API_BASE_URL = 'https://10.232.100.68:8081';

export const API_ROOT = `${API_BASE_URL}/api`;
export const FILE_ROOT = API_BASE_URL;
export const WS_URL = `${API_BASE_URL}/ws`;

export const API_ENDPOINTS = {
  users: `${API_ROOT}/users`,
  appLinks: `${API_ROOT}/app-links`,
  forms: `${API_ROOT}/forms`,
  documentTypes: `${API_ROOT}/document-types`,
  notices: `${API_ROOT}/notices`,
  departments: `${API_ROOT}/departments`,
  filesPreviewPdf: `${API_ROOT}/files/preview-pdf`,
};

export const toApiUrl = (path = '') => {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return `${API_ROOT}/${cleanPath}`;
};

export const toFileUrl = (path = '') => {
  if (!path) return '';

  const raw = String(path).trim();

  if (raw.startsWith('data:')) return raw;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      const cleanPath = url.pathname.replace(/^\/+/, '');

      if (
        url.hostname === 'homepage.youngone.com.vn' ||
        url.hostname === '10.232.100.68' ||
        url.hostname === '10.232.132.40'
      ) {
        if (cleanPath.startsWith('uploads/') || cleanPath.startsWith('files/')) {
          return `${API_BASE_URL}/${cleanPath}${url.search}${url.hash}`;
        }

        return `${API_BASE_URL}/files/${cleanPath}${url.search}${url.hash}`;
      }

      return raw;
    } catch {
      return raw;
    }
  }

  const cleanPath = raw.replace(/^\/+/, '');

  if (cleanPath.startsWith('uploads/') || cleanPath.startsWith('files/')) {
    return `${FILE_ROOT}/${cleanPath}`;
  }

  return `${FILE_ROOT}/files/${cleanPath}`;
};

// ==============================|| THEME CONFIG ||============================== //

const config = {
  fontFamily: `Inter var`,
  i18n: 'en',
  menuOrientation: 'vertical',
  menuCaption: true,
  miniDrawer: false,
  container: true,
  mode: 'light',
  presetColor: 'default',
  themeDirection: 'ltr',
  themeContrast: false
};

export default config;