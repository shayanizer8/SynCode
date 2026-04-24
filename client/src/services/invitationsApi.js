import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const invitationsClient = axios.create({
  baseURL: `${API_BASE_URL}/api/invitations`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const listMyInvitationsRequest = (token, params = {}) =>
  invitationsClient.get("/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });

export const acceptInvitationRequest = (token, invitationId) =>
  invitationsClient.post(
    `/${invitationId}/accept`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

export const rejectInvitationRequest = (token, invitationId) =>
  invitationsClient.post(
    `/${invitationId}/reject`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

