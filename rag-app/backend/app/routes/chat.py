# backend/app/routes/chat.py
from flask import Blueprint, request, jsonify

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()

    question = data.get("question") if data else None

    if not question:
        return jsonify({
            "success": False,
            "message": "Thiếu question"
        }), 400

    return jsonify({
        "success": True,
        "answer": f"Bạn vừa hỏi: {question}",
        "sources": []
    }), 200