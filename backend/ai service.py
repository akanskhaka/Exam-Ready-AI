import json
import os
import urllib.request
import urllib.error


class GeminiServiceError(RuntimeError):
    pass


def generate_text(prompt):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiServiceError("GEMINI_API_KEY is not configured")

    configured_model = os.getenv("GEMINI_MODEL")
    models = [configured_model] if configured_model else [
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ]
    payload = json.dumps({
        "contents": [{
            "parts": [{"text": prompt[:30000]}]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 2048
        }
    }).encode("utf-8")

    last_error = None
    data = None
    for model in models:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
                break
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code not in (404, 429):
                raise GeminiServiceError(f"Gemini request failed ({error.code})") from error
        except urllib.error.URLError as error:
            raise GeminiServiceError("Could not connect to Gemini") from error

    if data is None:
        if isinstance(last_error, urllib.error.HTTPError) and last_error.code == 429:
            raise GeminiServiceError("Gemini is busy. Please wait a moment and try again.")
        raise GeminiServiceError("No supported Gemini model is available for this API key.")

    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiServiceError("Gemini returned no answer")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise GeminiServiceError("Gemini returned an empty answer")
    return text