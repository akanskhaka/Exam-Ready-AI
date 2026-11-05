/* =========================================================
   STUDENT DASHBOARD DATA
   Everything starts empty. No fake subjects, marks or readiness.
========================================================= */

let studentData = {
    subjects: [],
    quizzes: [],
    revisions: [],
    exams: [],
    studyMinutes: 0,
    studySeconds: 0,
    pausedSeconds: 0,
    timerSessions: []
};

let dataLoadError = null;
let calendarEvents = [];
let currentDashboardPage = "dashboard";
const MAX_PDF_TEXT_LENGTH = 150000;
let pdfJsPromise = null;


/* =========================================================
   TIMER VARIABLES
========================================================= */

let timerInterval = null;
let pausedDisplayInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerPausedAt = null;
let currentTimerSession = null;


/* =========================================================
   GET ELEMENTS
========================================================= */

const menuLinks = document.querySelectorAll(".menu-link");
const contentArea = document.getElementById("content-area");
const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");
const backButton = document.getElementById("backToDashboard");
const topbarName = document.getElementById("topbar-name");
const calendarCatSticker = document.getElementById("calendar-cat-sticker");

/* =========================================================
   HELPERS
========================================================= */

/* Stops user-typed text from being treated as HTML */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveData() {
    try {
        localStorage.setItem(
            "studentDashboardData",
            JSON.stringify(studentData)
        );
        return true;
    } catch (error) {
        dataLoadError = "Dashboard changes could not be saved in this browser.";
        console.error(dataLoadError, error);

        if (contentArea) {
            const notice = document.createElement("p");
            notice.className = "content-box";
            notice.setAttribute("role", "alert");
            notice.textContent = dataLoadError;
            contentArea.prepend(notice);
        }
        return false;
    }
}


function loadData() {

    let savedData;

    try {
        savedData = localStorage.getItem("studentDashboardData");
    } catch (error) {
        dataLoadError = "Browser storage could not be accessed. Dashboard data may not persist.";
        console.error(dataLoadError, error);
        return;
    }

    if (!savedData)
        return;

    try {
        const parsedData = JSON.parse(savedData);

        if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
            throw new TypeError("Saved dashboard data must be an object.");
        }

        studentData = {
            subjects: Array.isArray(parsedData.subjects)
                ? parsedData.subjects
                    .filter(subject => subject && typeof subject === "object" && !Array.isArray(subject))
                    .map(subject => ({
                        ...subject,
                        name: typeof subject.name === "string" ? subject.name : "",
                        topics: Array.isArray(subject.topics)
                            ? subject.topics
                                .filter(topic => topic && typeof topic === "object" && !Array.isArray(topic))
                                .map(topic => ({
                                    ...topic,
                                    name: typeof topic.name === "string" ? topic.name : "",
                                    completed: topic.completed === true
                                }))
                            : [],
                        documents: Array.isArray(subject.documents)
                            ? subject.documents
                                .filter(document => document && typeof document === "object" &&
                                    !Array.isArray(document) &&
                                    typeof document.name === "string" &&
                                    Array.isArray(document.pages))
                                .map(document => ({
                                    ...document,
                                    id: document.id || `${Date.now()}-${Math.random()}`,
                                    name: document.name,
                                    pages: document.pages
                                        .filter(page => typeof page === "string")
                                        .map(page => page.slice(0, MAX_PDF_TEXT_LENGTH))
                                }))
                            : []
                    }))
                : [],
            quizzes: Array.isArray(parsedData.quizzes) ? parsedData.quizzes : [],
            revisions: Array.isArray(parsedData.revisions) ? parsedData.revisions : [],
            exams: Array.isArray(parsedData.exams) ? parsedData.exams : [],
            studyMinutes: Number.isFinite(parsedData.studyMinutes) && parsedData.studyMinutes >= 0
                ? parsedData.studyMinutes
                : 0,
            studySeconds: Number.isFinite(parsedData.studySeconds) && parsedData.studySeconds >= 0
                ? parsedData.studySeconds
                : Math.max(0, Number(parsedData.studyMinutes) || 0) * 60,
            pausedSeconds: Number.isFinite(parsedData.pausedSeconds) && parsedData.pausedSeconds >= 0
                ? parsedData.pausedSeconds
                : 0,
            timerSessions: Array.isArray(parsedData.timerSessions)
                ? parsedData.timerSessions.filter(session =>
                    session && typeof session === "object" && !Array.isArray(session)
                )
                : []
        };
    } catch (error) {
        console.error("Could not load saved dashboard data:", error);
        dataLoadError = "Saved dashboard data could not be read. The dashboard is using empty data for now; the saved data was not changed.";
        studentData = {
            subjects: [],
            quizzes: [],
            revisions: [],
            exams: [],
            studyMinutes: 0,
            studySeconds: 0,
            pausedSeconds: 0,
            timerSessions: []
        };
    }
}


/* ---------- Profile storage ---------- */

function getProfile() {
    try {
        const saved = localStorage.getItem("studentProfile");
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && typeof parsed === "object") {
            return {
                name: typeof parsed.name === "string" ? parsed.name : "",
                email: typeof parsed.email === "string" ? parsed.email : "",
                course: typeof parsed.course === "string" ? parsed.course : "",
                year: typeof parsed.year === "string" ? parsed.year : ""
            };
        }
    } catch (error) {
        console.error("Could not read profile:", error);
    }
    return { name: "", email: "", course: "", year: "" };
}


function applyProfileName() {
    const profile = getProfile();
    if (topbarName) {
        topbarName.textContent =
            profile.name || sessionStorage.getItem("userName") || "Student";
    }
}


loadData();

async function refreshDashboardData() {
    const [subjects, report] = await Promise.all([
        examReadyApi.get("/subjects"),
        examReadyApi.get("/reports/dashboard")
    ]);

    const previousSubjects = studentData.subjects;
    studentData.subjects = subjects.map(subject => {
        const previous = previousSubjects.find(item =>
            String(item.id) === String(subject.id) ||
            (typeof item.name === "string" &&
                item.name.toLowerCase() === subject.name.toLowerCase())
        );
        return {
            ...subject,
            topics: (subject.topics || []).map(topic => ({
                ...topic,
                revisionCount: 0,
                lastRevised: null,
                studyMinutes: 0,
                needsRevision: false
            })),
            documents: previous ? previous.documents || [] : []
        };
    });
    studentData.quizzes = (report.quiz_attempts || []).map(attempt => ({
        id: attempt.id,
        name: attempt.name,
        percentage: attempt.percentage,
        date: attempt.attempted_at,
        subjectId: attempt.subject_id,
        subjectName: attempt.subject_name || "General quiz",
        correctAnswers: attempt.correct_answers,
        totalQuestions: attempt.total_questions
    }));
    saveData();
}

function showDashboardApiError(error) {
    console.error("Could not load student data from the server:", error);
    if (error.status === 401) {
        window.location.replace("./login.html");
        return;
    }

    const notice = document.createElement("p");
    notice.className = "content-box";
    notice.setAttribute("role", "alert");
    notice.textContent = `Could not load saved student data: ${error.message}`;
    contentArea.prepend(notice);
}


/* =========================================================
   DASHBOARD
========================================================= */

function openDashboard() {

    clearTimer();

    pageTitle.textContent = "Dashboard";
    pageDescription.textContent =
        "Track your actual study progress and academic activity.";

    const totalSubjects = studentData.subjects.length;
    const studyHours = Math.floor(studentData.studyMinutes / 60);
    const studyMinutes = studentData.studyMinutes % 60;
    const subjectProgress = studentData.subjects.map(subject => {
        const topics = Array.isArray(subject.topics) ? subject.topics : [];
        const completed = topics.filter(topic =>
            topic.completed || topic.status === "completed"
        ).length;

        return {
            name: subject.name || "Untitled subject",
            completed,
            total: topics.length,
            percentage: topics.length
                ? Math.round(completed / topics.length * 100)
                : 0
        };
    });
    const totalProgressTopics = subjectProgress.reduce(
        (total, subject) => total + subject.total,
        0
    );
    const completedProgressTopics = subjectProgress.reduce(
        (total, subject) => total + subject.completed,
        0
    );
    const overallStudyProgress = totalProgressTopics
        ? Math.round(completedProgressTopics / totalProgressTopics * 100)
        : 0;

    contentArea.innerHTML = `

        ${dataLoadError ? `
            <p class="content-box" role="alert">
                ${escapeHtml(dataLoadError)}
            </p>
        ` : ""}

        <!-- WELCOME -->
        <div class="welcome-card">
            <div>
                <h2>Welcome to your Dashboard</h2>
                <p>
                    Add your subjects, topics and study sessions.
                    Your dashboard will update automatically.
                </p>
            </div>
        </div>

        <!-- OVERVIEW -->
        <div class="cards">

            <div class="card" data-nav="subjects" tabindex="0" role="link">
                <i class="fa-solid fa-book"></i>
                <h3>Subjects</h3>
                <p>${totalSubjects} Added</p>
            </div>

            <div class="card" data-nav="timer" tabindex="0" role="link">
                <i class="fa-solid fa-clock"></i>
                <h3>Study Time</h3>
                <p>${studyHours}h ${studyMinutes}m</p>
            </div>

            <a class="card" href="quiz.html">
                <i class="fa-solid fa-circle-question"></i>
                <h3>Quiz</h3>
                <p>Practice and track your quiz scores</p>
            </a>

            <section class="card study-progress-card" aria-labelledby="study-progress-heading">
                <i class="fa-solid fa-chart-simple" aria-hidden="true"></i>
                <h3 id="study-progress-heading">Study Progress</h3>
                <p>${overallStudyProgress}% overall · ${completedProgressTopics}/${totalProgressTopics} topics completed</p>
                <div class="progress-bar"
                     role="progressbar"
                     aria-label="Overall study progress"
                     aria-valuemin="0"
                     aria-valuemax="100"
                     aria-valuenow="${overallStudyProgress}">
                    <div class="progress" style="width:${overallStudyProgress}%"></div>
                </div>
                <div class="study-progress-list">
                    ${
                        subjectProgress.length
                            ? subjectProgress.map(subject => `
                                <div class="study-progress-item">
                                    <div class="study-progress-label">
                                        <span>${escapeHtml(subject.name)}</span>
                                        <strong>${subject.percentage}%</strong>
                                    </div>
                                    <div class="progress-bar"
                                         role="progressbar"
                                         aria-label="${escapeHtml(subject.name)} progress"
                                         aria-valuemin="0"
                                         aria-valuemax="100"
                                         aria-valuenow="${subject.percentage}">
                                        <div class="progress" style="width:${subject.percentage}%"></div>
                                    </div>
                                    <small>${subject.completed}/${subject.total} topics completed</small>
                                </div>
                            `).join("")
                            : "<small>Add subjects to track your study progress.</small>"
                    }
                </div>
            </section>

        </div>

        <!-- QUICK ACTIONS -->
        <h2 class="section-heading">Quick Actions</h2>

        <div class="dashboard-actions">

            <div class="action-card" data-action="ai">
                <div class="action-icon"><i class="fa-solid fa-robot"></i></div>
                <h3>AI Assistant</h3>
                <p>Ask questions and get study guidance.</p>
                <button type="button">Open Assistant</button>
            </div>

            <div class="action-card" data-action="calendar">
                <div class="action-icon"><i class="fa-solid fa-calendar"></i></div>
                <h3>Calendar</h3>
                <p>View your study calendar and upcoming dates.</p>
                <button type="button">Open Calendar</button>
            </div>

            <div class="action-card" data-action="schedule">
                <div class="action-icon"><i class="fa-solid fa-calendar-days"></i></div>
                <h3>Schedule</h3>
                <p>Review and manage your study schedule.</p>
                <button type="button">View Schedule</button>
            </div>

            <div class="action-card" data-action="profile">
                <div class="action-icon"><i class="fa-solid fa-user"></i></div>
                <h3>Profile</h3>
                <p>Manage your student information.</p>
                <button type="button">View Profile</button>
            </div>

        </div>
    `;

    addDashboardEvents();
}


/* =========================================================
   DASHBOARD EVENTS
========================================================= */

function addDashboardEvents() {
    document.querySelectorAll(".card[data-nav]").forEach(card => {
        const navigate = () => navigateTo(card.dataset.nav);

        card.addEventListener("click", navigate);
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate();
            }
        });
    });

    document.querySelectorAll(".action-card").forEach(card => {
        card.addEventListener("click", function () {
            navigateTo(this.dataset.action);   // ai, subjects, profile, timer
        });
    });
}


/* =========================================================
   SUBJECT CALCULATIONS
========================================================= */

function getTotalTopics() {
    let total = 0;
    studentData.subjects.forEach(subject => {
        total += subject.topics.length;
    });
    return total;
}


function getCompletedTopics() {
    let completed = 0;
    studentData.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            if (topic.completed) completed++;
        });
    });
    return completed;
}


/* =========================================================
   SUBJECT PAGE
========================================================= */

function openSubjects() {

    clearTimer();

    pageTitle.textContent = "Subjects";
    pageDescription.textContent =
        "Add a subject first, then upload its study PDFs alongside your topics.";

    contentArea.innerHTML = `
        <div class="subject-container">

            <h2>Subjects Studying</h2>

            <p>Add the subjects you are currently studying.</p>

            <div class="add-subject">
                <input type="text" id="subjectInput" placeholder="Enter subject name">
                <button type="button" id="addSubject">Add Subject</button>
            </div>

            <div id="subjectList" class="subject-list"></div>

        </div>
    `;

    renderSubjects();

    document.getElementById("addSubject").addEventListener("click", addSubject);

    document.getElementById("subjectInput").addEventListener("keypress", function (event) {
        if (event.key === "Enter") addSubject();
    });
}


/* =========================================================
   ADD SUBJECT
========================================================= */

function addSubject() {

    const input = document.getElementById("subjectInput");
    const name = input.value.trim();

    if (!name) {
        alert("Please enter a subject.");
        return;
    }

    studentData.subjects.push({
        id: Date.now(),
        name: name,
        topics: [],
        documents: []
    });

    saveData();
    input.value = "";
    renderSubjects();
}


/* =========================================================
   RENDER SUBJECTS
========================================================= */

function renderSubjects() {

    const list = document.getElementById("subjectList");

    if (!list)
        return;

    if (studentData.subjects.length === 0) {
        list.innerHTML = `
            <div class="content-box">
                <h3>No subjects added yet.</h3>
                <p>Add your first subject above.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = "";

    studentData.subjects.forEach(subject => {

        const completed = subject.topics.filter(topic => topic.completed).length;
        const total = subject.topics.length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

        const card = document.createElement("div");
        card.className = "subject-card";

        card.innerHTML = `
            <div class="subject-card-heading">
                <h3>${escapeHtml(subject.name)}</h3>
                <button type="button" class="delete-subject-btn"
                        aria-label="Delete ${escapeHtml(subject.name)}"
                        title="Delete subject">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
            </div>

            <p>${completed} / ${total} Topics Completed</p>

            <div class="progress-bar">
                <div class="progress" style="width:${percentage}%"></div>
            </div>

            <p>${percentage}% Completed</p>

            <input type="text" class="topic-input" placeholder="Enter topic">

            <button type="button" class="add-topic-btn">Add Topic</button>

            <div class="topic-list"></div>

            <section class="subject-documents">
                <h4>Study PDFs</h4>
                <label for="subjectPdf${studentData.subjects.indexOf(subject)}">
                    Add PDF files (no file-size limit)
                </label>
                <input id="subjectPdf${studentData.subjects.indexOf(subject)}"
                       type="file" class="subject-pdf-input"
                       accept=".pdf,application/pdf" multiple>
                <p class="subject-pdf-status" role="status" aria-live="polite"></p>
                <div class="subject-pdf-list"></div>
            </section>
        `;

        list.appendChild(card);

        const topicInput = card.querySelector(".topic-input");
        const addTopicButton = card.querySelector(".add-topic-btn");
        const topicList = card.querySelector(".topic-list");
        const deleteSubjectButton = card.querySelector(".delete-subject-btn");
        const pdfInput = card.querySelector(".subject-pdf-input");
        const pdfStatus = card.querySelector(".subject-pdf-status");
        const pdfList = card.querySelector(".subject-pdf-list");

        renderTopics(subject, topicList);
        renderSubjectDocuments(subject, pdfList);

        deleteSubjectButton.addEventListener("click", function () {
            if (!window.confirm(`Delete "${subject.name}" and all its topics?`))
                return;

            const subjectIndex = studentData.subjects.indexOf(subject);
            if (subjectIndex === -1)
                return;

            studentData.subjects.splice(subjectIndex, 1);
            saveData();
            renderSubjects();
        });

        function addTopic() {

            const topicName = topicInput.value.trim();

            if (!topicName) {
                alert("Enter a topic.");
                return;
            }

            subject.topics.push({
                name: topicName,
                completed: false
            });

            saveData();
            renderSubjects();
        }

        addTopicButton.addEventListener("click", addTopic);

        topicInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") addTopic();
        });

        pdfInput.addEventListener("change", async function () {
            const files = Array.from(this.files || []);
            this.value = "";

            if (files.length === 0)
                return;

            this.disabled = true;
            pdfStatus.textContent = "Reading PDF files in this browser...";

            let addedCount = 0;
            const errors = [];

            for (const file of files) {
                try {
                    if (!file.name.toLowerCase().endsWith(".pdf") &&
                        file.type !== "application/pdf") {
                        throw new Error("Choose a PDF file.");
                    }

                    const documentData = await extractPdfText(file);
                    subject.documents = Array.isArray(subject.documents)
                        ? subject.documents
                        : [];
                    subject.documents.push(documentData);

                    if (!saveData()) {
                        subject.documents.pop();
                        errors.push(`${file.name}: ${dataLoadError || "could not save the PDF text."}`);
                        break;
                    }

                    addedCount++;
                } catch (error) {
                    console.error(`Could not read PDF "${file.name}":`, error);
                    errors.push(`${file.name}: ${error.message}`);
                }
            }

            renderSubjects();

            const status = document.querySelectorAll(".subject-pdf-status")[
                studentData.subjects.indexOf(subject)
            ];
            if (status) {
                status.textContent = [
                    addedCount ? `${addedCount} PDF${addedCount === 1 ? "" : "s"} added.` : "",
                    ...errors
                ].filter(Boolean).join(" ");
            }
        });
    });
}


async function extractPdfText(file) {
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pages = [];
    let textLength = 0;

    try {
        const pdf = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(item => typeof item.str === "string" ? item.str : "")
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();

            textLength += pageText.length;
            if (textLength > MAX_PDF_TEXT_LENGTH) {
                throw new Error("This PDF contains too much text. Split it into smaller files (up to 150,000 characters each).");
            }

            pages.push(pageText);
        }
    } finally {
        await loadingTask.destroy();
    }

    if (!pages.some(page => page.length > 0)) {
        throw new Error("No selectable text was found. Scanned PDFs need OCR before they can be used.");
    }

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        pages
    };
}


function getPdfJs() {
    if (!pdfJsPromise) {
        pdfJsPromise = import("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs")
            .then(pdfjs => {
                pdfjs.GlobalWorkerOptions.workerSrc =
                    "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs";
                return pdfjs;
            })
            .catch(error => {
                pdfJsPromise = null;
                console.error("Could not load the PDF reader:", error);
                throw new Error("The PDF reader could not be loaded. Check your internet connection and try again.");
            });
    }

    return pdfJsPromise;
}


function renderSubjectDocuments(subject, container) {
    container.innerHTML = "";

    (Array.isArray(subject.documents) ? subject.documents : []).forEach(documentData => {
        const row = document.createElement("div");
        row.className = "subject-pdf-row";

        const name = document.createElement("span");
        name.className = "subject-pdf-name";
        name.textContent = documentData.name;

        const summarizeButton = document.createElement("button");
        summarizeButton.type = "button";
        summarizeButton.className = "subject-pdf-summary-btn";
        summarizeButton.textContent = "Ask AI";
        summarizeButton.addEventListener("click", () => {
            navigateTo("ai", {
                subjectId: subject.id,
                documentId: documentData.id
            });
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "subject-pdf-delete-btn";
        deleteButton.setAttribute("aria-label", `Remove ${documentData.name}`);
        deleteButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
        deleteButton.addEventListener("click", () => {
            if (!window.confirm(`Remove "${documentData.name}" from this subject?`))
                return;

            const documentIndex = subject.documents.indexOf(documentData);
            subject.documents.splice(documentIndex, 1);

            if (!saveData()) {
                subject.documents.splice(documentIndex, 0, documentData);
                return;
            }

            renderSubjects();
        });

        row.append(name, summarizeButton, deleteButton);
        container.appendChild(row);
    });
}


/* =========================================================
   RENDER TOPICS
========================================================= */

function renderTopics(subject, container) {

    container.innerHTML = "";

    subject.topics.forEach((topic, index) => {

        const row = document.createElement("div");
        row.style.marginTop = "10px";
        row.className = "topic-row";

        row.innerHTML = `
            <label>
                <input type="checkbox" ${topic.completed ? "checked" : ""}>
                ${escapeHtml(topic.name)}
            </label>
            <button type="button" class="delete-topic-btn"
                    aria-label="Delete ${escapeHtml(topic.name)}"
                    title="Delete topic">
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
        `;

        const checkbox = row.querySelector("input");
        const deleteTopicButton = row.querySelector(".delete-topic-btn");

        checkbox.addEventListener("change", function () {
            subject.topics[index].completed = this.checked;
            saveData();
            renderSubjects();
        });

        deleteTopicButton.addEventListener("click", function () {
            if (!window.confirm(`Delete the topic "${topic.name}"?`))
                return;

            subject.topics.splice(index, 1);
            saveData();
            renderSubjects();
        });

        container.appendChild(row);
    });
}


/* =========================================================
   REPORTS
========================================================= */

function openReports() {

    clearTimer();

    pageTitle.textContent = "Reports";
    pageDescription.textContent = "Review your syllabus progress and previous quiz results.";

    const total = getTotalTopics();
    const completed = getCompletedTopics();

    const syllabus =
        total === 0 ? 0 : Math.round(completed / total * 100);
    const quizRecords = studentData.quizzes
        .filter(quiz => quiz && typeof quiz === "object")
        .slice()
        .reverse();

    const quizHistory = quizRecords.length
        ? quizRecords.map(quiz => {
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
            const date = typeof quiz.date === "string" && quiz.date
                ? new Date(quiz.date)
                : null;
            const dateLabel = date && !Number.isNaN(date.getTime())
                ? date.toLocaleString()
                : "";

            return `
                <article class="report-quiz-record">
                    <div class="report-quiz-details">
                        <strong>${escapeHtml(quiz.name || "Quiz")}</strong>
                        <span>${escapeHtml(subjectName)}${escapeHtml(sourceName)}</span>
                        ${dateLabel ? `<time datetime="${escapeHtml(quiz.date)}">${escapeHtml(dateLabel)}</time>` : ""}
                    </div>
                    <div class="report-quiz-chart-wrap">
                        <div class="report-quiz-chart"
                             style="--report-score: ${safeScore}; --report-score-color: ${scoreColor}"
                             role="img"
                             aria-label="${safeScore}% score; ${100 - safeScore}% remaining">
                            <span>${escapeHtml(quiz.percentage)}%</span>
                        </div>
                    </div>
                </article>
            `;
        }).join("")
        : `<p class="report-quiz-empty">No quiz attempts saved yet. Your results will appear here after you complete a quiz.</p>`;
    const averageScore = quizRecords.length
        ? Math.round(quizRecords.reduce(
            (sum, quiz) => sum + (Number(quiz.percentage) || 0),
            0
        ) / quizRecords.length)
        : 0;

    contentArea.innerHTML = `

        <div class="content-box">

            <h2>Progress Report</h2>

            <p>Your syllabus progress is based on completed topics.</p>

            <br>

            <h3>Syllabus Progress</h3>

            <!-- STACKED BAR -->
            <div style="
                display:flex;
                width:100%;
                height:40px;
                margin-top:15px;
                border-radius:8px;
                overflow:hidden;
                background:#eeeeee;
            ">

                <div style="
                    width:${syllabus}%;
                    background:#6c63ff;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:white;
                    font-weight:bold;
                ">
                    ${syllabus > 0 ? syllabus + "%" : ""}
                </div>

                <div style="
                    width:${100 - syllabus}%;
                    background:#dddddd;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#555;
                ">
                    ${100 - syllabus > 0 ? (100 - syllabus) + "% Remaining" : ""}
                </div>

            </div>

            <br>

            <p>Completed Topics: ${completed} / ${total}</p>

        </div>

        <div class="content-box report-quiz-history">
            <h2>Previous Quiz Reports</h2>
            <p>Every saved quiz attempt is shown here with its score and chart.</p>
            <p><strong>${quizRecords.length}</strong> attempts ·
               <strong>${averageScore}%</strong> average score</p>
            <ul class="report-quiz-legend" aria-label="Quiz score chart colors">
                <li><span class="report-legend-swatch report-legend-perfect"></span>100%: green</li>
                <li><span class="report-legend-swatch report-legend-average"></span>50-99%: orange</li>
                <li><span class="report-legend-swatch report-legend-low"></span>Under 50%: red</li>
            </ul>
            <div class="report-quiz-list">${quizHistory}</div>
        </div>

    `;
}


/* =========================================================
   CALENDAR
========================================================= */

/* Day is fixed to 1 so month navigation never skips months */
let calendarDate = new Date();
calendarDate.setDate(1);

let selectedCalendarDate = null;
let calendarFocusDate = null;
let editingCalendarEventId = null;


async function openCalendar() {

    clearTimer();

    pageTitle.textContent = "Calendar";
    pageDescription.textContent = "Plan your revision sessions and exam dates.";

    const focusDate = calendarFocusDate;
    calendarFocusDate = null;
    selectedCalendarDate = null;
    editingCalendarEventId = null;

    contentArea.innerHTML = `<p class="content-box" role="status">Loading saved calendar events...</p>`;
    try {
        await refreshDashboardData();
        calendarEvents = await examReadyApi.get("/calendar");
    } catch (error) {
        showDashboardApiError(error);
        return;
    }

    renderCalendar();

    if (focusDate) {
        selectCalendarDate(focusDate);
    }
}


function renderCalendar() {

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const monthName = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ][month];
    const monthArtwork = [
        { icon: "❄️", label: "Winter snow" },
        { icon: "💗", label: "February hearts" },
        { icon: "🌷", label: "Spring tulips" },
        { icon: "🌸", label: "Spring blossoms" },
        { icon: "🦋", label: "May butterfly" },
        { icon: "☀️", label: "Summer sunshine" },
        { icon: "🌊", label: "Summer waves" },
        { icon: "🌻", label: "August sunflower" },
        { icon: "🍂", label: "Autumn leaves" },
        { icon: "🎃", label: "October pumpkin" },
        { icon: "🍁", label: "November leaf" },
        { icon: "☃️", label: "Winter snowman" }
    ][month];

    contentArea.innerHTML = `

        <div class="calendar-wrapper" data-month="${month}">

            <div class="calendar-banner">
                <div class="calendar-banner-copy">
                    <span>YOUR YEAR, AT A GLANCE</span>
                    <strong>${monthName} ${year}</strong>
                </div>
                <span class="calendar-month-art"
                      role="img"
                      aria-label="${monthArtwork.label}">${monthArtwork.icon}</span>
            </div>

            <!-- HEADER -->
            <div class="calendar-header">

                <button type="button" class="calendar-nav" id="previousMonth">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>

                <div class="calendar-title">
                    <select id="calendarMonth">
                        ${generateMonthOptions(month)}
                    </select>

                    <select id="calendarYear">
                        ${generateYearOptions(year)}
                    </select>
                </div>

                <button type="button" class="calendar-nav" id="nextMonth">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

            </div>

            <!-- CALENDAR -->
            <div class="calendar">

                <div class="calendar-weekdays">
                    <div>MONDAY</div>
                    <div>TUESDAY</div>
                    <div>WEDNESDAY</div>
                    <div>THURSDAY</div>
                    <div>FRIDAY</div>
                    <div>SATURDAY</div>
                    <div>SUNDAY</div>
                </div>

                <div class="calendar-days" id="calendarDays"></div>

            </div>

            <!-- SCHEDULE FORM -->
            <div id="calendarEventPanel" class="calendar-event-panel">

                <h2>Schedule Event</h2>

                <p id="selectedDateText">Select a date from the calendar.</p>

                <div class="calendar-form">

                    <label>Subject</label>

                    <select id="calendarSubject">
                        <option value="">No subject</option>
                        ${studentData.subjects.map(subject => `
                                <option value="${subject.id}">
                                ${escapeHtml(subject.name)}
                            </option>
                        `).join("")}
                    </select>

                        <label for="calendarTopic">Event title</label>

                        <input type="text" id="calendarTopic" maxlength="200"
                               placeholder="Enter event title">

                        <label for="calendarTime">Time</label>
                        <input type="time" id="calendarTime">

                        <label for="calendarDescription">Description</label>
                        <textarea id="calendarDescription" rows="3"
                                  placeholder="Add event details"></textarea>

                        <label for="calendarReminder">Reminder</label>
                        <select id="calendarReminder">
                            <option value="">No reminder</option>
                            <option value="5">5 minutes before</option>
                            <option value="15">15 minutes before</option>
                            <option value="30">30 minutes before</option>
                            <option value="60">1 hour before</option>
                            <option value="1440">1 day before</option>
                        </select>

                        <label>Event Type</label>

                    <select id="calendarEventType">
                        <option value="revision">Revision</option>
                        <option value="exam">Exam</option>
                    </select>

                    <button type="button" id="saveCalendarEvent" class="calendar-save-btn">
                        <i class="fa-solid fa-plus"></i>
                        Save Event
                    </button>

                </div>

                <div id="calendarSelectedEvents"></div>
            </div>

            <!-- LEGEND -->
            <div class="calendar-legend">
                <div><span class="legend-box revision-color"></span> Revision</div>
                <div><span class="legend-box exam-color"></span> Exam</div>
            </div>

        </div>
    `;

    renderCalendarDays();

    document.getElementById("previousMonth").addEventListener("click", function () {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        selectedCalendarDate = null;
        renderCalendar();
    });

    document.getElementById("nextMonth").addEventListener("click", function () {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        selectedCalendarDate = null;
        renderCalendar();
    });

    document.getElementById("calendarMonth").addEventListener("change", function () {
        calendarDate.setMonth(Number(this.value));
        selectedCalendarDate = null;
        renderCalendar();
    });

    document.getElementById("calendarYear").addEventListener("change", function () {
        calendarDate.setFullYear(Number(this.value));
        selectedCalendarDate = null;
        renderCalendar();
    });

    document.getElementById("saveCalendarEvent").addEventListener("click", saveCalendarEvent);
}


/* ---------- Month options ---------- */

function generateMonthOptions(selectedMonth) {

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return months.map((month, index) => `
        <option value="${index}" ${index === selectedMonth ? "selected" : ""}>
            ${month}
        </option>
    `).join("");
}


/* ---------- Year options ---------- */

function generateYearOptions(selectedYear) {

    let options = "";

    for (let year = 2000; year <= 2050; year++) {
        options += `
            <option value="${year}" ${year === selectedYear ? "selected" : ""}>
                ${year}
            </option>
        `;
    }

    return options;
}


/* ---------- Render days ---------- */

function renderCalendarDays() {

    const calendarDays = document.getElementById("calendarDays");

    if (!calendarDays)
        return;

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();

    /* JS: Sunday = 0 ... Saturday = 6. We want Monday first. */
    const firstDay = new Date(year, month, 1).getDay();
    const mondayFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    let html = "";

    /* Previous month days */
    for (let i = mondayFirstDay - 1; i >= 0; i--) {
        html += `
            <div class="calendar-day other-month">
                <span>${previousMonthDays - i}</span>
            </div>
        `;
    }

    /* Current month */
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {

        const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

        const dateString = formatDate(year, month, day);

        const revisionEvents =
            studentData.revisions.filter(event => event.date === dateString);

        const examEvents =
            studentData.exams.filter(event => event.date === dateString);
        const savedEvents = calendarEvents.filter(
            event => event.event_date === dateString
        );

        html += `
            <div class="calendar-day ${isToday ? "today" : ""}"
                 data-date="${dateString}">

                <span class="day-number">${day}</span>

                <div class="day-events">
                    ${renderDayEvents(revisionEvents, examEvents, savedEvents)}
                </div>

            </div>
        `;
    }

    /* Next month days */
    const totalCells = mondayFirstDay + daysInMonth;
    const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells;

    for (let day = 1; day <= remainingCells; day++) {
        html += `
            <div class="calendar-day other-month">
                <span>${day}</span>
            </div>
        `;
    }

    calendarDays.innerHTML = html;

    /* Date click */
    document
        .querySelectorAll(".calendar-day:not(.other-month)")
        .forEach(dayElement => {
            dayElement.addEventListener("click", function () {
                selectCalendarDate(this.dataset.date);
            });
        });
}


/* ---------- Format date as YYYY-MM-DD ---------- */

function formatDate(year, month, day) {

    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");

    return `${year}-${formattedMonth}-${formattedDay}`;
}


/* ---------- Events inside a date cell ---------- */

function renderDayEvents(revisions, exams, savedEvents) {

    let html = "";

    revisions.forEach(event => {
        html += `
            <div class="calendar-event revision-event">
                <i class="fa-solid fa-book"></i>
                ${escapeHtml(event.subject)}
            </div>
        `;
    });

    exams.forEach(event => {
        html += `
            <div class="calendar-event exam-event"
                 title="Exam: ${escapeHtml(event.subject)}${event.topic ? ` - ${escapeHtml(event.topic)}` : ""}">
                <i class="fa-solid fa-file-pen"></i>
                ${escapeHtml(event.subject)}
                ${event.topic ? `<span class="calendar-event-topic">${escapeHtml(event.topic)}</span>` : ""}
            </div>
        `;
    });

    savedEvents.forEach(event => {
        html += `
            <div class="calendar-event ${event.event_type === "exam" ? "exam-event" : "revision-event"}"
                 title="${escapeHtml(event.title)}${event.event_time ? ` · ${escapeHtml(event.event_time)}` : ""}">
                ${escapeHtml(event.title)}
            </div>
        `;
    });

    return html;
}


/* ---------- Select a date ---------- */

function selectCalendarDate(date) {

    selectedCalendarDate = date;

    const dateObject = new Date(date + "T00:00:00");

    const formattedDate = dateObject.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const panel = document.getElementById("calendarEventPanel");
    const dateText = document.getElementById("selectedDateText");

    dateText.innerHTML = `<strong>${formattedDate}</strong>`;

    panel.classList.add("show");

    document.querySelectorAll(".calendar-day").forEach(day => {
        day.classList.remove("selected-date");
    });

    const selected = document.querySelector(`[data-date="${date}"]`);

    if (selected) {
        selected.classList.add("selected-date");
    }

    renderSelectedCalendarEvents();

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* ---------- Save calendar event ---------- */

function renderSelectedCalendarEvents() {
    const container = document.getElementById("calendarSelectedEvents");
    if (!container) return;

    const selectedEvents = calendarEvents.filter(
        event => event.event_date === selectedCalendarDate
    );
    if (!selectedEvents.length) {
        container.innerHTML = "<p>No saved events for this date.</p>";
        return;
    }

    container.innerHTML = `
        <h3>Events for this date</h3>
        ${selectedEvents.map(event => `
            <article class="content-box">
                <strong>${escapeHtml(event.title)}</strong>
                <p>${escapeHtml(event.event_type)}${event.event_time ? ` · ${escapeHtml(event.event_time)}` : ""}</p>
                ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
                ${event.reminder_minutes !== null
                    ? `<p>Reminder: ${escapeHtml(event.reminder_minutes)} minutes before</p>`
                    : ""}
                <button type="button" data-edit-calendar-event="${event.id}">Edit</button>
                <button type="button" data-delete-calendar-event="${event.id}">Delete</button>
            </article>
        `).join("")}
    `;

    container.querySelectorAll("[data-edit-calendar-event]").forEach(button => {
        button.addEventListener("click", () => {
            const event = calendarEvents.find(
                item => item.id === Number(button.dataset.editCalendarEvent)
            );
            if (!event) return;

            editingCalendarEventId = event.id;
            document.getElementById("calendarSubject").value =
                event.subject_id === null ? "" : String(event.subject_id);
            document.getElementById("calendarTopic").value = event.title;
            document.getElementById("calendarTime").value = event.event_time || "";
            document.getElementById("calendarDescription").value =
                event.description || "";
            document.getElementById("calendarReminder").value =
                event.reminder_minutes === null ? "" : String(event.reminder_minutes);
            document.getElementById("calendarEventType").value = event.event_type;
            document.getElementById("saveCalendarEvent").textContent = "Update Event";
        });
    });

    container.querySelectorAll("[data-delete-calendar-event]").forEach(button => {
        button.addEventListener("click", async () => {
            const eventId = Number(button.dataset.deleteCalendarEvent);
            try {
                await examReadyApi.delete(`/calendar/${eventId}`);
                calendarEvents = calendarEvents.filter(event => event.id !== eventId);
                renderCalendarDays();
                renderSelectedCalendarEvents();
            } catch (error) {
                alert(`Could not delete the event: ${error.message}`);
            }
        });
    });
}


async function saveCalendarEvent() {

    if (!selectedCalendarDate) {
        alert("Please select a date first.");
        return;
    }

    const subjectValue = document.getElementById("calendarSubject").value;
    const title = document.getElementById("calendarTopic").value.trim();
    const type = document.getElementById("calendarEventType").value;

    if (!title) {
        alert("Please enter an event title.");
        return;
    }

    const event = {
        subject_id: subjectValue ? Number(subjectValue) : null,
        title,
        event_type: type,
        event_date: selectedCalendarDate,
        event_time: document.getElementById("calendarTime").value || null,
        description: document.getElementById("calendarDescription").value.trim(),
        reminder_minutes: document.getElementById("calendarReminder").value
            ? Number(document.getElementById("calendarReminder").value)
            : null
    };

    try {
        const savedEvent = editingCalendarEventId
            ? await examReadyApi.put(`/calendar/${editingCalendarEventId}`, event)
            : await examReadyApi.post("/calendar", event);
        calendarEvents = calendarEvents.filter(item => item.id !== savedEvent.id);
        calendarEvents.push(savedEvent);
        editingCalendarEventId = null;

        document.getElementById("calendarTopic").value = "";
        document.getElementById("calendarTime").value = "";
        document.getElementById("calendarDescription").value = "";
        document.getElementById("calendarReminder").value = "";
        document.getElementById("calendarEventType").value = "revision";
        document.getElementById("saveCalendarEvent").textContent = "Save Event";

        renderCalendarDays();
        renderSelectedCalendarEvents();
    } catch (error) {
        alert(`Could not save the event: ${error.message}`);
    }
}


/* =========================================================
   SCHEDULE
========================================================= */

function openSchedule() {

    clearTimer();

    pageTitle.textContent = "Schedule";
    pageDescription.textContent =
        "Add exam dates and review your upcoming study schedule.";

    const readiness = calculateReadiness();
    const subjects = [...new Set(studentData.subjects
        .map(subject => subject.name)
        .filter(name => typeof name === "string" && name.trim()))];
    const topics = [...new Set(studentData.subjects
        .flatMap(subject => Array.isArray(subject.topics) ? subject.topics : [])
        .map(topic => topic.name)
        .filter(name => typeof name === "string" && name.trim()))];
    const exams = studentData.exams
        .map((exam, index) => ({ exam, index }))
        .sort((first, second) =>
            String(first.exam.date || "").localeCompare(String(second.exam.date || ""))
    );

    contentArea.innerHTML = `

        <div class="content-box schedule-exam-form">

            <h2>Add an Exam</h2>
            <p>Enter the subject, topic, and date for your exam.</p>

            <form id="examScheduleForm" class="schedule-form">
                <div class="schedule-field">
                    <label for="examSubject">Subject</label>
                    <input id="examSubject" name="subject" type="text"
                           list="examSubjectOptions" maxlength="100"
                           placeholder="Enter or select a subject" required>
                    <datalist id="examSubjectOptions">
                        ${subjects.map(subject => `
                            <option value="${escapeHtml(subject)}"></option>
                        `).join("")}
                    </datalist>
                </div>

                <div class="schedule-field">
                    <label for="examTopic">Topic</label>
                    <input id="examTopic" name="topic" type="text"
                           list="examTopicOptions" maxlength="150"
                           placeholder="Enter or select a topic" required>
                    <datalist id="examTopicOptions">
                        ${topics.map(topic => `
                            <option value="${escapeHtml(topic)}"></option>
                        `).join("")}
                    </datalist>
                </div>

                <div class="schedule-field">
                    <label for="examDate">Exam Date</label>
                    <input id="examDate" name="date" type="date" required>
                </div>

                <button type="submit" class="schedule-submit-btn">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    Add Exam
                </button>
            </form>

            <p id="examScheduleStatus" class="schedule-status" role="status" aria-live="polite"></p>

        </div>

        <br>

        <!-- EXAM TABLE -->
        <div class="content-box">

            <h2>Exam Schedule</h2>

            <div class="schedule-table-wrap">
            <table class="schedule-table">

                <thead>
                    <tr>
                        <th scope="col">Subject</th>
                        <th scope="col">Topic</th>
                        <th scope="col">Exam Date</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        exams.length === 0
                        ? `
                        <tr>
                            <td colspan="4" class="schedule-empty">
                                No exams scheduled yet.
                            </td>
                        </tr>
                        `
                        : exams.map(({ exam, index }) => `
                        <tr>
                            <td>${escapeHtml(exam.subject)}</td>
                            <td>${escapeHtml(exam.topic)}</td>
                            <td>${escapeHtml(exam.date)}</td>
                            <td class="schedule-action-cell">
                                <button type="button" class="schedule-delete-btn"
                                        data-exam-index="${index}"
                                        aria-label="Delete ${escapeHtml(exam.subject)} exam on ${escapeHtml(exam.date)}"
                                        title="Delete exam">
                                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                                    Delete
                                </button>
                            </td>
                        </tr>
                        `).join("")
                    }
                </tbody>

            </table>
            </div>
            <p id="scheduleDeleteStatus" class="schedule-status" role="status" aria-live="polite"></p>

        </div>

        <br>

        <!-- REVISION LIST -->
        <div class="content-box">

            <h2>Revision Schedule</h2>

            <br>

            ${
                studentData.revisions.length === 0
                ? `<p>No revision dates scheduled yet.</p>`
                : studentData.revisions.map(revision => `
                    <div style="
                        padding:12px;
                        margin-bottom:10px;
                        background:#f5f7fb;
                        border-radius:8px;
                    ">
                        <strong>${escapeHtml(revision.subject)}</strong>
                        - ${escapeHtml(revision.topic)}
                        - ${escapeHtml(revision.date)}
                    </div>
                `).join("")
            }

        </div>

        <br>

        <!-- READINESS -->
        <div class="content-box">

            <h2>Exam Readiness</h2>

            <br>

            <div style="
                width:100%;
                height:35px;
                background:#eeeeee;
                border-radius:8px;
                overflow:hidden;
            ">
                <div style="
                    width:${readiness}%;
                    height:100%;
                    background:#6c63ff;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:white;
                    font-weight:bold;
                ">
                    ${readiness > 0 ? readiness + "%" : ""}
                </div>
            </div>

            <br>

            <p>Readiness is calculated from:</p>
            <br>
            <p>✓ Syllabus completion (50%)</p>
            <p>✓ Quiz performance (30%)</p>
            <p>✓ Study time (20%, 10 hours = full score)</p>

            <br>

            <p><strong>Current readiness: ${readiness}%</strong></p>

        </div>
    `;

    document.getElementById("examScheduleForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const subject = document.getElementById("examSubject").value.trim();
        const topic = document.getElementById("examTopic").value.trim();
        const date = document.getElementById("examDate").value;

        if (!subject || !topic || !date) {
            document.getElementById("examScheduleStatus").textContent =
                "Enter a subject, topic, and exam date.";
            return;
        }

        studentData.exams.push({
            id: Date.now(),
            subject,
            topic,
            date
        });

        const [year, month] = date.split("-").map(Number);
        calendarDate.setFullYear(year, month - 1, 1);
        calendarFocusDate = date;

        const saved = saveData();
        openSchedule();
        document.getElementById("examScheduleStatus").textContent =
            saved
                ? "Exam added to your schedule."
                : dataLoadError || "The exam could not be saved.";
    });

    document.querySelectorAll(".schedule-delete-btn").forEach(button => {
        button.addEventListener("click", function () {
            const examIndex = Number(this.dataset.examIndex);
            const exam = studentData.exams[examIndex];

            if (!exam)
                return;

            if (!window.confirm(`Delete the exam for "${exam.subject}" on ${exam.date}?`))
                return;

            studentData.exams.splice(examIndex, 1);
            const saved = saveData();

            if (!saved) {
                studentData.exams.splice(examIndex, 0, exam);
            }

            openSchedule();

            if (!saved) {
                document.getElementById("scheduleDeleteStatus").textContent =
                    dataLoadError || "The exam could not be deleted.";
            } else {
                document.getElementById("scheduleDeleteStatus").textContent =
                    "Exam deleted from your schedule and calendar.";
            }
        });
    });
}


/* =========================================================
   READINESS CALCULATION
========================================================= */

function calculateReadiness() {

    const totalTopics = getTotalTopics();
    const completedTopics = getCompletedTopics();

    const syllabusScore =
        totalTopics === 0 ? 0 : (completedTopics / totalTopics) * 100;

    const quizScore =
        studentData.quizzes.length === 0
            ? 0
            : studentData.quizzes.reduce(
                (sum, quiz) => sum + quiz.percentage, 0
            ) / studentData.quizzes.length;

    const studyScore =
        Math.min(studentData.studyMinutes / 600 * 100, 100);

    /* Weights: Syllabus 50%, Quiz 30%, Study time 20% */
    const readiness =
        (syllabusScore * 0.5) +
        (quizScore * 0.3) +
        (studyScore * 0.2);

    return Math.round(readiness);
}


/* =========================================================
   PROFILE
========================================================= */

function openProfile() {

    clearTimer();

    pageTitle.textContent = "Profile";
    pageDescription.textContent = "Manage your student information.";

    const profile = getProfile();

    contentArea.innerHTML = `
        <div class="profile-container">

            <div class="profile-avatar">
                <i class="fa-solid fa-circle-user"></i>
                <h2>Student Profile</h2>
            </div>

            <div class="profile-form">

                <label>Full Name</label>
                <input type="text" id="studentName" placeholder="Enter your name"
                       value="${escapeHtml(profile.name)}">

                <label>Email</label>
                <input type="email" id="studentEmail" placeholder="Enter your email"
                       value="${escapeHtml(profile.email)}">

                <label>Course</label>
                <input type="text" id="studentCourse" placeholder="Enter your course"
                       value="${escapeHtml(profile.course)}">

                <label>Year</label>
                <input type="text" id="studentYear" placeholder="Enter your year"
                       value="${escapeHtml(profile.year)}">

                <button type="button" class="save-btn" id="saveProfile">
                    Save Profile
                </button>

            </div>

        </div>
    `;

    document.getElementById("saveProfile").addEventListener("click", function () {

        const name = document.getElementById("studentName").value.trim();

        if (!name) {
            alert("Please enter your name.");
            return;
        }

        const newProfile = {
            name: name,
            email: document.getElementById("studentEmail").value.trim(),
            course: document.getElementById("studentCourse").value.trim(),
            year: document.getElementById("studentYear").value.trim()
        };

        try {
            localStorage.setItem("studentProfile", JSON.stringify(newProfile));
            localStorage.setItem("studentName", name);   // kept for compatibility
        } catch (error) {
            console.error("Could not save profile:", error);
            alert("Profile could not be saved in this browser.");
            return;
        }

        applyProfileName();
        alert("Profile saved successfully!");
    });
}


/* =========================================================
   AI ASSISTANT
========================================================= */

function getStudyPdfDocuments() {
    return studentData.subjects.flatMap((subject, subjectIndex) =>
        (Array.isArray(subject.documents) ? subject.documents : [])
            .map((documentData, documentIndex) => ({
                key: `${subjectIndex}:${documentIndex}`,
                subject,
                document: documentData
            }))
    );
}


function getPdfSentences(documentData) {
    return (Array.isArray(documentData.pages) ? documentData.pages : [])
        .flatMap((page, pageIndex) =>
            page.split(/(?<=[.!?])\s+/)
                .map(text => ({ text: text.trim(), page: pageIndex + 1 }))
                .filter(sentence => sentence.text)
        );
}


const pdfSummaryStopWords = new Set([
    "about", "after", "again", "also", "and", "are", "because", "been",
    "before", "being", "between", "but", "can", "could", "did", "does",
    "each", "for", "from", "had", "has", "have", "her", "here", "his",
    "into", "its", "may", "more", "most", "not", "our", "out", "over",
    "same", "should", "some", "such", "than", "that", "the", "their",
    "them", "then", "there", "these", "they", "this", "those", "through",
    "under", "use", "was", "were", "what", "when", "where", "which",
    "while", "who", "will", "with", "would", "you", "your"
]);


function getPdfKeywords(text) {
    return (text.toLowerCase().match(/[a-z0-9]{2,}/g) || [])
        .filter(word => !pdfSummaryStopWords.has(word));
}


function summarizePdf(documentData) {
    const sentences = getPdfSentences(documentData);
    if (sentences.length === 0)
        return "No readable text was found in this PDF.";

    const frequencies = new Map();
    sentences.forEach(sentence => {
        new Set(getPdfKeywords(sentence.text)).forEach(word => {
            frequencies.set(word, (frequencies.get(word) || 0) + 1);
        });
    });

    const ranked = sentences.map((sentence, index) => {
        const words = new Set(getPdfKeywords(sentence.text));
        const score = [...words].reduce((total, word) =>
            total + Math.log(1 + sentences.length / frequencies.get(word)), 0
        ) / Math.sqrt(Math.max(words.size, 1));
        return { ...sentence, index, score };
    });

    const selected = ranked
        .sort((first, second) => second.score - first.score)
        .slice(0, Math.min(5, ranked.length))
        .sort((first, second) => first.index - second.index);

    return selected.map(sentence =>
        `${sentence.text} (page ${sentence.page})`
    ).join("\n\n");
}


function answerFromPdf(question, documents) {
    const queryWords = new Set(getPdfKeywords(question));
    if (queryWords.size === 0)
        return "Please include a few keywords from the PDF in your question.";

    const results = documents.flatMap(({ subject, document }) => {
        const sentences = getPdfSentences(document);
        const frequencies = new Map();
        sentences.forEach(sentence => {
            new Set(getPdfKeywords(sentence.text)).forEach(word => {
                frequencies.set(word, (frequencies.get(word) || 0) + 1);
            });
        });

        return sentences.map(sentence => {
            const sentenceWords = new Set(getPdfKeywords(sentence.text));
            const matches = [...queryWords].filter(word => sentenceWords.has(word));
            const score = matches.reduce((total, word) =>
                total + 1 + Math.log(1 + sentences.length / (frequencies.get(word) || 1)), 0
            );
            return { ...sentence, document, subject, score };
        }).filter(result => result.score > 0);
    }).sort((first, second) => second.score - first.score);

    if (results.length === 0) {
        const names = documents.map(({ document }) => `"${document.name}"`).join(", ");
        return `I couldn't find a relevant passage in ${names}. Try asking with words used in the PDF.`;
    }

    const excerpts = results.slice(0, 3).map(result =>
        `“${result.text}” (${result.subject.name}, ${result.document.name}, page ${result.page})`
    );
    return `I found these relevant passages:\n\n${excerpts.join("\n\n")}`;
}


function openAI(options = {}) {

    clearTimer();

    pageTitle.textContent = "AI Assistant";
    pageDescription.textContent =
        "Ask questions about your uploaded study PDFs or request a summary.";

    const documents = getStudyPdfDocuments();
    const selectedDocument = documents.find(({ subject, document }) =>
        options.subjectId !== undefined &&
        String(subject.id) === String(options.subjectId) &&
        String(document.id) === String(options.documentId)
    );
    const initialSelection = selectedDocument ? selectedDocument.key : "";

    contentArea.innerHTML = `
        <div class="ai-container">

            <h2>AI Study Assistant</h2>
            <p class="ai-document-note">
                PDF text is processed in your browser and stays in this browser.
                Answers use passages from your documents; scanned PDFs need OCR.
            </p>

            <div class="ai-document-controls">
                <label for="aiDocumentSelect">Use study PDF</label>
                <select id="aiDocumentSelect" ${documents.length ? "" : "disabled"}>
                    <option value="">Choose a PDF</option>
                    <option value="all">All uploaded PDFs</option>
                    ${documents.map(({ key, subject, document }) => `
                        <option value="${escapeHtml(key)}">
                            ${escapeHtml(subject.name)} — ${escapeHtml(document.name)}
                        </option>
                    `).join("")}
                </select>
                <button type="button" id="summarizePDF" ${documents.length ? "" : "disabled"}>
                    Summarize PDF
                </button>
                <button type="button" id="clearAIChat" class="ai-clear-btn">
                    Clear chat
                </button>
            </div>

            <div id="aiSuggestions" class="ai-suggestions" aria-label="Suggested questions"></div>

            <div class="chat-box" id="chatBox" role="log" aria-live="polite" aria-relevant="additions">
                <div class="message ai-message">
                    Hello! Select a PDF to get answers from its text or generate an extractive summary.
                </div>
            </div>

            <form class="ai-input" id="aiQuestionForm">
                <input id="aiInput" type="text" maxlength="500"
                       aria-label="Your question" placeholder="Ask a question..." autocomplete="off">
                <button type="submit" id="sendAI" disabled>
                    <i class="fa-solid fa-paper-plane"></i>
                    <span>Send</span>
                </button>
            </form>

        </div>
    `;

    const input = document.getElementById("aiInput");
    const button = document.getElementById("sendAI");
    const chat = document.getElementById("chatBox");
    const documentSelect = document.getElementById("aiDocumentSelect");
    const summarizeButton = document.getElementById("summarizePDF");
    const clearButton = document.getElementById("clearAIChat");
    const questionForm = document.getElementById("aiQuestionForm");
    const suggestions = document.getElementById("aiSuggestions");
    let responsePending = false;

    if (initialSelection) {
        documentSelect.value = initialSelection;
    }

    function appendMessage(className, text) {
        const message = document.createElement("div");
        message.className = `message ${className}`;
        message.textContent = text;
        chat.appendChild(message);
        chat.scrollTop = chat.scrollHeight;
    }

    function getSelectedDocuments() {
        const source = documentSelect.value;
        return source === "all"
            ? documents
            : documents.filter(item => item.key === source);
    }

    function updateSuggestions() {
        const selectedDocuments = getSelectedDocuments();
        let questions = [
            "Help me plan my revision",
            "How should I prepare for an exam?"
        ];

        if (selectedDocuments.length > 0) {
            const terms = new Map();
            selectedDocuments.forEach(({ document }) => {
                getPdfSentences(document).forEach(({ text }) => {
                    new Set(getPdfKeywords(text)).forEach(word => {
                        terms.set(word, (terms.get(word) || 0) + 1);
                    });
                });
            });

            const keywords = [...terms]
                .sort((first, second) => second[1] - first[1])
                .slice(0, 3)
                .map(([word]) => word);

            questions = [
                "Summarize this PDF",
                ...keywords.slice(0, 2).map(word => `Explain ${word}`)
            ];
        }

        suggestions.replaceChildren();
        questions.forEach(question => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ai-suggestion";
            chip.textContent = question;
            chip.addEventListener("click", () => {
                if (question === "Summarize this PDF") {
                    summarizeSelectedDocuments();
                    return;
                }

                input.value = question;
                updateSendButton();
                questionForm.requestSubmit();
            });
            suggestions.appendChild(chip);
        });
    }

    function updateSendButton() {
        button.disabled = responsePending || !input.value.trim();
    }

    function summarizeSelectedDocuments() {
        const selectedDocuments = getSelectedDocuments();
        if (selectedDocuments.length === 0) {
            appendMessage("ai-message", "Choose a PDF first to summarize it.");
            return;
        }

        selectedDocuments.forEach(({ subject, document }) => {
            appendMessage(
                "ai-message",
                `Summary of "${document.name}" (${subject.name}):\n\n${summarizePdf(document)}`
            );
        });
    }

    function sendMessage(event) {
        event.preventDefault();

        const question = input.value.trim();

        if (!question || responsePending)
            return;

        appendMessage("user-message", question);
        input.value = "";
        responsePending = true;
        updateSendButton();

        const loading = document.createElement("div");
        loading.className = "message ai-message ai-typing";
        loading.setAttribute("role", "status");
        loading.textContent = "Looking through your study material...";
        chat.appendChild(loading);
        chat.scrollTop = chat.scrollHeight;

        const selectedDocuments = getSelectedDocuments();

        window.setTimeout(() => {
            if (!document.body.contains(chat))
                return;

            try {
                let answer;
                if (selectedDocuments.length > 0) {
                    answer = answerFromPdf(question, selectedDocuments);
                } else {
                    answer = "Try adding a study PDF to a subject so I can answer from your notes.";
                    const q = question.toLowerCase();

                    if (q.includes("python")) {
                        answer = "For Python, focus on variables, loops, functions, lists, dictionaries and OOP.";
                    } else if (q.includes("sql") || q.includes("dbms")) {
                        answer = "For DBMS and SQL, practice SELECT, JOIN, GROUP BY, normalization, keys and transactions.";
                    } else if (q.includes("exam") || q.includes("revision")) {
                        answer = "Focus on your incomplete topics first, then attempt quizzes and revise your mistakes.";
                    }
                }

                loading.remove();
                appendMessage("ai-message", answer);
            } catch (error) {
                console.error("Could not answer the study question:", error);
                loading.remove();
                appendMessage("ai-message", "I couldn't process that question. Please try again.");
            } finally {
                responsePending = false;
                updateSendButton();
            }
        }, 350);
    }

    summarizeButton.addEventListener("click", summarizeSelectedDocuments);
    documentSelect.addEventListener("change", updateSuggestions);
    input.addEventListener("input", updateSendButton);
    questionForm.addEventListener("submit", sendMessage);
    clearButton.addEventListener("click", function () {
        if (responsePending)
            return;

        chat.replaceChildren();
        appendMessage(
            "ai-message",
            documents.length
                ? "Chat cleared. Ask me about your selected study PDF."
                : "Chat cleared. Add a study PDF to ask questions about your notes."
        );
    });

    updateSuggestions();
    input.focus();
}


/* =========================================================
   TIMER
========================================================= */

function openTimer() {

    clearTimer();

    pageTitle.textContent = "Study Timer";
    pageDescription.textContent = "Track your focused study sessions.";

    timerSeconds = 25 * 60;

    contentArea.innerHTML = `
        <div class="timer-container">

            <h2>Study Timer</h2>

            <p>25-minute focused session</p>

            <div class="timer-display" id="timerDisplay">25:00</div>
            <p id="timerStatus" class="timer-status" role="status">Ready to focus.</p>

            <div class="timer-buttons">
                <button type="button" id="startTimer">Start</button>
                <button type="button" id="pauseTimer">Pause</button>
                <button type="button" class="reset" id="resetTimer">Reset</button>
            </div>

        </div>

        <div class="content-box timer-records">
            <h2>Study Records</h2>
            <div class="timer-totals">
                <p>Focused study: <strong id="totalStudyTime">0m</strong></p>
                <p>Time paused: <strong id="totalPausedTime">0m</strong></p>
            </div>
            <h3>Session history</h3>
            <div id="timerSessionHistory" class="timer-session-history"></div>
        </div>
    `;

    updateTimerDisplay();

    document.getElementById("startTimer").addEventListener("click", startTimer);
    document.getElementById("pauseTimer").addEventListener("click", pauseTimer);
    document.getElementById("resetTimer").addEventListener("click", resetTimer);
    renderTimerStats();
}


function startTimer() {

    if (timerRunning)
        return;

    if (timerSeconds <= 0) {
        const status = document.getElementById("timerStatus");
        if (status)
            status.textContent = "Reset the timer before starting another session.";
        return;
    }

    if (!currentTimerSession) {
        currentTimerSession = {
            startedAt: new Date().toISOString(),
            studySeconds: 0,
            pausedSeconds: 0,
            completed: false
        };
    }

    if (timerPausedAt !== null) {
        const pausedDuration = Math.max(0, Math.floor((Date.now() - timerPausedAt) / 1000));
        currentTimerSession.pausedSeconds += pausedDuration;
        studentData.pausedSeconds += pausedDuration;
        timerPausedAt = null;
        if (pausedDisplayInterval !== null) {
            clearInterval(pausedDisplayInterval);
            pausedDisplayInterval = null;
        }
        saveData();
    }

    timerRunning = true;
    document.getElementById("timerStatus").textContent = "Focused study in progress.";

    timerInterval = setInterval(function () {

        if (timerSeconds > 0) {

            timerSeconds--;
            currentTimerSession.studySeconds++;
            studentData.studySeconds++;
            studentData.studyMinutes = Math.floor(studentData.studySeconds / 60);
            updateTimerDisplay();
            renderTimerStats();

            if (studentData.studySeconds % 15 === 0)
                saveData();

        } else {

            if (currentTimerSession)
                currentTimerSession.completed = true;
            clearTimer();
            const status = document.getElementById("timerStatus");
            if (status)
                status.textContent = "Session complete. Your study record has been saved.";
            window.alert("Study session completed!");
        }

    }, 1000);
}


function pauseTimer() {
    if (!timerRunning || !currentTimerSession)
        return;

    if (timerInterval !== null)
        clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerPausedAt = Date.now();
    document.getElementById("timerStatus").textContent = "Timer paused. Paused time is being recorded.";

    if (pausedDisplayInterval === null) {
        pausedDisplayInterval = setInterval(renderTimerStats, 1000);
    }

    saveData();
    renderTimerStats();
}


function resetTimer() {
    clearTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
    const status = document.getElementById("timerStatus");
    if (status)
        status.textContent = "Timer reset. Your session has been saved.";
}


function clearTimer() {

    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }
    if (pausedDisplayInterval !== null) {
        clearInterval(pausedDisplayInterval);
    }

    timerInterval = null;
    pausedDisplayInterval = null;
    timerRunning = false;

    if (currentTimerSession) {
        if (timerPausedAt !== null) {
            const pausedDuration = Math.max(0, Math.floor((Date.now() - timerPausedAt) / 1000));
            currentTimerSession.pausedSeconds += pausedDuration;
            studentData.pausedSeconds += pausedDuration;
        }

        if (currentTimerSession.studySeconds > 0 || currentTimerSession.pausedSeconds > 0) {
            studentData.timerSessions.push({
                ...currentTimerSession,
                endedAt: new Date().toISOString()
            });
            saveData();
        }
        currentTimerSession = null;
    }

    timerPausedAt = null;
    renderTimerStats();
}


function formatTimerDuration(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return remainingSeconds
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
}


function renderTimerStats() {
    const studyTotal = document.getElementById("totalStudyTime");
    const pausedTotal = document.getElementById("totalPausedTime");
    const history = document.getElementById("timerSessionHistory");
    if (!studyTotal || !pausedTotal || !history)
        return;

    const studySeconds = Number.isFinite(studentData.studySeconds)
        ? studentData.studySeconds
        : studentData.studyMinutes * 60;
    const currentPauseSeconds = timerPausedAt === null
        ? 0
        : Math.max(0, Math.floor((Date.now() - timerPausedAt) / 1000));
    const pausedSeconds = studentData.pausedSeconds + currentPauseSeconds;
    studyTotal.textContent = formatTimerDuration(studySeconds);
    pausedTotal.textContent = formatTimerDuration(pausedSeconds);

    const sessions = studentData.timerSessions.slice().reverse();
    if (currentTimerSession) {
        sessions.unshift({
            ...currentTimerSession,
            pausedSeconds: currentTimerSession.pausedSeconds + currentPauseSeconds,
            inProgress: true
        });
    }

    if (!sessions.length) {
        history.innerHTML = `<p class="timer-history-empty">No study sessions recorded yet. Start the timer to begin.</p>`;
        return;
    }

    history.innerHTML = sessions.map(session => {
        const startedAt = typeof session.startedAt === "string"
            ? new Date(session.startedAt)
            : null;
        const sessionDate = startedAt && !Number.isNaN(startedAt.getTime())
            ? startedAt.toLocaleString()
            : "Study session";
        const sessionStatus = session.inProgress
            ? "In progress"
            : session.completed
                ? "Completed"
                : "Ended";

        return `
            <article class="timer-session-row">
                <div>
                    <strong>${escapeHtml(sessionDate)}</strong>
                    <span>${sessionStatus}</span>
                </div>
                <div class="timer-session-duration">
                    <span>Studied: ${formatTimerDuration(session.studySeconds)}</span>
                    <span>Paused: ${formatTimerDuration(session.pausedSeconds)}</span>
                </div>
            </article>
        `;
    }).join("");
}


function updateTimerDisplay() {

    const display = document.getElementById("timerDisplay");

    if (!display)
        return;

    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    display.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
}


/* =========================================================
   LOGOUT
========================================================= */

function openLogout() {

    clearTimer();

    pageTitle.textContent = "Logout";
    pageDescription.textContent = "Sign out of your student account.";

    contentArea.innerHTML = `
        <div class="content-box">

            <h2>Logout</h2>

            <p>Are you sure you want to logout?</p>

            <br>

            <button type="button" class="save-btn" id="confirmLogout">
                Confirm Logout
            </button>

            <button type="button" class="save-btn" id="cancelLogout"
                    style="margin-left:10px;">
                Cancel
            </button>

        </div>
    `;

    document.getElementById("confirmLogout").addEventListener("click", function () {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("userId");
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userName");
        window.location.replace("./dashboard.html");
    });

    document.getElementById("cancelLogout").addEventListener("click", function () {
        navigateTo("dashboard");
    });
}


/* =========================================================
   NAVIGATION (one place controls every page)
========================================================= */

const pages = {
    dashboard: openDashboard,
    subjects:  openSubjects,
    reports:   openReports,
    schedule:  openSchedule,
    calendar:  openCalendar,
    profile:   openProfile,
    ai:        openAI,
    timer:     openTimer,
    logout:    openLogout
};


function navigateTo(page, options) {

    const renderPage = pages[page];

    if (!renderPage) {
        console.error(`Unknown dashboard page: ${page}`);
        return;
    }

    /* Keep the sidebar highlight in sync (cards, back button, links) */
    menuLinks.forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });

    if (calendarCatSticker) {
        calendarCatSticker.hidden = page !== "calendar";
    }

    /* Back button on every page except Dashboard and Logout */
    if (backButton) {
        backButton.style.display =
            (page === "dashboard" || page === "logout") ? "none" : "inline-block";
    }

    try {
        renderPage(options);
    } catch (error) {
        console.error(`Failed to open "${page}":`, error);
        contentArea.innerHTML = `
            <p class="content-box" role="alert">
                Something went wrong while opening this page.
            </p>
        `;
    }

    currentDashboardPage = page;
    if (["dashboard", "subjects", "reports"].includes(page)) {
        refreshDashboardData().then(() => {
            if (currentDashboardPage === page) {
                renderPage(options);
            }
        }).catch(showDashboardApiError);
    }

    window.scrollTo(0, 0);
}


/* Sidebar links */
menuLinks.forEach(link => {
    link.addEventListener("click", function (event) {
        if (this.dataset.page === "quiz")
            return;

        event.preventDefault();
        navigateTo(this.dataset.page);
    });
});


/* Back to Dashboard button */
if (backButton) {
    backButton.addEventListener("click", function () {
        navigateTo("dashboard");
    });
}


/* =========================================================
   START APPLICATION
========================================================= */

window.addEventListener("pagehide", clearTimer);
applyProfileName();
navigateTo("dashboard");
