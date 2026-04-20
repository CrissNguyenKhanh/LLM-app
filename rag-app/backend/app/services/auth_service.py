import json
import os
from typing import Any

from flask import current_app, session
from werkzeug.security import check_password_hash, generate_password_hash


def _users_db_path() -> str:
    return current_app.config["USERS_DB_PATH"]


def _ensure_storage() -> None:
    path = _users_db_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"users": []}, handle)


def _read_payload() -> dict[str, Any]:
    _ensure_storage()
    with open(_users_db_path(), "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        return {"users": []}
    users = data.get("users")
    if not isinstance(users, list):
        data["users"] = []
    return data


def _write_payload(payload: dict[str, Any]) -> None:
    _ensure_storage()
    with open(_users_db_path(), "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=True, indent=2)


def _normalize_username(username: str) -> str:
    return (username or "").strip().lower()


def sanitize_user(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "username": record["username"],
        "display_name": record.get("display_name") or record["username"],
    }


def find_user(username: str) -> dict[str, Any] | None:
    normalized = _normalize_username(username)
    payload = _read_payload()
    for user in payload["users"]:
        if _normalize_username(user.get("username", "")) == normalized:
            return user
    return None


def create_user(username: str, password: str, display_name: str | None = None) -> dict[str, Any]:
    payload = _read_payload()
    normalized = _normalize_username(username)
    if not normalized:
        raise ValueError("Username khong duoc de trong.")
    if len(normalized) < 3:
        raise ValueError("Username phai co it nhat 3 ky tu.")
    if len(password or "") < 6:
        raise ValueError("Mat khau phai co it nhat 6 ky tu.")
    if find_user(normalized):
        raise ValueError("Username da ton tai.")

    record = {
        "username": normalized,
        "display_name": (display_name or normalized).strip() or normalized,
        "password_hash": generate_password_hash(password),
    }
    payload["users"].append(record)
    _write_payload(payload)
    return sanitize_user(record)


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    user = find_user(username)
    if not user:
        return None
    if not check_password_hash(user["password_hash"], password or ""):
        return None
    return sanitize_user(user)


def login_user(user: dict[str, Any]) -> None:
    session["user"] = user


def logout_user() -> None:
    session.clear()
    session.modified = True


def get_session_user() -> dict[str, Any] | None:
    user = session.get("user")
    if not isinstance(user, dict):
        return None
    username = user.get("username")
    if not username:
        return None
    stored_user = find_user(username)
    if not stored_user:
        session.pop("user", None)
        return None
    sanitized = sanitize_user(stored_user)
    session["user"] = sanitized
    return sanitized
