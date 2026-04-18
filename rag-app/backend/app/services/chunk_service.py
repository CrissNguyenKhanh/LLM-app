# backend/app/services/chunk_service.py

from typing import List, Dict


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict]:
    """
    Chia text thành các chunk có overlap.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size
        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append({
                "chunk_index": chunk_index,
                "text": chunk_content
            })
            chunk_index += 1

        start += chunk_size - overlap

        if start >= len(text):
            break

    return chunks