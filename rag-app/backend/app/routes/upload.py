# backend/app/routes/upload.py
import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.services.document_service import extract_text

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
        preview = extracted_text[:500]

        return jsonify({
            "success": True,
            "message": "Upload và parse file thành công",
            "filename": filename,
            "file_type": extension,
            "char_count": len(extracted_text),
            "preview": preview
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Upload thành công nhưng parse file thất bại",
            "error": str(e),
            "filename": filename
        }), 500