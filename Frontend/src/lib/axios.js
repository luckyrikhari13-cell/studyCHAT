import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api",
  withCredentials: true,
});

// Send a fresh Clerk token with every request. The __session cookie alone can go stale
// (Clerk refreshes it about every minute), which causes random 401s: the Users list then
// comes back empty and the error is easy to miss.
axiosInstance.interceptors.request.use(async (config) => {
  try {
    const token = await window.Clerk?.session?.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // fall back to the cookie
  }
  return config;
});
