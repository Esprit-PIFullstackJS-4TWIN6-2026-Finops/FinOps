import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });
let isRefreshing = false;
let queue = [];

function getAccessToken() {
  return localStorage.getItem("saas_access_token");
}

function getRefreshToken() {
  return localStorage.getItem("saas_refresh_token");
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem("saas_access_token", accessToken);
  localStorage.setItem("saas_refresh_token", refreshToken);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error?.response?.status !== 401 || original?._retry) throw error;

    const refreshToken = getRefreshToken();
    if (!refreshToken) throw error;
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      setTokens(data.access_token, data.refresh_token);
      queue.forEach((p) => p.resolve(data.access_token));
      queue = [];
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (err) {
      queue.forEach((p) => p.reject(err));
      queue = [];
      localStorage.removeItem("saas_access_token");
      localStorage.removeItem("saas_refresh_token");
      localStorage.removeItem("saas_user");
      throw err;
    } finally {
      isRefreshing = false;
    }
  },
);

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

