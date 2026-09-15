from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Schedule
from schemas import schedule_schema

schedules_bp = Blueprint(
    "schedules",
    __name__,
    url_prefix="/api/schedules"
)


@schedules_bp.route("", methods=["POST"])
@jwt_required()
def create_schedule():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    schedule = Schedule(
        user_id=user_id,
        subject_id=data.get("subject_id"),
        title=data.get("title"),
        description=data.get("description"),
        start_time=datetime.fromisoformat(
            data["start_time"]
        ),
        end_time=(
            datetime.fromisoformat(data["end_time"])
            if data.get("end_time")
            else None
        )
    )

    db.session.add(schedule)
    db.session.commit()

    return jsonify(
        schedule_schema(schedule)
    ), 201


@schedules_bp.route("", methods=["GET"])
@jwt_required()
def get_schedules():

    user_id = int(get_jwt_identity())

    schedules = Schedule.query.filter_by(
        user_id=user_id
    ).order_by(
        Schedule.start_time
    ).all()

    return jsonify([
        schedule_schema(schedule)
        for schedule in schedules
    ])


@schedules_bp.route("/<int:schedule_id>/complete", methods=["PUT"])
@jwt_required()
def complete_schedule(schedule_id):

    user_id = int(get_jwt_identity())

    schedule = Schedule.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return jsonify({
            "message": "Schedule not found"
        }), 404

    schedule.status = "completed"

    db.session.commit()

    return jsonify({
        "message": "Schedule completed"
    })