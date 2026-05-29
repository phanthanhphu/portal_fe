// ==============================|| THEME CONSTANT ||============================== //

export const APP_DEFAULT_PATH = '/dashboard';
export const HORIZONTAL_MAX_ITEM = 6;
export const DRAWER_WIDTH = 267;
export const MINI_DRAWER_WIDTH = 0;
export const HEADER_HEIGHT = 74;
export const GRID_COMMON_SPACING = { xs: 2, md: 2.5 };

// ==============================|| API CONFIG ||============================== //

export const API_BASE_URL = 'https://homepage.youngone.com.vn:8081';

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

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  return `${FILE_ROOT}/${raw.replace(/^\/+/, '')}`;
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