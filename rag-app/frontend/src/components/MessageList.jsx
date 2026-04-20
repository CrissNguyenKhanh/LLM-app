import React from "react";

function Bubble({ role, content, meta }) {
  return (
    <article className={`bubble bubble-${role}`}>
      <div className="bubble-role">{role === "user" ? "You" : "Assistant"}</div>
      <p>{content}</p>
      {meta ? <div className="bubble-meta">{meta}</div> : null}
    </article>
  );
}

export default function MessageList({ messages, loading }) {
  if (!messages.length) {
    return (
      <div className="empty-state">
        <p>Hoi bat ky cau gi (freestyle) — khong can upload.</p>
        <span>Neu ban upload tai lieu, cau tra loi se co them danh sach chunk “Sources”.</span>
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
        />
      ))}
      {loading ? (
        <article className="bubble bubble-assistant bubble-loading">
          <div className="bubble-role">Assistant</div>
          <p>Dang goi backend... (Ollama local lan dau co the mat 1–3 phut).</p>
        </article>
      ) : null}
    </div>
  );
}
