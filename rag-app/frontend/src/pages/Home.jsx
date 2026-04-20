import React, { useEffect, useState } from "react";
import ChatBox from "../components/ChatBox";
import MessageList from "../components/MessageList";
import SourceList from "../components/SourceList";
import UploadPanel from "../components/UploadPanel";
import { API_BASE_URL, fetchHealth, sendChat, uploadDocument } from "../api/chatApi";

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

  if (payload.answer_status === "freestyle") {
    return [modelText, "Freestyle mode (khong dung RAG).", warningsText].filter(Boolean).join(" | ");
  }

  if (payload.answer_status === "freestyle_error") {
    return [modelText, "Khong goi duoc LLM, vui long kiem tra backend.", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "refused") {
    return [modelText, "Ollama da tu choi cau tra loi nay.", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "fallback") {
    return [modelText, "Khong lay duoc cau tra loi tu Ollama, dang hien snippet fallback.", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "needs_clarification") {
    return [modelText, "Can ban dat cau hoi ro hon."]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "no_match") {
    return [modelText, activeDocText, "Khong tim thay chunk du lien quan trong tai lieu.", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "extractive_summary") {
    return [modelText, activeDocText, "Tra loi duoc trich xuat truc tiep tu tai lieu (summary mode).", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "extractive_reason") {
    return [modelText, activeDocText, "Tra loi duoc trich xuat truc tiep tu tai lieu (reason mode).", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "refused_fallback") {
    return [modelText, activeDocText, "Model tu choi, backend da fallback sang cau tra loi trich xuat tu tai lieu.", warningsText]
      .filter(Boolean)
      .join(" | ");
  }

  if (payload.answer_status === "no_active_document") {
    return [modelText, "Chua co tai lieu active de truy van."]
      .filter(Boolean)
      .join(" | ");
  }

  return [modelText, activeDocText, warningsText || "Phan hoi tu Ollama da duoc hien thi ben tren."]
    .filter(Boolean)
    .join(" | ");
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);

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

  async function handleUpload() {
    if (!selectedFile || uploading) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      const payload = await uploadDocument(selectedFile);
      setUploadResult(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleChat(event) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }

    setError("");
    setLoading(true);
    setMessages((current) => [...current, buildMessage("user", trimmed)]);
    setQuestion("");

    try {
      const payload = await sendChat(trimmed);

      setMessages((current) => [
        ...current,
        buildMessage(
          "assistant",
          payload.answer || "Khong co cau tra loi.",
          buildAssistantMeta(payload)
        ),
      ]);
      setSources(payload.sources || []);
    } catch (err) {
      setMessages((current) => [
        ...current,
        buildMessage("assistant", "Backend loi khi xu ly cau hoi.", err.message),
      ]);
      setSources([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">RAG Chat</div>
          <div className="topbar-meta">
            <span className="pill">API: {API_BASE_URL}</span>
            <span className={`pill ${health?.llm_backend_reachable ? "pill-ok" : "pill-warn"}`}>
              LLM: {health?.llm_backend_reachable ? "Reachable" : "Unreachable"}
            </span>
            <span className="pill pill-muted">{health?.llm_backend_detail || "Checking..."}</span>
          </div>
        </div>
        <div className="topbar-right">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setSideOpen((v) => !v)}
          >
            {sideOpen ? "Hide panels" : "Show panels"}
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className={`chat-layout ${sideOpen ? "chat-layout-split" : "chat-layout-full"}`}>
        {sideOpen ? (
          <aside className="side-panel">
            <UploadPanel
              selectedFile={selectedFile}
              onFileChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              onUpload={handleUpload}
              uploading={uploading}
              uploadResult={uploadResult}
            />
            <SourceList sources={sources} />
          </aside>
        ) : null}

        <main className="chat-main">
          <div className="chat-main-inner">
            <MessageList messages={messages} loading={loading} />
          </div>
          <div className="chat-composer">
            <ChatBox
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={handleChat}
              loading={loading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
