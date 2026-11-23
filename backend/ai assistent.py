import importlib.util
import os
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required


SERVICE_PATH = Path(__file__).with_name("ai service.py")
SERVICE_SPEC = importlib.util.spec_from_file_location("examready_ai_service", SERVICE_PATH)
AI_SERVICE = importlib.util.module_from_spec(SERVICE_SPEC)
SERVICE_SPEC.loader.exec_module(AI_SERVICE)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


def data_object():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@ai_bp.route("/health", methods=["GET"])
@jwt_required()
def health():
    configured = bool(os.getenv("GEMINI_API_KEY"))
    return jsonify({
        "status": "ready" if configured else "not-configured",
        "configured": configured
    })


@ai_bp.route("/answer", methods=["POST"])
@jwt_required()
def answer():
    data = data_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    question = data.get("question")
    context = data.get("context")
    history = data.get("history", [])
    if not isinstance(question, str) or not question.strip():
        return jsonify({"message": "Question is required"}), 400
    if len(question) > 500:
        return jsonify({"message": "Question must be 500 characters or fewer"}), 400
    if context is not None and not isinstance(context, str):
        return jsonify({"message": "Context must be text"}), 400
    if not isinstance(history, list):
        return jsonify({"message": "History must be a list of messages"}), 400

    history_lines = []
    for message in history[-8:]:
        if not isinstance(message, dict):
            return jsonify({"message": "Each history item must be a message"}), 400
        role = message.get("role")
        content = message.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            return jsonify({"message": "History messages need a valid role and text"}), 400
        if content.strip():
            history_lines.append(f"{role.upper()}: {content.strip()[:1000]}")

    history_text = "\n".join(history_lines) or "No earlier messages."

    prompt = (
        "You are an exam study assistant. Use the recent conversation to "
        "understand follow-up questions. Give useful general study guidance "
        "when no study PDF is supplied. When a PDF is supplied, answer clearly "
        "from it; if a fact is not supported by the material, say so and "
        "distinguish any general explanation from the source.\n\n"
        f"STUDY MATERIAL:\n{(context or 'No study PDF supplied.')[:18000]}\n\n"
        f"RECENT CONVERSATION:\n{history_text}\n\n"
        f"QUESTION:\n{question.strip()}"
    )
    try:
        answer_text = AI_SERVICE.generate_text(prompt)
    except AI_SERVICE.GeminiServiceError as error:
        return jsonify({"message": str(error)}), 502
    return jsonify({"answer": answer_text})


@ai_bp.route("/summarize", methods=["POST"])
@jwt_required()
def summarize():
    data = data_object()
    if data is None:
        return jsonify({"message": "A valid JSON request is required"}), 400

    text = data.get("text")
    title = data.get("title")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"message": "Study text is required"}), 400

    prompt = (
        "Summarize the following study material for exam preparation. Include "
        "the main ideas, important terms, and key facts. Keep it concise.\n\n"
        f"DOCUMENT: {title if isinstance(title, str) else 'Study material'}\n\n"
        f"{text[:30000]}"
    )
    try:
        summary = AI_SERVICE.generate_text(prompt)
    except AI_SERVICE.GeminiServiceError as error:
        return jsonify({"message": str(error)}), 502
    return jsonify({"summary": summary})