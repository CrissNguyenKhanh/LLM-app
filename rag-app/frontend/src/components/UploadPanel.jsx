import React from "react";

export default function UploadPanel({
  selectedFile,
  onFileChange,
  onUpload,
  uploading,
  uploadResult,
}) {
  return (
    <section className="panel upload-panel">
      <div className="panel-header">
        <p className="eyebrow">Document Intake</p>
        <h2>Nap tai lieu vao RAG</h2>
      </div>

      <label className="file-picker">
        <span>Chon file `pdf`, `txt`, `docx`</span>
        <input type="file" accept=".pdf,.txt,.docx" onChange={onFileChange} />
      </label>

      <div className="upload-actions">
        <div className="upload-meta">
          <strong>{selectedFile?.name || "Chua chon file"}</strong>
          <span>
            {selectedFile
              ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`
              : "Sau khi upload, backend se chunk va index vao Chroma."}
          </span>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={onUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Dang upload..." : "Upload tai lieu"}
        </button>
      </div>

      {uploadResult ? (
        <div className="upload-result">
          <p>{uploadResult.message || "Upload xong."}</p>
          <div className="stats-row">
            <span>{`Chunks: ${uploadResult.chunk_count ?? 0}`}</span>
            <span>{`Vector: ${uploadResult.saved_count ?? 0}`}</span>
            <span>{`Keyword: ${uploadResult.keyword_saved_count ?? 0}`}</span>
          </div>
          {uploadResult.backend_warning ? (
            <p className="warning-text">{uploadResult.backend_warning}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
