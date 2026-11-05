from math import isfinite

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import CalendarEvent, QuizAttempt, Subject, Topic
from schemas import subject_schema, topic_schema

subjects_bp = Blueprint(
    "subjects",
    __name__,
    url_prefix="/api/subjects"
)

TOPIC_STATUSES = {"not-started", "in-progress", "completed"}


def json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return data


@subjects_bp.route("", methods=["POST"])
@jwt_required()
def add_subject():
    data = json_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    name = data.get("name")
    description = data.get("description", "")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 150:
        return jsonify({"message": "Subject name is required and must be 150 characters or fewer"}), 400
    if not isinstance(description, str):
        return jsonify({"message": "Description must be text"}), 400

    subject = Subject(
        name=name.strip(),
        description=description.strip(),
        user_id=int(get_jwt_identity())
    )
    db.session.add(subject)
    db.session.commit()
    return jsonify(subject_schema(subject)), 201


@subjects_bp.route("", methods=["GET"])
@jwt_required()
def get_subjects():
    subjects = Subject.query.filter_by(
        user_id=int(get_jwt_identity())
    ).order_by(Subject.id).all()
    return jsonify([subject_schema(subject) for subject in subjects])


@subjects_bp.route("/<int:subject_id>", methods=["PUT"])
@jwt_required()
def update_subject(subject_id):
    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=int(get_jwt_identity())
    ).first()
    if not subject:
        return jsonify({"message": "Subject not found"}), 404

    data = json_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    if "name" in data:
        name = data["name"]
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 150:
            return jsonify({"message": "Subject name is required and must be 150 characters or fewer"}), 400
        subject.name = name.strip()

    if "description" in data:
        description = data["description"]
        if not isinstance(description, str):
            return jsonify({"message": "Description must be text"}), 400
        subject.description = description.strip()

    db.session.commit()
    return jsonify(subject_schema(subject))


@subjects_bp.route("/<int:subject_id>", methods=["DELETE"])
@jwt_required()
def delete_subject(subject_id):
    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=int(get_jwt_identity())
    ).first()
    if not subject:
        return jsonify({"message": "Subject not found"}), 404

    CalendarEvent.query.filter_by(subject_id=subject.id).update(
        {CalendarEvent.subject_id: None},
        synchronize_session=False
    )
    QuizAttempt.query.filter_by(subject_id=subject.id).update(
        {QuizAttempt.subject_id: None},
        synchronize_session=False
    )
    db.session.delete(subject)
    db.session.commit()
    return jsonify({"message": "Subject deleted"})


@subjects_bp.route("/<int:subject_id>/topics", methods=["POST"])
@jwt_required()
def add_topic(subject_id):
    user_id = int(get_jwt_identity())
    subject = Subject.query.filter_by(id=subject_id, user_id=user_id).first()
    if not subject:
        return jsonify({"message": "Subject not found"}), 404

    data = json_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    name = data.get("name")
    unit = data.get("unit", "General")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
        return jsonify({"message": "Topic name is required and must be 200 characters or fewer"}), 400
    if not isinstance(unit, str) or not unit.strip() or len(unit.strip()) > 80:
        return jsonify({"message": "Unit must be 80 characters or fewer"}), 400

    topic = Topic(
        name=name.strip(),
        unit=unit.strip(),
        subject_id=subject.id
    )
    db.session.add(topic)
    db.session.commit()
    return jsonify(topic_schema(topic)), 201


@subjects_bp.route("/<int:subject_id>/topics", methods=["GET"])
@jwt_required()
def get_topics(subject_id):
    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=int(get_jwt_identity())
    ).first()
    if not subject:
        return jsonify({"message": "Subject not found"}), 404
    return jsonify([topic_schema(topic) for topic in subject.topics])


@subjects_bp.route("/topics/<int:topic_id>", methods=["PUT"])
@jwt_required()
def update_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == int(get_jwt_identity())
    ).first()
    if not topic:
        return jsonify({"message": "Topic not found"}), 404

    data = json_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    if "name" in data:
        name = data["name"]
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
            return jsonify({"message": "Topic name is required and must be 200 characters or fewer"}), 400
        topic.name = name.strip()

    if "unit" in data:
        unit = data["unit"]
        if not isinstance(unit, str) or not unit.strip() or len(unit.strip()) > 80:
            return jsonify({"message": "Unit must be 80 characters or fewer"}), 400
        topic.unit = unit.strip()

    if "completed" in data:
        if not isinstance(data["completed"], bool):
            return jsonify({"message": "completed must be a boolean"}), 400
        topic.completed = data["completed"]
        topic.status = "completed" if topic.completed else "not-started"

    if "status" in data:
        status = data["status"]
        if not isinstance(status, str) or status not in TOPIC_STATUSES:
            return jsonify({"message": "Invalid topic status"}), 400
        topic.status = status
        topic.completed = status == "completed"

    if "mastery" in data:
        mastery = data["mastery"]
        if isinstance(mastery, bool) or not isinstance(mastery, (int, float)):
            return jsonify({"message": "Mastery must be a number from 0 to 100"}), 400
        if not isfinite(mastery) or not 0 <= mastery <= 100:
            return jsonify({"message": "Mastery must be a number from 0 to 100"}), 400
        topic.mastery = mastery

    db.session.commit()
    return jsonify(topic_schema(topic))


@subjects_bp.route("/topics/<int:topic_id>", methods=["DELETE"])
@jwt_required()
def delete_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == int(get_jwt_identity())
    ).first()
    if not topic:
        return jsonify({"message": "Topic not found"}), 404

    db.session.delete(topic)
    db.session.commit()
    return jsonify({"message": "Topic deleted"})


@subjects_bp.route("/topics/<int:topic_id>/complete", methods=["PUT"])
@jwt_required()
def complete_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == int(get_jwt_identity())
    ).first()
    if not topic:
        return jsonify({"message": "Topic not found"}), 404

    topic.completed = True
    topic.status = "completed"
    db.session.commit()
    return jsonify({"message": "Topic marked as completed"})
