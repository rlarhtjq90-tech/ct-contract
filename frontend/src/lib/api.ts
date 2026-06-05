const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ct_token");
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ct_token");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API Error: ${res.status}`);
  }

  return res.json();
}

// ===== Auth =====
export const auth = {
  login: (email: string, password: string) =>
    fetchApi<{ accessToken: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ===== Dashboard =====
export const dashboard = {
  getSummary: () => fetchApi<any>("/dashboard/summary"),
  getProgressTrend: (months = 12) =>
    fetchApi<any[]>(`/dashboard/progress-trend?months=${months}`),
  getContractComparison: () => fetchApi<any[]>("/dashboard/contract-comparison"),
  getCurrentMonth: () => fetchApi<any>("/dashboard/current-month"),
  getUpcomingExpiry: (days = 30) => fetchApi<any>(`/dashboard/upcoming-expiry?days=${days}`),
  getBillingComparison: () => fetchApi<any[]>("/dashboard/billing-comparison"),
};

// ===== Clients (발주처) =====
export const clients = {
  getAll: () => fetchApi<any[]>("/clients"),
  getOne: (id: number) => fetchApi<any>(`/clients/${id}`),
  create: (data: any) =>
    fetchApi<any>("/clients", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    fetchApi<any>(`/clients/${id}`, { method: "DELETE" }),
};

// ===== Projects (도급계약) =====
export const projects = {
  getAll: () => fetchApi<any[]>("/projects"),
  getOne: (id: number) => fetchApi<any>(`/projects/${id}`),
  create: (data: any) =>
    fetchApi<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addChange: (id: number, data: { afterAmount: number; reason: string; effectiveDate?: string }) =>
    fetchApi<any>(`/projects/${id}/changes`, { method: "POST", body: JSON.stringify(data) }),
  getChanges: (id: number) => fetchApi<any[]>(`/projects/${id}/changes`),
  remove: (id: number) => fetchApi<any>(`/projects/${id}`, { method: "DELETE" }),
};

// ===== Subcontractors (하도급사) =====
export const subcontractors = {
  getAll: () => fetchApi<any[]>("/subcontractors"),
  getOne: (id: number) => fetchApi<any>(`/subcontractors/${id}`),
  create: (data: any) =>
    fetchApi<any>("/subcontractors", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/subcontractors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    fetchApi<any>(`/subcontractors/${id}`, { method: "DELETE" }),
};

// ===== Subcontracts (하도급계약) =====
export const subcontracts = {
  getAll: (projectId?: number) =>
    fetchApi<any[]>(`/subcontracts${projectId ? `?projectId=${projectId}` : ""}`),
  getOne: (id: number) => fetchApi<any>(`/subcontracts/${id}`),
  create: (data: any) =>
    fetchApi<any>("/subcontracts", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { contractNo?: string; workScope?: string; contractDate?: string; startDate?: string; endDate?: string }) =>
    fetchApi<any>(`/subcontracts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addChange: (id: number, data: { afterAmount: number; reason: string; effectiveDate?: string }) =>
    fetchApi<any>(`/subcontracts/${id}/changes`, { method: "POST", body: JSON.stringify(data) }),
  getChanges: (id: number) => fetchApi<any[]>(`/subcontracts/${id}/changes`),
  remove: (id: number) => fetchApi<any>(`/subcontracts/${id}`, { method: "DELETE" }),
};

// ===== Billings (기성) =====
export const billings = {
  getByMonth: (month: string) => fetchApi<any[]>(`/billings?month=${month}`),
  bulkUpdate: (updates: any[]) =>
    fetchApi<any[]>("/billings/bulk", { method: "POST", body: JSON.stringify({ updates }) }),
  approve: (id: number) =>
    fetchApi<any>(`/billings/${id}/approve`, { method: "PUT" }),
};

// ===== Notifications (알림) =====
export const notifications = {
  getAll: () => fetchApi<any[]>("/notifications"),
  getUnreadCount: () => fetchApi<number>("/notifications/unread-count"),
  markRead: (id: number) =>
    fetchApi<any>(`/notifications/${id}/read`, { method: "PUT" }),
};

// ===== Delete Requests (삭제 승인 요청) =====
export const deleteRequests = {
  getAll: () => fetchApi<any[]>('/delete-requests'),
  getPending: () => fetchApi<any[]>('/delete-requests/pending'),
  create: (data: { targetType: string; targetId: number; targetName: string; reason?: string }) =>
    fetchApi<any>('/delete-requests', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: number) => fetchApi<any>(`/delete-requests/${id}/approve`, { method: 'PUT' }),
  reject: (id: number) => fetchApi<any>(`/delete-requests/${id}/reject`, { method: 'PUT' }),
};

// ===== Project Billings (도급 기성현황) =====
export const projectBillings = {
  getByMonth: (month: string) => fetchApi<any[]>(`/project-billings?month=${month}`),
  bulkUpdate: (updates: any[]) =>
    fetchApi<any[]>('/project-billings/bulk', { method: 'POST', body: JSON.stringify({ updates }) }),
  approve: (id: number) =>
    fetchApi<any>(`/project-billings/${id}/approve`, { method: 'PUT' }),
};

// ===== Snapshots =====
export const snapshots = {
  getAll: () => fetchApi<any[]>("/snapshots"),
  getByMonth: (month: string) => fetchApi<any>(`/snapshots/by-month?month=${month}`),
  create: (month?: string) =>
    fetchApi<any>(`/snapshots/create${month ? `?month=${month}` : ""}`, { method: "POST" }),
  delete: (month: string) =>
    fetchApi<any>(`/snapshots/${month}`, { method: "DELETE" }),
};

// ===== Contract Changes (변동추이) =====
export const contractChanges = {
  getAll: () => fetchApi<any[]>("/contract-changes"),
};

// ===== Reports (리포트) =====
export const reports = {
  getOverview: () => fetchApi<any[]>("/reports/overview"),
};
