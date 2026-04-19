import React from "react";

export default function ChatBox({
  question,
  onQuestionChange,
  onSubmit,
  loading,
}) {
  return (
    <form className="chat-box" onSubmit={onSubmit}>
      <textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="Vi du: Do la ki thi gi? Tai lieu nay noi ve chu de nao?"
        rows={4}
      />
      <div className="chat-actions">
        <span>Backend: `POST /api/chat`</span>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Dang hoi..." : "Gui cau hoi"}
        </button>
      </div>
    </form>
  );
}
