import React from "react";

export default function ChatBox({
  question,
  onQuestionChange,
  onSubmit,
  loading,
  disabled,
}) {
  return (
    <form className="chat-box" onSubmit={onSubmit}>
      <textarea
        value={question}
        disabled={disabled}
        onChange={(event) => onQuestionChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit(event);
          }
        }}
        placeholder="Nhan Enter de gui tin nhan..."
        rows={1}
      />
      <div className="chat-actions">
        <span className="composer-hint">RAG se them source neu co tai lieu active.</span>
        <button
          className="primary-button"
          type="submit"
          disabled={disabled || loading || !question.trim()}
        >
          {loading ? "Dang gui..." : "Gui"}
        </button>
      </div>
    </form>
  );
}
