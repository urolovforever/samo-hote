const BASE = '/api';

function getToken(): string | null {
  try {
    return localStorage.getItem('samo_token');
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try { localStorage.setItem('samo_token', token); } catch {}
}

export function clearToken() {
  try { localStorage.removeItem('samo_token'); } catch {}
}

let isRedirecting = false;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (!isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('samo_admin');
      localStorage.removeItem('samo_shift');
      // Soft redirect instead of hard reload
      window.location.href = '/';
    }
    throw new Error('Sessiya tugadi. Qayta kiring.');
  }

  if (res.status === 429) {
    const err = await res.json().catch(() => ({ error: 'Juda ko\'p urinish' }));
    throw new Error(err.error || 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Xatolik' }));
    throw new Error(err.error || 'Xatolik');
  }

  return res.json();
}

// Auth
export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; admin: { id: number; name: string; username: string; role: 'super_admin' | 'admin' } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Rooms
  getRooms: () => request<any[]>('/rooms'),
  updateRoom: (id: string, data: Record<string, any>) =>
    request<any>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (params?: { date?: string; type?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/transactions${query ? '?' + query : ''}`);
  },
  addTransaction: (data: Record<string, any>) =>
    request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) =>
    request<any>(`/transactions/${id}`, { method: 'DELETE' }),
  updateTransaction: (id: string, data: Record<string, any>) =>
    request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Shifts
  getShifts: () => request<any[]>('/shifts'),
  startShift: () => request<any>('/shifts', { method: 'POST' }),
  closeShift: (id: string, notes: string) =>
    request<any>(`/shifts/${id}/close`, { method: 'PUT', body: JSON.stringify({ notes }) }),

  // Bookings
  getBookings: () => request<any[]>('/bookings'),
  addBooking: (data: Record<string, any>) =>
    request<any>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateBooking: (id: string, data: Record<string, any>) =>
    request<any>(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelBooking: (id: string) =>
    request<any>(`/bookings/${id}/cancel`, { method: 'PUT' }),
  checkInFromBooking: (id: string, data: Record<string, any>) =>
    request<any>(`/bookings/${id}/checkin`, { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  getDailyReport: (date: string) => request<any>(`/reports/daily/${date}`),
  closeDailyReport: (date: string, reportText: string) =>
    request<any>(`/reports/daily/${date}/close`, { method: 'POST', body: JSON.stringify({ report_text: reportText }) }),
  getClosedDates: (month?: string) => {
    const query = month ? `?month=${month}` : '';
    return request<any[]>(`/reports/closed-dates${query}`);
  },

  // Statistics
  getStatistics: () => request<any>('/statistics'),

  // Admins
  getAdmins: () => request<any[]>('/admins'),
  createAdmin: (data: { name: string; username: string; password: string; role: string }) =>
    request<any>('/admins', { method: 'POST', body: JSON.stringify(data) }),
  deleteAdmin: (id: string) =>
    request<any>(`/admins/${id}`, { method: 'DELETE' }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<any>('/admins/password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }),
};
