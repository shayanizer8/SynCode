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

export const getRecentRoomsRequest = (token) =>
  roomsClient.get("/recent", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const createRoomRequest = (token, payload) =>
  roomsClient.post("/", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const renameRoomRequest = (token, roomId, payload) =>
  roomsClient.put(`/${roomId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const deleteRoomRequest = (token, roomId) =>
  roomsClient.delete(`/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const joinRoomByInviteRequest = (token, payload) =>
  roomsClient.post("/join", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const joinRoomByIdRequest = (token, roomId) =>
  roomsClient.post(
    `/join/${roomId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

export const getRoomMetadataRequest = (token, roomId) =>
  roomsClient.get(`/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const getRoomContentRequest = (token, roomId) =>
  roomsClient.get(`/${roomId}/content`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const updateRoomContentRequest = (token, roomId, payload) =>
  roomsClient.put(`/${roomId}/content`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const getRoomMembersRequest = (token, roomId) =>
  roomsClient.get(`/${roomId}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const getRoomMessagesRequest = (token, roomId) =>
  roomsClient.get(`/${roomId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const sendRoomMessageRequest = (token, roomId, payload) =>
  roomsClient.post(`/${roomId}/messages`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const executeCodeRequest = (token, payload) =>
  axios.post(`${API_BASE_URL}/api/execute`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });