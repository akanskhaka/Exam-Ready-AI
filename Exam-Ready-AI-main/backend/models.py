
from datetime import datetime, date

from database import db


# ==========================================
# USER
# ==========================================

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        "user_id",
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        "full_name",
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    subjects = db.relationship(
        "Subject",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# ==========================================
# SUBJECT
# ==========================================

class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user = db.relationship(
        "User",
        back_populates="subjects"
    )

    topics = db.relationship(
        "Topic",
        back_populates="subject",
        cascade="all, delete-orphan"
    )

    quizzes = db.relationship(
        "Quiz",
        back_populates="subject",
        cascade="all, delete-orphan"
    )


# ==========================================
# TOPIC
# ==========================================

class Topic(db.Model):
    __tablename__ = "topics"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False
    )

    name = db.Column(
        db.String(200),
        nullable=False
    )

    unit = db.Column(
        db.String(80),
        default="General",
        nullable=False
    )

    completed = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    status = db.Column(
        db.String(30),
        default="not-started",
        nullable=False
    )

    mastery = db.Column(
        db.Float,
        default=0,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    subject = db.relationship(
        "Subject",
        back_populates="topics"
    )


# ==========================================
# STUDY SCHEDULE
# ==========================================

class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    start_time = db.Column(
        db.DateTime,
        nullable=False
    )

    end_time = db.Column(
        db.DateTime,
        nullable=True
    )

    status = db.Column(
        db.String(30),
        default="pending",
        nullable=False
    )

    user = db.relationship("User")

    subject = db.relationship("Subject")


# ==========================================
# REVISION
# ==========================================

class Revision(db.Model):
    __tablename__ = "revisions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False
    )

    topic = db.Column(
        db.String(200),
        nullable=False
    )

    revision_date = db.Column(
        db.Date,
        nullable=False
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    status = db.Column(
        db.String(30),
        default="pending",
        nullable=False
    )

    user = db.relationship("User")

    subject = db.relationship("Subject")


# ==========================================
# QUIZ
# ==========================================

class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    total_marks = db.Column(
        db.Float,
        default=0,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    subject = db.relationship(
        "Subject",
        back_populates="quizzes"
    )

    questions = db.relationship(
        "Question",
        back_populates="quiz",
        cascade="all, delete-orphan"
    )

    attempts = db.relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan"
    )


# ==========================================
# QUIZ QUESTION
# ==========================================

class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id"),
        nullable=False
    )

    question = db.Column(
        db.Text,
        nullable=False
    )

    option_a = db.Column(
        db.String(500),
        nullable=False
    )

    option_b = db.Column(
        db.String(500),
        nullable=False
    )

    option_c = db.Column(
        db.String(500),
        nullable=False
    )

    option_d = db.Column(
        db.String(500),
        nullable=False
    )

    correct_answer = db.Column(
        db.String(1),
        nullable=False
    )

    marks = db.Column(
        db.Float,
        default=1,
        nullable=False
    )

    quiz = db.relationship(
        "Quiz",
        back_populates="questions"
    )


# ==========================================
# QUIZ ATTEMPT
# ==========================================

class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id"),
        nullable=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    quiz_name = db.Column(
        db.String(200),
        nullable=True
    )

    score = db.Column(
        db.Float,
        default=0,
        nullable=False
    )

    total_marks = db.Column(
        db.Float,
        default=0,
        nullable=False
    )

    correct_answers = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    total_questions = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    attempted_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    quiz = db.relationship(
        "Quiz",
        back_populates="attempts"
    )

    subject = db.relationship("Subject")

    user = db.relationship("User")


# ==========================================
# EXAM
# ==========================================

class Exam(db.Model):
    __tablename__ = "exams"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    exam_name = db.Column(
        db.String(200),
        nullable=False
    )

    exam_date = db.Column(
        db.Date,
        nullable=False
    )

    total_marks = db.Column(
        db.Float,
        default=100
    )

    internal_marks = db.Column(
        db.Float,
        default=0
    )

    previous_marks = db.Column(
        db.Float,
        default=0
    )

    contents = db.Column(
        db.Text,
        nullable=True
    )

    user = db.relationship("User")

    subject = db.relationship("Subject")


# ==========================================
# STUDY SESSION
# ==========================================

class StudySession(db.Model):
    __tablename__ = "study_sessions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    duration_minutes = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    study_date = db.Column(
        db.Date,
        default=date.today,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user = db.relationship("User")

    subject = db.relationship("Subject")


# ==========================================
# CALENDAR EVENT
# ==========================================

class CalendarEvent(db.Model):
    __tablename__ = "calendar_events"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    event_type = db.Column(
        db.String(50),
        nullable=False
    )

    event_date = db.Column(
        db.Date,
        nullable=False
    )

    event_time = db.Column(
        db.Time,
        nullable=True
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    reminder_minutes = db.Column(
        db.Integer,
        nullable=True
    )

    user = db.relationship("User")

    subject = db.relationship("Subject")


# ==========================================
# PROGRESS SNAPSHOT
# ==========================================

class ProgressSnapshot(db.Model):
    __tablename__ = "progress_snapshots"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    syllabus_completion = db.Column(
        db.Float,
        default=0
    )

    quiz_average = db.Column(
        db.Float,
        default=0
    )

    readiness_score = db.Column(
        db.Float,
        default=0
    )

    recorded_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user = db.relationship("User")
