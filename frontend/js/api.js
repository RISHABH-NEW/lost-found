/**
 * LOST & FOUND CAMPUS PORTAL - API CLIENT
 * Centralized fetch handler, JWT management, and REST endpoints
 */

const API_BASE = '/api';

// Token Storage
const getAuthToken = () => localStorage.getItem('token');
const setAuthToken = (token) => localStorage.setItem('token', token);
const removeAuthToken = () => localStorage.removeItem('token');

// User Storage
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};
const setStoredUser = (user) => localStorage.setItem('user', JSON.stringify(user));
const removeStoredUser = () => localStorage.removeItem('user');

// Centralized Request Handler
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};
  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If unauthorized, clear invalid session
      if (res.status === 401 && token) {
        removeAuthToken();
        removeStoredUser();
        // Only redirect if on protected page
        const protectedPages = ['dashboard', 'my-posts', 'report-lost', 'report-found', 'profile'];
        if (protectedPages.some((p) => window.location.pathname.includes(p))) {
          window.location.href = '/login.html?expired=1';
        }
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// Authentication Endpoints
const authAPI = {
  signup: (userData) =>
    apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (profileData) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
};

// Items Endpoints
const itemsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qs = query.toString();
    return apiRequest(`/items${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => apiRequest(`/items/${id}`),
  create: (formData) =>
    apiRequest('/items', {
      method: 'POST',
      body: formData,
    }),
  update: (id, formData) =>
    apiRequest(`/items/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  delete: (id) =>
    apiRequest(`/items/${id}`, {
      method: 'DELETE',
    }),
  resolve: (id, status) =>
    apiRequest(`/items/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getMyPosts: () => apiRequest('/items/user/my-posts'),
  getStats: () => apiRequest('/items/stats/summary'),
};
