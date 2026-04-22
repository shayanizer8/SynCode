import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createRoomRequest,
  deleteRoomRequest,
  getRecentRoomsRequest,
  getRoomsRequest,
  joinRoomByIdRequest,
  joinRoomByInviteRequest,
  renameRoomRequest,
} from "../services/roomsApi";
import {
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
  Filter,
  FolderClosed,
  Home,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { clearAuthToken, getAuthToken } from "../services/tokenStorage";
import { getCurrentUserRequest } from "../services/authApi";

const navItems = [
  { key: "home", label: "Home", icon: Home, active: true },
  { key: "projects", label: "My Projects", icon: FolderClosed, active: false },
  { key: "settings", label: "Settings", icon: Settings, active: false },
];

const badgeClassMap = {
  Python: "badge-python",
  JavaScript: "badge-javascript",
  Java: "badge-java",
  "C++": "badge-cpp",
};

const avatarToneClass = ["tone-a", "tone-b", "tone-c", "tone-d"];
const roomLanguageOptions = ["Python", "JavaScript", "C++", "Java"];

const initialCreateFormState = {
  name: "",
  language: "Python",
  isPrivate: true,
  inviteEmail: "",
};

const getRelativeEditedLabel = (updatedAt) => {
  if (!updatedAt) {
    return "Edited recently";
  }

  const updatedTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedTime)) {
    return "Edited recently";
  }

  const diffMs = Date.now() - updatedTime;
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `Edited ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `Edited ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  return `Edited ${days} day${days === 1 ? "" : "s"} ago`;
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialRooms = Array.isArray(location.state?.initialRooms) ? location.state.initialRooms : [];

  const [rooms, setRooms] = useState(initialRooms);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("create");
  const [createForm, setCreateForm] = useState(initialCreateFormState);
  const [createRoomError, setCreateRoomError] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinRoomError, setJoinRoomError] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);
  const [isRecentRoomsLoading, setIsRecentRoomsLoading] = useState(false);
  const [recentRoomsError, setRecentRoomsError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [openRoomMenuId, setOpenRoomMenuId] = useState("");
  const [menuActionError, setMenuActionError] = useState("");
  const [roomActionState, setRoomActionState] = useState({
    mode: "",
    roomId: "",
  });
  const [renameDialogState, setRenameDialogState] = useState({
    isOpen: false,
    roomId: "",
    roomName: "",
    nextName: "",
    error: "",
  });
  const [deleteDialogState, setDeleteDialogState] = useState({
    isOpen: false,
    roomId: "",
    roomName: "",
  });

  const refreshRooms = async () => {
    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsLoadingRooms(true);
      setRoomsError("");

      const response = await getRoomsRequest(token);
      const apiRooms = Array.isArray(response.data?.rooms) ? response.data.rooms : [];
      setRooms(apiRooms);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login");
        return;
      }

      const message = error.response?.data?.message || "Unable to load rooms right now.";
      setRoomsError(message);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchRecentRooms = async () => {
    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsRecentRoomsLoading(true);
      setRecentRoomsError("");

      const response = await getRecentRoomsRequest(token);
      const apiRooms = Array.isArray(response.data?.rooms) ? response.data.rooms : [];
      setRecentRooms(apiRooms);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login");
        return;
      }

      const message = error.response?.data?.message || "Unable to load recent rooms.";
      setRecentRoomsError(message);
    } finally {
      setIsRecentRoomsLoading(false);
    }
  };

  useEffect(() => {
    refreshRooms();
  }, [navigate]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = getAuthToken();

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await getCurrentUserRequest(token);
        setCurrentUserId(String(response.data?.user?._id || response.data?.user?.id || ""));
      } catch (error) {
        if (error.response?.status === 401) {
          clearAuthToken();
          navigate("/login", { replace: true });
        }
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    if (isRoomModalOpen && activeModalTab === "join") {
      fetchRecentRooms();
    }
  }, [activeModalTab, isRoomModalOpen]);

  const visibleRooms = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        id: String(room.id || room._id || ""),
        ownerId: String(room.ownerId || ""),
        edited: getRelativeEditedLabel(room.updatedAt),
        collaborators: Array.isArray(room.collaborators) ? room.collaborators : [],
        isOwner: String(room.ownerId || "") === String(currentUserId || ""),
      })),
    [rooms, currentUserId]
  );

  const handleToggleRoomMenu = (roomId) => {
    setMenuActionError("");
    setOpenRoomMenuId((prev) => (prev === roomId ? "" : roomId));
  };

  const openRenameDialog = (room) => {
    setMenuActionError("");
    setOpenRoomMenuId("");
    setRenameDialogState({
      isOpen: true,
      roomId: room.id,
      roomName: room.name || "",
      nextName: room.name || "",
      error: "",
    });
  };

  const closeRenameDialog = () => {
    setRenameDialogState({
      isOpen: false,
      roomId: "",
      roomName: "",
      nextName: "",
      error: "",
    });
  };

  const openDeleteDialog = (room) => {
    setMenuActionError("");
    setOpenRoomMenuId("");
    setDeleteDialogState({
      isOpen: true,
      roomId: room.id,
      roomName: room.name || "",
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialogState({
      isOpen: false,
      roomId: "",
      roomName: "",
    });
  };

  const handleRenameRoom = async () => {
    const trimmedName = renameDialogState.nextName.trim();

    if (!trimmedName) {
      setRenameDialogState((prev) => ({
        ...prev,
        error: "Room name is required.",
      }));
      return;
    }

    if (trimmedName === renameDialogState.roomName) {
      closeRenameDialog();
      return;
    }

    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setRoomActionState({ mode: "rename", roomId: renameDialogState.roomId });
      setMenuActionError("");
      setRenameDialogState((prev) => ({ ...prev, error: "" }));
      await renameRoomRequest(token, renameDialogState.roomId, { name: trimmedName });
      setOpenRoomMenuId("");
      closeRenameDialog();
      await refreshRooms();
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }

      const message = error.response?.data?.message || "Unable to rename this room.";
      setRenameDialogState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setRoomActionState({ mode: "", roomId: "" });
    }
  };

  const handleDeleteRoom = async () => {
    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setRoomActionState({ mode: "delete", roomId: deleteDialogState.roomId });
      setMenuActionError("");
      await deleteRoomRequest(token, deleteDialogState.roomId);
      setOpenRoomMenuId("");
      closeDeleteDialog();
      await refreshRooms();
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }

      const message = error.response?.data?.message || "Unable to delete this room.";
      setMenuActionError(message);
    } finally {
      setRoomActionState({ mode: "", roomId: "" });
    }
  };

  const openRoomModal = () => {
    setActiveModalTab("create");
    setCreateRoomError("");
    setJoinRoomError("");
    setIsRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
  };

  const switchModalTab = (tab) => {
    setActiveModalTab(tab);
    setCreateRoomError("");
    setJoinRoomError("");
  };

  const handleCreateInputChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCreateRoomError("");
  };

  const handleCreateRoom = async () => {
    if (!createForm.name.trim()) {
      setCreateRoomError("Room name is required");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsCreatingRoom(true);
      setCreateRoomError("");

      const response = await createRoomRequest(token, {
        name: createForm.name.trim(),
        language: createForm.language,
        isPrivate: createForm.isPrivate,
        inviteEmail: createForm.inviteEmail.trim(),
      });

      const createdRoom = response.data?.room;
      const createdRoomId = createdRoom?.id || createdRoom?._id;

      if (!createdRoomId) {
        setCreateRoomError("Room could not be created. Please try again.");
        return;
      }

      await refreshRooms();
      setCreateForm(initialCreateFormState);
      setIsRoomModalOpen(false);
      navigate(`/editor/${createdRoomId}`);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login");
        return;
      }

      const message = error.response?.data?.message || "Unable to create room right now.";
      setCreateRoomError(message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinByInvite = async () => {
    if (!joinInput.trim()) {
      setJoinRoomError("Invite code or link is required");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsJoiningRoom(true);
      setJoinRoomError("");

      const response = await joinRoomByInviteRequest(token, {
        inviteCodeOrLink: joinInput.trim(),
      });

      const joinedRoom = response.data?.room;
      const joinedRoomId = joinedRoom?.id || joinedRoom?._id;

      if (!joinedRoomId) {
        setJoinRoomError("Unable to join room. Please try again.");
        return;
      }

      await refreshRooms();
      setJoinInput("");
      setIsRoomModalOpen(false);
      navigate(`/editor/${joinedRoomId}`);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login");
        return;
      }

      const message = error.response?.data?.message || "Unable to join room right now.";
      setJoinRoomError(message);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleJoinRecentRoom = async (roomId) => {
    const token = getAuthToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsJoiningRoom(true);
      setJoinRoomError("");
      await joinRoomByIdRequest(token, roomId);
      await refreshRooms();
      setIsRoomModalOpen(false);
      navigate(`/editor/${roomId}`);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login");
        return;
      }

      const message = error.response?.data?.message || "Unable to join selected room.";
      setJoinRoomError(message);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const closeLogoutConfirm = () => {
    setIsLogoutConfirmOpen(false);
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
            <ArrowLeftRight size={18} />
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
              >
                <Icon size={18} />
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="sidebar-avatar-wrap" aria-label="User account">
            <span className="sidebar-avatar">SC</span>
            <span className="online-dot" aria-hidden="true"></span>
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            data-tooltip="Logout"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>My Coding Rooms</h1>
            <p>Manage and jump into your collaborative sessions</p>
          </div>
          {visibleRooms.length > 0 ? (
            <button type="button" className="btn btn-filled dashboard-new-btn" onClick={openRoomModal}>
              <Plus size={16} />
              <span>New Room</span>
            </button>
          ) : null}
        </header>

        <div className="dashboard-divider" />

        {roomsError ? <p className="form-server-error">{roomsError}</p> : null}
        {menuActionError ? <p className="form-server-error">{menuActionError}</p> : null}

        {isLoadingRooms ? (
          <section className="rooms-empty-state" aria-label="Rooms loading state">
            <div className="empty-illustration" aria-hidden="true">
              <ArrowLeftRight size={34} />
            </div>
            <h2>Loading rooms...</h2>
            <p>Fetching your latest collaborative sessions</p>
          </section>
        ) : null}

        {!isLoadingRooms && visibleRooms.length > 0 ? (
          <>
            <div className="dashboard-search-row">
              <label className="dashboard-search" htmlFor="room-search">
                <Search size={16} />
                <input id="room-search" type="text" placeholder="Search rooms..." />
              </label>
              <button type="button" className="dashboard-filter-btn" aria-label="Filter rooms">
                <Filter size={16} />
              </button>
            </div>

            <section className="rooms-grid" aria-label="Coding rooms">
              {visibleRooms.map((room) => (
                <article className="room-card" key={room.id}>
                  <div className="room-card-top">
                    <div className="room-badges">
                      <span className={`lang-badge ${badgeClassMap[room.language] || "badge-python"}`}>
                        {room.language}
                      </span>
                      {room.live ? (
                        <span className="live-badge">
                          <span className="live-dot" aria-hidden="true" />
                          Live
                        </span>
                      ) : null}
                    </div>
                    {room.isOwner ? (
                      <button
                        type="button"
                        className="room-menu-btn"
                        aria-label="Room options"
                        onClick={() => handleToggleRoomMenu(room.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                    ) : null}
                  </div>

                  <h2>{room.name}</h2>
                  <p>{room.edited}</p>

                  <div className="room-card-bottom">
                    <div className="room-collaborators" aria-label="Collaborators">
                      {room.collaborators.map((collab, index) => (
                        <span
                          className={`room-avatar ${avatarToneClass[index % avatarToneClass.length]}`}
                          key={`${room.id}-${collab}`}
                          style={{ marginLeft: index === 0 ? 0 : -8 }}
                        >
                          {collab}
                        </span>
                      ))}
                    </div>

                    <Link to={`/editor/${room.id}`} className="room-open-btn">
                      Open Room
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  {room.isOwner && openRoomMenuId === room.id ? (
                    <div className="room-menu-popup" role="menu" aria-label="Room actions">
                      <button
                        type="button"
                        className="room-menu-item"
                        role="menuitem"
                        onClick={() => openRenameDialog(room)}
                        disabled={roomActionState.mode !== "" && roomActionState.roomId === room.id}
                      >
                        <Pencil size={14} /> Rename
                      </button>
                      <button
                        type="button"
                        className="room-menu-item delete"
                        role="menuitem"
                        onClick={() => openDeleteDialog(room)}
                        disabled={roomActionState.mode !== "" && roomActionState.roomId === room.id}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          </>
        ) : null}

        {!isLoadingRooms && visibleRooms.length === 0 ? (
          <section className="rooms-empty-state" aria-label="Empty rooms state">
            <div className="empty-illustration" aria-hidden="true">
              <ArrowLeftRight size={34} />
            </div>
            <h2>No rooms yet</h2>
            <p>Create your first coding room and invite your team</p>
            <button type="button" className="btn btn-filled" onClick={openRoomModal}>
              <Plus size={16} />
              <span>Create a Room</span>
            </button>
          </section>
        ) : null}
      </main>

      {isRoomModalOpen ? (
        <div className="room-modal-overlay" onClick={closeRoomModal} role="presentation">
          <section className="room-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="room-modal-close" onClick={closeRoomModal} aria-label="Close modal">
              <X size={18} />
            </button>

            <div className="room-modal-tabs" role="tablist" aria-label="Room mode">
              <button
                type="button"
                role="tab"
                className={`room-modal-tab${activeModalTab === "create" ? " is-active" : ""}`}
                onClick={() => switchModalTab("create")}
                aria-selected={activeModalTab === "create"}
              >
                Create Room
              </button>
              <button
                type="button"
                role="tab"
                className={`room-modal-tab${activeModalTab === "join" ? " is-active" : ""}`}
                onClick={() => switchModalTab("join")}
                aria-selected={activeModalTab === "join"}
              >
                Join Room
              </button>
            </div>

            {activeModalTab === "create" ? (
              <div className="room-modal-content">
                {createRoomError ? <p className="form-server-error">{createRoomError}</p> : null}

                <div className="room-field">
                  <label htmlFor="room-name">Room Name</label>
                  <input
                    id="room-name"
                    name="name"
                    type="text"
                    placeholder="e.g. My Python Project"
                    value={createForm.name}
                    onChange={handleCreateInputChange}
                  />
                </div>

                <div className="room-field">
                  <label htmlFor="room-language">Language</label>
                  <div className="modal-select-wrap">
                    <select id="room-language" name="language" value={createForm.language} onChange={handleCreateInputChange}>
                      {roomLanguageOptions.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>

                <div className="room-toggle-row">
                  <div>
                    <p>Private Room</p>
                    <span>Only invited members can join</span>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${createForm.isPrivate ? "is-on" : ""}`}
                    onClick={() =>
                      setCreateForm((prev) => ({
                        ...prev,
                        isPrivate: !prev.isPrivate,
                      }))
                    }
                    aria-label="Toggle room privacy"
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="room-field">
                  <label htmlFor="invite-email">Invite by Email (optional)</label>
                  <input
                    id="invite-email"
                    name="inviteEmail"
                    type="text"
                    placeholder="Enter one email address"
                    value={createForm.inviteEmail}
                    onChange={handleCreateInputChange}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-filled room-modal-submit"
                  onClick={handleCreateRoom}
                  disabled={isCreatingRoom}
                >
                  {isCreatingRoom ? "Creating Room..." : "Create Room"}
                </button>
              </div>
            ) : (
              <div className="room-modal-content">
                {joinRoomError ? <p className="form-server-error">{joinRoomError}</p> : null}

                <div className="room-field">
                  <label htmlFor="room-code">Room Code or Invite Link</label>
                  <input
                    id="room-code"
                    type="text"
                    placeholder="Paste your invite link or room code here"
                    value={joinInput}
                    onChange={(event) => {
                      setJoinInput(event.target.value);
                      setJoinRoomError("");
                    }}
                  />
                  <small>Ask your collaborator to share their room invite link</small>
                </div>

                <div className="or-divider">
                  <span>or</span>
                </div>

                <div className="recent-rooms">
                  <h3>Recently Visited Rooms</h3>
                  {isRecentRoomsLoading ? <p className="form-server-error">Loading recent rooms...</p> : null}
                  {recentRoomsError ? <p className="form-server-error">{recentRoomsError}</p> : null}

                  {!isRecentRoomsLoading && !recentRoomsError && recentRooms.length === 0 ? (
                    <p className="form-server-error">No recent rooms found.</p>
                  ) : null}

                  {!isRecentRoomsLoading && !recentRoomsError
                    ? recentRooms.map((room) => (
                        <div className="recent-room-row" key={room._id}>
                          <div>
                            <p>{room.name}</p>
                            <span className={`lang-badge ${badgeClassMap[room.language] || "badge-python"}`}>
                              {room.language}
                            </span>
                          </div>
                          <button type="button" onClick={() => handleJoinRecentRoom(room._id)} disabled={isJoiningRoom}>
                            Join
                          </button>
                        </div>
                      ))
                    : null}
                </div>

                <button
                  type="button"
                  className="btn btn-filled room-modal-submit"
                  onClick={handleJoinByInvite}
                  disabled={isJoiningRoom}
                >
                  {isJoiningRoom ? "Joining Room..." : "Join Room"}
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isLogoutConfirmOpen ? (
        <div className="room-modal-overlay" onClick={closeLogoutConfirm} role="presentation">
          <section className="room-modal logout-confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="room-modal-close"
              onClick={closeLogoutConfirm}
              aria-label="Close logout confirmation"
            >
              <X size={18} />
            </button>

            <div className="logout-confirm-content">
              <h2>Log out of SynCode?</h2>
              <p>You will need to sign in again to access your dashboard.</p>

              <div className="logout-confirm-actions">
                <button type="button" className="btn btn-ghost" onClick={closeLogoutConfirm}>
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

      {renameDialogState.isOpen ? (
        <div className="room-modal-overlay" onClick={closeRenameDialog} role="presentation">
          <section className="room-modal room-action-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="room-modal-close" onClick={closeRenameDialog} aria-label="Close rename dialog">
              <X size={18} />
            </button>

            <div className="room-action-content">
              <h2>Rename Room</h2>
              <p>Update the room name for your collaborators.</p>

              {renameDialogState.error ? <p className="form-server-error">{renameDialogState.error}</p> : null}

              <div className="room-field">
                <label htmlFor="rename-room-input">Room Name</label>
                <input
                  id="rename-room-input"
                  type="text"
                  value={renameDialogState.nextName}
                  onChange={(event) =>
                    setRenameDialogState((prev) => ({
                      ...prev,
                      nextName: event.target.value,
                      error: "",
                    }))
                  }
                />
              </div>

              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeRenameDialog}
                  disabled={roomActionState.mode === "rename" && roomActionState.roomId === renameDialogState.roomId}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-filled"
                  onClick={handleRenameRoom}
                  disabled={roomActionState.mode === "rename" && roomActionState.roomId === renameDialogState.roomId}
                >
                  {roomActionState.mode === "rename" && roomActionState.roomId === renameDialogState.roomId
                    ? "Renaming..."
                    : "Rename"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {deleteDialogState.isOpen ? (
        <div className="room-modal-overlay" onClick={closeDeleteDialog} role="presentation">
          <section className="room-modal room-action-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="room-modal-close" onClick={closeDeleteDialog} aria-label="Close delete dialog">
              <X size={18} />
            </button>

            <div className="room-action-content">
              <h2>Delete Room?</h2>
              <p>
                This will permanently delete <strong>{deleteDialogState.roomName}</strong> and its files, messages, and member list.
              </p>

              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeDeleteDialog}
                  disabled={roomActionState.mode === "delete" && roomActionState.roomId === deleteDialogState.roomId}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-filled btn-danger"
                  onClick={handleDeleteRoom}
                  disabled={roomActionState.mode === "delete" && roomActionState.roomId === deleteDialogState.roomId}
                >
                  {roomActionState.mode === "delete" && roomActionState.roomId === deleteDialogState.roomId
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
