# backend/app/services/chunk_service.py

import re
from typing import List, Dict


def _find_sentence_boundary(text: str, target: int, window: int = 80) -> int:
    """
    Tìm điểm cắt tự nhiên (cuối câu) gần vị trí `target`.
    Ưu tiên: dấu xuống dòng đôi > dấu chấm/hỏi/chấm than > xuống dòng đơn.
    Nếu không tìm thấy trong cửa sổ, trả về target.
    """
    if target >= len(text):
        return len(text)

    search_start = max(0, target - window)
    search_end = min(len(text), target + window)
    region = text[search_start:search_end]

    # Ưu tiên 1: đoạn ngắt kép (paragraph boundary)
    for match in re.finditer(r"\n\s*\n", region):
        pos = search_start + match.end()
        if abs(pos - target) <= window:
            return pos

    # Ưu tiên 2: cuối câu (. ! ?)
    best = None
    best_dist = window + 1
    for match in re.finditer(r"[.!?][\s\n]", region):
        pos = search_start + match.end()
        dist = abs(pos - target)
        if dist < best_dist:
            best = pos
            best_dist = dist

    if best is not None:
        return best

    # Ưu tiên 3: xuống dòng đơn
    for match in re.finditer(r"\n", region):
        pos = search_start + match.end()
        if abs(pos - target) <= window:
            return pos

    # Fallback: cắt ở khoảng trắng gần nhất
    space_pos = text.rfind(" ", max(0, target - 20), target + 20)
    if space_pos > 0:
        return space_pos + 1

    return target


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict]:
    """
    Chia text thành các chunk có overlap.
    Sử dụng sentence boundary để không cắt giữa từ/câu.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        raw_end = start + chunk_size

        if raw_end >= len(text):
            end = len(text)
        else:
            end = _find_sentence_boundary(text, raw_end)

        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append({
                "chunk_index": chunk_index,
                "text": chunk_content,
            })
            chunk_index += 1

        next_start = end - overlap
        if next_start <= start:
            next_start = start + max(chunk_size // 2, 100)
        start = next_start

        if start >= len(text):
            break

    return chunks