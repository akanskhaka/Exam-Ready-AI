
import os

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
from models import (
    CalendarEvent,
    ProgressSnapshot,
    Question,
    Quiz,
    QuizAttempt,
    StudySession,
    Subject,
    Topic,
    User
)


app = Flask(__name__)

# Frontend connection
CORS(app)

# Database connection
init_db(app)

# JWT configuration
app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY"
)

jwt = JWTManager(app)


# Register API blueprints
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

# Create only the tables needed by the connected calendar, subjects, and reports.
with app.app_context():
    db.metadata.create_all(bind=db.engine, tables=[
        User.__table__,
        Subject.__table__,
        Topic.__table__,
        CalendarEvent.__table__,
        Quiz.__table__,
        Question.__table__,
        QuizAttempt.__table__,
        StudySession.__table__,
        ProgressSnapshot.__table__
    ])


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


if __name__ == "__main__":

    app.run(
        debug=True,
        port=5002
    )
