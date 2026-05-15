import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
export const API = `${API_BASE}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export default api;
