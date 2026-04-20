import json
import re
import unicodedata

from flask import Blueprint, current_app, jsonify, request
from openai import NotFoundError

from app.services.embedding_service import (
    generate_answer_with_context,
    generate_answer_freeform,
    get_embedding,
    is_llm_transport_error,
    llm_timeout_user_hint,
    llm_unreachable_user_hint,
)
from app.services.vector_store_service import (
    get_store_stats,
    keyword_search_chunks,
    query_similar_chunks,
)

chat_bp = Blueprint("chat", __name__)

_VAGUE_PATTERNS = {
    "hi",
    "hello",
    "xin chao",
    "rut gon cai do",
    "tom tat cai do",
    "cai do",
    "cai nay",
}

_REFUSAL_PATTERNS = (
    "toi khong the cung cap",
    "toi khong the ho tro",
    "toi khong the ho tro ban voi yeu cau nay",
    "toi khong the giup",
    "toi khong the dap ung yeu cau nay",
    "khong the ho tro yeu cau nay",
    "i can't help with",
    "i cannot help with",
    "i can't provide",
    "i cannot assist with that request",
    "i'm sorry, but i can't assist with that",
    "illegal or harmful",
    "bat hop phap",
    "co hai",
    "khong phu hop",
)


def _load_request_json() -> dict | None:
    data = request.get_json(silent=True)
    if data is not None:
        return data

    raw = request.get_data(cache=True)
    if not raw:
        return None

    for encoding in ("utf-8", "utf-8-sig", "cp1258", "cp1252", "latin-1"):
        try:
            parsed = json.loads(raw.decode(encoding))
        except Exception:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _log_embedding_failure(exc: BaseException) -> None:
    if is_llm_transport_error(exc):
        current_app.logger.warning(
            "Embedding skipped because LLM backend is unavailable: %s - %s",
            current_app.config.get("OPENAI_BASE_URL"),
            exc,
        )
    else:
        current_app.logger.exception("Embedding/vector query failed")


def _log_llm_failure(exc: BaseException) -> None:
    if is_llm_transport_error(exc):
        current_app.logger.warning(
            "LLM generation failed because backend is unavailable: %s - %s",
            current_app.config.get("OPENAI_BASE_URL"),
            exc,
        )
    else:
        current_app.logger.exception("LLM generation failed")


def _missing_model_warning(exc: BaseException) -> str | None:
    if not isinstance(exc, NotFoundError):
        return None
    configured_model = current_app.config.get("CHAT_MODEL")
    return (
        f"Model '{configured_model}' khong ton tai tren LLM backend hien tai. "
        "Hay cap nhat CHAT_MODEL trong backend/.env cho khop voi /v1/models cua server ban dang dung."
    )


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _normalized_no_accents(text: str) -> str:
    return _normalize_text(_strip_accents(text))


def _is_vague_question(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    if not normalized:
        return True
    if normalized in _VAGUE_PATTERNS:
        return True
    if len(normalized) <= 3:
        return True

    words = set(re.findall(r"\w+", normalized))
    return bool(words) and words.issubset({"nay", "do", "kia", "this", "that", "it"})


def _filter_relevant_matches(matches: list[dict]) -> list[dict]:
    max_distance = current_app.config.get("MAX_VECTOR_DISTANCE", 1.2)
    min_keyword_score = current_app.config.get("MIN_KEYWORD_SCORE", 1)
    filtered = []

    for match in matches:
        text = (match.get("text") or "").strip()
        distance = match.get("distance")
        score = match.get("score")

        if not text:
            continue
        if distance is not None and distance > max_distance:
            continue
        if score is not None and score < min_keyword_score:
            continue
        filtered.append(match)

    return filtered


def _is_model_refusal(answer: str) -> bool:
    normalized = _normalized_no_accents(answer)
    if not normalized:
        return False
    return any(pattern in normalized for pattern in _REFUSAL_PATTERNS)


def _wants_three_sentences(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(hint in normalized for hint in ("3 cau", "ba cau", "3 sentence", "three sentence"))


def _clean_sentence(text: str) -> str:
    cleaned = re.sub(r"[`*_>#]+", " ", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _split_sentences(text: str) -> list[str]:
    raw = _clean_sentence(text)
    if not raw:
        return []
    parts = re.split(r"(?<=[.!?])\s+|\n+", raw)
    return [part.strip(" -•\t") for part in parts if part and part.strip(" -•\t")]


def _extractive_sentences(context_blocks: list[str], limit: int = 3) -> list[str]:
    seen: set[str] = set()
    picked: list[str] = []

    for block in context_blocks:
        for sentence in _split_sentences(block):
            normalized = _normalized_no_accents(sentence)
            if len(normalized) < 30:
                continue
            if normalized in seen:
                continue
            if normalized.startswith(("online shopping vs offline shopping", "advantages", "disadvantages")):
                continue
            seen.add(normalized)
            picked.append(sentence)
            if len(picked) >= limit:
                return picked
    return picked


def _answer_from_context(
    context_blocks: list[str],
    question: str,
    max_sentences: int,
) -> str:
    sentences = _extractive_sentences(context_blocks, limit=20)
    if not sentences:
        return "Khong du du lieu trong tai lieu da cung cap."

    question_tokens = {
        token
        for token in re.findall(r"\w+", _normalized_no_accents(question))
        if len(token) >= 3
    }

    scored = []
    for sentence in sentences:
        normalized = _normalized_no_accents(sentence)
        sentence_tokens = set(re.findall(r"\w+", normalized))
        overlap = len(question_tokens.intersection(sentence_tokens))
        score = overlap * 10 + min(len(sentence), 180) / 180
        scored.append((score, sentence))

    scored.sort(key=lambda item: item[0], reverse=True)
    picked = [sentence for _, sentence in scored[:max_sentences]]
    if not any(score > 0 for score, _ in scored[:max_sentences]):
        picked = sentences[:max_sentences]
    return " ".join(picked)


@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = _load_request_json()
    question = data.get("question") if data else None

    if not question:
        return jsonify({
            "success": False,
            "message": "Thieu question",
        }), 400

    active_document = current_app.config.get("ACTIVE_DOCUMENT_FILENAME")
    if not active_document:
        backend_warnings: list[str] = []
        try:
            answer = generate_answer_freeform(
                question=question,
                model=current_app.config["CHAT_MODEL"],
            )
            body = {
                "success": True,
                "answer": answer or "",
                "answer_status": "freestyle",
                "llm_model": current_app.config["CHAT_MODEL"],
                "sources": [],
            }
            return jsonify(body), 200
        except Exception as exc:
            _log_llm_failure(exc)
            if is_llm_transport_error(exc):
                backend_warnings.append(llm_unreachable_user_hint())
            if "timeout" in exc.__class__.__name__.lower() or "timed out" in str(exc).lower():
                backend_warnings.append(llm_timeout_user_hint())
            missing_model_warning = _missing_model_warning(exc)
            if missing_model_warning:
                backend_warnings.append(missing_model_warning)

            body = {
                "success": True,
                "answer": "Khong goi duoc LLM luc nay. Hay thu lai sau.",
                "answer_status": "freestyle_error",
                "llm_model": current_app.config["CHAT_MODEL"],
                "sources": [],
            }
            if backend_warnings:
                body["backend_warnings"] = list(dict.fromkeys(backend_warnings))
            return jsonify(body), 200

    if _is_vague_question(question):
        return jsonify({
            "success": True,
            "answer": (
                "Cau hoi nay con qua mo ho. Hay noi ro ban muon tom tat, giai thich, "
                "hay hoi dap ve phan nao trong tai lieu."
            ),
            "answer_status": "needs_clarification",
            "llm_model": current_app.config["CHAT_MODEL"],
            "active_document": active_document,
            "sources": [],
        }), 200

    try:
        matches = []
        backend_warnings: list[str] = []

        try:
            query_embedding = get_embedding(
                text=question,
                model=current_app.config["EMBEDDING_MODEL"],
            )
            matches = query_similar_chunks(
                query_embedding=query_embedding,
                top_k=current_app.config["TOP_K"],
                filename_filter=active_document,
            )
        except Exception as exc:
            _log_embedding_failure(exc)
            if is_llm_transport_error(exc):
                backend_warnings.append(llm_unreachable_user_hint())
            matches = keyword_search_chunks(
                question=question,
                top_k=current_app.config["TOP_K"],
                filename_filter=active_document,
            )

        matches = _filter_relevant_matches(matches)
        if not matches:
            body = {
                "success": True,
                "answer": (
                    "Minh chua tim thay doan nao du lien quan trong tai lieu active. "
                    "Hay hoi cu the hon hoac dung tu khoa dung voi noi dung file."
                ),
                "answer_status": "no_match",
                "llm_model": current_app.config["CHAT_MODEL"],
                "active_document": active_document,
                "sources": [],
                "debug": get_store_stats(),
            }
            if backend_warnings:
                body["backend_warnings"] = list(dict.fromkeys(backend_warnings))
            return jsonify(body), 200

        context_blocks = [match["text"] for match in matches]
        max_sentences = 3 if _wants_three_sentences(question) else 4

        try:
            answer = generate_answer_with_context(
                question=question,
                context_blocks=context_blocks,
                model=current_app.config["CHAT_MODEL"],
            )
            if _is_model_refusal(answer):
                answer_status = "refused_fallback"
                answer = _answer_from_context(
                    context_blocks=context_blocks,
                    question=question,
                    max_sentences=max_sentences,
                )
            else:
                answer_status = "answered"
                if _wants_three_sentences(question):
                    answer = " ".join(_split_sentences(answer)[:3]) or answer
        except Exception as exc:
            _log_llm_failure(exc)
            answer = _answer_from_context(
                context_blocks=context_blocks,
                question=question,
                max_sentences=max_sentences,
            )
            answer_status = "fallback"
            if is_llm_transport_error(exc):
                backend_warnings.append(llm_unreachable_user_hint())
            if "timeout" in exc.__class__.__name__.lower() or "timed out" in str(exc).lower():
                backend_warnings.append(llm_timeout_user_hint())
            missing_model_warning = _missing_model_warning(exc)
            if missing_model_warning:
                backend_warnings.append(missing_model_warning)

        sources = []
        for match in matches:
            metadata = match.get("metadata") or {}
            sources.append({
                "filename": metadata.get("filename"),
                "chunk_index": metadata.get("chunk_index"),
                "distance": match.get("distance"),
                "snippet": (match.get("text") or "")[:200],
            })

        body = {
            "success": True,
            "answer": answer,
            "answer_status": answer_status,
            "llm_model": current_app.config["CHAT_MODEL"],
            "active_document": active_document,
            "sources": sources,
        }
        if backend_warnings:
            body["backend_warnings"] = list(dict.fromkeys(backend_warnings))

        return jsonify(body), 200
    except Exception as exc:
        current_app.logger.exception("Chat route failed")
        return jsonify({
            "success": False,
            "message": "Xu ly chat that bai",
            "error": str(exc),
        }), 500
