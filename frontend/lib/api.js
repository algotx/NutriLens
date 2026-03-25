import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// For physical device testing, replace with your machine's local IP
// e.g. 'http://192.168.1.100:3000/api'
// For emulators: Android uses 'http://10.0.2.2:3000/api', iOS simulator uses 'http://localhost:3000/api'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.180:3000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 — clears stale token (e.g. after DB reset)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
};

export const mealsAPI = {
  log: (data) => api.post('/meals', data),
  getByDate: (date) => api.get('/meals', { params: { date } }),
  getSummary: (date) => api.get('/meals/summary', { params: { date } }),
  delete: (id) => api.delete(`/meals/${id}`),
  analyzePhoto: (formData) =>
    api.post('/meals/analyze-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s — Gemini can be slow
    }),
  lookupBarcode: (barcode) => api.get(`/meals/barcode/${barcode}`),
};

export const savedFoodsAPI = {
  list: () => api.get('/saved-foods'),
  save: (data) => api.post('/saved-foods', data),
  delete: (id) => api.delete(`/saved-foods/${id}`),
};

export const insightsAPI = {
  weekly: () => api.get('/insights/weekly'),
  streak: () => api.get('/insights/streak'),
  coach: (question) => api.post('/insights/coach', { question }),
};

export default api;
