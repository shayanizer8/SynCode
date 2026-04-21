import { useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import {
  executeCodeRequest,
  getRoomContentRequest,
  getRoomMembersRequest,
  getRoomMessagesRequest,
  getRoomMetadataRequest,
  sendRoomMessageRequest,
  updateRoomContentRequest,
} from "../services/roomsApi";
import { getCurrentUserRequest } from "../services/authApi";
import { clearAuthToken, getAuthToken } from "../services/tokenStorage";
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

const tonePalette = ["tone-a", "tone-b", "tone-c", "tone-d"];

const getToneFromName = (name) => {
  const safeName = typeof name === "string" ? name : "User";
  const sum = safeName.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  return tonePalette[sum % tonePalette.length];
};

const formatChatTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Editor = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState("output");
  const [roomName, setRoomName] = useState("My Python Project");
  const [roomInviteCode, setRoomInviteCode] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCopyFeedback, setInviteCopyFeedback] = useState("");
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
  const [currentUser, setCurrentUser] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const centerPanelRef = useRef(null);
  const chatBottomRef = useRef(null);
  const socketRef = useRef(null);

  const activeCollab = useMemo(() => onlineUserIds.length, [onlineUserIds]);
  const collaboratorsWithPresence = useMemo(
    () =>
      collaborators.map((member) => {
        const isOnline = onlineUserIds.includes(member.userId);

        return {
          ...member,
          online: isOnline,
          status: `${member.roleLabel}${isOnline ? " • online" : " • offline"}`,
        };
      }),
    [collaborators, onlineUserIds]
  );
  const hasUnsavedChanges = useMemo(() => !areFileSetsEqual(files, savedFiles), [files, savedFiles]);

  useEffect(() => {
    const fetchRoomData = async () => {
      const token = getAuthToken();

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
        setRoomInviteCode(room.inviteCode || "");

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
          clearAuthToken();
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
    const token = getAuthToken();

    if (!token) {
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await getCurrentUserRequest(token);
        setCurrentUser(response.data?.user || null);
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
    const token = getAuthToken();

    if (!token || !roomId || isAccessDenied) {
      return undefined;
    }

    let isCancelled = false;

    const fetchRoomChatData = async () => {
      try {
        const [membersResponse, messagesResponse] = await Promise.all([
          getRoomMembersRequest(token, roomId),
          getRoomMessagesRequest(token, roomId),
        ]);

        if (isCancelled) {
          return;
        }

        const members = Array.isArray(membersResponse.data?.members)
          ? membersResponse.data.members.map((member) => ({
              userId: member.userId,
              name: member.name || "Unknown",
              roleLabel: member.role ? `Role: ${member.role}` : "Member",
              tone: getToneFromName(member.name),
            }))
          : [];

        const messages = Array.isArray(messagesResponse.data?.messages)
          ? messagesResponse.data.messages.map((message) => ({
              id: message.id,
              userId: message.userId,
              from: message.senderName || "Unknown",
              at: formatChatTime(message.createdAt),
              text: message.text || "",
              tone: getToneFromName(message.senderName),
              deliveryStatus: "",
            }))
          : [];

        setCollaborators(members);
        setChatMessages((prev) => {
          const previousStatusById = new Map(prev.map((item) => [item.id, item.deliveryStatus]));

          return messages.map((message) => {
            const isMine = String(currentUser?.id || "") === String(message.userId || "");

            if (!isMine) {
              return message;
            }

            const previousStatus = previousStatusById.get(message.id);

            return {
              ...message,
              deliveryStatus: previousStatus === "delivered" ? "delivered" : "sent",
            };
          });
        });
        setChatError("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const status = error.response?.status;

        if (status === 401) {
          clearAuthToken();
          navigate("/login", { replace: true });
          return;
        }

        if (status === 403) {
          setIsAccessDenied(true);
          return;
        }

        const message = error.response?.data?.message || "Could not load room chat.";
        setChatError(message);
      }
    };

    fetchRoomChatData();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, isAccessDenied, navigate, roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const hasOnlineRecipients = onlineUserIds.some((userId) => String(userId) !== String(currentUser?.id));

    if (!hasOnlineRecipients || !currentUser?.id) {
      return;
    }

    setChatMessages((prev) => {
      let changed = false;

      const next = prev.map((message) => {
        if (String(message.userId) !== String(currentUser.id) || message.deliveryStatus === "delivered") {
          return message;
        }

        changed = true;
        return {
          ...message,
          deliveryStatus: "delivered",
        };
      });

      return changed ? next : prev;
    });
  }, [onlineUserIds, currentUser?.id]);

  useEffect(() => {
    const token = getAuthToken();

    if (!token || !roomId || isAccessDenied) {
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      auth: {
        token,
      },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId }, (ack) => {
        if (!ack?.ok) {
          setChatError(ack?.message || "Could not join realtime room.");
        }
      });
    });

    socket.on("room:presence", (payload) => {
      if (payload?.roomId !== roomId) {
        return;
      }

      setOnlineUserIds(Array.isArray(payload.userIds) ? payload.userIds : []);
    });

    socket.on("chat:new", (message) => {
      if (message?.roomId !== roomId) {
        return;
      }

      const normalizedMessage = {
        id: message.id,
        userId: message.userId,
        from: message.senderName || "Unknown",
        at: formatChatTime(message.createdAt),
        text: message.text || "",
        tone: getToneFromName(message.senderName),
        deliveryStatus: "sent",
      };

      setChatMessages((prev) => {
        if (prev.some((item) => item.id === normalizedMessage.id)) {
          return prev;
        }

        return [...prev, normalizedMessage];
      });
    });

    socket.on("connect_error", () => {
      setChatError("Realtime connection failed. Falling back to API chat.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setOnlineUserIds([]);
    };
  }, [isAccessDenied, roomId]);

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
    const token = getAuthToken();

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
        clearAuthToken();
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
    const token = getAuthToken();

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

  const handleSendChatMessage = async (event) => {
    event.preventDefault();

    const token = getAuthToken();
    const text = chatInput.trim();

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (!text) {
      return;
    }

    const hasOnlineRecipients = onlineUserIds.some((userId) => String(userId) !== String(currentUser?.id));

    try {
      setIsSendingChatMessage(true);
      setChatError("");
      const socket = socketRef.current;

      if (socket && socket.connected) {
        const ack = await new Promise((resolve) => {
          socket.emit("chat:send", { roomId, text }, resolve);
        });

        if (!ack?.ok) {
          throw new Error(ack?.message || "Unable to send message right now.");
        }

        const sentMessage = ack.message;

        if (sentMessage?.id) {
          setChatMessages((prev) => {
            const nextMessage = {
              id: sentMessage.id,
              userId: sentMessage.userId,
              from: sentMessage.senderName || currentUser?.name || "You",
              at: formatChatTime(sentMessage.createdAt),
              text: sentMessage.text || "",
              tone: getToneFromName(sentMessage.senderName || currentUser?.name),
              deliveryStatus: ack.deliveryStatus || (hasOnlineRecipients ? "delivered" : "sent"),
            };

            const existingIndex = prev.findIndex((item) => item.id === nextMessage.id);

            if (existingIndex >= 0) {
              const copy = [...prev];
              copy[existingIndex] = {
                ...copy[existingIndex],
                deliveryStatus: nextMessage.deliveryStatus,
              };
              return copy;
            }

            return [...prev, nextMessage];
          });
        }

        setChatInput("");
      } else {
        const response = await sendRoomMessageRequest(token, roomId, { text });
        const createdMessage = response.data?.message;

        if (createdMessage) {
          setChatMessages((prev) => {
            if (prev.some((item) => item.id === createdMessage.id)) {
              return prev;
            }

            return [
              ...prev,
              {
                id: createdMessage.id,
                userId: createdMessage.userId,
                from: createdMessage.senderName || currentUser?.name || "You",
                at: formatChatTime(createdMessage.createdAt),
                text: createdMessage.text || "",
                tone: getToneFromName(createdMessage.senderName || currentUser?.name),
                deliveryStatus: "sent",
              },
            ];
          });
        }

        setChatInput("");
      }
    } catch (error) {
      if (error.message) {
        setChatError(error.message);
        return;
      }

      const status = error.response?.status;

      if (status === 401) {
        clearAuthToken();
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setIsAccessDenied(true);
        return;
      }

      const message = error.response?.data?.message || "Unable to send message right now.";
      setChatError(message);
    } finally {
      setIsSendingChatMessage(false);
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

  const openInviteModal = () => {
    setInviteCopyFeedback("");
    setIsInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteCopyFeedback("");
  };

  const copyInviteText = async (value, type) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setInviteCopyFeedback("Invite code copied");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setInviteCopyFeedback("Invite code copied");
    }
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

          <button type="button" className="editor-btn ghost" onClick={openInviteModal}>Invite</button>
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
              {collaboratorsWithPresence.length > 0 ? collaboratorsWithPresence.map((user) => (
                <div key={user.userId} className="collab-row">
                  <span className={`top-avatar ${user.tone}`}>
                    {(user.name || "U")[0]}
                    {user.online ? <i className="mini-online-dot" aria-hidden="true" /> : null}
                  </span>
                  <div>
                    <p>{user.name}</p>
                    <small>{user.status}</small>
                  </div>
                </div>
              )) : <p className="chat-empty">No collaborators in this room yet.</p>}
            </div>

            <div className="chat-divider" />

            <div className="chat-header">Chat</div>

            <div className="chat-messages">
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => {
                  const isMine = currentUser?.id === message.userId;

                  return (
                    <article key={message.id} className={`chat-msg${isMine ? " mine" : ""}`}>
                      <div className="chat-meta">
                        <span className="chat-user">{message.from}</span>
                      </div>
                      <p>{message.text}</p>
                      <div className={`chat-msg-footer${isMine ? " mine" : ""}`}>
                        <time>{message.at}</time>
                        {isMine ? (
                          <span className={`chat-delivery ${message.deliveryStatus === "delivered" ? "delivered" : "sent"}`}>
                            {message.deliveryStatus === "delivered" ? "✓✓" : "✓"}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="chat-empty">No messages yet. Start the conversation.</p>
              )}
              <div ref={chatBottomRef} />
            </div>

            {chatError ? <p className="chat-error">{chatError}</p> : null}

            <form className="chat-input-row" onSubmit={handleSendChatMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                maxLength={2000}
              />
              <button type="submit" aria-label="Send message" disabled={isSendingChatMessage || !chatInput.trim()}>
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

      {isInviteModalOpen ? (
        <div className="editor-modal-overlay" onClick={closeInviteModal} role="presentation">
          <section className="editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Invite to {roomName}</h3>
            <p>Share this code with collaborators so they can join this room.</p>

            <div className="invite-row">
              <label htmlFor="invite-code">Invite Code</label>
              <div className="invite-field-wrap">
                <input id="invite-code" type="text" className="editor-modal-input" value={roomInviteCode} readOnly />
                <button type="button" className="editor-btn ghost invite-copy-btn" onClick={() => copyInviteText(roomInviteCode, "code")}>Copy Code</button>
              </div>
            </div>

            {inviteCopyFeedback ? <p className="invite-feedback">{inviteCopyFeedback}</p> : null}

            <div className="editor-modal-actions">
              <button type="button" className="editor-btn ghost" onClick={closeInviteModal}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Editor;
