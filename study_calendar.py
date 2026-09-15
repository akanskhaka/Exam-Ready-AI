from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import CalendarEvent
from schemas import calendar_schema

calendar_bp = Blueprint(
    "calendar",
    __name__,
    url_prefix="/api/calendar"
)


@calendar_bp.route("", methods=["POST"])
@jwt_required()
def create_event():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    event = CalendarEvent(
        user_id=user_id,
        subject_id=data.get("subject_id"),
        title=data["title"],
        event_type=data["event_type"],
        event_date=date.fromisoformat(
            data["event_date"]
        ),
        description=data.get("description")
    )

    db.session.add(event)
    db.session.commit()

    return jsonify(
        calendar_schema(event)
    ), 201


@calendar_bp.route("", methods=["GET"])
@jwt_required()
def get_events():

    user_id = int(get_jwt_identity())

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)

    query = CalendarEvent.query.filter_by(
        user_id=user_id
    )

    if month and year:

        start_date = date(year, month, 1)

        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        query = query.filter(
            CalendarEvent.event_date >= start_date,
            CalendarEvent.event_date < end_date
        )

    events = query.order_by(
        CalendarEvent.event_date
    ).all()

    return jsonify([
        calendar_schema(event)
        for event in events
    ])