import React from "react";

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let cur = value;
  while (cur >= 1024 && idx < units.length - 1) {
    cur /= 1024;
    idx += 1;
  }
  const rounded = idx === 0 ? Math.round(cur) : Math.round(cur * 10) / 10;
  return `${rounded} ${units[idx]}`;
}

function formatTime(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function DocumentLibrary({
  documents,
  activeDocument,
  documentMode,
  onDocumentModeChange,
  selectedDocuments,
  onToggleSelect,
  onActivate,
  onDelete,
  loading,
  error,
}) {
  return (
    <section className="panel documents-panel">
      <div className="panel-header">
        <p className="eyebrow">Library</p>
        <div className="panel-title-row">
          <h2>Thu vien tai lieu</h2>
          <select
            className="scope-select"
            value={documentMode}
            onChange={(event) => onDocumentModeChange(event.target.value)}
          >
            <option value="active">1 file (Active)</option>
            <option value="selected">Nhieu file (Selected)</option>
            <option value="all">Tat ca (All)</option>
          </select>
        </div>
        <p className="documents-subtitle">
          {documentMode === "active"
            ? "Chat tren 1 tai lieu dang active."
            : documentMode === "selected"
              ? "Tick nhieu file de chat tren tap tai lieu da chon."
              : "Chat tren toan bo thu vien tai lieu."}
        </p>
      </div>

      {error ? <div className="inline-error">{error}</div> : null}

      {!documents?.length ? (
        <div className="empty-sources">
          {loading ? "Dang tai danh sach tai lieu..." : "Chua co tai lieu. Hay upload o ben duoi."}
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc) => {
            const filename = doc.filename;
            const isActive = filename && filename === activeDocument;
            const isSelected = filename && selectedDocuments?.includes(filename);
            return (
              <article
                className={isActive ? "document-item active" : "document-item"}
                key={filename}
              >
                <div className="document-top">
                  {documentMode === "selected" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(isSelected)}
                      onChange={() => onToggleSelect(filename)}
                      title="Chon tai lieu"
                    />
                  ) : null}
                  <div className="document-name">
                    <strong title={filename}>{doc.display_name || filename}</strong>
                    <span className="document-filename">{filename}</span>
                  </div>
                </div>

                <div className="document-meta">
                  <span>{doc.file_type ? doc.file_type.toUpperCase() : "FILE"}</span>
                  <span>{formatBytes(doc.size_bytes)}</span>
                  <span>{`Chunks: ${doc.chunk_count ?? 0}`}</span>
                </div>

                <div className="document-meta document-meta-muted">
                  <span>{formatTime(doc.uploaded_at_ms)}</span>
                  {doc.embedding_fail_count ? (
                    <span className="warning-text">{`Embedding fail: ${doc.embedding_fail_count}`}</span>
                  ) : (
                    <span />
                  )}
                </div>

                <div className="document-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onActivate(filename)}
                    disabled={loading}
                  >
                    {isActive ? "Dang active" : "Set active"}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => onDelete(filename)}
                    disabled={loading}
                  >
                    Xoa
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

