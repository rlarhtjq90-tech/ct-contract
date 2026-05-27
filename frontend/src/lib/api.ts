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
};

// ===== Clients (발주처) =====
export const clients = {
  getAll: () => fetchApi<any[]>("/clients"),
  getOne: (id: number) => fetchApi<any>(`/clients/${id}`),
  create: (data: any) =>
    fetchApi<any>("/clients", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

// ===== Projects (도급계약) =====
export const projects = {
  getAll: () => fetchApi<any[]>("/projects"),
  getOne: (id: number) => fetchApi<any>(`/projects/${id}`),
  create: (data: any) =>
    fetchApi<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addChange: (id: number, data: any) =>
    fetchApi<any>(`/projects/${id}/changes`, { method: "POST", body: JSON.stringify(data) }),
  getChanges: (id: number) => fetchApi<any[]>(`/projects/${id}/changes`),
};

// ===== Subcontractors (하도급사) =====
export const subcontractors = {
  getAll: () => fetchApi<any[]>("/subcontractors"),
  getOne: (id: number) => fetchApi<any>(`/subcontractors/${id}`),
  create: (data: any) =>
    fetchApi<any>("/subcontractors", { method: "POST", body: JSON.stringify(data) }),
};

// ===== Subcontracts (하도급계약) =====
export const subcontracts = {
  getAll: (projectId?: number) =>
    fetchApi<any[]>(`/subcontracts${projectId ? `?projectId=${projectId}` : ""}`),
  getOne: (id: number) => fetchApi<any>(`/subcontracts/${id}`),
  create: (data: any) =>
    fetchApi<any>("/subcontracts", { method: "POST", body: JSON.stringify(data) }),
  addChange: (id: number, data: { deltaAmount: number; reason: string; effectiveDate?: string }) =>
    fetchApi<any>(`/subcontracts/${id}/changes`, { method: "POST", body: JSON.stringify(data) }),
  getChanges: (id: number) => fetchApi<any[]>(`/subcontracts/${id}/changes`),
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

// ===== Snapshots =====
export const snapshots = {
  getAll: () => fetchApi<any[]>("/snapshots"),
  getByMonth: (month: string) => fetchApi<any>(`/snapshots/by-month?month=${month}`),
};
