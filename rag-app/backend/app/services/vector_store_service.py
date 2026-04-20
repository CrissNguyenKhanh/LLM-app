# backend/app/services/vector_store_service.py
import os
import json
import chromadb
from flask import current_app


def get_chroma_client():
    db_path = current_app.config["VECTOR_DB_DIR"]
    os.makedirs(db_path, exist_ok=True)
    return chromadb.PersistentClient(path=db_path)


def get_or_create_collection():
    client = get_chroma_client()
    collection_name = current_app.config["CHROMA_COLLECTION_NAME"]

    collection = client.get_or_create_collection(name=collection_name)
    return collection


def clear_vector_store() -> None:
    client = get_chroma_client()
    collection_name = current_app.config["CHROMA_COLLECTION_NAME"]
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        # Collection may not exist yet.
        pass
    client.get_or_create_collection(name=collection_name)


def save_chunks_to_vector_store(chunks: list[dict]):
    if not chunks:
        return 0

    collection = get_or_create_collection()

    ids = []
    documents = []
    metadatas = []
    embeddings = []

    for chunk in chunks:
        ids.append(chunk["chunk_id"])
        documents.append(chunk["text"])
        metadatas.append(chunk["metadata"])
        embeddings.append(chunk["embedding"])

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings
    )

    return len(ids)


def query_similar_chunks(
    query_embedding: list[float],
    top_k: int = 4,
    filename_filter: str | None = None,
) -> list[dict]:
    collection = get_or_create_collection()
    query_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
        "include": ["documents", "metadatas", "distances"],
    }
    if filename_filter:
        query_kwargs["where"] = {"filename": filename_filter}
    result = collection.query(**query_kwargs)

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    rows = []
    for idx, doc in enumerate(documents):
        rows.append({
            "text": doc,
            "metadata": metadatas[idx] if idx < len(metadatas) else {},
            "distance": distances[idx] if idx < len(distances) else None
        })

    return rows


def _get_keyword_store_path() -> str:
    db_path = current_app.config["VECTOR_DB_DIR"]
    os.makedirs(db_path, exist_ok=True)
    return os.path.join(db_path, "keyword_chunks.json")


def clear_keyword_store() -> None:
    store_path = _get_keyword_store_path()
    if os.path.exists(store_path):
        os.remove(store_path)


def _load_keyword_chunks() -> list[dict]:
    store_path = _get_keyword_store_path()
    if not os.path.exists(store_path):
        return []

    with open(store_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, list):
            return data
    return []


def save_chunks_to_keyword_store(chunks: list[dict]) -> int:
    if not chunks:
        return 0

    existing = _load_keyword_chunks()
    existing_ids = {item.get("chunk_id") for item in existing}

    added = 0
    for chunk in chunks:
        chunk_id = chunk.get("chunk_id")
        if chunk_id in existing_ids:
            continue
        existing.append({
            "chunk_id": chunk_id,
            "text": chunk.get("text", ""),
            "metadata": chunk.get("metadata", {})
        })
        existing_ids.add(chunk_id)
        added += 1

    with open(_get_keyword_store_path(), "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False)

    return added


def keyword_search_chunks(
    question: str,
    top_k: int = 4,
    filename_filter: str | None = None,
) -> list[dict]:
    keyword_chunks = _load_keyword_chunks()
    tokens = {token.lower() for token in question.split() if token.strip()}

    if not keyword_chunks:
        return []

    if filename_filter:
        keyword_chunks = [
            item for item in keyword_chunks
            if (item.get("metadata") or {}).get("filename") == filename_filter
        ]
        if not keyword_chunks:
            return []

    if not tokens:
        return [
            {
                "text": item.get("text", ""),
                "metadata": item.get("metadata", {}),
                "distance": None,
                "score": 0
            }
            for item in keyword_chunks[:top_k]
        ]

    scored_rows = []
    for item in keyword_chunks:
        doc_text = item.get("text", "")
        doc_tokens = set(doc_text.lower().split())
        score = len(tokens.intersection(doc_tokens))
        if score > 0:
            scored_rows.append({
                "text": doc_text,
                "metadata": item.get("metadata", {}),
                "distance": None,
                "score": score
            })

    scored_rows.sort(key=lambda row: row["score"], reverse=True)
    if scored_rows:
        return scored_rows[:top_k]
    return []


def get_store_stats() -> dict:
    vector_count = 0
    keyword_count = 0

    try:
        collection = get_or_create_collection()
        vector_count = collection.count()
    except Exception:
        vector_count = 0

    try:
        keyword_count = len(_load_keyword_chunks())
    except Exception:
        keyword_count = 0

    return {
        "vector_count": vector_count,
        "keyword_count": keyword_count,
        "vector_db_dir": current_app.config["VECTOR_DB_DIR"],
        "collection_name": current_app.config["CHROMA_COLLECTION_NAME"]
    }
