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
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    VECTOR_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
    CHROMA_COLLECTION_NAME = "documents"

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}

    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 100
    TOP_K = 4

    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", _default_embedding)
    CHAT_MODEL = os.getenv("CHAT_MODEL", _default_chat)
    OPENAI_BASE_URL = _llm_base
    DOCKER_LINKS = ""
