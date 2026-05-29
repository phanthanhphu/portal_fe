import axios from 'axios';
import { API_BASE_URL, API_ROOT, FILE_ROOT } from '../config';

window.API_BASE_URL = API_BASE_URL;

const isBadUrl = (url) => {
  return (
    url === undefined ||
    url === null ||
    url === '' ||
    url === 'undefined' ||
    url === '/undefined' ||
    String(url).includes('/undefined')
  );
};

const getRawUrl = (input) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return input?.url;
};

const normalizeApiUrl = (rawUrl) => {
  if (isBadUrl(rawUrl)) {
    console.error('❌ BAD API URL:', rawUrl);
    throw new Error('API URL is undefined. Please check caller file.');
  }

  try {
    const parsedUrl = new URL(rawUrl, window.location.origin);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api')) {
      return `${API_BASE_URL}${pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (
      pathname.startsWith('/files') ||
      pathname.startsWith('/uploads') ||
      pathname.startsWith('/ws')
    ) {
      return `${FILE_ROOT}${pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (String(rawUrl).startsWith('/')) {
      return `${API_ROOT}${pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    config.url = normalizeApiUrl(config.url);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (config.data && config.method !== 'get') {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error(`❌ [${status}] ${url}`, error.response?.data || error);

    if (status === 401) {
      localStorage.clear();

      if (window.location.pathname !== '/react/login') {
        window.location.href = '/react/login?sessionExpired=true';
      }
    }

    return Promise.reject(error);
  }
);

const originalFetch = window.fetch;

window.fetch = async function (input, init = {}) {
  const rawUrl = getRawUrl(input);

  if (isBadUrl(rawUrl)) {
    console.error('❌ FETCH URL UNDEFINED:', rawUrl, input);
    throw new Error('Fetch URL is undefined. Please check the file calling fetch().');
  }

  const normalizedUrl = normalizeApiUrl(rawUrl);

  const token = localStorage.getItem('token');
  const hasFiles = init.body instanceof FormData;
  const headers = new Headers(init.headers || {});

  if (!hasFiles && init.body && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...init,
    headers,
    credentials: 'include',
  };

  const response = await originalFetch(normalizedUrl, config);

  if (response.status === 401) {
    localStorage.clear();

    if (window.location.pathname !== '/react/login') {
      window.location.href = '/react/login?sessionExpired=true';
    }
  }

  return response;
};

export const api = {
  get: (url, params = {}) => apiClient.get(normalizeApiUrl(url), { params }),
  post: (url, data = {}) => apiClient.post(normalizeApiUrl(url), data),
  put: (url, data = {}) => apiClient.put(normalizeApiUrl(url), data),
  patch: (url, data = {}) => apiClient.patch(normalizeApiUrl(url), data),
  delete: (url, config = {}) => apiClient.delete(normalizeApiUrl(url), config),
  postForm: (url, formData) => apiClient.post(normalizeApiUrl(url), formData),
  upload: (url, formData) => apiClient.post(normalizeApiUrl(url), formData),
};

window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;

  if (err?.response?.status === 401) {
    localStorage.clear();
    window.location.href = '/react/login?globalError=true';
  }
});

console.log('🚀 API BASE URL:', API_BASE_URL);