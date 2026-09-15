from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import Subject, Topic

progress_bp = Blueprint(
    "progress",
    __name__,
    url_prefix="/api/progress"
)


@progress_bp.route(
    "/subject/<int:subject_id>",
    methods=["GET"]
)
@jwt_required()
def subject_progress(subject_id):

    user_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    topics = Topic.query.filter_by(
        subject_id=subject_id
    ).all()

    total_topics = len(topics)

    completed_topics = sum(
        1 for topic in topics
        if topic.completed
    )

    percentage = (
        completed_topics / total_topics * 100
        if total_topics > 0
        else 0
    )

    return jsonify({
        "subject_id": subject.id,
        "subject": subject.name,
        "total_topics": total_topics,
        "completed_topics": completed_topics,
        "completion_percentage": round(
            percentage,
            2
        )
    })