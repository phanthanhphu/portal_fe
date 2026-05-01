import axios from 'axios';

/* -----------------------------------------------------
 * 1️⃣ SETUP API BASE URL
 * ----------------------------------------------------- */
const setupApiBaseUrl = () => {
  if (!window.API_BASE_URL) {
    window.API_BASE_URL =
      window.location.hostname === 'localhost'
        ? 'http://localhost:8081'
        : `http://${window.location.hostname}:8081`;
  }
  console.log('🌐 API BASE URL:', window.API_BASE_URL);
};

setupApiBaseUrl();

/* -----------------------------------------------------
 * 2️⃣ GLOBAL AXIOS INSTANCE
 * ----------------------------------------------------- */
export const apiClient = axios.create({
  baseURL: window.API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

/* -----------------------------------------------------
 * 3️⃣ AXIOS REQUEST INTERCEPTOR
 * ----------------------------------------------------- */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type when there is a body (not GET)
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    } else if (config.data && config.method !== 'get') {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* -----------------------------------------------------
 * 4️⃣ AXIOS RESPONSE INTERCEPTOR (FIXED)
 * ----------------------------------------------------- */
apiClient.interceptors.response.use(
  // ✔ Always return JSON body directly
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

/* -----------------------------------------------------
 * 5️⃣ SAFE FETCH OVERRIDE (FIXED)
 * ----------------------------------------------------- */
const originalFetch = window.fetch;

window.fetch = async function (input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const token = localStorage.getItem('token');
  const hasFiles = init.body instanceof FormData;

  const headers = new Headers(init.headers || {});

  // Only set Content-Type when body exists and NOT FormData
  if (hasFiles) {
    // Browser will handle boundary
  } else if (init.body && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  // Add token
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const config = {
    ...init,
    headers,
    credentials: 'include',
  };

  try {
    const response = await originalFetch(input, config);

    // HANDLE 401
    if (response.status === 401) {
      console.warn('🔓 FETCH 401 → force logout');
      localStorage.clear();
      if (window.location.pathname !== '/react/login') {
        window.location.href = '/react/login?sessionExpired=true';
      }
    }

    return response;
  } catch (error) {
    console.error('❌ FETCH ERROR:', url, error);
    throw error;
  }
};

/* -----------------------------------------------------
 * 6️⃣ AXIOS CREATE OVERRIDE (optional support)
 * ----------------------------------------------------- */
if (window.axios) {
  const originalCreate = window.axios.create;

  window.axios.create = function (...args) {
    const instance = originalCreate.call(this, ...args);

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;

      if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
      } else if (config.data && config.method !== 'get') {
        config.headers['Content-Type'] = 'application/json';
      }

      return config;
    });

    return instance;
  };
}

/* -----------------------------------------------------
 * 7️⃣ SIMPLE API WRAPPER (auto returns response.data)
 * ----------------------------------------------------- */
export const api = {
  get: (url, params = {}) => apiClient.get(url, { params }),
  post: (url, data = {}) => apiClient.post(url, data),
  postForm: (url, formData) =>
    apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  upload: (url, formData) =>
    apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

/* -----------------------------------------------------
 * 8️⃣ GLOBAL ERROR HANDLER
 * ----------------------------------------------------- */
window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;

  if (err?.response?.status === 401) {
    localStorage.clear();
    window.location.href = '/react/login?globalError=true';
  }
});

/* -----------------------------------------------------
 * INIT MESSAGE
 * ----------------------------------------------------- */
console.log('🚀 GLOBAL API v3 READY');
