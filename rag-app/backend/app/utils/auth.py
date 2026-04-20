from functools import wraps

from flask import current_app, jsonify

from app.services.auth_service import get_session_user


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_app.config.get("REQUIRE_AUTH", False):
            return view(*args, **kwargs)
        user = get_session_user()
        if not user:
            return jsonify({
                "success": False,
                "message": "Vui long dang nhap de tiep tuc.",
            }), 401
        return view(*args, **kwargs)

    return wrapped
