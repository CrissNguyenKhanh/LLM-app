import React from "react";

function Bubble({ role, content, meta }) {
  return (
    <article className={`bubble bubble-${role}`}>
      <div className="bubble-role">{role === "user" ? "Ban" : "RAG Bot"}</div>
      <p>{content}</p>
      {meta ? <div className="bubble-meta">{meta}</div> : null}
    </article>
  );
}

export default function MessageList({ messages, loading }) {
  if (!messages.length) {
    return (
      <div className="empty-state">
        <p>Nhap cau hoi o ben duoi de test retrieval va chat.</p>
        <span>
          Goi y: hoi truc tiep theo noi dung file vua upload de xem source co len
          dung khong.
        </span>
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
          <div className="bubble-role">RAG Bot</div>
          <p>Dang goi backend... neu Ollama local chay cham thi co the mat vai chuc giay.</p>
        </article>
      ) : null}
    </div>
  );
}
