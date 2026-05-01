import React, { useCallback } from "react";

const FILE_ICONS = { pdf: "📄", txt: "📝", docx: "📘" };

function formatBytes(bytes) {
  const v = Number(bytes || 0);
  if (!Number.isFinite(v) || v <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, cur = v;
  while (cur >= 1024 && i < units.length - 1) { cur /= 1024; i++; }
  return `${i === 0 ? Math.round(cur) : Math.round(cur * 10) / 10} ${units[i]}`;
}

function formatTime(ms) {
  const v = Number(ms || 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  try { return new Date(v).toLocaleString("vi-VN"); } catch { return ""; }
}

export default function DocumentLibrary({
  documents, activeDocument, documentMode, onDocumentModeChange,
  selectedDocuments, onToggleSelect, onActivate, onDelete, loading, error,
}) {
  return (
    <section className="panel documents-panel">
      <div className="panel-header">
        <p className="eyebrow">Library</p>
        <div className="panel-title-row">
          <h2>Thư viện tài liệu</h2>
          <select className="scope-select" value={documentMode} onChange={(e) => onDocumentModeChange(e.target.value)}>
            <option value="active">1 file (Active)</option>
            <option value="selected">Nhiều file</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
        <p className="documents-subtitle">
          {documentMode === "active" ? "Chat trên 1 tài liệu đang active."
            : documentMode === "selected" ? "Tick nhiều file để chat trên tập đã chọn."
            : "Chat trên toàn bộ thư viện tài liệu."}
        </p>
      </div>

      {error ? <div className="inline-error">{error}</div> : null}

      {!documents?.length ? (
        <div className="empty-sources">
          {loading ? "Đang tải danh sách tài liệu..." : "Chưa có tài liệu. Hãy upload ở bên dưới."}
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc) => {
            const filename = doc.filename;
            const isActive = filename && filename === activeDocument;
            const isSelected = filename && selectedDocuments?.includes(filename);
            const icon = FILE_ICONS[doc.file_type?.toLowerCase()] || "📁";
            return (
              <article className={`document-item${isActive ? " active" : ""}`} key={filename}>
                <div className="document-top">
                  {documentMode === "selected" ? (
                    <input type="checkbox" checked={Boolean(isSelected)} onChange={() => onToggleSelect(filename)} title="Chọn tài liệu" />
                  ) : null}
                  <div className="document-name">
                    <strong title={filename}>{icon} {doc.display_name || filename}</strong>
                    <span className="document-filename">{filename}</span>
                  </div>
                </div>
                <div className="document-meta">
                  <span>{doc.file_type ? doc.file_type.toUpperCase() : "FILE"}</span>
                  <span>{formatBytes(doc.size_bytes)}</span>
                  <span>Chunks: {doc.chunk_count ?? 0}</span>
                </div>
                <div className="document-meta document-meta-muted">
                  <span>{formatTime(doc.uploaded_at_ms)}</span>
                  {doc.embedding_fail_count ? <span className="warning-text">⚠ Embedding fail: {doc.embedding_fail_count}</span> : null}
                </div>
                <div className="document-actions">
                  <button type="button" className="ghost-button" onClick={() => onActivate(filename)} disabled={loading}>
                    {isActive ? "✓ Active" : "Set active"}
                  </button>
                  <button type="button" className="danger-button" onClick={() => onDelete(filename)} disabled={loading}>
                    Xóa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
