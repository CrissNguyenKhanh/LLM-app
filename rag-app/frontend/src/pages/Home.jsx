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
      const warningText = payload.backend_warnings?.length
        ? `Canh bao: ${payload.backend_warnings.join(" | ")}`
        : payload.success
          ? "Tra loi thanh cong."
          : "Khong ro trang thai.";

      setMessages((current) => [
        ...current,
        buildMessage("assistant", payload.answer || "Khong co cau tra loi.", warningText),
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
    <main className="layout-shell">
      <div className="hero-card">
        <div>
          <p className="eyebrow">RAG Chat Lab</p>
          <h1>Test upload va hoi dap ma khong can ngoi cho Postman quay mai</h1>
          <p className="hero-copy">
            Giao dien nay noi thang den backend Flask de ban xem health, upload
            tai lieu va chat voi cac chunk retrieve duoc.
          </p>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <span>API Base</span>
            <strong>{API_BASE_URL}</strong>
          </div>
          <div className="status-card">
            <span>LLM Backend</span>
            <strong>
              {health?.llm_backend_reachable ? "Reachable" : "Dang co van de"}
            </strong>
          </div>
          <div className="status-card">
            <span>Detail</span>
            <strong>{health?.llm_backend_detail || "Dang kiem tra..."}</strong>
          </div>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="main-grid">
        <div className="left-column">
          <UploadPanel
            selectedFile={selectedFile}
            onFileChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            onUpload={handleUpload}
            uploading={uploading}
            uploadResult={uploadResult}
          />

          <section className="panel chat-panel">
            <div className="panel-header">
              <p className="eyebrow">Conversation</p>
              <h2>Hoi dap voi tai lieu</h2>
            </div>
            <MessageList messages={messages} loading={loading} />
            <ChatBox
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={handleChat}
              loading={loading}
            />
          </section>
        </div>

        <SourceList sources={sources} />
      </section>
    </main>
  );
}
