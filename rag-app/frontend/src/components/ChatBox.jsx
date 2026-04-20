import React from "react";

export default function ChatBox({
  question,
  onQuestionChange,
  onSubmit,
  loading,
  disabled,
  images,
  onImagesChange,
}) {
  async function handlePaste(event) {
    if (!event.clipboardData?.items?.length) {
      return;
    }

    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter((item) => item.kind === "file" && item.type?.startsWith("image/"));
    if (!imageItems.length) {
      return;
    }

    event.preventDefault();

    const next = [...(images || [])];
    const MAX_IMAGES = 3;
    const MAX_BYTES = 2 * 1024 * 1024;

    for (const item of imageItems) {
      if (next.length >= MAX_IMAGES) {
        break;
      }
      const file = item.getAsFile?.();
      if (!file) {
        continue;
      }
      if (file.size > MAX_BYTES) {
        next.push({
          id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          error: `Anh qua lon (${Math.round(file.size / 1024)} KB). Gioi han 2048 KB.`,
        });
        continue;
      }

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Doc anh that bai"));
        reader.readAsDataURL(file);
      }).catch(() => "");

      if (!dataUrl) {
        next.push({
          id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          error: "Khong doc duoc anh tu clipboard.",
        });
        continue;
      }

      next.push({
        id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name || "pasted-image",
        mime: file.type,
        size: file.size,
        dataUrl,
      });
    }

    onImagesChange?.(next);
  }

  return (
    <form className="chat-box" onSubmit={onSubmit}>
      <textarea
        value={question}
        disabled={disabled}
        onChange={(event) => onQuestionChange(event.target.value)}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit(event);
          }
        }}
        placeholder="Nhan Enter de gui tin nhan..."
        rows={1}
      />
      {images?.length ? (
        <div className="composer-attachments">
          {images.map((img) => (
            <div className="attachment-chip" key={img.id}>
              {img.dataUrl ? (
                <img className="attachment-thumb" src={img.dataUrl} alt={img.name || "attachment"} />
              ) : (
                <div className="attachment-error">{img.error || "Anh khong hop le"}</div>
              )}
              <button
                type="button"
                className="attachment-remove"
                onClick={() => onImagesChange?.(images.filter((item) => item.id !== img.id))}
                aria-label="Remove image"
                title="Xoa anh"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="chat-actions">
        <span className="composer-hint">
          Paste anh bang Ctrl+V. RAG se them source neu co tai lieu active.
        </span>
        <button
          className="primary-button"
          type="submit"
          disabled={disabled || loading || (!question.trim() && !images?.some((img) => img.dataUrl))}
        >
          {loading ? "Dang gui..." : "Gui"}
        </button>
      </div>
    </form>
  );
}
