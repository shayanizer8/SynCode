import {
  ArrowRight,
  ArrowLeftRight,
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

const Dashboard = () => {
  const params = new URLSearchParams(window.location.search);
  const isEmptyState = params.get("state") === "empty";
  const visibleRooms = isEmptyState ? [] : rooms;

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
            <button type="button" className="btn btn-filled dashboard-new-btn">
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

                    <button type="button" className="room-open-btn">
                      Open Room
                      <ArrowRight size={14} />
                    </button>
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
            <button type="button" className="btn btn-filled">
              <Plus size={16} />
              <span>Create a Room</span>
            </button>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
