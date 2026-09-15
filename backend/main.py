from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import db, init_db

from auth import auth_bp
from students import students_bp
from subjects import subjects_bp
from schedules import schedules_bp
from revisions import revisions_bp
from quizzes import quizzes_bp
from exams import exams_bp
from study_calendar import calendar_bp
from progress import progress_bp
from analytics import analytics_bp
from readiness import readiness_bp
from reports import reports_bp

import os
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)

CORS(app)

init_db(app)

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY"
)

jwt = JWTManager(app)


# -----------------------------
# REGISTER BLUEPRINTS
# -----------------------------

app.register_blueprint(auth_bp)
app.register_blueprint(students_bp)
app.register_blueprint(subjects_bp)
app.register_blueprint(schedules_bp)
app.register_blueprint(revisions_bp)
app.register_blueprint(quizzes_bp)
app.register_blueprint(exams_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(progress_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(readiness_bp)
app.register_blueprint(reports_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "StudyAI Backend is running"
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "StudyAI API is working"
    })


# -----------------------------
# CREATE DATABASE TABLES
# -----------------------------

with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(
        debug=True,
        port=5002
    )