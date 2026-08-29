const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('shg_auth_token') || null;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('shg_auth_token', token);
  } else {
    localStorage.removeItem('shg_auth_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    // If unauthenticated, clear token
    if (response.status === 401) {
      // Don't auto-redirect on login attempt failure
      if (!endpoint.includes('/login')) {
        setAuthToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error) {
    // If network error (offline), rethrow as network error
    if (!window.navigator.onLine || error.message.includes('Failed to fetch')) {
      error.isOffline = true;
    }
    throw error;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // SHGs
  getStats: () => request('/shgs/stats'),
  getSHGs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/shgs${query ? `?${query}` : ''}`);
  },
  getSHG: (id) => request(`/shgs/${id}`),
  createSHG: (data) => request('/shgs', { method: 'POST', body: JSON.stringify(data) }),
  updateSHG: (id, data) => request(`/shgs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitSHG: (id) => request(`/shgs/${id}/submit`, { method: 'POST' }),
  deleteSHG: (id) => request(`/shgs/${id}`, { method: 'DELETE' }),
  syncBatch: (items) => request('/shgs/sync-batch', { method: 'POST', body: JSON.stringify({ items }) }),

  // Admin
  getEmployees: () => request('/admin/employees'),
  createEmployee: (data) => request('/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/admin/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: (limit = 200) => request(`/admin/audit-logs?limit=${limit}`),
  getExcelExportUrl: (params = {}) => {
    const token = getAuthToken();
    const query = new URLSearchParams({ ...params, token }).toString();
    return `${API_BASE}/admin/export/excel?${query}`;
  },
  getCSVExportUrl: (params = {}) => {
    const token = getAuthToken();
    const query = new URLSearchParams({ ...params, token }).toString();
    return `${API_BASE}/admin/export/csv?${query}`;
  }
};
