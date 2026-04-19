import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.services.document_service import extract_text
from app.services.chunk_service import chunk_text
from app.services.embedding_service import (
    get_embedding,
    is_llm_transport_error,
    llm_unreachable_user_hint,
)
from app.services.vector_store_service import (
    save_chunks_to_vector_store,
    save_chunks_to_keyword_store
)

upload_bp = Blueprint("upload", __name__)


def allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


@upload_bp.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy file trong request"
        }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "message": "Tên file rỗng"
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "message": "Định dạng file không được hỗ trợ"
        }), 400

    filename = secure_filename(file.filename)
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    try:
        extension = filename.rsplit(".", 1)[1].lower()
        extracted_text = extract_text(file_path, extension)

        if not extracted_text.strip():
            return jsonify({
                "success": False,
                "message": "File không có nội dung text để xử lý",
                "filename": filename
            }), 400

        chunks = chunk_text(
            text=extracted_text,
            chunk_size=current_app.config["CHUNK_SIZE"],
            overlap=current_app.config["CHUNK_OVERLAP"]
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
                    "source": file_path
                }
            }

            try:
                embedding = get_embedding(
                    text=chunk["text"],
                    model=current_app.config["EMBEDDING_MODEL"]
                )
                vector_chunks.append({
                    **chunk_payload,
                    "embedding": embedding
                })
            except Exception as e:
                if is_llm_transport_error(e):
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
                "metadata": chunk["metadata"]
            }
            for chunk in enriched_chunks[:3]
        ]

        payload = {
            "success": True,
            "message": "Upload, parse, chunk và index vector thành công",
            "filename": filename,
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

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Upload thành công nhưng xử lý file thất bại",
            "error": str(e),
            "filename": filename
        }), 500