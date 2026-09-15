from database import db
from sqlalchemy import func

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import (
    StudySession,
    QuizAttempt
)

analytics_bp = Blueprint(
    "analytics",
    __name__,
    url_prefix="/api/analytics"
)


@analytics_bp.route("/study-time", methods=["GET"])
@jwt_required()
def study_time():

    user_id = int(get_jwt_identity())

    total_minutes = db.session.query(
        func.coalesce(
            func.sum(
                StudySession.duration_minutes
            ),
            0
        )
    ).filter(
        StudySession.user_id == user_id
    ).scalar()

    return jsonify({
        "total_minutes": total_minutes,
        "total_hours": round(
            total_minutes / 60,
            2
        )
    })


@analytics_bp.route("/quiz-performance", methods=["GET"])
@jwt_required()
def quiz_performance():

    user_id = int(get_jwt_identity())

    attempts = QuizAttempt.query.filter_by(
        user_id=user_id
    ).order_by(
        QuizAttempt.attempted_at
    ).all()

    results = []

    for attempt in attempts:

        percentage = (
            attempt.score /
            attempt.total_marks *
            100
            if attempt.total_marks > 0
            else 0
        )

        results.append({
            "quiz_id": attempt.quiz_id,
            "score": attempt.score,
            "total": attempt.total_marks,
            "percentage": round(
                percentage,
                2
            ),
            "date": attempt.attempted_at.isoformat()
        })

    return jsonify(results)