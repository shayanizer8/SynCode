import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderClosed, Home, X } from "lucide-react";
import { clearAuthToken, getAuthToken } from "../services/tokenStorage";
import { acceptInvitationRequest, listMyInvitationsRequest, rejectInvitationRequest } from "../services/invitationsApi";

const navItems = [
  { key: "home", label: "Home", icon: Home, active: false, to: "/dashboard" },
  { key: "invitations", label: "My Invitations", icon: FolderClosed, active: true, to: "/invitations" },
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const Invitations = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({ mode: "", id: "" });
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === "pending"),
    [invitations]
  );

  const refresh = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await listMyInvitationsRequest(token, { status: "pending" });
      setInvitations(Array.isArray(response.data?.invitations) ? response.data.invitations : []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Unable to load invitations right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [navigate]);

  const handleAccept = async (invitationId) => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setActionState({ mode: "accept", id: invitationId });
      setError("");
      const response = await acceptInvitationRequest(token, invitationId);
      const roomId = response.data?.roomId;
      if (roomId) {
        navigate(`/editor/${roomId}`);
        return;
      }
      await refresh();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Unable to accept invitation.");
    } finally {
      setActionState({ mode: "", id: "" });
    }
  };

  const handleReject = async (invitationId) => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setActionState({ mode: "reject", id: invitationId });
      setError("");
      await rejectInvitationRequest(token, invitationId);
      await refresh();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Unable to reject invitation.");
    } finally {
      setActionState({ mode: "", id: "" });
    }
  };

  const confirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar" aria-label="Sidebar navigation">
        <div className="sidebar-top">
          <button type="button" className="sidebar-logo" aria-label="SynCode">
            <span style={{ fontWeight: 700 }}>SC</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-icon-btn${item.active ? " is-active" : ""}`}
                data-tooltip={item.label}
                aria-label={item.label}
                onClick={() => navigate(item.to)}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="sidebar-avatar-wrap" aria-label="Logout" onClick={() => setIsLogoutConfirmOpen(true)}>
            <span className="sidebar-avatar">U</span>
            <span className="online-dot" aria-hidden="true"></span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>My Invitations</h1>
            <p>Accept or reject invitations to join coding rooms</p>
          </div>
        </header>

        <div className="dashboard-divider" />

        {error ? <p className="form-server-error">{error}</p> : null}

        {isLoading ? (
          <section className="rooms-empty-state" aria-label="Invitations loading state">
            <h2>Loading invitations...</h2>
            <p>Please wait while we fetch your pending invites.</p>
          </section>
        ) : pendingInvitations.length === 0 ? (
          <section className="rooms-empty-state" aria-label="No invitations">
            <h2>No pending invitations</h2>
            <p>When someone invites you to a room, it will appear here.</p>
            <button type="button" className="btn btn-filled" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
          </section>
        ) : (
          <section className="rooms-grid" aria-label="Pending invitations">
            {pendingInvitations.map((inv) => (
              <article className="room-card" key={inv.id}>
                <div className="room-card-top">
                  <div className="room-badges">
                    {inv.roomLanguage ? <span className="lang-badge badge-python">{inv.roomLanguage}</span> : null}
                    <span className="live-badge">Invitation</span>
                  </div>
                </div>

                <h2>{inv.roomName}</h2>
                <p>
                  Invited by {inv.inviterName}
                  {inv.inviterEmail ? ` (${inv.inviterEmail})` : ""}
                </p>
                <p style={{ opacity: 0.8, marginTop: 10 }}>Sent: {formatDate(inv.createdAt)}</p>

                <div className="room-card-bottom" style={{ marginTop: 14, gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-filled"
                    onClick={() => handleAccept(inv.id)}
                    disabled={actionState.id === inv.id}
                  >
                    {actionState.mode === "accept" && actionState.id === inv.id ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleReject(inv.id)}
                    disabled={actionState.id === inv.id}
                  >
                    {actionState.mode === "reject" && actionState.id === inv.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {isLogoutConfirmOpen ? (
        <div className="room-modal-overlay" onClick={() => setIsLogoutConfirmOpen(false)} role="presentation">
          <section className="room-modal logout-confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="room-modal-close"
              onClick={() => setIsLogoutConfirmOpen(false)}
              aria-label="Close logout confirmation"
            >
              <X size={18} />
            </button>

            <div className="logout-confirm-content">
              <h2>Log out of SynCode?</h2>
              <p>You will need to sign in again to access your dashboard.</p>

              <div className="logout-confirm-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsLogoutConfirmOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-filled" onClick={confirmLogout}>
                  Logout
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Invitations;

