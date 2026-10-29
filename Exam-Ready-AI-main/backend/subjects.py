from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Subject, Topic
from schemas import subject_schema, topic_schema

subjects_bp = Blueprint(
    "subjects",
    __name__,
    url_prefix="/api/subjects"
)


@subjects_bp.route("", methods=["POST"])
@jwt_required()
def add_subject():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    name = data.get("name")
    description = data.get("description", "")

    if not name:
        return jsonify({
            "message": "Subject name is required"
        }), 400

    subject = Subject(
        name=name,
        description=description,
        user_id=user_id
    )

    db.session.add(subject)
    db.session.commit()

    return jsonify(
        subject_schema(subject)
    ), 201


@subjects_bp.route("", methods=["GET"])
@jwt_required()
def get_subjects():

    user_id = int(get_jwt_identity())

    subjects = Subject.query.filter_by(
        user_id=user_id
    ).all()

    return jsonify([
        subject_schema(subject)
        for subject in subjects
    ])


@subjects_bp.route("/<int:subject_id>", methods=["DELETE"])
@jwt_required()
def delete_subject(subject_id):

    user_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    db.session.delete(subject)
    db.session.commit()

    return jsonify({
        "message": "Subject deleted"
    })


@subjects_bp.route("/<int:subject_id>/topics", methods=["POST"])
@jwt_required()
def add_topic(subject_id):

    user_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    data = request.get_json()

    topic = Topic(
        name=data.get("name"),
        subject_id=subject_id
    )

    db.session.add(topic)
    db.session.commit()

    return jsonify(
        topic_schema(topic)
    ), 201


@subjects_bp.route("/<int:subject_id>/topics", methods=["GET"])
@jwt_required()
def get_topics(subject_id):

    user_id = int(get_jwt_identity())

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    return jsonify([
        topic_schema(topic)
        for topic in subject.topics
    ])


@subjects_bp.route("/topics/<int:topic_id>/complete", methods=["PUT"])
@jwt_required()
def complete_topic(topic_id):

    user_id = int(get_jwt_identity())

    topic = Topic.query.get(topic_id)

    if not topic or topic.subject.user_id != user_id:
        return jsonify({
            "message": "Topic not found"
        }), 404

    topic.completed = True

    db.session.commit()

    return jsonify({
        "message": "Topic marked as completed"
    })