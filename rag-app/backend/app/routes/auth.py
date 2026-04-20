from flask import Blueprint, current_app, jsonify, request

from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_session_user,
    login_user,
    logout_user,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip()

    try:
        user = create_user(username=username, password=password, display_name=display_name)
        login_user(user)
    except ValueError as exc:
        return jsonify({
            "success": False,
            "message": str(exc),
        }), 400

    return jsonify({
        "success": True,
        "message": "Dang ky thanh cong.",
        "user": user,
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = authenticate_user(username=username, password=password)
    if not user:
        return jsonify({
            "success": False,
            "message": "Sai username hoac mat khau.",
        }), 401

    login_user(user)
    return jsonify({
        "success": True,
        "message": "Dang nhap thanh cong.",
        "user": user,
    }), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
def me():
    user = get_session_user()
    return jsonify({
        "success": True,
        "authenticated": bool(user),
        "user": user,
    }), 200


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    logout_user()
    response = jsonify({
        "success": True,
        "message": "Da dang xuat.",
    })
    response.delete_cookie(
        current_app.config.get("SESSION_COOKIE_NAME", "session"),
        path="/",
        samesite=current_app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
        secure=current_app.config.get("SESSION_COOKIE_SECURE", False),
        httponly=current_app.config.get("SESSION_COOKIE_HTTPONLY", True),
    )
    return response, 200
