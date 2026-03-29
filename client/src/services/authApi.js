import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const registerRequest = (payload) => authClient.post("/register", payload);

export const loginRequest = (payload) => authClient.post("/login", payload);
