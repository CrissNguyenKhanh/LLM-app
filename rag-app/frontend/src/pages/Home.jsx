import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  fetchCurrentUser,
  fetchDocuments,
  fetchHealth,
  deleteDocument,
  loginUser,
  logoutUser,
  registerUser,
  sendChat,
  setActiveDocument as apiSetActiveDocument,
  uploadDocument,
} from "../api/chatApi";
import ActionSimulator from "../components/ActionSimulator";
import AuthScreen from "../components/AuthScreen";
import ChatBox from "../components/ChatBox";
import DocumentLibrary from "../components/DocumentLibrary";
import MessageList from "../components/MessageList";
import SourceList from "../components/SourceList";
import UploadPanel from "../components/UploadPanel";

function buildMessage(role, content, meta) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    meta,
  };
}

function buildAssistantMeta(payload) {
  const modelText = payload.llm_model ? `Model: ${payload.llm_model}` : null;
  const activeDocText = payload.active_document ? `Tai lieu active: ${payload.active_document}` : null;
  const warningsText = payload.backend_warnings?.length
    ? `Canh bao: ${payload.backend_warnings.join(" | ")}`
    : null;

  return [modelText, activeDocText, warningsText].filter(Boolean).join(" | ");
}

function createConversation() {
  return {
    id: `conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function pickActionKey(normalizedText) {
  if (/\b(chay|run|sprint)\b/.test(normalizedText)) return "run";
  if (/\b(di|buoc|walk)\b/.test(normalizedText)) return "walk";
  if (/\b(nhay|jump|bat)\b/.test(normalizedText)) return "jump";
  if (/\b(chao|vay tay|wave)\b/.test(normalizedText)) return "wave";
  if (/\b(xoay|quay|spin|turn)\b/.test(normalizedText)) return "spin";
  if (/\b(ngoi|sit)\b/.test(normalizedText)) return "sit";
  if (/\b(dam|punch)\b/.test(normalizedText)) return "punch";
  if (/\b(da|kick)\b/.test(normalizedText)) return "kick";
  if (/\b(nang tay|gio tay|raise)\b/.test(normalizedText)) return "raise";
  return "idle";
}

function extractSimulationRequest(text) {
  const originalText = String(text || "").trim();
  const normalized = normalizeText(originalText);
  const wantsSimulation =
    normalized.includes("mo phong") && /hanh\s+dong/.test(normalized);

  if (!wantsSimulation) {
    return null;
  }

  const actionMatch = normalized.match(/hanh\s+dong\s+(.+)$/);
  const actionText = actionMatch?.[1]?.trim() || originalText;

  return {
    id: `simulation-${Date.now()}`,
    originalText,
    actionText,
    actionKey: pickActionKey(normalized),
  };
}

export default function Home() {
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [activeDocument, setActiveDocument] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [documentMode, setDocumentMode] = useState("active");
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [composerImages, setComposerImages] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const booting = authLoading || !health;

  useEffect(() => {
    let mounted = true;

    fetchCurrentUser()
      .then((payload) => {
        if (mounted) {
          setUser(payload.user || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setAuthLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchHealth()
      .then((payload) => {
        if (mounted) {
          setHealth(payload);
        }
      })
      .catch((err) => {
        if (mounted) {
          setHealth({
            success: false,
            llm_backend_reachable: false,
            llm_backend_detail: err.message,
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.username) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    const storageKey = `rag-chat-history:${user.username}`;
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const safeParsed = Array.isArray(parsed) ? parsed : [];

    if (safeParsed.length > 0) {
      setConversations(safeParsed);
      setActiveConversationId(safeParsed[0].id);
      setMessages(safeParsed[0].messages || []);
      return;
    }

    const starter = createConversation();
    setConversations([starter]);
    setActiveConversationId(starter.id);
    setMessages([]);
    window.localStorage.setItem(storageKey, JSON.stringify([starter]));
  }, [user]);

  useEffect(() => {
    if (!user?.username) {
      return;
    }

    window.localStorage.setItem(
      `rag-chat-history:${user.username}`,
      JSON.stringify(conversations)
    );
  }, [conversations, user]);

  useEffect(() => {
    if (!user?.username) {
      setDocuments([]);
      setSelectedDocuments([]);
      setActiveDocument("");
      return;
    }

    let mounted = true;
    setDocumentsLoading(true);
    setDocumentsError("");
    fetchDocuments()
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setDocuments(payload.documents || []);
        setActiveDocument(payload.active_document || "");
      })
      .catch((err) => {
        if (mounted) {
          setDocumentsError(err.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setDocumentsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  function syncConversation(nextMessages, nextSources = []) {
    setMessages(nextMessages);
    setSources(nextSources);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: nextMessages,
              title: nextMessages[0]?.content?.slice(0, 36) || "New chat",
              updatedAt: Date.now(),
            }
          : conversation
      )
    );
  }

  function handleNewChat() {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setMessages([]);
    setSources([]);
    setQuestion("");
    setError("");
    setSimulation(null);
  }

  function handleSelectConversation(conversation) {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages || []);
    setSources([]);
    setQuestion("");
    setError("");
  }

  async function handleAuthSubmit(form) {
    setAuthError("");
    setAuthLoading(true);

    try {
      const payload =
        authMode === "login" ? await loginUser(form) : await registerUser(form);
      setUser(payload.user || null);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setAuthError("");
      setQuestion("");
      setMessages([]);
      setSources([]);
      setConversations([]);
      setActiveConversationId(null);
      setUploadResult(null);
      setSelectedFile(null);
      setActiveDocument("");
      setDocuments([]);
      setDocumentsError("");
      setDocumentsLoading(false);
      setDocumentMode("active");
      setSelectedDocuments([]);
      setComposerImages([]);
      setError("");
      setSimulation(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile || uploading) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      const payload = await uploadDocument(selectedFile);
      setUploadResult(payload);
      setActiveDocument(payload.active_document || payload.filename || "");
      setDocumentsLoading(true);
      const docsPayload = await fetchDocuments();
      setDocuments(docsPayload.documents || []);
      setActiveDocument(docsPayload.active_document || payload.active_document || payload.filename || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setDocumentsLoading(false);
    }
  }

  function toggleSelectDocument(filename) {
    if (!filename) {
      return;
    }
    setSelectedDocuments((current) =>
      current.includes(filename)
        ? current.filter((name) => name !== filename)
        : [...current, filename]
    );
  }

  async function handleActivateDocument(filename) {
    setDocumentsError("");
    setDocumentsLoading(true);
    try {
      const payload = await apiSetActiveDocument(filename);
      setActiveDocument(payload.active_document || "");
    } catch (err) {
      setDocumentsError(err.message);
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handleDeleteDocument(filename) {
    if (!filename) {
      return;
    }
    const ok = window.confirm(`Xoa tai lieu '${filename}'? (se xoa file va index)`);
    if (!ok) {
      return;
    }

    setDocumentsError("");
    setDocumentsLoading(true);
    try {
      await deleteDocument(filename);
      const payload = await fetchDocuments();
      setDocuments(payload.documents || []);
      setActiveDocument(payload.active_document || "");
      setSelectedDocuments((current) => current.filter((name) => name !== filename));
    } catch (err) {
      setDocumentsError(err.message);
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handleChat(event) {
    event.preventDefault();

    const trimmed = question.trim();
    const hasImages = composerImages.some((img) => img?.dataUrl);
    if ((!trimmed && !hasImages) || loading || !activeConversationId) {
      return;
    }

    setError("");
    setLoading(true);
    setQuestion("");

    const nextSimulation = extractSimulationRequest(trimmed);
    if (nextSimulation) {
      setSimulation(nextSimulation);
    }

    const nextUserMessage = {
      ...buildMessage("user", trimmed || (hasImages ? "[Da gui anh]" : "")),
      images: composerImages.filter((img) => img?.dataUrl),
    };
    const optimisticMessages = [...messages, nextUserMessage];
    syncConversation(optimisticMessages);
    setComposerImages([]);

    try {
      const payload = await sendChat(trimmed, {
        documentMode,
        selectedDocuments,
        images: nextUserMessage.images,
        messageHistory: optimisticMessages,
      });
      const nextMessages = [
        ...optimisticMessages,
        buildMessage(
          "assistant",
          payload.answer || "Khong co cau tra loi.",
          buildAssistantMeta(payload)
        ),
      ];
      syncConversation(nextMessages, payload.sources || []);
      setActiveDocument(payload.active_document || activeDocument);
    } catch (err) {
      if (err.message?.includes("Vui long dang nhap") || err.message?.includes("(401)")) {
        setUser(null);
      }
      syncConversation([
        ...optimisticMessages,
        buildMessage("assistant", "Backend loi khi xu ly cau hoi.", err.message),
      ]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (booting && !user) {
    return <div className="splash-screen">Dang tai workspace...</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
        error={authError}
      />
    );
  }

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) || null;

  return (
    <div className="chatgpt-shell">
      <aside className="chatgpt-sidebar">
        <div className="sidebar-top">
          <button className="sidebar-new-chat" type="button" onClick={handleNewChat}>
            + New chat
          </button>
          <div className="sidebar-brand">
            <strong>RAG Chat</strong>
            <span>Clone 11 style</span>
          </div>
        </div>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={
                conversation.id === activeConversationId
                  ? "conversation-item active"
                  : "conversation-item"
              }
              onClick={() => handleSelectConversation(conversation)}
            >
              {conversation.title}
            </button>
          ))}
        </div>

        <div className="sidebar-panels">
          <DocumentLibrary
            documents={documents}
            activeDocument={activeDocument}
            documentMode={documentMode}
            onDocumentModeChange={setDocumentMode}
            selectedDocuments={selectedDocuments}
            onToggleSelect={toggleSelectDocument}
            onActivate={handleActivateDocument}
            onDelete={handleDeleteDocument}
            loading={documentsLoading}
            error={documentsError}
          />
          <UploadPanel
            selectedFile={selectedFile}
            onFileChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            onUpload={handleUpload}
            uploading={uploading}
            uploadResult={uploadResult}
            activeDocument={activeDocument}
          />
          <SourceList sources={sources} />
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{user.display_name || user.username}</strong>
            <span>@{user.username}</span>
          </div>
          <div className="sidebar-status">
            <span>API: {API_BASE_URL}</span>
            <span>LLM: {health?.llm_backend_reachable ? "Online" : "Offline"}</span>
          </div>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Dang xuat
          </button>
        </div>
      </aside>

      <main className="chatgpt-main">
        <header className="chatgpt-header">
          <div>
            <h1>{activeConversation?.title || "New chat"}</h1>
            <p>{health?.llm_backend_detail || "Dang kiem tra ket noi backend..."}</p>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="chat-main-inner">
          <ActionSimulator
            simulation={simulation}
            onClose={() => setSimulation(null)}
          />
          <MessageList
            messages={messages}
            loading={loading}
            activeConversationTitle={activeConversation?.title}
          />
        </div>

        <div className="chat-composer">
          <ChatBox
            question={question}
            onQuestionChange={setQuestion}
            onSubmit={handleChat}
            loading={loading}
            disabled={!activeConversationId}
            images={composerImages}
            onImagesChange={setComposerImages}
          />
        </div>
      </main>
    </div>
  );
}
