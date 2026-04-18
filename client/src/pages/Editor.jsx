import { useEffect, useMemo, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getRoomContentRequest,
  getRoomMetadataRequest,
  updateRoomContentRequest,
} from "../services/roomsApi";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Edit3,
  FileText,
  Folder,
  LogOut,
  Play,
  Plus,
  Save,
  SendHorizontal,
  Settings,
} from "lucide-react";

const languageLabelMap = {
  Python: "python",
  JavaScript: "javascript",
  Java: "java",
  "C++": "cpp",
};

const defaultFileByLanguage = {
  Python: { path: "main.py", content: "print('Welcome to SynCode')\n" },
  JavaScript: { path: "main.js", content: "console.log('Welcome to SynCode');\n" },
  Java: {
    path: "Main.java",
    content:
      "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to SynCode\");\n    }\n}\n",
  },
  "C++": {
    path: "main.cpp",
    content:
      "#include <iostream>\n\nint main() {\n    std::cout << \"Welcome to SynCode\" << std::endl;\n    return 0;\n}\n",
  },
};

const collaborators = [
  { name: "Ahmed", status: "Editing main.py:12", tone: "tone-b", online: true },
  { name: "Sara", status: "Editing main.py:18", tone: "tone-c", online: true },
  { name: "John", status: "Idle", tone: "tone-a", online: true },
  { name: "Mina", status: "Viewing", tone: "tone-d", online: false },
];

const chatMessages = [
  { id: 1, from: "Ahmed", at: "10:34", text: "I think we need broader exception handling.", mine: false, tone: "tone-b" },
  { id: 2, from: "You", at: "10:35", text: "Agreed. Updating it now.", mine: true, tone: "tone-a" },
  { id: 3, from: "Sara", at: "10:36", text: "Looks good after that change.", mine: false, tone: "tone-c" },
  { id: 4, from: "John", at: "10:37", text: "Can we also log timestamps for each run?", mine: false, tone: "tone-d" },
  { id: 5, from: "You", at: "10:38", text: "Added and pushed to main.py.", mine: true, tone: "tone-a" },
];

const outputLinesSeed = [
  { text: "[14:30:22] Starting execution of 'main.py'...", type: "muted" },
  { text: "Initializing SynCode at ./src...", type: "muted" },
  { text: "Processing file: utils.py... [DONE]", type: "success" },
  { text: "ERROR: ConfigNotFound: Missing .codesync.yaml at project root", type: "error" },
  { text: "Process completed successfully.", type: "success" },
];

const Editor = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState("output");
  const [roomName, setRoomName] = useState("My Python Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [roomLanguage, setRoomLanguage] = useState("Python");
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [editorCode, setEditorCode] = useState("");
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState("");
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [terminalLines, setTerminalLines] = useState(outputLinesSeed);

  const activeCollab = useMemo(() => collaborators.filter((user) => user.online).length, []);

  useEffect(() => {
    const fetchRoomData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      if (!roomId) {
        setRoomLoadError("Room id is missing.");
        setIsLoadingRoom(false);
        return;
      }

      try {
        setIsLoadingRoom(true);
        setIsAccessDenied(false);
        setRoomLoadError("");

        const [metadataResponse, contentResponse] = await Promise.all([
          getRoomMetadataRequest(token, roomId),
          getRoomContentRequest(token, roomId),
        ]);

        const room = metadataResponse.data?.room;
        const contentFiles = Array.isArray(contentResponse.data?.files) ? contentResponse.data.files : [];

        if (!room?._id) {
          setRoomLoadError("Room metadata is unavailable.");
          return;
        }

        setRoomName(room.name || "Untitled Room");
        setRoomLanguage(room.language || "Python");

        const fallback = defaultFileByLanguage[room.language] || defaultFileByLanguage.Python;
        const normalizedFiles =
          contentFiles.length > 0
            ? contentFiles.map((file) => ({
                path: file.path,
                language: file.language || room.language,
                content: typeof file.content === "string" ? file.content : "",
              }))
            : [
                {
                  path: fallback.path,
                  language: room.language || "Python",
                  content: fallback.content,
                },
              ];

        setFiles(normalizedFiles);
        setActiveFile(normalizedFiles[0].path);
        setEditorCode(normalizedFiles[0].content);
      } catch (error) {
        const status = error.response?.status;

        if (status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
          return;
        }

        if (status === 403) {
          setIsAccessDenied(true);
          return;
        }

        if (status === 404) {
          setRoomLoadError("Room not found.");
          return;
        }

        const message = error.response?.data?.message || "Unable to load room data right now.";
        setRoomLoadError(message);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    fetchRoomData();
  }, [navigate, roomId]);

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    const nextFile = files.find((file) => file.path === activeFile);

    if (nextFile) {
      setEditorCode(nextFile.content);
    }
  }, [activeFile, files]);

  const handleEditorChange = (nextValue) => {
    const newContent = nextValue || "";
    setEditorCode(newContent);
    setSaveMessage("");

    setFiles((prev) =>
      prev.map((file) =>
        file.path === activeFile
          ? {
              ...file,
              content: newContent,
            }
          : file
      )
    );
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage("");

      await updateRoomContentRequest(token, roomId, {
        files,
      });

      setSaveMessage("Saved");
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setIsAccessDenied(true);
        return;
      }

      const message = error.response?.data?.message || "Unable to save room content.";
      setSaveMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  if (isLoadingRoom) {
    return (
      <div className="editor-page editor-status-page">
        <div className="editor-status-card">
          <h2>Loading room...</h2>
          <p>Please wait while SynCode prepares your editor.</p>
        </div>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="editor-page editor-status-page">
        <div className="editor-status-card">
          <h2>Access denied (403)</h2>
          <p>You are not a member of this room.</p>
          <button type="button" className="editor-btn ghost" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (roomLoadError) {
    return (
      <div className="editor-page editor-status-page">
        <div className="editor-status-card">
          <h2>Could not open room</h2>
          <p>{roomLoadError}</p>
          <button type="button" className="editor-btn ghost" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <div className="editor-top-left">
          <button type="button" className="editor-logo" aria-label="SynCode">
            <ArrowLeftRight size={17} />
            <span>SynCode</span>
          </button>

          <div className="room-name-wrap">
            {isEditingName ? (
              <input
                className="room-name-input"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setIsEditingName(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button type="button" className="room-name-btn" onClick={() => setIsEditingName(true)}>
                <span>{roomName}</span>
                <Edit3 size={13} className="room-pencil" />
              </button>
            )}
          </div>

          <button type="button" className="language-pill">
            {roomLanguage} <ChevronDown size={13} />
          </button>
        </div>

        <div className="editor-top-right">
          <div className="top-collab-avatars" aria-label="Active collaborators">
            {collaborators.slice(0, 4).map((user, index) => (
              <span key={user.name} className={`top-avatar ${user.tone}`} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                {user.name[0]}
                {user.online ? <i className="mini-online-dot" aria-hidden="true" /> : null}
              </span>
            ))}
          </div>

          <button type="button" className="editor-btn ghost">Invite</button>
          <button type="button" className="editor-btn run">
            <Play size={12} />
            Run
          </button>
          <button type="button" className="editor-btn ghost" onClick={handleSave} disabled={isSaving}>
            <Save size={12} />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="editor-icon-btn" aria-label="Settings">
            <Settings size={16} />
          </button>
          <button type="button" className="editor-icon-btn" aria-label="Logout" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="editor-workspace">
        {!leftCollapsed ? (
          <aside className="explorer-panel">
            <div className="panel-title-row">
              <p>Explorer</p>
              <button type="button" className="panel-mini-btn" aria-label="New file">
                <Plus size={14} />
              </button>
            </div>

            <div className="file-tree">
              <button type="button" className="file-row folder-row">
                <Folder size={14} />
                <span>src</span>
              </button>
              {files.map((file) => (
                <button
                  type="button"
                  key={file.path}
                  className={`file-row nested${activeFile === file.path ? " file-row-active" : ""}`}
                  onClick={() => setActiveFile(file.path)}
                >
                  <FileText size={14} />
                  <span>{file.path}</span>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <section className="editor-center-panel">
          <button
            type="button"
            className="panel-toggle-btn left"
            onClick={() => setLeftCollapsed((prev) => !prev)}
            aria-label={leftCollapsed ? "Expand explorer" : "Collapse explorer"}
          >
            {leftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button
            type="button"
            className="panel-toggle-btn right"
            onClick={() => setRightCollapsed((prev) => !prev)}
            aria-label={rightCollapsed ? "Expand chat" : "Collapse chat"}
          >
            {rightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <div className="editor-tabbar">
            {files.map((file) => (
              <button
                type="button"
                key={file.path}
                className={`editor-tab${activeFile === file.path ? " active" : ""}`}
                onClick={() => setActiveFile(file.path)}
              >
                {file.path}
              </button>
            ))}
            <button type="button" className="editor-tab add" aria-label="New tab">
              <Plus size={14} />
            </button>
          </div>

          <div className="code-canvas">
            <div className="monaco-wrapper">
              <MonacoEditor
                height="100%"
                language={languageLabelMap[roomLanguage] || "plaintext"}
                theme="vs-dark"
                value={editorCode}
                onChange={handleEditorChange}
                options={{
                  fontFamily: "JetBrains Mono, Consolas, Monaco, monospace",
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            </div>
          </div>

          {saveMessage ? <p className="editor-save-message">{saveMessage}</p> : null}

          <div className="terminal-panel">
            <div className="terminal-topbar">
              <div className="terminal-tabs">
                <button
                  type="button"
                  className={`terminal-tab${activeBottomTab === "output" ? " active" : ""}`}
                  onClick={() => setActiveBottomTab("output")}
                >
                  Output
                </button>
                <button
                  type="button"
                  className={`terminal-tab${activeBottomTab === "terminal" ? " active" : ""}`}
                  onClick={() => setActiveBottomTab("terminal")}
                >
                  Terminal
                </button>
              </div>
              <button type="button" className="terminal-clear" onClick={() => setTerminalLines([])}>
                Clear
              </button>
            </div>

            <div className="terminal-body">
              {terminalLines.length > 0 ? (
                terminalLines.map((line, index) => (
                  <p key={`line-${index}`} className={`term-line ${line.type}`}>
                    {line.text}
                  </p>
                ))
              ) : (
                <p className="term-line muted">Output cleared.</p>
              )}
              <span className="terminal-cursor" aria-hidden="true" />
            </div>
          </div>
        </section>

        {!rightCollapsed ? (
          <aside className="chat-panel">
            <div className="chat-collab-header">
              <h3>Collaborators</h3>
              <span>{activeCollab} active</span>
            </div>

            <div className="collab-list">
              {collaborators.map((user) => (
                <div key={user.name} className="collab-row">
                  <span className={`top-avatar ${user.tone}`}>
                    {user.name[0]}
                    {user.online ? <i className="mini-online-dot" aria-hidden="true" /> : null}
                  </span>
                  <div>
                    <p>{user.name}</p>
                    <small>{user.status}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-divider" />

            <div className="chat-header">Chat</div>

            <div className="chat-messages">
              {chatMessages.map((message) => (
                <article key={message.id} className={`chat-msg${message.mine ? " mine" : ""}`}>
                  <div className="chat-meta">
                    <span className={`chat-user ${message.tone}`}>{message.from}</span>
                    <time>{message.at}</time>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>

            <form className="chat-input-row" onSubmit={(event) => event.preventDefault()}>
              <input type="text" placeholder="Type a message..." />
              <button type="submit" aria-label="Send message">
                <SendHorizontal size={16} />
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

export default Editor;
