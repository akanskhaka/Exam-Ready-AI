from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database import db
from models import Quiz, Question, QuizAttempt, Subject

quizzes_bp = Blueprint(
    "quizzes",
    __name__,
    url_prefix="/api/quizzes"
)


@quizzes_bp.route("", methods=["POST"])
@jwt_required()
def create_quiz():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    subject = Subject.query.filter_by(
        id=data["subject_id"],
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    quiz = Quiz(
        subject_id=subject.id,
        title=data["title"],
        total_marks=data.get("total_marks", 0)
    )

    db.session.add(quiz)
    db.session.flush()

    for question_data in data.get("questions", []):

        question = Question(
            quiz_id=quiz.id,
            question=question_data["question"],
            option_a=question_data.get("option_a"),
            option_b=question_data.get("option_b"),
            option_c=question_data.get("option_c"),
            option_d=question_data.get("option_d"),
            correct_answer=question_data["correct_answer"],
            marks=question_data.get("marks", 1)
        )

        db.session.add(question)

    db.session.commit()

    return jsonify({
        "message": "Quiz created",
        "quiz_id": quiz.id
    }), 201


@quizzes_bp.route("/<int:quiz_id>", methods=["GET"])
@jwt_required()
def get_quiz(quiz_id):

    user_id = int(get_jwt_identity())

    quiz = Quiz.query.get(quiz_id)

    if not quiz or quiz.subject.user_id != user_id:
        return jsonify({
            "message": "Quiz not found"
        }), 404

    return jsonify({
        "id": quiz.id,
        "title": quiz.title,
        "subject_id": quiz.subject_id,
        "total_marks": quiz.total_marks,
        "questions": [
            {
                "id": q.id,
                "question": q.question,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "marks": q.marks
            }
            for q in quiz.questions
        ]
    })


@quizzes_bp.route(
    "/<int:quiz_id>/submit",
    methods=["POST"]
)
@jwt_required()
def submit_quiz(quiz_id):

    user_id = int(get_jwt_identity())

    quiz = Quiz.query.get(quiz_id)

    if not quiz or quiz.subject.user_id != user_id:
        return jsonify({
            "message": "Quiz not found"
        }), 404

    data = request.get_json()

    answers = data.get("answers", {})

    score = 0
    total = 0

    for question in quiz.questions:

        total += question.marks

        selected_answer = answers.get(
            str(question.id)
        )

        if selected_answer == question.correct_answer:
            score += question.marks

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user_id,
        score=score,
        total_marks=total
    )

    db.session.add(attempt)
    db.session.commit()

    percentage = (
        (score / total) * 100
        if total > 0 else 0
    )

    return jsonify({
        "score": score,
        "total_marks": total,
        "percentage": round(percentage, 2)
    })