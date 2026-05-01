import React, { useRef, useEffect, useState } from "react";

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      type="button"
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
      title="Copy"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Bubble({ role, content, meta, images }) {
  const isAssistant = role === "assistant";
  return (
    <article className={`message-row message-row-${role}`}>
      {isAssistant && (
        <div className="avatar avatar-assistant">✦</div>
      )}
      <div className={`bubble bubble-${role}`}>
        <div className="bubble-role">{role === "user" ? "You" : "Assistant"}</div>
        {images?.length ? (
          <div className="bubble-images">
            {images.filter((img) => img?.dataUrl).map((img) => (
              <img key={img.id || img.dataUrl} className="bubble-image" src={img.dataUrl} alt={img.name || "image"} loading="lazy" />
            ))}
          </div>
        ) : null}
        {isAssistant ? (
          <div
            className="bubble-content md-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <div className="bubble-content">{content}</div>
        )}
        <div className="bubble-footer">
          {meta ? <div className="bubble-meta">{meta}</div> : <span />}
          {isAssistant && content ? <CopyButton text={content} /> : null}
        </div>
      </div>
      {!isAssistant && (
        <div className="avatar avatar-user">U</div>
      )}
    </article>
  );
}

export default function MessageList({ messages, loading, activeConversationTitle }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!messages.length) {
    return (
      <div className="empty-chatgpt">
        <div className="empty-chatgpt-mark">✦</div>
        <h2>{activeConversationTitle && activeConversationTitle !== "New chat" ? activeConversationTitle : "Tôi có thể giúp gì cho bạn?"}</h2>
        <p>Chat tự do ngay lập tức. Upload tài liệu để kích hoạt RAG và nhận câu trả lời có nguồn trích dẫn.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <Bubble
          key={message.id}
          role={message.role}
          content={message.content}
          meta={message.meta}
          images={message.images}
        />
      ))}
      {loading ? (
        <article className="message-row message-row-assistant">
          <div className="avatar avatar-assistant">✦</div>
          <div className="bubble bubble-assistant bubble-loading">
            <div className="bubble-role">Assistant</div>
            <div className="bubble-content">Đang xử lý...</div>
          </div>
        </article>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
