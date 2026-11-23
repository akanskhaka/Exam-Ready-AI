const STORAGE_KEY = "studentDashboardData";
const stopWords = new Set([
    "about", "after", "again", "also", "and", "are", "because", "been",
    "before", "being", "between", "but", "can", "could", "did", "does",
    "each", "for", "from", "had", "has", "have", "her", "here", "his",
    "into", "its", "may", "more", "most", "not", "our", "out", "over",
    "same", "should", "some", "such", "than", "that", "the", "their",
    "them", "then", "there", "these", "they", "this", "those", "through",
    "under", "use", "was", "were", "what", "when", "where", "which",
    "while", "who", "will", "with", "would", "you", "your"
]);

let studentData = {
    subjects: [],
    quizzes: []
};

const subjectSelect = document.getElementById("studyQuizSubject");
const unitSelect = document.getElementById("studyQuizUnit");
const documentSelect = document.getElementById("studyQuizDocument");
const generateButton = document.getElementById("generateStudyQuiz");
const quizStatus = document.getElementById("studyQuizStatus");
const questionsContainer = document.getElementById("studyQuizQuestions");
const scoreSubjectSelect = document.getElementById("quizSubject");
const scoreList = document.getElementById("quizList");
const averageScore = document.getElementById("averageQuizScore");
const retryNotice = document.getElementById("retryQuizNotice");


function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function readDashboardData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData)
        return { subjects: [], quizzes: [] };

    const parsedData = JSON.parse(savedData);
    if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData))
        throw new TypeError("Saved dashboard data must be an object.");

    return {
        ...parsedData,
        subjects: Array.isArray(parsedData.subjects)
            ? parsedData.subjects
                .filter(subject => subject && typeof subject === "object" && !Array.isArray(subject))
                .map(subject => ({
                    ...subject,
                    name: typeof subject.name === "string" ? subject.name : "",
                    topics: Array.isArray(subject.topics)
                        ? subject.topics.filter(topic =>
                            topic && typeof topic === "object" && !Array.isArray(topic)
                        )
                        : [],
                    documents: Array.isArray(subject.documents)
                        ? subject.documents.filter(documentData =>
                            documentData &&
                            typeof documentData === "object" &&
                            typeof documentData.name === "string" &&
                            Array.isArray(documentData.pages)
                        )
                        : []
                }))
            : [],
        quizzes: Array.isArray(parsedData.quizzes)
            ? parsedData.quizzes.filter(quiz =>
                quiz && typeof quiz === "object" && !Array.isArray(quiz)
            )
            : []
    };
}


function showStorageError(error) {
    console.error("Could not read quiz data:", error);
    quizStatus.setAttribute("role", "alert");
    quizStatus.textContent =
        "Your saved study data could not be read. Check your browser storage and reload this page.";
}


async function loadQuizData() {
    let localSubjects = [];
    try {
        localSubjects = readDashboardData().subjects;
    } catch (error) {
        console.error("Could not read local quiz materials:", error);
    }

    try {
        const [subjects, report] = await Promise.all([
            examReadyApi.get("/subjects"),
            examReadyApi.get("/reports/dashboard")
        ]);
        studentData = {
            subjects: subjects.map(subject => {
                const localSubject = localSubjects.find(item =>
                    String(item.id) === String(subject.id) ||
                    item.name.toLowerCase() === subject.name.toLowerCase()
                );
                return {
                    ...subject,
                    topics: subject.topics || [],
                    documents: localSubject ? localSubject.documents || [] : []
                };
            }),
            quizzes: (report.quiz_attempts || []).map(attempt => ({
                id: attempt.id,
                name: attempt.name,
                percentage: attempt.percentage,
                date: attempt.attempted_at,
                subjectId: attempt.subject_id,
                subjectName: attempt.subject_name || "General quiz",
                correctAnswers: attempt.correct_answers,
                totalQuestions: attempt.total_questions
            }))
        };
        renderSubjectOptions();
        renderQuizHistory();
        if (subjectSelect.value) {
            updateStudySources();
        } else {
            quizStatus.textContent = studentData.subjects.length
                ? "Choose a subject to start. PDFs are taken from that subject's study materials."
                : "No subjects found. Add a subject and topics or a PDF on the dashboard first.";
        }
    } catch (error) {
        console.error("Could not load student quiz data:", error);
        quizStatus.setAttribute("role", "alert");
        quizStatus.textContent = `Could not load saved student data: ${error.message}`;
        if (error.status === 401) {
            window.location.replace("./login.html");
        }
    }
}


function renderSubjectOptions() {
    const subjectOptions = studentData.subjects.map(subject =>
        `<option value="${subject.id}">${escapeHtml(subject.name || "Untitled subject")}</option>`
    ).join("");

    subjectSelect.innerHTML = `<option value="">Select a subject</option>${subjectOptions}`;
    scoreSubjectSelect.innerHTML =
        `<option value="">General quiz</option>${subjectOptions}`;

    const requestedSubjectId = new URLSearchParams(window.location.search)
        .get("subjectId");
    const requestedIndex = studentData.subjects.findIndex(subject =>
        String(subject.id || "") === requestedSubjectId
    );

    if (requestedSubjectId && requestedIndex >= 0) {
        subjectSelect.value = String(studentData.subjects[requestedIndex].id);
        scoreSubjectSelect.value = String(studentData.subjects[requestedIndex].id);
    }
}


function selectedSubject() {
    if (subjectSelect.value === "")
        return null;

    return studentData.subjects.find(
        subject => String(subject.id) === subjectSelect.value
    ) || null;
}


function selectedDocument() {
    const subject = selectedSubject();
    if (!subject || documentSelect.value === "")
        return null;

    const index = Number(documentSelect.value);
    const documents = Array.isArray(subject.documents) ? subject.documents : [];
    return Number.isInteger(index) ? documents[index] || null : null;
}


function getTopicHint(subject) {
    if (!subject)
        return studentData.subjects.length
            ? "Select a subject to begin."
            : "Add a subject on the dashboard, then add topics or upload a PDF.";

    const subjectTopics = subject.topics
        .map(topic => typeof topic.name === "string" ? topic.name.trim() : "")
        .filter(Boolean);
    const otherTopics = studentData.subjects
        .filter(candidate => candidate !== subject)
        .flatMap(candidate => candidate.topics)
        .map(topic => typeof topic.name === "string" ? topic.name.trim() : "")
        .filter(Boolean);

    if (subjectTopics.length && otherTopics.length)
        return "Choose a PDF, or use this subject's syllabus topics.";
    if (subjectTopics.length)
        return "Add topics under another subject to use syllabus quiz choices, or upload a PDF for this subject.";
    return "Add syllabus topics or upload a PDF under this subject before generating a quiz.";
}


function updateStudySources() {
    const subject = selectedSubject();
    const documents = subject && Array.isArray(subject.documents) ? subject.documents : [];

    questionsContainer.innerHTML = "";
    retryNotice.hidden = true;
    unitSelect.innerHTML = `<option value="">All units</option>${
        subject
            ? [...new Set(subject.topics.map(topic => topic.unit || "General"))]
                .map(unit => `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`)
                .join("")
            : ""
    }`;
    unitSelect.disabled = !subject;
    documentSelect.innerHTML = subject
        ? `<option value="">Use syllabus topics</option>
            ${documents.map((documentData, index) => `
                <option value="${index}">${escapeHtml(documentData.name)}</option>
            `).join("")}`
        : `<option value="">Select a subject first</option>`;
    if (documents.length)
        documentSelect.value = "0";
    documentSelect.disabled = !subject;
    generateButton.disabled = !subject;
    const firstDocument = documents[0];
    quizStatus.textContent = firstDocument
        ? `A quiz will use text from "${firstDocument.name}". Choose syllabus topics to use the subject list instead.`
        : getTopicHint(subject);
    quizStatus.setAttribute("role", "status");
}


function pdfSentences(documentData) {
    return documentData.pages.flatMap((page, pageIndex) =>
        page.split(/(?<=[.!?])\s+/)
            .map(text => ({ text: text.trim(), page: pageIndex + 1 }))
            .filter(sentence => sentence.text)
    );
}


function shuffleChoices(choices) {
    for (let index = choices.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
    }
    return choices;
}


function pdfQuestions(documentData) {
    const sentences = pdfSentences(documentData);
    const frequencies = new Map();
    const words = sentences
        .flatMap(sentence => sentence.text.toLowerCase().match(/[a-z0-9]{4,}/g) || [])
        .filter(word => !stopWords.has(word));

    words.forEach(word => frequencies.set(word, (frequencies.get(word) || 0) + 1));

    const usedAnswers = new Set();
    const questions = [];

    for (const sentence of sentences) {
        const terms = sentence.text.match(/\b[A-Za-z][A-Za-z0-9'-]{3,}\b/g) || [];
        const answer = terms
            .filter(term =>
                !stopWords.has(term.toLowerCase()) &&
                !usedAnswers.has(term.toLowerCase())
            )
            .sort((first, second) =>
                (frequencies.get(first.toLowerCase()) || 0) -
                    (frequencies.get(second.toLowerCase()) || 0) ||
                second.length - first.length
            )[0];

        if (!answer)
            continue;

        const normalizedAnswer = answer.toLowerCase();
        const distractors = Array.from(frequencies.keys())
            .filter(word => word !== normalizedAnswer)
            .sort((first, second) =>
                (frequencies.get(second) || 0) - (frequencies.get(first) || 0)
            )
            .slice(0, 3);
        if (!distractors.length)
            continue;

        usedAnswers.add(normalizedAnswer);
        const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        questions.push({
            prompt: sentence.text.replace(new RegExp(`\\b${escapedAnswer}\\b`, "i"), "_____"),
            answer: normalizedAnswer,
            choices: shuffleChoices([normalizedAnswer, ...distractors])
        });

        if (questions.length === 5)
            break;
    }

    return questions;
}


function topicQuestions(subject, unitName = "") {
    const subjectTopics = subject.topics
        .filter(topic => !unitName || (topic.unit || "General") === unitName)
        .map(topic => typeof topic.name === "string" ? topic.name.trim() : "")
        .filter(Boolean);
    const distractors = studentData.subjects
        .filter(candidate => candidate !== subject)
        .flatMap(candidate => candidate.topics)
        .map(topic => typeof topic.name === "string" ? topic.name.trim() : "")
        .filter(Boolean);
    const distinctDistractors = Array.from(new Map(
        distractors.map(topic => [topic.toLowerCase(), topic])
    ).values());
    const questions = [];
    const usedTopics = new Set();

    for (const topic of subjectTopics) {
        const normalizedTopic = topic.toLowerCase();
        if (usedTopics.has(normalizedTopic))
            continue;

        const choices = distinctDistractors
            .filter(option => option.toLowerCase() !== normalizedTopic)
            .slice(0, 3)
            .map(option => option.toLowerCase());
        if (!choices.length)
            continue;

        usedTopics.add(normalizedTopic);
        questions.push({
            prompt: `Which topic is listed under "${subject.name}"?`,
            answer: normalizedTopic,
            choices: shuffleChoices([normalizedTopic, ...choices])
        });
        if (questions.length === 5)
            break;
    }

    return questions;
}


function generateQuiz() {
    retryNotice.hidden = true;
    const subject = selectedSubject();
    if (!subject) {
        quizStatus.textContent = "Select a subject before generating a quiz.";
        return;
    }

    const documentData = selectedDocument();
    const unitName = unitSelect.value;
    const questions = documentData
        ? pdfQuestions(documentData)
        : topicQuestions(subject, unitName);
    if (!questions.length) {
        quizStatus.textContent = documentData
            ? `There is not enough readable text in "${documentData.name}" to make questions. Try another PDF.`
            : getTopicHint(subject);
        questionsContainer.innerHTML = "";
        return;
    }

    renderQuestions(subject, documentData, questions, unitName);
}


function renderQuestions(subject, documentData, questions, unitName) {
    const sourceName = documentData ? documentData.name : "Syllabus topics";
    quizStatus.textContent =
        `${questions.length} questions based on ${sourceName} for ${subject.name}.`;
    questionsContainer.innerHTML = `
        <form id="studyQuizForm" class="study-quiz-form">
            ${questions.map((question, questionIndex) => `
                <fieldset class="study-quiz-question">
                    <legend>${questionIndex + 1}. ${escapeHtml(question.prompt)}</legend>
                    ${question.choices.map((choice, choiceIndex) => `
                        <label class="study-quiz-choice">
                            <input type="radio" name="question-${questionIndex}"
                                   value="${choiceIndex}" required>
                            <span>${escapeHtml(choice)}</span>
                        </label>
                    `).join("")}
                    <p class="study-quiz-feedback" hidden></p>
                </fieldset>
            `).join("")}
            <button type="submit">Submit quiz</button>
        </form>
    `;

    document.getElementById("studyQuizForm").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        let correctCount = 0;

        questions.forEach((question, questionIndex) => {
            const selected = form.querySelector(
                `input[name="question-${questionIndex}"]:checked`
            );
            const correct = selected &&
                question.choices[Number(selected.value)] === question.answer;
            if (correct)
                correctCount++;

            const feedback = form.querySelectorAll(".study-quiz-feedback")[questionIndex];
            feedback.hidden = false;
            feedback.textContent = correct ? "Correct" : `Answer: ${question.answer}`;
            feedback.classList.toggle("is-correct", Boolean(correct));
            feedback.classList.toggle("is-incorrect", !correct);
        });

        const percentage = Math.round(correctCount / questions.length * 100);
        const record = {
            name: `${subject.name} - ${sourceName} Quiz`.slice(0, 200),
            percentage,
            date: new Date().toISOString(),
            subjectId: subject.id,
            subjectName: subject.name,
            ...(unitName ? { unitName } : {}),
            sourceDocumentName: documentData ? documentData.name : "Syllabus topics"
        };

        try {
            await saveQuizRecord(record, correctCount, questions.length);
        } catch (error) {
            console.error("Could not save quiz score:", error);
            quizStatus.textContent = `Your score could not be saved: ${error.message}`;
            return;
        }

        quizStatus.textContent =
            `You scored ${correctCount} out of ${questions.length} (${percentage}%). Saved to ${subject.name}.`;
        form.querySelectorAll("input, button").forEach(control => {
            control.disabled = true;
        });
        renderQuizHistory();

        if (percentage < 100) {
            document.getElementById("retryQuizMessage").textContent =
                `Your maximum score is 100%. You scored ${percentage}%, so retake the quiz to try again.`;
            retryNotice.hidden = false;
        }
    });
}


async function saveQuizRecord(record, correctAnswers, totalQuestions) {
    const savedAttempt = await examReadyApi.post("/quizzes/attempts", {
        name: record.name,
        subject_id: record.subjectId ?? null,
        correct_answers: correctAnswers,
        total_questions: totalQuestions
    });
    const subject = studentData.subjects.find(
        item => String(item.id) === String(savedAttempt.subject_id)
    );
    studentData.quizzes.push({
        ...savedAttempt,
        percentage: savedAttempt.percentage,
        date: savedAttempt.attempted_at,
        subjectId: savedAttempt.subject_id,
        subjectName: subject ? subject.name : "General quiz"
    });
}


async function addManualScore(event) {
    event.preventDefault();

    const name = document.getElementById("quizName").value.trim();
    const score = Number(document.getElementById("quizScore").value);
    if (!name || !Number.isInteger(score) || score < 0 || score > 100) {
        document.getElementById("manualQuizStatus").textContent =
            "Enter a quiz name and a score from 0 to 100.";
        return;
    }

    const subject = studentData.subjects.find(
        item => String(item.id) === scoreSubjectSelect.value
    ) || null;
    const record = {
        name,
        percentage: score,
        date: new Date().toISOString(),
        subjectId: subject ? subject.id : null,
        ...(subject ? { subjectId: subject.id, subjectName: subject.name } : {})
    };

    try {
        await saveQuizRecord(record, score, 100);
    } catch (error) {
        console.error("Could not save quiz score:", error);
        document.getElementById("manualQuizStatus").setAttribute("role", "alert");
        document.getElementById("manualQuizStatus").textContent =
            `Your score could not be saved: ${error.message}`;
        return;
    }

    document.getElementById("manualQuizForm").reset();
    const manualStatus = document.getElementById("manualQuizStatus");
    manualStatus.setAttribute("role", "status");
    manualStatus.textContent = "Quiz score saved.";
    renderQuizHistory();
}


function renderQuizHistory() {
    const scores = studentData.quizzes
        .map(quiz => Number(quiz.percentage))
        .filter(score => Number.isFinite(score) && score >= 0 && score <= 100);
    const average = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;
    averageScore.textContent = `${average}%`;

    if (!studentData.quizzes.length) {
        scoreList.innerHTML = `<p class="empty-list">No quiz scores saved yet.</p>`;
        return;
    }

    scoreList.innerHTML = studentData.quizzes
        .slice()
        .reverse()
        .map(quiz => {
            const score = Number(quiz.percentage);
            const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
            const scoreColor = safeScore === 100
                ? "#218653"
                : safeScore >= 50
                    ? "#e29124"
                    : "#cf4650";
            const subjectName = typeof quiz.subjectName === "string" && quiz.subjectName
                ? quiz.subjectName
                : "General quiz";
            const sourceName = typeof quiz.sourceDocumentName === "string" &&
                quiz.sourceDocumentName
                ? ` · ${quiz.sourceDocumentName}`
                : "";
            return `
                <article class="quiz-record">
                    <div>
                        <span class="quiz-record-name">${escapeHtml(quiz.name || "Quiz")}</span>
                        <span class="quiz-record-meta">${escapeHtml(subjectName)}${escapeHtml(sourceName)}</span>
                    </div>
                    <div class="quiz-record-result">
                        <div class="score-chart"
                             style="--score: ${safeScore}; --score-color: ${scoreColor}"
                             role="img"
                             aria-label="${safeScore}% score; ${100 - safeScore}% remaining">
                            <span>${escapeHtml(quiz.percentage)}%</span>
                        </div>
                        ${safeScore < 100 && quiz.sourceDocumentName
                            ? `<span class="quiz-retry-label">Retake recommended</span>`
                            : ""}
                    </div>
                </article>
            `;
        }).join("");
}


subjectSelect.addEventListener("change", updateStudySources);
unitSelect.addEventListener("change", () => {
    questionsContainer.innerHTML = "";
    retryNotice.hidden = true;
});
documentSelect.addEventListener("change", () => {
    questionsContainer.innerHTML = "";
    retryNotice.hidden = true;
    const documentData = selectedDocument();
    quizStatus.textContent = documentData
        ? `A quiz will use text from "${documentData.name}".`
        : getTopicHint(selectedSubject());
});
generateButton.addEventListener("click", generateQuiz);
document.getElementById("manualQuizForm").addEventListener("submit", addManualScore);
document.getElementById("retryQuiz").addEventListener("click", () => {
    retryNotice.hidden = true;
    questionsContainer.innerHTML = "";
    generateQuiz();
});

loadQuizData();