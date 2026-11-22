from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Revision, Subject
from schemas import revision_schema

revisions_bp = Blueprint(
    "revisions",
    __name__,
    url_prefix="/api/revisions"
)


@revisions_bp.route("", methods=["POST"])
@jwt_required()
def create_revision():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON request is required"}), 400

    subject_id = data.get("subject_id")
    topic = data.get("topic")
    revision_date = data.get("revision_date")
    notes = data.get("notes")
    if isinstance(subject_id, bool) or not isinstance(subject_id, int):
        return jsonify({"message": "A valid subject ID is required"}), 400
    if not Subject.query.filter_by(id=subject_id, user_id=user_id).first():
        return jsonify({"message": "Subject not found"}), 404
    if not isinstance(topic, str) or not topic.strip() or len(topic.strip()) > 200:
        return jsonify({"message": "Topic is required and must be 200 characters or fewer"}), 400
    if not isinstance(revision_date, str):
        return jsonify({"message": "Revision date must use YYYY-MM-DD format"}), 400
    try:
        parsed_date = date.fromisoformat(revision_date)
    except ValueError:
        return jsonify({"message": "Revision date must use YYYY-MM-DD format"}), 400
    if parsed_date.isoformat() != revision_date:
        return jsonify({"message": "Revision date must use YYYY-MM-DD format"}), 400
    if notes is not None and not isinstance(notes, str):
        return jsonify({"message": "Notes must be text"}), 400

    revision = Revision(
        user_id=user_id,
        subject_id=subject_id,
        topic=topic.strip(),
        revision_date=parsed_date,
        notes=notes.strip() if notes else None
    )

    db.session.add(revision)
    db.session.commit()

    return jsonify(
        revision_schema(revision)
    ), 201


@revisions_bp.route("", methods=["GET"])
@jwt_required()
def get_revisions():

    user_id = int(get_jwt_identity())

    revisions = Revision.query.filter_by(
        user_id=user_id
    ).order_by(
        Revision.revision_date
    ).all()

    return jsonify([
        revision_schema(revision)
        for revision in revisions
    ])


@revisions_bp.route(
    "/<int:revision_id>/complete",
    methods=["PUT"]
)
@jwt_required()
def complete_revision(revision_id):

    user_id = int(get_jwt_identity())

    revision = Revision.query.filter_by(
        id=revision_id,
        user_id=user_id
    ).first()

    if not revision:
        return jsonify({
            "message": "Revision not found"
        }), 404

    revision.status = "completed"

    db.session.commit()

    return jsonify({
        "message": "Revision completed"
    })