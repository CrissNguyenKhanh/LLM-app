import os

from flask import Blueprint, current_app, jsonify, request, session

from app.services.document_registry_service import delete_document_record, list_documents
from app.services.vector_store_service import (
    delete_document_from_keyword_store,
    delete_document_from_vector_store,
)
from app.utils.auth import require_auth

documents_bp = Blueprint("documents", __name__)


def _get_active_document() -> str:
    return str(session.get("active_document") or "").strip()


def _set_active_document(filename: str) -> None:
    filename = (filename or "").strip()
    session["active_document"] = filename


@documents_bp.route("/api/documents", methods=["GET"])
@require_auth
def get_documents():
    docs = list_documents()
    return jsonify(
        {
            "success": True,
            "documents": docs,
            "active_document": _get_active_document(),
        }
    ), 200


@documents_bp.route("/api/documents/active", methods=["POST"])
@require_auth
def set_active_document():
    data = request.get_json(silent=True) or {}
    filename = (data.get("filename") or "").strip()
    if not filename:
        _set_active_document("")
        return jsonify({"success": True, "active_document": ""}), 200

    uploads_dir = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(uploads_dir, filename)
    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "Tai lieu khong ton tai."}), 404

    _set_active_document(filename)
    return jsonify({"success": True, "active_document": filename}), 200


@documents_bp.route("/api/documents/<path:filename>", methods=["DELETE"])
@require_auth
def delete_document(filename: str):
    filename = (filename or "").strip()
    if not filename:
        return jsonify({"success": False, "message": "filename is required"}), 400

    uploads_dir = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(uploads_dir, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as exc:
            return jsonify({"success": False, "message": "Khong xoa duoc file.", "error": str(exc)}), 500

    delete_document_from_vector_store(filename)
    delete_document_from_keyword_store(filename)
    delete_document_record(filename)

    if _get_active_document() == filename:
        _set_active_document("")

    return jsonify({"success": True, "deleted": filename}), 200

