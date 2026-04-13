import { useMemo, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
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
  SendHorizontal,
  Settings,
} from "lucide-react";

const openTabs = ["main.py", "utils.py"];

const initialCode = `import os
import datetime  # standard lib

def sync_repository(repo_path: str):
  print(f"Initializing SynCode at {repo_path}...")
  timestamp = datetime.datetime.now()
  try:
    files = os.listdir(repo_path)
    for file_name in files:
      if file_name.endswith('.py'):
        process_file(file_name)
  except Exception as error:
    print(f"Error: {error}")

# Main execution entry
if __name__ == '__main__':
  path = './src'
  sync_repository(path)
  print('Process completed successfully.')

# TODO: add git hooks integration
def validate_config():
  return 'valid'
`;

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
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState("output");
  const [roomName, setRoomName] = useState("My Python Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeFile, setActiveFile] = useState(openTabs[0]);
  const [editorCode, setEditorCode] = useState(initialCode);
  const [terminalLines, setTerminalLines] = useState(outputLinesSeed);

  const activeCollab = useMemo(() => collaborators.filter((user) => user.online).length, []);

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
            Python <ChevronDown size={13} />
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
          <button type="button" className="editor-icon-btn" aria-label="Settings">
            <Settings size={16} />
          </button>
          <button type="button" className="editor-icon-btn" aria-label="Logout">
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
              <button type="button" className="file-row file-row-active">
                <FileText size={14} />
                <span>main.py</span>
              </button>
              <button type="button" className="file-row nested">
                <FileText size={14} />
                <span>utils.py</span>
              </button>
              <button type="button" className="file-row">
                <FileText size={14} />
                <span>requirements.txt</span>
              </button>
              <button type="button" className="file-row">
                <FileText size={14} />
                <span>README.md</span>
              </button>
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
            {openTabs.map((tab) => (
              <button
                type="button"
                key={tab}
                className={`editor-tab${activeFile === tab ? " active" : ""}`}
                onClick={() => setActiveFile(tab)}
              >
                {tab}
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
                language="python"
                theme="vs-dark"
                value={editorCode}
                onChange={(nextValue) => setEditorCode(nextValue || "")}
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
