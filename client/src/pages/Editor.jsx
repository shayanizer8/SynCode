import { useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useNavigate, useParams } from "react-router-dom";
import {
  executeCodeRequest,
  getRoomContentRequest,
  getRoomMetadataRequest,
  updateRoomContentRequest,
} from "../services/roomsApi";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Folder,
  LogOut,
  Play,
  Plus,
  Save,
  SendHorizontal,
  Settings,
  Trash2,
} from "lucide-react";

const languageLabelMap = {
  Python: "python",
  JavaScript: "javascript",
  Java: "java",
  "C++": "cpp",
};

const fileExtensionMap = {
  Python: "py",
  JavaScript: "js",
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

const normalizeFilesForCompare = (fileList) =>
  [...fileList]
    .map((file) => ({
      path: file.path,
      language: file.language,
      content: file.content,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

const areFileSetsEqual = (leftFiles, rightFiles) =>
  JSON.stringify(normalizeFilesForCompare(leftFiles)) === JSON.stringify(normalizeFilesForCompare(rightFiles));

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
  const [savedFiles, setSavedFiles] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [editorCode, setEditorCode] = useState("");
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState("");
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [fileActionModal, setFileActionModal] = useState({
    mode: "",
    filePath: "",
    nextPath: "",
  });
  const [terminalLines, setTerminalLines] = useState([]);
  const centerPanelRef = useRef(null);

  const activeCollab = useMemo(() => collaborators.filter((user) => user.online).length, []);
  const hasUnsavedChanges = useMemo(() => !areFileSetsEqual(files, savedFiles), [files, savedFiles]);

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
        setSavedFiles(normalizedFiles);
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

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!isResizingTerminal) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const panelElement = centerPanelRef.current;

      if (!panelElement) {
        return;
      }

      const panelRect = panelElement.getBoundingClientRect();
      const minTerminalHeight = 150;
      const minEditorHeight = 220;
      const maxTerminalHeight = Math.max(minTerminalHeight, panelRect.height - minEditorHeight);
      const requestedHeight = panelRect.bottom - event.clientY;
      const clampedHeight = Math.min(maxTerminalHeight, Math.max(minTerminalHeight, requestedHeight));

      setTerminalHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
    };

    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTerminal]);

  const handleTerminalResizeStart = (event) => {
    event.preventDefault();
    setIsResizingTerminal(true);
  };

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

      setSavedFiles(files);
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

  const handleRunCode = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setIsRunning(true);
      setActiveBottomTab("output");
      setTerminalLines([{ text: `[${new Date().toLocaleTimeString()}] Running ${activeFile || "file"}...`, type: "muted" }]);

      const response = await executeCodeRequest(token, {
        sourceCode: editorCode,
        language: roomLanguage,
        stdin: runInput,
      });

      const result = response.data?.result || {};
      const nextLines = [];

      nextLines.push({ text: `Status: ${result.status || "Unknown"}`, type: "muted" });

      if (result.compileOutput) {
        result.compileOutput
          .split("\n")
          .filter(Boolean)
          .forEach((line) => nextLines.push({ text: line, type: "error" }));
      }

      if (result.stderr) {
        result.stderr
          .split("\n")
          .filter(Boolean)
          .forEach((line) => nextLines.push({ text: line, type: "error" }));
      }

      if (result.stdout) {
        result.stdout
          .split("\n")
          .filter(Boolean)
          .forEach((line) => nextLines.push({ text: line, type: "success" }));
      }

      if (result.message) {
        nextLines.push({ text: result.message, type: "muted" });
      }

      if (result.time || result.memory) {
        nextLines.push({
          text: `time=${result.time ?? "-"}s memory=${result.memory ?? "-"}KB`,
          type: "muted",
        });
      }

      if (nextLines.length === 1) {
        nextLines.push({ text: "No output.", type: "muted" });
      }

      setTerminalLines(nextLines);
    } catch (error) {
      const message = error.response?.data?.message || "Code execution failed.";
      const details = error.response?.data?.details;
      setTerminalLines([
        { text: `[${new Date().toLocaleTimeString()}] Run failed`, type: "error" },
        { text: message, type: "error" },
        ...(details ? [{ text: String(details), type: "muted" }] : []),
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const getUniqueFileName = () => {
    const extension = fileExtensionMap[roomLanguage] || "txt";
    const existingPaths = new Set(files.map((file) => file.path));

    for (let index = 1; index <= 999; index += 1) {
      const candidate = `untitled-${index}.${extension}`;

      if (!existingPaths.has(candidate)) {
        return candidate;
      }
    }

    return `untitled-${Date.now()}.${extension}`;
  };

  const handleCreateFile = () => {
    const newFile = {
      path: getUniqueFileName(),
      language: roomLanguage,
      content: "",
    };

    const nextDraftFiles = [...files, newFile];

    setFiles(nextDraftFiles);
    setActiveFile(newFile.path);
    setEditorCode(newFile.content);
    setSaveMessage(`Created ${newFile.path}. Click Save to persist.`);
  };

  const openRenameFileModal = (filePath) => {
    setFileActionModal({
      mode: "rename",
      filePath,
      nextPath: filePath,
    });
  };

  const openDeleteFileModal = (filePath) => {
    setFileActionModal({
      mode: "delete",
      filePath,
      nextPath: "",
    });
  };

  const closeFileActionModal = () => {
    setFileActionModal({
      mode: "",
      filePath: "",
      nextPath: "",
    });
  };

  const handleConfirmRenameFile = () => {
    const filePath = fileActionModal.filePath;
    const targetFile = files.find((file) => file.path === filePath);

    if (!targetFile) {
      closeFileActionModal();
      return;
    }

    const newPath = fileActionModal.nextPath.trim();

    if (!newPath) {
      setSaveMessage("File name cannot be empty.");
      return;
    }

    if (newPath === targetFile.path) {
      return;
    }

    const alreadyExists = files.some((file) => file.path === newPath);

    if (alreadyExists) {
      setSaveMessage("A file with this name already exists.");
      return;
    }

    const nextDraftFiles = files.map((file) =>
      file.path === targetFile.path
        ? {
            ...file,
            path: newPath,
          }
        : file
    );

    setFiles(nextDraftFiles);
    closeFileActionModal();
    setSaveMessage(`Renamed to ${newPath}. Click Save to persist.`);

    if (activeFile === targetFile.path) {
      setActiveFile(newPath);
    }
  };

  const handleConfirmDeleteFile = () => {
    const filePath = fileActionModal.filePath;

    if (files.length <= 1) {
      setSaveMessage("At least one file is required in the room.");
      closeFileActionModal();
      return;
    }

    const nextDraftFiles = files.filter((file) => file.path !== filePath);

    setFiles(nextDraftFiles);
    closeFileActionModal();
    setSaveMessage(`Deleted ${filePath}. Click Save to persist.`);

    if (activeFile === filePath && nextDraftFiles.length > 0) {
      setActiveFile(nextDraftFiles[0].path);
      setEditorCode(nextDraftFiles[0].content);
    }
  };

  const handleAttemptExit = () => {
    if (hasUnsavedChanges) {
      setIsExitConfirmOpen(true);
      return;
    }

    navigate("/dashboard");
  };

  const closeExitConfirm = () => {
    setIsExitConfirmOpen(false);
  };

  const confirmExitWithoutSaving = () => {
    setIsExitConfirmOpen(false);
    navigate("/dashboard");
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
          <button type="button" className="editor-btn run" onClick={handleRunCode} disabled={isRunning}>
            <Play size={12} />
            {isRunning ? "Running..." : "Run"}
          </button>
          <button type="button" className="editor-btn ghost" onClick={handleSave} disabled={isSaving}>
            <Save size={12} />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="editor-icon-btn" aria-label="Settings">
            <Settings size={16} />
          </button>
          <button type="button" className="editor-icon-btn" aria-label="Back to dashboard" onClick={handleAttemptExit}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="editor-workspace">
        {!leftCollapsed ? (
          <aside className="explorer-panel">
            <div className="panel-title-row">
              <p>Explorer</p>
              <button
                type="button"
                className="panel-mini-btn"
                aria-label="Collapse explorer"
                onClick={() => setLeftCollapsed(true)}
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="file-tree">
              <button type="button" className="file-row folder-row">
                <Folder size={14} />
                <span>src</span>
              </button>
              {files.map((file) => (
                <div key={file.path} className={`file-row nested${activeFile === file.path ? " file-row-active" : ""}`}>
                  <button type="button" className="file-open-btn" onClick={() => setActiveFile(file.path)}>
                    <FileText size={14} />
                    <span>{file.path}</span>
                  </button>

                  <div className="file-row-actions">
                    <button
                      type="button"
                      className="file-action-btn"
                      aria-label={`Rename ${file.path}`}
                      onClick={() => openRenameFileModal(file.path)}
                      disabled={isSaving}
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      type="button"
                      className="file-action-btn delete"
                      aria-label={`Delete ${file.path}`}
                      onClick={() => openDeleteFileModal(file.path)}
                      disabled={isSaving}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        <section className="editor-center-panel" ref={centerPanelRef}>
          {leftCollapsed ? (
            <button
              type="button"
              className="explorer-expand-btn"
              onClick={() => setLeftCollapsed(false)}
              aria-label="Expand explorer"
            >
              <ChevronRight size={14} />
            </button>
          ) : null}

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
            <button
              type="button"
              className="editor-tab add"
              aria-label="New file"
              onClick={handleCreateFile}
              disabled={isSaving}
            >
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

          <div className="terminal-panel" style={{ height: `${terminalHeight}px` }}>
            <div
              className="terminal-resizer"
              role="separator"
              aria-label="Resize output panel"
              aria-orientation="horizontal"
              onMouseDown={handleTerminalResizeStart}
            />
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

            {activeBottomTab === "output" ? (
              <div className="terminal-input-wrap">
                <label htmlFor="run-stdin" className="terminal-input-label">Give your inputs in order before running code.</label>
                <textarea
                  id="run-stdin"
                  className="terminal-stdin-input"
                  value={runInput}
                  onChange={(event) => setRunInput(event.target.value)}
                  placeholder="Type input exactly in the order your program expects"
                  rows={2}
                />
              </div>
            ) : null}

            <div className="terminal-body">
              {activeBottomTab === "output" ? (
                terminalLines.length > 0 ? (
                  terminalLines.map((line, index) => (
                    <p key={`line-${index}`} className={`term-line ${line.type}`}>
                      {line.text}
                    </p>
                  ))
                ) : (
                  <p className="term-line muted">Click Run to execute your current file.</p>
                )
              ) : (
                <p className="term-line muted">Interactive terminal is not connected yet.</p>
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

      {fileActionModal.mode ? (
        <div className="editor-modal-overlay" onClick={closeFileActionModal} role="presentation">
          <section className="editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            {fileActionModal.mode === "rename" ? (
              <>
                <h3>Rename File</h3>
                <p>Choose a new file name for this room.</p>
                <input
                  type="text"
                  className="editor-modal-input"
                  value={fileActionModal.nextPath}
                  onChange={(event) =>
                    setFileActionModal((prev) => ({
                      ...prev,
                      nextPath: event.target.value,
                    }))
                  }
                  placeholder="e.g. main.py"
                  autoFocus
                />
                <div className="editor-modal-actions">
                  <button type="button" className="editor-btn ghost" onClick={closeFileActionModal}>
                    Cancel
                  </button>
                  <button type="button" className="editor-btn run" onClick={handleConfirmRenameFile} disabled={isSaving}>
                    {isSaving ? "Renaming..." : "Rename"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Delete File</h3>
                <p>Are you sure you want to delete {fileActionModal.filePath}?</p>
                <div className="editor-modal-actions">
                  <button type="button" className="editor-btn ghost" onClick={closeFileActionModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="editor-btn run editor-danger-btn"
                    onClick={handleConfirmDeleteFile}
                    disabled={isSaving}
                  >
                    {isSaving ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}

      {isExitConfirmOpen ? (
        <div className="editor-modal-overlay" onClick={closeExitConfirm} role="presentation">
          <section className="editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Unsaved changes</h3>
            <p>You are leaving this room without saving your latest changes.</p>
            <div className="editor-modal-actions">
              <button type="button" className="editor-btn ghost" onClick={closeExitConfirm}>
                Stay
              </button>
              <button type="button" className="editor-btn run editor-danger-btn" onClick={confirmExitWithoutSaving}>
                Leave Without Saving
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Editor;
