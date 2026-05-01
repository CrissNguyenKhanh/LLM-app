import React from "react";

export default function SourceList({ sources }) {
  return (
    <section className="panel sources-panel">
      <div className="panel-header">
        <p className="eyebrow">Sources</p>
        <h2>Đoạn trích xuất</h2>
      </div>

      {!sources?.length ? (
        <div className="empty-sources">
          Chưa có source. Khi bạn upload tài liệu và hỏi, các chunk liên quan sẽ hiện ở đây.
        </div>
      ) : (
        <div className="source-list">
          {sources.map((source, index) => (
            <article className="source-card" key={`${source.filename}-${index}`}>
              <div className="source-top">
                <strong>{source.filename || "Không rõ file"}</strong>
                <span>Chunk {source.chunk_index ?? "?"}</span>
              </div>
              <p>{source.snippet || "Không có snippet."}</p>
              <small>
                {source.distance != null ? `distance: ${Number(source.distance).toFixed(4)}` : "distance: n/a"}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
