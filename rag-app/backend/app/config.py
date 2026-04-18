# backend/app/config.py
import os


class Config:
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}

    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 100