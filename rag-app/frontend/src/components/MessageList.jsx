import React from "react";

function Bubble({ role, content, meta, images }) {
  return (
    <article className={`message-row message-row-${role}`}>
      <div className={`avatar avatar-${role}`}>{role === "user" ? "U" : "AI"}</div>
      <div className={`bubble bubble-${role}`}>
        <div className="bubble-role">{role === "user" ? "You" : "Assistant"}</div>
        {images?.length ? (
          <div className="bubble-images">
            {images
              .filter((img) => img?.dataUrl)
              .map((img) => (
                <img
                  key={img.id || img.dataUrl}
                  className="bubble-image"
                  src={img.dataUrl}
                  alt={img.name || "image"}
                  loading="lazy"
                />
              ))}
          </div>
        ) : null}
        <p>{content}</p>
        {meta ? <div className="bubble-meta">{meta}</div> : null}
      </div>
    </article>
  );
}

export default function MessageList({ messages, loading, activeConversationTitle }) {
  if (!messages.length) {
    return (
      <div className="empty-chatgpt">
        <div className="empty-chatgpt-mark">AI</div>
        <h2>{activeConversationTitle || "How can I help you today?"}</h2>
        <p>
          Chat freestyle ngay lap tuc. Neu upload them tai lieu, cau tra loi se co
          danh sach source va chunk lien quan.
        </p>
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
          <div className="avatar avatar-assistant">AI</div>
          <div className="bubble bubble-assistant bubble-loading">
            <div className="bubble-role">Assistant</div>
            <p>Dang goi backend va tong hop cau tra loi...</p>
          </div>
        </article>
      ) : null}
    </div>
  );
}
