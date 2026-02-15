// frontend/src/admin/adminApi.js
import axios from 'axios';
const API = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('admin_token');
}

// ensure axios default header set if token exists
const t = getToken();
if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;

function getAuthHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export const adminClient = {
  get: (path, opts = {}) =>
    axios.get(`${API}${path}`, { headers: { ...getAuthHeader(), ...(opts.headers || {}) }, params: opts.params || {} }),
  post: (path, data, opts = {}) =>
    axios.post(`${API}${path}`, data, { headers: { ...getAuthHeader(), ...(opts.headers || {}) } }),
  put: (path, data, opts = {}) =>
    axios.put(`${API}${path}`, data, { headers: { ...getAuthHeader(), ...(opts.headers || {}) } }),
  del: (path, opts = {}) =>
    axios.delete(`${API}${path}`, { headers: { ...getAuthHeader(), ...(opts.headers || {}) } }),
};
