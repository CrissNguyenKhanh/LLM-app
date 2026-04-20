import json
import os
import time
from typing import Any

from flask import current_app


def _registry_path() -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(base_dir, "data", "documents.json")


def _ensure_registry() -> None:
    path = _registry_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"documents": []}, handle, ensure_ascii=False, indent=2)


def _read_payload() -> dict[str, Any]:
    _ensure_registry()
    with open(_registry_path(), "r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        return {"documents": []}
    docs = payload.get("documents")
    if not isinstance(docs, list):
        payload["documents"] = []
    return payload


def _write_payload(payload: dict[str, Any]) -> None:
    _ensure_registry()
    with open(_registry_path(), "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _now_ms() -> int:
    return int(time.time() * 1000)


def list_documents() -> list[dict[str, Any]]:
    payload = _read_payload()
    docs = payload.get("documents") or []
    if not isinstance(docs, list):
        return []
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    existing_files: set[str] = set()
    if upload_dir and os.path.isdir(upload_dir):
        try:
            existing_files = {name for name in os.listdir(upload_dir) if name}
        except Exception:
            existing_files = set()

    cleaned: list[dict[str, Any]] = []
    for doc in docs:
        if not isinstance(doc, dict):
            continue
        filename = str(doc.get("filename") or "").strip()
        if not filename:
            continue
        if existing_files and filename not in existing_files:
            continue
        cleaned.append(doc)

    cleaned.sort(key=lambda item: int(item.get("uploaded_at_ms") or 0), reverse=True)
    return cleaned


def upsert_document(record: dict[str, Any]) -> dict[str, Any]:
    filename = str(record.get("filename") or "").strip()
    if not filename:
        raise ValueError("filename is required")

    payload = _read_payload()
    docs: list[dict[str, Any]] = payload.get("documents") or []
    if not isinstance(docs, list):
        docs = []

    existing_idx = None
    for idx, doc in enumerate(docs):
        if isinstance(doc, dict) and str(doc.get("filename") or "").strip() == filename:
            existing_idx = idx
            break

    normalized = {
        "filename": filename,
        "display_name": (record.get("display_name") or filename),
        "file_type": record.get("file_type") or "",
        "size_bytes": int(record.get("size_bytes") or 0),
        "char_count": int(record.get("char_count") or 0),
        "chunk_count": int(record.get("chunk_count") or 0),
        "saved_count": int(record.get("saved_count") or 0),
        "keyword_saved_count": int(record.get("keyword_saved_count") or 0),
        "embedding_fail_count": int(record.get("embedding_fail_count") or 0),
        "uploaded_at_ms": int(record.get("uploaded_at_ms") or _now_ms()),
        "updated_at_ms": _now_ms(),
    }

    if existing_idx is None:
        docs.append(normalized)
    else:
        merged = {**docs[existing_idx], **normalized}
        merged["uploaded_at_ms"] = int(docs[existing_idx].get("uploaded_at_ms") or normalized["uploaded_at_ms"])
        docs[existing_idx] = merged

    payload["documents"] = docs
    _write_payload(payload)
    return normalized


def delete_document_record(filename: str) -> bool:
    filename = (filename or "").strip()
    if not filename:
        return False

    payload = _read_payload()
    docs = payload.get("documents") or []
    if not isinstance(docs, list) or not docs:
        return False

    kept = []
    removed = False
    for doc in docs:
        if not isinstance(doc, dict):
            continue
        if str(doc.get("filename") or "").strip() == filename:
            removed = True
            continue
        kept.append(doc)

    if removed:
        payload["documents"] = kept
        _write_payload(payload)
    return removed

