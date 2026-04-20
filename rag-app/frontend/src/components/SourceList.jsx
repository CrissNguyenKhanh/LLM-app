import React from "react";

export default function SourceList({ sources }) {
  return (
    <section className="panel sources-panel">
      <div className="panel-header">
        <p className="eyebrow">Sources</p>
        <h2>Doan trich xuat</h2>
      </div>

      {!sources.length ? (
        <div className="empty-sources">
          Chua co source. Khi ban upload tai lieu va hoi, cac chunk lien quan se hien o day.
        </div>
      ) : (
        <div className="source-list">
          {sources.map((source, index) => (
            <article className="source-card" key={`${source.filename}-${index}`}>
              <div className="source-top">
                <strong>{source.filename || "Khong ro file"}</strong>
                <span>{`Chunk ${source.chunk_index ?? "?"}`}</span>
              </div>
              <p>{source.snippet || "Khong co snippet."}</p>
              <small>
                {source.distance != null
                  ? `distance: ${Number(source.distance).toFixed(4)}`
                  : "distance: n/a"}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
