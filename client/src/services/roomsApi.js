import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const roomsClient = axios.create({
  baseURL: `${API_BASE_URL}/api/rooms`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getRoomsRequest = (token) =>
  roomsClient.get("/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });