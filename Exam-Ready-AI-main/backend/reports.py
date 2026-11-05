from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload

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
    ).options(
        joinedload(QuizAttempt.quiz),
        joinedload(QuizAttempt.subject)
    ).order_by(
        QuizAttempt.attempted_at
    ).all()

    quiz_history = []
    for attempt in quiz_attempts:
        quiz_history.append({
            "id": attempt.id,
            "name": attempt.quiz_name or (
                attempt.quiz.title if attempt.quiz else "Quiz"
            ),
            "subject_id": attempt.subject_id,
            "subject_name": attempt.subject.name if attempt.subject else None,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "percentage": (
                round(attempt.score / attempt.total_marks * 100, 2)
                if attempt.total_marks else 0
            ),
            "attempted_at": (
                attempt.attempted_at.isoformat()
                if attempt.attempted_at else None
            )
        })

    total_correct = sum(attempt.correct_answers for attempt in quiz_attempts)
    total_questions = sum(attempt.total_questions for attempt in quiz_attempts)

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
        ],
        "quiz_attempts": quiz_history,
        "quiz_statistics": {
            "attempts": len(quiz_attempts),
            "average_percentage": (
                round(
                    sum(item["percentage"] for item in quiz_history) / len(quiz_history),
                    2
                )
                if quiz_history else 0
            ),
            "correct_answers": total_correct,
            "total_questions": total_questions
        }
    })