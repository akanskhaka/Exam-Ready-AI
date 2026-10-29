from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Exam

exams_bp = Blueprint(
    "exams",
    __name__,
    url_prefix="/api/exams"
)


@exams_bp.route("", methods=["POST"])
@jwt_required()
def create_exam():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    exam = Exam(
        user_id=user_id,
        subject_id=data.get("subject_id"),
        exam_name=data["exam_name"],
        exam_date=date.fromisoformat(
            data["exam_date"]
        ),
        total_marks=data.get("total_marks", 100),
        internal_marks=data.get("internal_marks", 0),
        previous_marks=data.get("previous_marks", 0),
        contents=data.get("contents")
    )

    db.session.add(exam)
    db.session.commit()

    return jsonify({
        "message": "Exam created",
        "exam": {
            "id": exam.id,
            "exam_name": exam.exam_name,
            "exam_date": exam.exam_date.isoformat()
        }
    }), 201


@exams_bp.route("", methods=["GET"])
@jwt_required()
def get_exams():

    user_id = int(get_jwt_identity())

    exams = Exam.query.filter_by(
        user_id=user_id
    ).order_by(
        Exam.exam_date
    ).all()

    return jsonify([
        {
            "id": exam.id,
            "exam_name": exam.exam_name,
            "subject_id": exam.subject_id,
            "exam_date": exam.exam_date.isoformat(),
            "total_marks": exam.total_marks,
            "internal_marks": exam.internal_marks,
            "previous_marks": exam.previous_marks,
            "contents": exam.contents
        }
        for exam in exams
    ])