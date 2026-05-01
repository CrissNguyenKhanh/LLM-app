import React, { useRef, useState } from "react";

export default function UploadPanel({ selectedFile, onFileChange, onUpload, uploading, uploadResult, activeDocument }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange({ target: { files: [file] } });
  }

  return (
    <section className="panel upload-panel">
      <div className="panel-header">
        <p className="eyebrow">Knowledge</p>
        <h2>Upload tài liệu</h2>
      </div>

      <label
        className="file-picker"
        style={dragging ? { borderColor: "var(--accent)", background: "rgba(34,211,160,0.07)" } : {}}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span>{dragging ? "Thả file vào đây ✦" : "Kéo thả hoặc click để chọn file"}</span>
        <span style={{ fontSize: "10px", marginTop: "2px" }}>PDF · TXT · DOCX</span>
        <input ref={inputRef} type="file" accept=".pdf,.txt,.docx" onChange={onFileChange} style={{ display: "none" }} />
      </label>

      {activeDocument ? <div className="active-doc">✓ Active: {activeDocument}</div> : null}

      <div className="upload-actions">
        <div className="upload-meta">
          <strong>{selectedFile?.name || "Chưa chọn file"}</strong>
          <span>{selectedFile ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB` : "Upload để bật RAG và hiện source."}</span>
        </div>
        <button className="primary-button" type="button" onClick={onUpload} disabled={!selectedFile || uploading}>
          {uploading ? "Đang tải…" : "Tải lên"}
        </button>
      </div>

      {uploadResult ? (
        <div className="upload-result">
          <p>{uploadResult.message || "Upload xong."}</p>
          <div className="stats-row">
            <span>Chunks: {uploadResult.chunk_count ?? 0}</span>
            <span>Vector: {uploadResult.saved_count ?? 0}</span>
            <span>Keyword: {uploadResult.keyword_saved_count ?? 0}</span>
          </div>
          {uploadResult.backend_warning ? <p className="warning-text">⚠ {uploadResult.backend_warning}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
