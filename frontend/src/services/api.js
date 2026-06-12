/**
 * BiteStreak – API Service
 * Centralized Axios instance with JWT refresh interceptors.
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh access token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${BASE_URL}/refresh`, { refresh });
        localStorage.setItem("access_token", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authService = {
  register: (data) => api.post("/register", data),
  login: async (data) => {
    const res = await api.post("/login", data);
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    return res.data;
  },
  logout: async () => {
    const refresh = localStorage.getItem("refresh_token");
    await api.post("/logout", { refresh }).catch(() => {});
    localStorage.clear();
  },
  getUser: () => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
};

// ─── Customer ────────────────────────────────────────────────────────────────

export const customerService = {
  getDashboard: () => api.get("/dashboard"),
  getVisits: () => api.get("/visits"),
  getRewards: () => api.get("/rewards"),
  scanQR: (token) => api.post("/scan", { token }),
  claimReward: (reward_id) => api.post("/rewards/claim", { reward_id }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminService = {
  getStats: () => api.get("/admin/stats"),
  getCustomers: (search = "") =>
    api.get(`/admin/customers${search ? `?search=${search}` : ""}`),
  generateQR: () => api.post("/admin/generate-qr"),
  getTodayQR: () => api.get("/admin/today-qr"),
  claimReward: (reward_code) => api.post("/admin/claim-reward", { reward_code }),
};

// ─── Menu ────────────────────────────────────────────────────────────────────

export const menuService = {
  getMenu: () => api.get("/menu"),
  addItem: (data) => api.post("/menu", data),
  updateItem: (id, data) => api.put(`/menu/${id}`, data),
  deleteItem: (id) => api.delete(`/menu/${id}`),
};

// ─── Shop ────────────────────────────────────────────────────────────────────

export const shopService = {
  getShop: () => api.get("/shop"),
  updateShop: (data) => api.patch("/shop/update", data),
};
