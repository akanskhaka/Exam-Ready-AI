from datetime import date, time

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import CalendarEvent, Subject
from schemas import calendar_schema

calendar_bp = Blueprint(
    "calendar",
    __name__,
    url_prefix="/api/calendar"
)


def parse_event(data, user_id):
    if not isinstance(data, dict):
        return None, "A valid JSON request is required"

    title = data.get("title")
    event_type = data.get("event_type")
    event_date = data.get("event_date")
    description = data.get("description", "")
    time_value = data.get("event_time")
    reminder = data.get("reminder_minutes")
    subject_id = data.get("subject_id")

    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 200:
        return None, "Event title is required and must be 200 characters or fewer"
    if not isinstance(event_type, str) or not event_type.strip() or len(event_type.strip()) > 50:
        return None, "Event type is required and must be 50 characters or fewer"
    if not isinstance(event_date, str):
        return None, "A valid event date is required"
    try:
        parsed_date = date.fromisoformat(event_date)
    except ValueError:
        return None, "Event date must use YYYY-MM-DD format"

    if not isinstance(description, str):
        return None, "Description must be text"

    parsed_time = None
    if time_value not in (None, ""):
        if not isinstance(time_value, str):
            return None, "Event time must use HH:MM format"
        try:
            parsed_time = time.fromisoformat(time_value)
        except ValueError:
            return None, "Event time must use HH:MM format"
        if parsed_time.second or parsed_time.microsecond:
            return None, "Event time must use HH:MM format"

    if reminder == "":
        reminder = None
    if reminder is not None and (
        isinstance(reminder, bool) or not isinstance(reminder, int) or not 0 <= reminder <= 10080
    ):
        return None, "Reminder must be between 0 and 10080 minutes"

    if subject_id in ("", None):
        subject_id = None
    elif isinstance(subject_id, bool) or not isinstance(subject_id, int):
        return None, "Subject ID must be an integer"
    elif not Subject.query.filter_by(id=subject_id, user_id=user_id).first():
        return None, "Subject not found"

    return {
        "title": title.strip(),
        "event_type": event_type.strip(),
        "event_date": parsed_date,
        "event_time": parsed_time,
        "description": description.strip() or None,
        "reminder_minutes": reminder,
        "subject_id": subject_id
    }, None


@calendar_bp.route("", methods=["POST"])
@jwt_required()
def create_event():
    user_id = int(get_jwt_identity())
    values, error = parse_event(request.get_json(silent=True), user_id)
    if error:
        return jsonify({"message": error}), 400

    event = CalendarEvent(user_id=user_id, **values)
    db.session.add(event)
    db.session.commit()
    return jsonify(calendar_schema(event)), 201


@calendar_bp.route("", methods=["GET"])
@jwt_required()
def get_events():
    month_value = request.args.get("month")
    year_value = request.args.get("year")
    try:
        month = int(month_value) if month_value is not None else None
        year = int(year_value) if year_value is not None else None
    except ValueError:
        return jsonify({"message": "Month and year must be integers"}), 400
    if (month is None) != (year is None):
        return jsonify({"message": "Both month and year are required"}), 400
    if month is not None and not 1 <= month <= 12:
        return jsonify({"message": "Month must be between 1 and 12"}), 400
    if year is not None and not 1 <= year <= 9998:
        return jsonify({"message": "Year is out of range"}), 400

    query = CalendarEvent.query.filter_by(user_id=int(get_jwt_identity()))
    if month is not None and year is not None:
        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        query = query.filter(
            CalendarEvent.event_date >= start_date,
            CalendarEvent.event_date < end_date
        )

    events = query.order_by(
        CalendarEvent.event_date,
        CalendarEvent.event_time,
        CalendarEvent.id
    ).all()
    return jsonify([calendar_schema(event) for event in events])


@calendar_bp.route("/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id):
    user_id = int(get_jwt_identity())
    event = CalendarEvent.query.filter_by(id=event_id, user_id=user_id).first()
    if not event:
        return jsonify({"message": "Event not found"}), 404

    values, error = parse_event(request.get_json(silent=True), user_id)
    if error:
        return jsonify({"message": error}), 400

    for key, value in values.items():
        setattr(event, key, value)
    db.session.commit()
    return jsonify(calendar_schema(event))


@calendar_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    event = CalendarEvent.query.filter_by(
        id=event_id,
        user_id=int(get_jwt_identity())
    ).first()
    if not event:
        return jsonify({"message": "Event not found"}), 404

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted"})
