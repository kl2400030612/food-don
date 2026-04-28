import axios from 'axios';

const AUTH_TOKEN_KEY = 'food-auth-token';
const USER_KEY = 'user';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
  if (!error) return fallback;

  const payload = error.response?.data;

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload?.message) {
    return payload.message;
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (payload?.details && typeof payload.details === 'object') {
    const firstDetail = Object.values(payload.details)[0];
    if (firstDetail) {
      return String(firstDetail);
    }
  }

  return error.message || fallback;
};

// User APIs
export const getUsers = () => API.get('/users');
export const createUser = (user) => API.post('/users', user);
export const createAdminUser = (user) => API.post('/users/admin', user);
export const getUser = (id) => API.get(`/users/${id}`);
export const updateUser = (id, user) => API.put(`/users/${id}`, user);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// Food APIs
export const createFood = (food) => API.post('/foods', food);
export const getFoods = () => API.get('/foods');
export const getAvailableFoods = () => API.get('/foods/available');
export const getWarehouseFoods = () => API.get('/foods/warehouse');
export const getFoodsByDonor = (donorId) => API.get(`/foods/donor/${donorId}`);
export const deleteFood = (id) => API.delete(`/foods/${id}`);

// Request APIs
export const createRequest = (request) => API.post('/requests', request);
export const getRequests = () => API.get('/requests');
export const getRequestsByNgo = (ngoId) => API.get(`/requests/ngo/${ngoId}`);
export const approveRequest = (id) => API.put(`/requests/approve/${id}`);

// Notification APIs
export const getNotificationsByUser = (userId) => API.get(`/notifications/${userId}`);

// Analytics API
export const getAnalytics = () => API.get('/analytics');

// Admin Audit Logs API
export const getAdminLogs = (params = {}) => API.get('/admin/logs', { params });

export default API;
