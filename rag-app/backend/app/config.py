# backend/app/config.py
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _resolved_openai_base_url() -> str:
    explicit = os.getenv("OPENAI_BASE_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    return "http://127.0.0.1:11434/v1"


_llm_base = _resolved_openai_base_url()
_use_openai_cloud_defaults = "api.openai.com" in _llm_base.lower()
_default_embedding = "text-embedding-3-small" if _use_openai_cloud_defaults else "nomic-embed-text"
_default_chat = "gpt-4o-mini" if _use_openai_cloud_defaults else "llama3.2"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "rag_app_session")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "false").lower() == "true"
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    VECTOR_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
    USERS_DB_PATH = os.path.join(BASE_DIR, "data", "users.json")
    CHROMA_COLLECTION_NAME = "documents"
    FRONTEND_ORIGINS = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}

    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 100
    TOP_K = 2
    MIN_KEYWORD_SCORE = 1
    MAX_VECTOR_DISTANCE = float(os.getenv("MAX_VECTOR_DISTANCE", "1.2"))
    REPLACE_INDEX_ON_UPLOAD = os.getenv("REPLACE_INDEX_ON_UPLOAD", "false").lower() == "true"

    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", _default_embedding)
    CHAT_MODEL = os.getenv("CHAT_MODEL", _default_chat)
    OPENAI_BASE_URL = _llm_base
    DOCKER_LINKS = ""
