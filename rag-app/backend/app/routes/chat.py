from flask import Blueprint, request, jsonify, current_app
from openai import NotFoundError
from app.services.embedding_service import (
    get_embedding,
    generate_answer_with_context,
    is_llm_transport_error,
    llm_unreachable_user_hint,
)
from app.services.vector_store_service import (
    query_similar_chunks,
    keyword_search_chunks,
    get_store_stats
)

chat_bp = Blueprint("chat", __name__)


def _log_embedding_failure(exc: BaseException) -> None:
    if is_llm_transport_error(exc):
        current_app.logger.warning(
            "Embedding bo qua (khong ket noi LLM backend): %s — %s",
            current_app.config.get("OPENAI_BASE_URL"),
            exc,
        )
    else:
        current_app.logger.exception("Embedding/vector query failed")


def _log_llm_failure(exc: BaseException) -> None:
    if is_llm_transport_error(exc):
        current_app.logger.warning(
            "LLM khong goi duoc (backend khong san sang): %s — %s",
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


@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    question = data.get("question") if data else None

    if not question:
        return jsonify({
            "success": False,
            "message": "Thiếu question"
        }), 400

    try:
        matches = []
        backend_warnings: list[str] = []

        try:
            query_embedding = get_embedding(
                text=question,
                model=current_app.config["EMBEDDING_MODEL"]
            )
            matches = query_similar_chunks(
                query_embedding=query_embedding,
                top_k=current_app.config["TOP_K"]
            )
        except Exception as e:
            _log_embedding_failure(e)
            if is_llm_transport_error(e):
                backend_warnings.append(llm_unreachable_user_hint())
            matches = keyword_search_chunks(
                question=question,
                top_k=current_app.config["TOP_K"]
            )

        if not matches:
            stats = get_store_stats()
            if stats.get("keyword_count", 0) > 0:
                body = {
                    "success": True,
                    "answer": (
                        "Đã có dữ liệu fallback trong keyword store, "
                        "nhưng chưa tìm thấy chunk phù hợp với câu hỏi hiện tại."
                    ),
                    "sources": [],
                    "debug": stats,
                }
                if backend_warnings:
                    body["backend_warnings"] = backend_warnings
                return jsonify(body), 200

            body = {
                "success": True,
                "answer": "Chưa có dữ liệu trong vector store. Hãy upload tài liệu trước.",
                "sources": [],
                "debug": stats,
            }
            if backend_warnings:
                body["backend_warnings"] = backend_warnings
            return jsonify(body), 200

        context_blocks = [match["text"] for match in matches]

        try:
            answer = generate_answer_with_context(
                question=question,
                context_blocks=context_blocks,
                model=current_app.config["CHAT_MODEL"]
            )
        except Exception as e:
            _log_llm_failure(e)
            fallback_snippets = "\n".join(
                f"- {block[:180]}" for block in context_blocks[:3]
            )
            answer = (
                "Mình chưa thể gọi LLM lúc này, nhưng đây là các đoạn liên quan nhất:\n"
                f"{fallback_snippets}"
            )
            if is_llm_transport_error(e):
                backend_warnings.append(llm_unreachable_user_hint())
            missing_model_warning = _missing_model_warning(e)
            if missing_model_warning:
                backend_warnings.append(missing_model_warning)

        sources = []
        for match in matches:
            metadata = match.get("metadata") or {}
            sources.append({
                "filename": metadata.get("filename"),
                "chunk_index": metadata.get("chunk_index"),
                "distance": match.get("distance"),
                "snippet": (match.get("text") or "")[:200]
            })

        body = {
            "success": True,
            "answer": answer,
            "sources": sources,
        }
        if backend_warnings:
            body["backend_warnings"] = list(dict.fromkeys(backend_warnings))

        return jsonify(body), 200

    except Exception as e:
        current_app.logger.exception("Chat route failed")
        return jsonify({
            "success": False,
            "message": "Xử lý chat thất bại",
            "error": str(e)
        }), 500
