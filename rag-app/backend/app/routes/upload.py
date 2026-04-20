import os

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.utils import secure_filename

from app.services.chunk_service import chunk_text
from app.services.document_service import extract_text
from app.services.document_registry_service import upsert_document
from app.services.embedding_service import (
    get_embedding,
    is_llm_transport_error,
    llm_unreachable_user_hint,
)
from app.services.vector_store_service import (
    clear_keyword_store,
    clear_vector_store,
    save_chunks_to_keyword_store,
    save_chunks_to_vector_store,
)
from app.utils.auth import require_auth

upload_bp = Blueprint("upload", __name__)


def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


@upload_bp.route("/api/upload", methods=["POST"])
@require_auth
def upload_file():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "message": "Khong tim thay file trong request",
        }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "message": "Ten file rong",
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "message": "Dinh dang file khong duoc ho tro",
        }), 400

    filename = secure_filename(file.filename)
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    try:
        if current_app.config.get("REPLACE_INDEX_ON_UPLOAD", True):
            clear_vector_store()
            clear_keyword_store()

        extension = filename.rsplit(".", 1)[1].lower()
        extracted_text = extract_text(file_path, extension)

        if not extracted_text.strip():
            return jsonify({
                "success": False,
                "message": "File khong co noi dung text de xu ly",
                "filename": filename,
            }), 400

        chunks = chunk_text(
            text=extracted_text,
            chunk_size=current_app.config["CHUNK_SIZE"],
            overlap=current_app.config["CHUNK_OVERLAP"],
        )

        enriched_chunks = []
        vector_chunks = []
        embedding_fail_count = 0
        llm_backend_unreachable = False

        for chunk in chunks:
            chunk_id = f"{filename}_chunk_{chunk['chunk_index']}"
            chunk_payload = {
                "chunk_id": chunk_id,
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "metadata": {
                    "filename": filename,
                    "chunk_index": chunk["chunk_index"],
                    "source": file_path,
                },
            }

            try:
                embedding = get_embedding(
                    text=chunk["text"],
                    model=current_app.config["EMBEDDING_MODEL"],
                )
                vector_chunks.append({
                    **chunk_payload,
                    "embedding": embedding,
                })
            except Exception as exc:
                if is_llm_transport_error(exc):
                    llm_backend_unreachable = True
                embedding_fail_count += 1

            enriched_chunks.append(chunk_payload)

        saved_count = save_chunks_to_vector_store(vector_chunks)
        keyword_saved_count = save_chunks_to_keyword_store(enriched_chunks)

        preview_chunks = [
            {
                "chunk_id": chunk["chunk_id"],
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"][:200],
                "metadata": chunk["metadata"],
            }
            for chunk in enriched_chunks[:3]
        ]

        session["active_document"] = filename

        upsert_document(
            {
                "filename": filename,
                "display_name": filename,
                "file_type": extension,
                "size_bytes": int(os.path.getsize(file_path)) if os.path.exists(file_path) else 0,
                "char_count": len(extracted_text),
                "chunk_count": len(enriched_chunks),
                "saved_count": saved_count,
                "keyword_saved_count": keyword_saved_count,
                "embedding_fail_count": embedding_fail_count,
            }
        )

        payload = {
            "success": True,
            "message": "Upload, parse, chunk va index vector thanh cong",
            "filename": filename,
            "active_document": filename,
            "file_type": extension,
            "char_count": len(extracted_text),
            "chunk_count": len(enriched_chunks),
            "saved_count": saved_count,
            "keyword_saved_count": keyword_saved_count,
            "embedding_fail_count": embedding_fail_count,
            "preview": extracted_text[:500],
            "chunks_preview": preview_chunks,
        }
        if llm_backend_unreachable and embedding_fail_count:
            payload["backend_warning"] = llm_unreachable_user_hint()

        return jsonify(payload), 200

    except Exception as exc:
        return jsonify({
            "success": False,
            "message": "Upload thanh cong nhung xu ly file that bai",
            "error": str(exc),
            "filename": filename,
        }), 500
