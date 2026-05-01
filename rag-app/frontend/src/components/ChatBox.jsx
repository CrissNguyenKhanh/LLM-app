import React, { useRef, useEffect } from "react";

export default function ChatBox({
  question,
  onQuestionChange,
  onSubmit,
  loading,
  disabled,
  images,
  onImagesChange,
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [question]);

  async function handlePaste(event) {
    if (!event.clipboardData?.items?.length) return;
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter((item) => item.kind === "file" && item.type?.startsWith("image/"));
    if (!imageItems.length) return;
    event.preventDefault();
    const next = [...(images || [])];
    const MAX_IMAGES = 3;
    const MAX_BYTES = 2 * 1024 * 1024;
    for (const item of imageItems) {
      if (next.length >= MAX_IMAGES) break;
      const file = item.getAsFile?.();
      if (!file) continue;
      if (file.size > MAX_BYTES) {
        next.push({ id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`, error: `Ảnh quá lớn (${Math.round(file.size / 1024)} KB). Giới hạn 2048 KB.` });
        continue;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Đọc ảnh thất bại"));
        reader.readAsDataURL(file);
      }).catch(() => "");
      if (!dataUrl) { next.push({ id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`, error: "Không đọc được ảnh từ clipboard." }); continue; }
      next.push({ id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name || "pasted-image", mime: file.type, size: file.size, dataUrl });
    }
    onImagesChange?.(next);
  }

  const canSend = !disabled && !loading && (question.trim() || images?.some((img) => img?.dataUrl));

  return (
    <form className="chat-box" onSubmit={onSubmit}>
      {images?.length ? (
        <div className="composer-attachments">
          {images.map((img) => (
            <div className="attachment-chip" key={img.id}>
              {img.dataUrl ? (
                <img className="attachment-thumb" src={img.dataUrl} alt={img.name || "attachment"} />
              ) : (
                <div className="attachment-error">{img.error || "Ảnh không hợp lệ"}</div>
              )}
              <button
                type="button"
                className="attachment-remove"
                onClick={() => onImagesChange?.(images.filter((item) => item.id !== img.id))}
                aria-label="Xóa ảnh"
              >×</button>
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        value={question}
        disabled={disabled}
        onChange={(e) => onQuestionChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) onSubmit(e); }
        }}
        placeholder="Nhắn tin... (Enter gửi, Shift+Enter xuống dòng)"
        rows={1}
      />
      <div className="chat-actions">
        <span className="composer-hint">Dán ảnh bằng Ctrl+V · Shift+Enter xuống dòng</span>
        <button className="primary-button" type="submit" disabled={!canSend}>
          {loading ? "Đang gửi…" : "Gửi"}
        </button>
      </div>
    </form>
  );
}
