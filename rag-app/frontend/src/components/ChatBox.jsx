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
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit(event);
          }
        }}
        placeholder="Nhan Enter de gui, Shift+Enter de xuong dong..."
        rows={1}
      />
      <div className="chat-actions">
        <span className="composer-hint">
          Freestyle luon hoat dong. Neu upload tai lieu, backend tu dong tra ve sources.
        </span>
        <button className="primary-button" type="submit" disabled={loading || !question.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
