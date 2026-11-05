from math import isfinite

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

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON request is required"}), 400

    title = data.get("title")
    subject_id = data.get("subject_id")
    questions = data.get("questions", [])
    total_marks = data.get("total_marks", 0)
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 200:
        return jsonify({"message": "Quiz title is required and must be 200 characters or fewer"}), 400
    if isinstance(subject_id, bool) or not isinstance(subject_id, int):
        return jsonify({"message": "A valid subject ID is required"}), 400
    if (
        isinstance(total_marks, bool)
        or not isinstance(total_marks, (int, float))
        or not isfinite(total_marks)
        or total_marks < 0
    ):
        return jsonify({"message": "Total marks must be a non-negative number"}), 400
    if not isinstance(questions, list):
        return jsonify({"message": "Questions must be a list"}), 400
    if any(
        not isinstance(item, dict)
        or not isinstance(item.get("question"), str)
        or not item["question"].strip()
        or not isinstance(item.get("correct_answer"), str)
        or item["correct_answer"] not in {"A", "B", "C", "D"}
        or any(not isinstance(item.get(option), str) or not item[option].strip()
               for option in ("option_a", "option_b", "option_c", "option_d"))
        or isinstance(item.get("marks", 1), bool)
        or not isinstance(item.get("marks", 1), (int, float))
        or not isfinite(item.get("marks", 1))
        or item.get("marks", 1) <= 0
        for item in questions
    ):
        return jsonify({"message": "Each question needs text, four options, and a valid correct answer"}), 400

    subject = Subject.query.filter_by(
        id=subject_id,
        user_id=user_id
    ).first()

    if not subject:
        return jsonify({
            "message": "Subject not found"
        }), 404

    quiz = Quiz(
        subject_id=subject.id,
        title=title.strip(),
        total_marks=total_marks
    )

    db.session.add(quiz)
    db.session.flush()

    for question_data in questions:

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

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON request is required"}), 400

    answers = data.get("answers", {})
    if not isinstance(answers, dict):
        return jsonify({"message": "Answers must be an object"}), 400

    score = 0
    total = 0
    correct_answers = 0

    for question in quiz.questions:

        total += question.marks

        selected_answer = answers.get(
            str(question.id)
        )

        if selected_answer == question.correct_answer:
            score += question.marks
            correct_answers += 1

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user_id,
        subject_id=quiz.subject_id,
        quiz_name=quiz.title,
        score=score,
        total_marks=total,
        correct_answers=correct_answers,
        total_questions=len(quiz.questions)
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
        "correct_answers": correct_answers,
        "total_questions": len(quiz.questions),
        "percentage": round(percentage, 2)
    })


@quizzes_bp.route("/attempts", methods=["POST"])
@jwt_required()
def record_quiz_attempt():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON request is required"}), 400

    name = data.get("name")
    correct_answers = data.get("correct_answers")
    total_questions = data.get("total_questions")
    subject_id = data.get("subject_id")

    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
        return jsonify({"message": "Quiz name is required and must be 200 characters or fewer"}), 400
    for label, value in (
        ("correct_answers", correct_answers),
        ("total_questions", total_questions)
    ):
        if isinstance(value, bool) or not isinstance(value, int):
            return jsonify({"message": "{} must be an integer".format(label)}), 400
    if total_questions < 1 or not 0 <= correct_answers <= total_questions:
        return jsonify({"message": "Quiz answer counts are out of range"}), 400

    if subject_id in ("", None):
        subject_id = None
    elif isinstance(subject_id, bool) or not isinstance(subject_id, int):
        return jsonify({"message": "Subject ID must be an integer"}), 400
    else:
        subject = Subject.query.filter_by(id=subject_id, user_id=user_id).first()
        if not subject:
            return jsonify({"message": "Subject not found"}), 404

    attempt = QuizAttempt(
        user_id=user_id,
        subject_id=subject_id,
        quiz_name=name.strip(),
        score=correct_answers,
        total_marks=total_questions,
        correct_answers=correct_answers,
        total_questions=total_questions
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        "id": attempt.id,
        "name": attempt.quiz_name,
        "subject_id": attempt.subject_id,
        "correct_answers": attempt.correct_answers,
        "total_questions": attempt.total_questions,
        "percentage": round(correct_answers / total_questions * 100, 2),
        "attempted_at": attempt.attempted_at.isoformat()
    }), 201