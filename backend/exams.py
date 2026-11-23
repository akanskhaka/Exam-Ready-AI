from datetime import date
from math import isfinite

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Exam, Subject

exams_bp = Blueprint(
    "exams",
    __name__,
    url_prefix="/api/exams"
)


def exam_schema(exam):
    return {
        "id": exam.id,
        "exam_name": exam.exam_name,
        "subject_id": exam.subject_id,
        "exam_date": exam.exam_date.isoformat(),
        "total_marks": exam.total_marks,
        "internal_marks": exam.internal_marks,
        "previous_marks": exam.previous_marks,
        "contents": exam.contents
    }


@exams_bp.route("", methods=["POST"])
@jwt_required()
def create_exam():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON request is required"}), 400

    exam_name = data.get("exam_name")
    exam_date = data.get("exam_date")
    contents = data.get("contents")
    subject_id = data.get("subject_id")
    if not isinstance(exam_name, str) or not exam_name.strip() or len(exam_name.strip()) > 200:
        return jsonify({"message": "Exam name is required and must be 200 characters or fewer"}), 400
    if not isinstance(exam_date, str):
        return jsonify({"message": "Exam date must use YYYY-MM-DD format"}), 400
    try:
        parsed_date = date.fromisoformat(exam_date)
    except ValueError:
        return jsonify({"message": "Exam date must use YYYY-MM-DD format"}), 400
    if parsed_date.isoformat() != exam_date:
        return jsonify({"message": "Exam date must use YYYY-MM-DD format"}), 400
    if contents is not None and not isinstance(contents, str):
        return jsonify({"message": "Exam topic must be text"}), 400

    if subject_id in ("", None):
        subject_id = None
    elif isinstance(subject_id, bool) or not isinstance(subject_id, int):
        return jsonify({"message": "Subject ID must be an integer"}), 400
    elif not Subject.query.filter_by(id=subject_id, user_id=user_id).first():
        return jsonify({"message": "Subject not found"}), 404

    numeric_values = {}
    for field, default in (
        ("total_marks", 100),
        ("internal_marks", 0),
        ("previous_marks", 0)
    ):
        value = data.get(field, default)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not isfinite(value)
            or value < 0
        ):
            return jsonify({"message": "{} must be a non-negative number".format(field)}), 400
        numeric_values[field] = value

    exam = Exam(
        user_id=user_id,
        subject_id=subject_id,
        exam_name=exam_name.strip(),
        exam_date=parsed_date,
        contents=contents.strip() if contents else None,
        **numeric_values
    )

    db.session.add(exam)
    db.session.commit()

    return jsonify(exam_schema(exam)), 201


@exams_bp.route("", methods=["GET"])
@jwt_required()
def get_exams():

    user_id = int(get_jwt_identity())

    exams = Exam.query.filter_by(
        user_id=user_id
    ).order_by(
        Exam.exam_date
    ).all()

    return jsonify([exam_schema(exam) for exam in exams])


@exams_bp.route("/<int:exam_id>", methods=["DELETE"])
@jwt_required()
def delete_exam(exam_id):
    exam = Exam.query.filter_by(
        id=exam_id,
        user_id=int(get_jwt_identity())
    ).first()
    if not exam:
        return jsonify({"message": "Exam not found"}), 404

    db.session.delete(exam)
    db.session.commit()
    return jsonify({"message": "Exam deleted"})