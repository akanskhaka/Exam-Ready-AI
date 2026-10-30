/* =========================================================
   STUDENT DASHBOARD DATA
   Everything starts empty. No fake subjects, marks or readiness.
========================================================= */

let studentData = {
    subjects: [],
    quizzes: [],
    revisions: [],
    exams: [],
    studyMinutes: 0
};

let dataLoadError = null;


/* =========================================================
   TIMER VARIABLES
========================================================= */

let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;


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
                            : []
                    }))
                : [],
            quizzes: Array.isArray(parsedData.quizzes) ? parsedData.quizzes : [],
            revisions: Array.isArray(parsedData.revisions) ? parsedData.revisions : [],
            exams: Array.isArray(parsedData.exams) ? parsedData.exams : [],
            studyMinutes: Number.isFinite(parsedData.studyMinutes) && parsedData.studyMinutes >= 0
                ? parsedData.studyMinutes
                : 0
        };
    } catch (error) {
        console.error("Could not load saved dashboard data:", error);
        dataLoadError = "Saved dashboard data could not be read. The dashboard is using empty data for now; the saved data was not changed.";
        studentData = {
            subjects: [],
            quizzes: [],
            revisions: [],
            exams: [],
            studyMinutes: 0
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


/* =========================================================
   DASHBOARD
========================================================= */

function openDashboard() {

    clearTimer();

    pageTitle.textContent = "Dashboard";
    pageDescription.textContent =
        "Track your actual study progress and academic activity.";

    const totalSubjects = studentData.subjects.length;
    const totalTopics = getTotalTopics();
    const completedTopics = getCompletedTopics();

    const syllabusProgress =
        totalTopics === 0
            ? 0
            : Math.round((completedTopics / totalTopics) * 100);

    const quizCount = studentData.quizzes.length;
    const studyHours = Math.floor(studentData.studyMinutes / 60);
    const studyMinutes = studentData.studyMinutes % 60;

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
                    Add your subjects, topics, quizzes and study sessions.
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

            <div class="card" data-nav="subjects" tabindex="0" role="link">
                <i class="fa-solid fa-list-check"></i>
                <h3>Syllabus</h3>
                <p>${syllabusProgress}% Completed</p>
                <div class="progress-bar">
                    <div class="progress" style="width:${syllabusProgress}%"></div>
                </div>
            </div>

            <div class="card" data-nav="reports" tabindex="0" role="link">
                <i class="fa-solid fa-pen-to-square"></i>
                <h3>Quizzes</h3>
                <p>${quizCount} Completed</p>
            </div>

            <div class="card" data-nav="timer" tabindex="0" role="link">
                <i class="fa-solid fa-clock"></i>
                <h3>Study Time</h3>
                <p>${studyHours}h ${studyMinutes}m</p>
            </div>

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
        "Add subjects, topics and update syllabus completion.";

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
        topics: []
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
        `;

        list.appendChild(card);

        const topicInput = card.querySelector(".topic-input");
        const addTopicButton = card.querySelector(".add-topic-btn");
        const topicList = card.querySelector(".topic-list");
        const deleteSubjectButton = card.querySelector(".delete-subject-btn");

        renderTopics(subject, topicList);

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
    pageDescription.textContent = "View syllabus and quiz performance.";

    const total = getTotalTopics();
    const completed = getCompletedTopics();

    const syllabus =
        total === 0 ? 0 : Math.round(completed / total * 100);

    const averageQuiz =
        studentData.quizzes.length === 0
            ? 0
            : Math.round(
                studentData.quizzes.reduce(
                    (sum, quiz) => sum + quiz.percentage, 0
                ) / studentData.quizzes.length
            );

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

        <br>

        <div class="content-box">

            <h2>Quiz Report</h2>

            <p>
                Average Quiz Score:
                <strong>${averageQuiz}%</strong>
            </p>

            <br>

            <div class="add-subject">
                <input type="text" id="quizName" placeholder="Quiz name">
                <input type="number" id="quizScore" placeholder="Score %" min="0" max="100">
                <button type="button" id="addQuiz">Add Quiz</button>
            </div>

            <div id="quizList"></div>

        </div>
    `;

    renderQuizzes();

    document.getElementById("addQuiz").addEventListener("click", addQuiz);
}


function openQuiz() {

    clearTimer();

    pageTitle.textContent = "Quiz";
    pageDescription.textContent = "Add and review your quiz scores.";

    const averageQuiz =
        studentData.quizzes.length === 0
            ? 0
            : Math.round(
                studentData.quizzes.reduce(
                    (sum, quiz) => sum + quiz.percentage, 0
                ) / studentData.quizzes.length
            );

    contentArea.innerHTML = `
        <div class="content-box">
            <h2>Quiz Report</h2>
            <p>Average Quiz Score: <strong>${averageQuiz}%</strong></p>
            <br>
            <div class="add-subject">
                <input type="text" id="quizName" placeholder="Quiz name">
                <input type="number" id="quizScore" placeholder="Score %" min="0" max="100">
                <button type="button" id="addQuiz">Add Quiz</button>
            </div>
            <div id="quizList"></div>
        </div>
    `;

    renderQuizzes();
    document.getElementById("addQuiz").addEventListener("click", addQuiz);
}


/* =========================================================
   QUIZ
========================================================= */

function addQuiz() {

    const name = document.getElementById("quizName").value.trim();
    const scoreText = document.getElementById("quizScore").value.trim();
    const score = Number(scoreText);

    if (!name || scoreText === "" || isNaN(score) || score < 0 || score > 100) {
        alert("Enter a quiz name and score between 0 and 100.");
        return;
    }

    studentData.quizzes.push({
        name: name,
        percentage: score
    });

    saveData();
    const activeMenuLink = Array.from(menuLinks).find(link =>
        link.classList.contains("active")
    );
    if (activeMenuLink && activeMenuLink.dataset.page === "quiz") {
        openQuiz();
    } else {
        openReports();
    }
}


/* =========================================================
   RENDER QUIZZES
========================================================= */

function renderQuizzes() {

    const list = document.getElementById("quizList");

    if (!list)
        return;

    if (studentData.quizzes.length === 0) {
        list.innerHTML = `<p>No quizzes added yet.</p>`;
        return;
    }

    list.innerHTML = studentData.quizzes.map(quiz => `
        <div style="
            padding:12px;
            margin-top:10px;
            background:#f5f7fb;
            border-radius:8px;
        ">
            <strong>${escapeHtml(quiz.name)}</strong>
            - ${escapeHtml(quiz.percentage)}%
        </div>
    `).join("");
}


/* =========================================================
   CALENDAR
========================================================= */

/* Day is fixed to 1 so month navigation never skips months */
let calendarDate = new Date();
calendarDate.setDate(1);

let selectedCalendarDate = null;


function openCalendar() {

    clearTimer();

    pageTitle.textContent = "Calendar";
    pageDescription.textContent = "Plan your revision sessions and exam dates.";

    selectedCalendarDate = null;

    renderCalendar();
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
                        <option value="">Select Subject</option>
                        ${studentData.subjects.map(subject => `
                            <option value="${escapeHtml(subject.name)}">
                                ${escapeHtml(subject.name)}
                            </option>
                        `).join("")}
                    </select>

                    <label>Topic</label>

                    <input type="text" id="calendarTopic" placeholder="Enter topic / chapter">

                    <label>Event Type</label>

                    <select id="calendarEventType">
                        <option value="revision">Revision</option>
                        <option value="exam">Exam</option>
                    </select>

                    <button type="button" id="saveCalendarEvent" class="calendar-save-btn">
                        <i class="fa-solid fa-plus"></i>
                        Schedule Event
                    </button>

                </div>

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

        html += `
            <div class="calendar-day ${isToday ? "today" : ""}"
                 data-date="${dateString}">

                <span class="day-number">${day}</span>

                <div class="day-events">
                    ${renderDayEvents(revisionEvents, examEvents)}
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

function renderDayEvents(revisions, exams) {

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
            <div class="calendar-event exam-event">
                <i class="fa-solid fa-file-pen"></i>
                ${escapeHtml(event.subject)}
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

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* ---------- Save calendar event ---------- */

function saveCalendarEvent() {

    if (!selectedCalendarDate) {
        alert("Please select a date first.");
        return;
    }

    const subject = document.getElementById("calendarSubject").value;
    const topic = document.getElementById("calendarTopic").value.trim();
    const type = document.getElementById("calendarEventType").value;

    if (!subject) {
        alert("Please select a subject.");
        return;
    }

    if (!topic) {
        alert("Please enter a topic.");
        return;
    }

    const event = {
        id: Date.now(),
        subject: subject,
        topic: topic,
        date: selectedCalendarDate
    };

    if (type === "revision") {
        studentData.revisions.push(event);
    } else {
        studentData.exams.push(event);
    }

    saveData();

    alert(
        type === "revision"
            ? "Revision scheduled successfully!"
            : "Exam scheduled successfully!"
    );

    selectedCalendarDate = null;
    renderCalendar();
}


/* =========================================================
   SCHEDULE
========================================================= */

function openSchedule() {

    clearTimer();

    pageTitle.textContent = "Schedule";
    pageDescription.textContent =
        "View exams, revisions and calculated exam readiness.";

    const readiness = calculateReadiness();

    contentArea.innerHTML = `

        <!-- EXAM TABLE -->
        <div class="content-box">

            <h2>Exam Schedule</h2>

            <br>

            <table style="width:100%; border-collapse:collapse;">

                <thead>
                    <tr>
                        <th style="text-align:left; padding:12px; border-bottom:1px solid #ddd;">Subject</th>
                        <th style="text-align:left; padding:12px; border-bottom:1px solid #ddd;">Topic</th>
                        <th style="text-align:left; padding:12px; border-bottom:1px solid #ddd;">Exam Date</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        studentData.exams.length === 0
                        ? `
                        <tr>
                            <td colspan="3" style="padding:15px;">
                                No exams scheduled yet.
                            </td>
                        </tr>
                        `
                        : studentData.exams.map(exam => `
                        <tr>
                            <td style="padding:12px;">${escapeHtml(exam.subject)}</td>
                            <td style="padding:12px;">${escapeHtml(exam.topic)}</td>
                            <td style="padding:12px;">${escapeHtml(exam.date)}</td>
                        </tr>
                        `).join("")
                    }
                </tbody>

            </table>

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

function openAI() {

    clearTimer();

    pageTitle.textContent = "AI Assistant";
    pageDescription.textContent = "Ask questions related to your studies.";

    contentArea.innerHTML = `
        <div class="ai-container">

            <h2>🤖 AI Study Assistant</h2>

            <div class="chat-box" id="chatBox">
                <div class="message ai-message">
                    Hello! Ask me anything about your studies.
                </div>
            </div>

            <div class="ai-input">
                <input id="aiInput" type="text" placeholder="Ask a question...">
                <button type="button" id="sendAI">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>

        </div>
    `;

    const input = document.getElementById("aiInput");
    const button = document.getElementById("sendAI");
    const chat = document.getElementById("chatBox");

    function sendMessage() {

        const question = input.value.trim();

        if (!question)
            return;

        chat.insertAdjacentHTML("beforeend", `
            <div class="message user-message">
                ${escapeHtml(question)}
            </div>
        `);

        input.value = "";
        chat.scrollTop = chat.scrollHeight;

        setTimeout(function () {

            let answer =
                "Revise the topic regularly and practice questions related to it.";

            const q = question.toLowerCase();

            if (q.includes("python")) {
                answer = "For Python, focus on variables, loops, functions, lists, dictionaries and OOP.";
            }
            else if (q.includes("sql") || q.includes("dbms")) {
                answer = "For DBMS and SQL, practice SELECT, JOIN, GROUP BY, normalization, keys and transactions.";
            }
            else if (q.includes("exam")) {
                answer = "Focus on your incomplete topics first, then attempt quizzes and revise your mistakes.";
            }

            /* If the user left this page, the chat box is gone */
            if (!document.body.contains(chat))
                return;

            chat.insertAdjacentHTML("beforeend", `
                <div class="message ai-message">
                    ${escapeHtml(answer)}
                </div>
            `);

            chat.scrollTop = chat.scrollHeight;

        }, 500);
    }

    button.addEventListener("click", sendMessage);

    input.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
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

            <div class="timer-buttons">
                <button type="button" id="startTimer">Start</button>
                <button type="button" id="pauseTimer">Pause</button>
                <button type="button" class="reset" id="resetTimer">Reset</button>
            </div>

        </div>
    `;

    updateTimerDisplay();

    document.getElementById("startTimer").addEventListener("click", startTimer);
    document.getElementById("pauseTimer").addEventListener("click", pauseTimer);
    document.getElementById("resetTimer").addEventListener("click", resetTimer);
}


function startTimer() {

    if (timerRunning)
        return;

    timerRunning = true;

    timerInterval = setInterval(function () {

        if (timerSeconds > 0) {

            timerSeconds--;
            updateTimerDisplay();

        } else {

            clearTimer();

            studentData.studyMinutes += 25;
            saveData();

            alert("🎉 Study session completed!");
        }

    }, 1000);
}


function pauseTimer() {
    clearTimer();
}


function resetTimer() {
    clearTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
}


function clearTimer() {

    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    timerInterval = null;
    timerRunning = false;
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
    quiz:      openQuiz,
    schedule:  openSchedule,
    calendar:  openCalendar,
    profile:   openProfile,
    ai:        openAI,
    timer:     openTimer,
    logout:    openLogout
};


function navigateTo(page) {

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
        renderPage();
    } catch (error) {
        console.error(`Failed to open "${page}":`, error);
        contentArea.innerHTML = `
            <p class="content-box" role="alert">
                Something went wrong while opening this page.
            </p>
        `;
    }

    window.scrollTo(0, 0);
}


/* Sidebar links */
menuLinks.forEach(link => {
    link.addEventListener("click", function (event) {
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

applyProfileName();
navigateTo("dashboard");
