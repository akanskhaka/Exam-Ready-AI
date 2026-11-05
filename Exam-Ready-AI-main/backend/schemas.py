
# ==========================================
# SUBJECT SCHEMA
# ==========================================

def subject_schema(subject):
    return {
        "id": subject.id,
        "name": subject.name,
        "description": subject.description,
        "topics": [
            topic_schema(topic)
            for topic in subject.topics
        ],
        "created_at": (
            subject.created_at.isoformat()
            if subject.created_at else None
        )
    }


# ==========================================
# TOPIC SCHEMA
# ==========================================

def topic_schema(topic):
    return {
        "id": topic.id,
        "subject_id": topic.subject_id,
        "name": topic.name,
        "unit": topic.unit,
        "completed": topic.completed,
        "status": topic.status,
        "mastery": topic.mastery
    }


# ==========================================
# SCHEDULE SCHEMA
# ==========================================

def schedule_schema(schedule):
    return {
        "id": schedule.id,
        "user_id": schedule.user_id,
        "subject_id": schedule.subject_id,
        "title": schedule.title,
        "description": schedule.description,
        "start_time": (
            schedule.start_time.isoformat()
            if schedule.start_time else None
        ),
        "end_time": (
            schedule.end_time.isoformat()
            if schedule.end_time else None
        ),
        "status": schedule.status
    }


# ==========================================
# REVISION SCHEMA
# ==========================================

def revision_schema(revision):
    return {
        "id": revision.id,
        "user_id": revision.user_id,
        "subject_id": revision.subject_id,
        "topic": revision.topic,
        "revision_date": (
            revision.revision_date.isoformat()
            if revision.revision_date else None
        ),
        "notes": revision.notes,
        "status": revision.status
    }


# ==========================================
# CALENDAR SCHEMA
# ==========================================

def calendar_schema(event):
    return {
        "id": event.id,
        "subject_id": event.subject_id,
        "title": event.title,
        "event_type": event.event_type,
        "event_date": (
            event.event_date.isoformat()
            if event.event_date else None
        ),
        "event_time": (
            event.event_time.strftime("%H:%M")
            if event.event_time else None
        ),
        "description": event.description,
        "reminder_minutes": event.reminder_minutes
    }
