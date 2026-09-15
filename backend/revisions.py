from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Revision
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

    data = request.get_json()

    revision = Revision(
        user_id=user_id,
        subject_id=data["subject_id"],
        topic=data["topic"],
        revision_date=date.fromisoformat(
            data["revision_date"]
        ),
        notes=data.get("notes")
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