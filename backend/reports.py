from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import (
    ProgressSnapshot,
    StudySession,
    QuizAttempt
)

reports_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/api/reports"
)


@reports_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard_report():

    user_id = int(get_jwt_identity())

    snapshots = ProgressSnapshot.query.filter_by(
        user_id=user_id
    ).order_by(
        ProgressSnapshot.recorded_at
    ).all()

    study_sessions = StudySession.query.filter_by(
        user_id=user_id
    ).order_by(
        StudySession.study_date
    ).all()

    quiz_attempts = QuizAttempt.query.filter_by(
        user_id=user_id
    ).order_by(
        QuizAttempt.attempted_at
    ).all()

    return jsonify({

        "progress": [
            {
                "date": snapshot.recorded_at.isoformat(),
                "syllabus": snapshot.syllabus_completion,
                "quiz": snapshot.quiz_average,
                "readiness": snapshot.readiness_score
            }
            for snapshot in snapshots
        ],

        "study_time": [
            {
                "date": session.study_date.isoformat(),
                "minutes": session.duration_minutes
            }
            for session in study_sessions
        ],

        "quiz_scores": [
            {
                "date": attempt.attempted_at.isoformat(),
                "score": attempt.score,
                "total": attempt.total_marks
            }
            for attempt in quiz_attempts
        ]
    })