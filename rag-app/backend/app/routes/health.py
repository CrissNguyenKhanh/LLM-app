# backend/app/routes/health.py
from flask import Blueprint, jsonify, current_app
from app.services.embedding_service import probe_llm_backend, get_llm_base_url
from app.services.auth_service import get_session_user

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health_check():
    llm_ok, llm_detail = probe_llm_backend()
    user = get_session_user()
    return jsonify({
        "success": True,
        "message": "Server is running",
        "require_auth": bool(current_app.config.get("REQUIRE_AUTH", False)),
        "authenticated": bool(user),
        "user": user,
        "llm_base_url": current_app.config.get("OPENAI_BASE_URL", get_llm_base_url()),
        "llm_backend_reachable": llm_ok,
        "llm_backend_detail": llm_detail,
    }), 200
