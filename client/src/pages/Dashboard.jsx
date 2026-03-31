import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
  Copy,
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

const rooms = [
  {
    id: 1,
    language: "Python",
    name: "Neural Network Core",
    edited: "Edited 2 hours ago",
    collaborators: ["AK", "LM", "+2"],
    live: true,
  },
  {
    id: 2,
    language: "JavaScript",
    name: "Frontend Realtime Sync",
    edited: "Edited 5 minutes ago",
    collaborators: ["RJ"],
    live: false,
    menuOpen: true,
  },
  {
    id: 3,
    language: "C++",
    name: "Game Engine Physics",
    edited: "Edited 1 day ago",
    collaborators: ["MA", "SR"],
    live: false,
  },
  {
    id: 4,
    language: "Python",
    name: "Data Scraper v2",
    edited: "Edited 3 hours ago",
    collaborators: ["NR"],
    live: false,
  },
  {
    id: 5,
    language: "JavaScript",
    name: "React Auth Hooks",
    edited: "Edited 5 hours ago",
    collaborators: ["SK", "AA"],
    live: false,
  },
  {
    id: 6,
    language: "Java",
    name: "Legacy Kernel Fix",
    edited: "Edited 2 days ago",
    collaborators: ["VN"],
    live: false,
  },
];

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

const recentRooms = [
  { id: "r1", name: "API Gateway", language: "JavaScript" },
  { id: "r2", name: "ML Sandbox", language: "Python" },
  { id: "r3", name: "Compiler Notes", language: "C++" },
];

const Dashboard = () => {
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("create");
  const [isPrivateRoom, setIsPrivateRoom] = useState(true);
  const params = new URLSearchParams(window.location.search);
  const isEmptyState = params.get("state") === "empty";
  const visibleRooms = isEmptyState ? [] : rooms;

  const openRoomModal = () => {
    setActiveModalTab("create");
    setIsRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
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
          <button type="button" className="sidebar-icon-btn" data-tooltip="Logout" aria-label="Logout">
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

        {visibleRooms.length > 0 ? (
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
                    <button type="button" className="room-menu-btn" aria-label="Room options">
                      <MoreVertical size={16} />
                    </button>
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

                    <Link to="/editor" className="room-open-btn">
                      Open Room
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  {room.menuOpen ? (
                    <div className="room-menu-popup" role="menu" aria-label="Room actions">
                      <button type="button" className="room-menu-item" role="menuitem">
                        <Pencil size={14} /> Rename
                      </button>
                      <button type="button" className="room-menu-item" role="menuitem">
                        <Copy size={14} /> Copy Invite Link
                      </button>
                      <button type="button" className="room-menu-item delete" role="menuitem">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          </>
        ) : (
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
        )}
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
                onClick={() => setActiveModalTab("create")}
                aria-selected={activeModalTab === "create"}
              >
                Create Room
              </button>
              <button
                type="button"
                role="tab"
                className={`room-modal-tab${activeModalTab === "join" ? " is-active" : ""}`}
                onClick={() => setActiveModalTab("join")}
                aria-selected={activeModalTab === "join"}
              >
                Join Room
              </button>
            </div>

            {activeModalTab === "create" ? (
              <div className="room-modal-content">
                <div className="room-field">
                  <label htmlFor="room-name">Room Name</label>
                  <input id="room-name" type="text" placeholder="e.g. My Python Project" />
                </div>

                <div className="room-field">
                  <label htmlFor="room-language">Language</label>
                  <div className="modal-select-wrap">
                    <select id="room-language" defaultValue="Python">
                      <option>Python</option>
                      <option>JavaScript</option>
                      <option>C++</option>
                      <option>Java</option>
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
                    className={`toggle-switch ${isPrivateRoom ? "is-on" : ""}`}
                    onClick={() => setIsPrivateRoom((prev) => !prev)}
                    aria-label="Toggle room privacy"
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="room-field">
                  <label htmlFor="invite-email">Invite by Email (optional)</label>
                  <input id="invite-email" type="text" placeholder="Enter email and press Enter" />
                  <div className="email-tag-list">
                    <span className="email-tag">
                      ahmed@gmail.com
                      <button type="button" aria-label="Remove ahmed@gmail.com">
                        <X size={12} />
                      </button>
                    </span>
                    <span className="email-tag">
                      sara@gmail.com
                      <button type="button" aria-label="Remove sara@gmail.com">
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                </div>

                <button type="button" className="btn btn-filled room-modal-submit">
                  Create Room
                </button>
              </div>
            ) : (
              <div className="room-modal-content">
                <div className="room-field">
                  <label htmlFor="room-code">Room Code or Invite Link</label>
                  <input id="room-code" type="text" placeholder="Paste your invite link or room code here" />
                  <small>Ask your collaborator to share their room invite link</small>
                </div>

                <div className="or-divider">
                  <span>or</span>
                </div>

                <div className="recent-rooms">
                  <h3>Recently Visited Rooms</h3>
                  {recentRooms.map((room) => (
                    <div className="recent-room-row" key={room.id}>
                      <div>
                        <p>{room.name}</p>
                        <span className={`lang-badge ${badgeClassMap[room.language] || "badge-python"}`}>
                          {room.language}
                        </span>
                      </div>
                      <button type="button">Join</button>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn btn-filled room-modal-submit">
                  Join Room
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
