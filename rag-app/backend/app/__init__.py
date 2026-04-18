# backend/app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.upload import upload_bp
from app.routes.chat import chat_bp
from app.routes.health import health_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    app.register_blueprint(upload_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(health_bp)

    return app