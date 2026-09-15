from datetime import date

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import (
    Exam,
    Subject,
    Topic,
    QuizAttempt,
    StudySession,
    Revision
)

readiness_bp = Blueprint(
    "readiness",
    __name__,
    url_prefix="/api/readiness"
)


@readiness_bp.route(
    "/subject/<int:subject_id>",
    methods=["GET"]
)
@jwt_required()
def calculate_readiness(subject_id):

    user_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    # -----------------------------
    # SYLLABUS
    # -----------------------------

    topics = Topic.query.filter_by(
        subject_id=subject_id
    ).all()

    total_topics = len(topics)

    completed_topics = sum(
        topic.completed
        for topic in topics
    )

    syllabus_score = (
        completed_topics /
        total_topics *
        100
        if total_topics else 0
    )

    # -----------------------------
    # QUIZ
    # -----------------------------

    attempts = QuizAttempt.query.join(
        QuizAttempt.quiz
    ).filter(
        QuizAttempt.user_id == user_id
    ).all()

    subject_attempts = [
        a for a in attempts
        if a.quiz.subject_id == subject_id
    ]

    quiz_scores = [
        a.score / a.total_marks * 100
        for a in subject_attempts
        if a.total_marks > 0
    ]

    quiz_score = (
        sum(quiz_scores) /
        len(quiz_scores)
        if quiz_scores else 0
    )

    # -----------------------------
    # STUDY TIME
    # -----------------------------

    sessions = StudySession.query.filter_by(
        user_id=user_id,
        subject_id=subject_id
    ).all()

    total_minutes = sum(
        session.duration_minutes
        for session in sessions
    )

    study_score = min(
        total_minutes / 600 * 100,
        100
    )

    # -----------------------------
    # REVISION
    # -----------------------------

    revisions = Revision.query.filter_by(
        user_id=user_id,
        subject_id=subject_id,
        status="completed"
    ).count()

    revision_score = min(
        revisions / 5 * 100,
        100
    )

    # -----------------------------
    # EXAM
    # -----------------------------

    exam = Exam.query.filter_by(
        user_id=user_id,
        subject_id=subject_id
    ).order_by(
        Exam.exam_date
    ).first()

    days_remaining = None

    if exam:

        days_remaining = (
            exam.exam_date -
            date.today()
        ).days

    # -----------------------------
    # FINAL READINESS
    # -----------------------------

    readiness_score = (
        syllabus_score * 0.35 +
        quiz_score * 0.25 +
        study_score * 0.15 +
        revision_score * 0.15 +
        10
    )

    readiness_score = min(
        readiness_score,
        100
    )

    if readiness_score >= 80:
        status = "Excellent"
    elif readiness_score >= 60:
        status = "Good"
    elif readiness_score >= 40:
        status = "Needs Improvement"
    else:
        status = "At Risk"

    return jsonify({
        "subject_id": subject.id,
        "subject": subject.name,

        "syllabus_completion": round(
            syllabus_score,
            2
        ),

        "quiz_performance": round(
            quiz_score,
            2
        ),

        "study_time_minutes": total_minutes,

        "revision_count": revisions,

        "days_remaining": days_remaining,

        "readiness_score": round(
            readiness_score,
            2
        ),

        "status": status
    })