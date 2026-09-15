/* =========================================================
   STUDENT DASHBOARD DATA
========================================================= */
/*
    Everything starts at zero.
    No fake subjects.
    No fake marks.
    No fake readiness.
*/
let studentData = {
    subjects: [],

    quizzes: [],

    revisions: [],

    exams: [],

    studyMinutes: 0

};
/* =========================================================
   TIMER VARIABLES
========================================================= */

let timerInterval = null;

let timerSeconds = 25 * 60;

let timerRunning = false;



/* =========================================================
   GET ELEMENTS
========================================================= */

const menuLinks =
    document.querySelectorAll(".menu-link");

const contentArea =
    document.getElementById("content-area");

const pageTitle =
    document.getElementById("page-title");

const pageDescription =
    document.getElementById("page-description");



/* =========================================================
   LOCAL STORAGE
========================================================= */


/*
    This allows the user's data to remain
    even after refreshing the page.
*/

function saveData() {

    localStorage.setItem(
        "studentDashboardData",
        JSON.stringify(studentData)
    );

}


function loadData() {

    const savedData =
        localStorage.getItem(
            "studentDashboardData"
        );


    if (savedData) {

        studentData =
            JSON.parse(savedData);

    }

}


loadData();



/* =========================================================
   DASHBOARD
========================================================= */

function openDashboard() {


    clearTimer();


    pageTitle.textContent =
        "Dashboard";


    pageDescription.textContent =
        "Track your actual study progress and academic activity.";


    const totalSubjects =
        studentData.subjects.length;


    const totalTopics =
        getTotalTopics();


    const completedTopics =
        getCompletedTopics();


    const syllabusProgress =
        totalTopics === 0
            ? 0
            : Math.round(
                (completedTopics / totalTopics) * 100
            );


    const quizCount =
        studentData.quizzes.length;


    const studyHours =
        Math.floor(
            studentData.studyMinutes / 60
        );


    const studyMinutes =
        studentData.studyMinutes % 60;



    contentArea.innerHTML = `

        <!-- WELCOME -->

        <div class="welcome-card">

            <div>

                <h2>
                    Welcome to your Dashboard 
                </h2>

                <p>
                    Add your subjects, topics,
                    quizzes and study sessions.
                    Your dashboard will update automatically.
                </p>

            </div>

        </div>



        <!-- OVERVIEW -->

        <div class="cards">


            <div class="card">

                <i class="fa-solid fa-book"></i>

                <h3>
                    Subjects
                </h3>

                <p>
                    ${totalSubjects}
                    Added
                </p>

            </div>



            <div class="card">

                <i class="fa-solid fa-list-check"></i>

                <h3>
                    Syllabus
                </h3>

                <p>
                    ${syllabusProgress}% Completed
                </p>

                <div class="progress-bar">

                    <div class="progress"
                         style="width:${syllabusProgress}%">
                    </div>

                </div>

            </div>



            <div class="card">

                <i class="fa-solid fa-pen-to-square"></i>

                <h3>
                    Quizzes
                </h3>

                <p>
                    ${quizCount}
                    Completed
                </p>

            </div>



            <div class="card">

                <i class="fa-solid fa-clock"></i>

                <h3>
                    Study Time
                </h3>

                <p>
                    ${studyHours}h
                    ${studyMinutes}m
                </p>

            </div>


        </div>



        <!-- QUICK ACTIONS -->

        <h2 class="section-heading">

            Quick Actions

        </h2>



        <div class="dashboard-actions">


            <!-- AI -->

            <div class="action-card"
                 data-action="ai">

                <div class="action-icon">

                    <i class="fa-solid fa-robot"></i>

                </div>

                <h3>
                    AI Assistant
                </h3>

                <p>
                    Ask questions and get
                    study guidance.
                </p>

                <button>
                    Open Assistant
                </button>

            </div>



            <!-- SUBJECTS -->

            <div class="action-card"
                 data-action="subjects">

                <div class="action-icon">

                    <i class="fa-solid fa-book-open"></i>

                </div>

                <h3>
                    Subjects
                </h3>

                <p>
                    Add subjects and manage
                    topic completion.
                </p>

                <button>
                    Manage Subjects
                </button>

            </div>



            <!-- PROFILE -->

            <div class="action-card"
                 data-action="profile">

                <div class="action-icon">

                    <i class="fa-solid fa-user"></i>

                </div>

                <h3>
                    Profile
                </h3>

                <p>
                    Manage your student
                    information.
                </p>

                <button>
                    View Profile
                </button>

            </div>



            <!-- TIMER -->

            <div class="action-card"
                 data-action="timer">

                <div class="action-icon">

                    <i class="fa-solid fa-stopwatch"></i>

                </div>

                <h3>
                    Study Timer
                </h3>

                <p>
                    Start a focused study
                    session.
                </p>

                <button>
                    Start Timer
                </button>

            </div>


        </div>

    `;


    addDashboardEvents();

}



/* =========================================================
   DASHBOARD EVENTS
========================================================= */

function addDashboardEvents() {


    document
        .querySelectorAll(".action-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                function () {

                    const action =
                        this.dataset.action;


                    if (action === "ai")
                        openAI();


                    if (action === "subjects")
                        openSubjects();


                    if (action === "profile")
                        openProfile();


                    if (action === "timer")
                        openTimer();

                }
            );

        });

}



/* =========================================================
   SUBJECT CALCULATIONS
========================================================= */

function getTotalTopics() {

    let total = 0;


    studentData.subjects.forEach(
        subject => {

            total += subject.topics.length;

        }
    );


    return total;

}



function getCompletedTopics() {

    let completed = 0;


    studentData.subjects.forEach(
        subject => {

            subject.topics.forEach(
                topic => {

                    if (topic.completed) {

                        completed++;

                    }

                }
            );

        }
    );


    return completed;

}



/* =========================================================
   SUBJECT PAGE
========================================================= */

function openSubjects() {


    clearTimer();


    pageTitle.textContent =
        "Subjects";


    pageDescription.textContent =
        "Add subjects, topics and update syllabus completion.";


    contentArea.innerHTML = `

        <div class="subject-container">

            <h2>
                 Subjects Studying
            </h2>

            <p>
                Add the subjects you are currently studying.
            </p>


            <div class="add-subject">

                <input
                    type="text"
                    id="subjectInput"
                    placeholder="Enter subject name">

                <button id="addSubject">

                    Add Subject

                </button>

            </div>


            <div
                id="subjectList"
                class="subject-list">

            </div>

        </div>

    `;


    renderSubjects();


    document
        .getElementById("addSubject")
        .addEventListener(
            "click",
            addSubject
        );

}



/* =========================================================
   ADD SUBJECT
========================================================= */

function addSubject() {


    const input =
        document.getElementById(
            "subjectInput"
        );


    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter a subject."
        );

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


    const list =
        document.getElementById(
            "subjectList"
        );


    if (!list)
        return;


    if (studentData.subjects.length === 0) {

        list.innerHTML = `

            <div class="content-box">

                <h3>
                    No subjects added yet.
                </h3>

                <p>
                    Add your first subject above.
                </p>

            </div>

        `;

        return;

    }


    list.innerHTML = "";


    studentData.subjects.forEach(
        subject => {


            const completed =
                subject.topics.filter(
                    topic =>
                        topic.completed
                ).length;


            const total =
                subject.topics.length;


            const percentage =
                total === 0
                    ? 0
                    : Math.round(
                        (completed / total) * 100
                    );



            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "subject-card";


            card.innerHTML = `

                <h3>
                    ${subject.name}
                </h3>

                <p>
                    ${completed}
                    /
                    ${total}
                    Topics Completed
                </p>

                <div class="progress-bar">

                    <div class="progress"
                         style="width:${percentage}%">
                    </div>

                </div>

                <p>
                    ${percentage}% Completed
                </p>


                <input
                    type="text"
                    class="topic-input"
                    placeholder="Enter topic">


                <button class="add-topic-btn">

                    Add Topic

                </button>


                <div class="topic-list">

                </div>

            `;


            list.appendChild(card);



            const topicInput =
                card.querySelector(
                    ".topic-input"
                );


            const addTopicButton =
                card.querySelector(
                    ".add-topic-btn"
                );


            const topicList =
                card.querySelector(
                    ".topic-list"
                );


            renderTopics(
                subject,
                topicList
            );



            addTopicButton.addEventListener(
                "click",
                function () {

                    const topicName =
                        topicInput.value.trim();


                    if (!topicName) {

                        alert(
                            "Enter a topic."
                        );

                        return;

                    }


                    subject.topics.push({

                        name: topicName,

                        completed: false

                    });


                    saveData();


                    renderSubjects();

                }
            );

        }
    );

}



/* =========================================================
   RENDER TOPICS
========================================================= */

function renderTopics(
    subject,
    container
) {


    container.innerHTML = "";


    subject.topics.forEach(
        (topic, index) => {


            const row =
                document.createElement(
                    "div"
                );


            row.style.marginTop =
                "10px";


            row.innerHTML = `

                <label>

                    <input
                        type="checkbox"
                        ${topic.completed ? "checked" : ""}>

                    ${topic.name}

                </label>

            `;


            const checkbox =
                row.querySelector(
                    "input"
                );


            checkbox.addEventListener(
                "change",
                function () {

                    subject.topics[index]
                        .completed =
                        this.checked;


                    saveData();


                    renderSubjects();


                }
            );


            container.appendChild(row);

        }
    );

}



/* =========================================================
   REPORTS
========================================================= */

function openReports() {


    clearTimer();


    pageTitle.textContent =
        "Reports";


    pageDescription.textContent =
        "View syllabus and quiz performance.";


    const total =
        getTotalTopics();


    const completed =
        getCompletedTopics();


    const syllabus =
        total === 0
            ? 0
            : Math.round(
                completed / total * 100
            );


    const averageQuiz =
        studentData.quizzes.length === 0
            ? 0
            : Math.round(
                studentData.quizzes.reduce(
                    (sum, quiz) =>
                        sum + quiz.percentage,
                    0
                ) /
                studentData.quizzes.length
            );



    contentArea.innerHTML = `

        <div class="content-box">

            <h2>
                 Progress Report
            </h2>

            <p>
                Your syllabus progress is based
                on completed topics.
            </p>


            <br>


            <h3>
                Syllabus Progress
            </h3>


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

                    ${syllabus}%

                </div>


                <div style="
                    width:${100 - syllabus}%;
                    background:#dddddd;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#555;
                ">

                    ${100 - syllabus}% Remaining

                </div>

            </div>


            <br>

            <p>
                Completed Topics:
                ${completed}
                /
                ${total}
            </p>

        </div>



        <br>



        <div class="content-box">

            <h2>
                 Quiz Report
            </h2>


            <p>
                Average Quiz Score:
                <strong>
                    ${averageQuiz}%
                </strong>
            </p>


            <br>


            <div class="add-subject">

                <input
                    type="text"
                    id="quizName"
                    placeholder="Quiz name">


                <input
                    type="number"
                    id="quizScore"
                    placeholder="Score %"
                    min="0"
                    max="100">


                <button id="addQuiz">

                    Add Quiz

                </button>

            </div>


            <div id="quizList"></div>

        </div>

    `;


    renderQuizzes();


    document
        .getElementById("addQuiz")
        .addEventListener(
            "click",
            addQuiz
        );

}



/* =========================================================
   QUIZ
========================================================= */

function addQuiz() {


    const name =
        document
            .getElementById("quizName")
            .value
            .trim();


    const score =
        Number(
            document
                .getElementById("quizScore")
                .value
        );


    if (!name ||
        isNaN(score) ||
        score < 0 ||
        score > 100) {

        alert(
            "Enter a quiz name and score between 0 and 100."
        );

        return;

    }


    studentData.quizzes.push({

        name: name,

        percentage: score

    });


    saveData();


    openReports();

}



/* =========================================================
   RENDER QUIZZES
========================================================= */

function renderQuizzes() {


    const list =
        document.getElementById(
            "quizList"
        );


    if (!list)
        return;


    if (studentData.quizzes.length === 0) {

        list.innerHTML = `

            <p>
                No quizzes added yet.
            </p>

        `;

        return;

    }


    list.innerHTML =
        studentData.quizzes.map(
            quiz => `

                <div style="
                    padding:12px;
                    margin-top:10px;
                    background:#f5f7fb;
                    border-radius:8px;
                ">

                    <strong>
                        ${quiz.name}
                    </strong>

                    -
                    ${quiz.percentage}%

                </div>

            `
        ).join("");

}



/* =========================================================
   CALENDAR
========================================================= */

let calendarDate = new Date();


function openCalendar() {

    clearTimer();

    pageTitle.textContent = "Calendar";

    pageDescription.textContent =
        "Plan your revision sessions and exam dates.";

    renderCalendar();

}



/* =========================================================
   RENDER CALENDAR
========================================================= */

function renderCalendar() {

    const month = calendarDate.getMonth();

    const year = calendarDate.getFullYear();

    const monthName =
        calendarDate.toLocaleString(
            "default",
            {
                month: "long"
            }
        );


    /*
        First day of month

        JavaScript:
        Sunday = 0
        Monday = 1
        ...
        Saturday = 6

        We want Monday = first day,
        so we convert it.
    */

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const mondayFirstDay =
        firstDay === 0
            ? 6
            : firstDay - 1;


    /*
        Number of days in current month
    */

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();



    /*
        Previous month's days
    */

    const previousMonthDays =
        new Date(
            year,
            month,
            0
        ).getDate();



    contentArea.innerHTML = `

        <div class="calendar-wrapper">


            <!-- =====================================
                 CALENDAR HEADER
            ====================================== -->

            <div class="calendar-header">


                <button
                    class="calendar-nav"
                    id="previousMonth">

                    <i class="fa-solid fa-chevron-left"></i>

                </button>



                <div class="calendar-title">


                    <select
                        id="calendarMonth">

                        ${generateMonthOptions(month)}

                    </select>



                    <select
                        id="calendarYear">

                        ${generateYearOptions(year)}

                    </select>


                </div>



                <button
                    class="calendar-nav"
                    id="nextMonth">

                    <i class="fa-solid fa-chevron-right"></i>

                </button>


            </div>



            <!-- =====================================
                 CALENDAR
            ====================================== -->

            <div class="calendar">


                <!-- WEEK DAYS -->

                <div class="calendar-weekdays">

                    <div>MONDAY</div>
                    <div>TUESDAY</div>
                    <div>WEDNESDAY</div>
                    <div>THURSDAY</div>
                    <div>FRIDAY</div>
                    <div>SATURDAY</div>
                    <div>SUNDAY</div>

                </div>



                <!-- DAYS -->

                <div
                    class="calendar-days"
                    id="calendarDays">

                </div>


            </div>



            <!-- =====================================
                 SCHEDULE FORM
            ====================================== -->

            <div
                id="calendarEventPanel"
                class="calendar-event-panel">

                <h2>
                    Schedule Event
                </h2>

                <p id="selectedDateText">
                    Select a date from the calendar.
                </p>


                <div class="calendar-form">


                    <label>
                        Subject
                    </label>

                    <select id="calendarSubject">

                        <option value="">
                            Select Subject
                        </option>

                        ${studentData.subjects.map(
                            subject => `
                                <option value="${subject.name}">
                                    ${subject.name}
                                </option>
                            `
                        ).join("")}

                    </select>



                    <label>
                        Topic
                    </label>

                    <input
                        type="text"
                        id="calendarTopic"
                        placeholder="Enter topic / chapter">



                    <label>
                        Event Type
                    </label>

                    <select id="calendarEventType">

                        <option value="revision">
                            Revision
                        </option>

                        <option value="exam">
                            Exam
                        </option>

                    </select>



                    <button
                        id="saveCalendarEvent"
                        class="calendar-save-btn">

                        <i class="fa-solid fa-plus"></i>

                        Schedule Event

                    </button>


                </div>


            </div>



            <!-- =====================================
                 LEGEND
            ====================================== -->

            <div class="calendar-legend">

                <div>

                    <span class="legend-box revision-color"></span>

                    Revision

                </div>


                <div>

                    <span class="legend-box exam-color"></span>

                    Exam

                </div>

            </div>


        </div>

    `;



    renderCalendarDays();



    /*
        Month navigation
    */

    document
        .getElementById("previousMonth")
        .addEventListener(
            "click",
            function () {

                calendarDate.setMonth(
                    calendarDate.getMonth() - 1
                );

                renderCalendar();

            }
        );



    document
        .getElementById("nextMonth")
        .addEventListener(
            "click",
            function () {

                calendarDate.setMonth(
                    calendarDate.getMonth() + 1
                );

                renderCalendar();

            }
        );



    /*
        Month dropdown
    */

    document
        .getElementById("calendarMonth")
        .addEventListener(
            "change",
            function () {

                calendarDate.setMonth(
                    Number(this.value)
                );

                renderCalendar();

            }
        );



    /*
        Year dropdown
    */

    document
        .getElementById("calendarYear")
        .addEventListener(
            "change",
            function () {

                calendarDate.setFullYear(
                    Number(this.value)
                );

                renderCalendar();

            }
        );



    /*
        Save event
    */

    document
        .getElementById("saveCalendarEvent")
        .addEventListener(
            "click",
            saveCalendarEvent
        );

}



/* =========================================================
   MONTH OPTIONS
========================================================= */

function generateMonthOptions(
    selectedMonth
) {

    const months = [

        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"

    ];


    return months.map(
        (month, index) => `

            <option
                value="${index}"
                ${index === selectedMonth ? "selected" : ""}>

                ${month}

            </option>

        `
    ).join("");

}



/* =========================================================
   YEAR OPTIONS
========================================================= */

function generateYearOptions(
    selectedYear
) {

    let options = "";


    /*
        Allows the student to select
        a large range of years.
    */

    for (
        let year = 2000;
        year <= 2050;
        year++
    ) {

        options += `

            <option
                value="${year}"
                ${year === selectedYear ? "selected" : ""}>

                ${year}

            </option>

        `;

    }


    return options;

}



/* =========================================================
   RENDER DAYS
========================================================= */

function renderCalendarDays() {

    const calendarDays =
        document.getElementById(
            "calendarDays"
        );


    if (!calendarDays)
        return;


    const month =
        calendarDate.getMonth();


    const year =
        calendarDate.getFullYear();



    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const mondayFirstDay =
        firstDay === 0
            ? 6
            : firstDay - 1;



    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();



    const previousMonthDays =
        new Date(
            year,
            month,
            0
        ).getDate();



    let html = "";



    /*
        =========================================
        PREVIOUS MONTH DAYS
        =========================================
    */

    for (
        let i = mondayFirstDay - 1;
        i >= 0;
        i--
    ) {

        const day =
            previousMonthDays - i;


        html += `

            <div class="
                calendar-day
                other-month
            ">

                <span>
                    ${day}
                </span>

            </div>

        `;

    }



    /*
        =========================================
        CURRENT MONTH
        =========================================
    */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {


        /*
            Check whether today
        */

        const today =
            new Date();


        const isToday =

            day === today.getDate() &&

            month === today.getMonth() &&

            year === today.getFullYear();



        /*
            Get events for this date
        */

        const dateString =
            formatDate(
                year,
                month,
                day
            );


        const revisionEvents =
            studentData.revisions.filter(
                event =>
                    event.date === dateString
            );


        const examEvents =
            studentData.exams.filter(
                event =>
                    event.date === dateString
            );



        html += `

            <div
                class="
                    calendar-day
                    ${isToday ? "today" : ""}
                "
                data-date="${dateString}">


                <span class="day-number">

                    ${day}

                </span>


                <div class="day-events">

                    ${renderDayEvents(
                        revisionEvents,
                        examEvents
                    )}

                </div>


            </div>

        `;

    }



    /*
        =========================================
        NEXT MONTH DAYS
        =========================================
    */


    const totalCells =
        mondayFirstDay +
        daysInMonth;


    const remainingCells =
        Math.ceil(
            totalCells / 7
        ) * 7 -
        totalCells;



    for (
        let day = 1;
        day <= remainingCells;
        day++
    ) {

        html += `

            <div class="
                calendar-day
                other-month
            ">

                <span>
                    ${day}
                </span>

            </div>

        `;

    }



    calendarDays.innerHTML =
        html;



    /*
        =========================================
        DATE CLICK
        =========================================
    */

    document
        .querySelectorAll(
            ".calendar-day:not(.other-month)"
        )
        .forEach(
            dayElement => {

                dayElement.addEventListener(
                    "click",
                    function () {

                        const selectedDate =
                            this.dataset.date;


                        selectCalendarDate(
                            selectedDate
                        );

                    }
                );

            }
        );

}



/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    year,
    month,
    day
) {

    const formattedMonth =
        String(month + 1)
            .padStart(2, "0");


    const formattedDay =
        String(day)
            .padStart(2, "0");


    return `${year}-${formattedMonth}-${formattedDay}`;

}



/* =========================================================
   DISPLAY EVENTS INSIDE DATE
========================================================= */

function renderDayEvents(
    revisions,
    exams
) {

    let html = "";



    revisions.forEach(
        event => {

            html += `

                <div
                    class="calendar-event revision-event">

                    <i class="fa-solid fa-book"></i>

                    ${event.subject}

                </div>

            `;

        }
    );



    exams.forEach(
        event => {

            html += `

                <div
                    class="calendar-event exam-event">

                    <i class="fa-solid fa-file-pen"></i>

                    ${event.subject}

                </div>

            `;

        }
    );


    return html;

}



/* =========================================================
   SELECT DATE
========================================================= */

let selectedCalendarDate = null;


function selectCalendarDate(
    date
) {

    selectedCalendarDate =
        date;



    const dateObject =
        new Date(
            date + "T00:00:00"
        );


    const formattedDate =
        dateObject.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );



    const panel =
        document.getElementById(
            "calendarEventPanel"
        );


    const dateText =
        document.getElementById(
            "selectedDateText"
        );


    dateText.innerHTML = `

        <strong>
            ${formattedDate}
        </strong>

    `;


    panel.classList.add(
        "show"
    );


    /*
        Highlight selected date
    */

    document
        .querySelectorAll(
            ".calendar-day"
        )
        .forEach(
            day => {

                day.classList.remove(
                    "selected-date"
                );

            }
        );


    const selected =
        document.querySelector(
            `[data-date="${date}"]`
        );


    if (selected) {

        selected.classList.add(
            "selected-date"
        );

    }



    /*
        Scroll down to schedule form
    */

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}



/* =========================================================
   SAVE CALENDAR EVENT
========================================================= */

function saveCalendarEvent() {

    if (!selectedCalendarDate) {

        alert(
            "Please select a date first."
        );

        return;

    }



    const subject =
        document
            .getElementById(
                "calendarSubject"
            )
            .value;


    const topic =
        document
            .getElementById(
                "calendarTopic"
            )
            .value
            .trim();


    const type =
        document
            .getElementById(
                "calendarEventType"
            )
            .value;



    if (!subject) {

        alert(
            "Please select a subject."
        );

        return;

    }


    if (!topic) {

        alert(
            "Please enter a topic."
        );

        return;

    }



    /*
        REVISION
    */

    if (type === "revision") {

        studentData.revisions.push({

            id: Date.now(),

            subject: subject,

            topic: topic,

            date: selectedCalendarDate

        });

    }



    /*
        EXAM
    */

    else {

        studentData.exams.push({

            id: Date.now(),

            subject: subject,

            topic: topic,

            date: selectedCalendarDate

        });

    }



    saveData();



    alert(
        type === "revision"
            ? "Revision scheduled successfully!"
            : "Exam scheduled successfully!"
    );



    /*
        Re-render calendar
    */

    renderCalendar();

}
/* =========================================================
   SCHEDULE
========================================================= */

function openSchedule() {


    clearTimer();


    pageTitle.textContent =
        "Schedule";


    pageDescription.textContent =
        "View exams, revisions and calculated exam readiness.";


    const readiness =
        calculateReadiness();


    contentArea.innerHTML = `

        <!-- EXAM TABLE -->

        <div class="content-box">

            <h2>
                 Exam Schedule
            </h2>


            <br>


            <table style="
                width:100%;
                border-collapse:collapse;
            ">

                <thead>

                    <tr>

                        <th style="
                            text-align:left;
                            padding:12px;
                            border-bottom:1px solid #ddd;
                        ">
                            Subject
                        </th>


                        <th style="
                            text-align:left;
                            padding:12px;
                            border-bottom:1px solid #ddd;
                        ">
                            Topic
                        </th>


                        <th style="
                            text-align:left;
                            padding:12px;
                            border-bottom:1px solid #ddd;
                        ">
                            Exam Date
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        studentData.exams.length === 0

                        ?

                        `
                        <tr>

                            <td colspan="3"
                                style="padding:15px;">

                                No exams scheduled yet.

                            </td>

                        </tr>
                        `

                        :

                        studentData.exams.map(
                            exam => `

                                <tr>

                                    <td style="padding:12px;">
                                        ${exam.subject}
                                    </td>

                                    <td style="padding:12px;">
                                        ${exam.topic}
                                    </td>

                                    <td style="padding:12px;">
                                        ${exam.date}
                                    </td>

                                </tr>

                            `
                        ).join("")

                    }

                </tbody>

            </table>

        </div>



        <br>



        <!-- REVISION TABLE -->

        <div class="content-box">

            <h2>
                 Revision Schedule
            </h2>


            <br>


            ${
                studentData.revisions.length === 0

                ?

                `<p>No revision dates scheduled yet.</p>`

                :

                studentData.revisions.map(
                    revision => `

                        <div style="
                            padding:12px;
                            margin-bottom:10px;
                            background:#f5f7fb;
                            border-radius:8px;
                        ">

                            
                            <strong>
                                ${revision.subject}
                            </strong>

                            -
                            ${revision.topic}

                            -

                            ${revision.date}

                        </div>

                    `
                ).join("")

            }

        </div>



        <br>



        <!-- READINESS -->

        <div class="content-box">

            <h2>
                 Exam Readiness
            </h2>


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

                    ${readiness}%

                </div>

            </div>


            <br>


            <p>
                Readiness is calculated from:
            </p>

            <br>

            <p>
                ✓ Syllabus completion
            </p>

            <p>
                ✓ Quiz performance
            </p>

            <p>
                ✓ Study time
            </p>

        </div>

    `;

}



/* =========================================================
   READINESS CALCULATION
========================================================= */

function calculateReadiness() {


    const totalTopics =
        getTotalTopics();


    const completedTopics =
        getCompletedTopics();


    const syllabusScore =
        totalTopics === 0
            ? 0
            : (
                completedTopics /
                totalTopics
            ) * 100;



    const quizScore =
        studentData.quizzes.length === 0
            ? 0
            : studentData.quizzes.reduce(
                (sum, quiz) =>
                    sum + quiz.percentage,
                0
            ) /
            studentData.quizzes.length;



    const studyScore =
        Math.min(
            studentData.studyMinutes / 600 * 100,
            100
        );



    /*
        Weight:

        Syllabus = 50%
        Quiz = 30%
        Study time = 20%
    */

    const readiness =
        (
            syllabusScore * 0.5
        )
        +
        (
            quizScore * 0.3
        )
        +
        (
            studyScore * 0.2
        );


    return Math.round(readiness);

}



/* =========================================================
   PROFILE
========================================================= */

function openProfile() {


    clearTimer();


    pageTitle.textContent =
        "Profile";


    pageDescription.textContent =
        "Manage your student information.";


    contentArea.innerHTML = `

        <div class="profile-container">

            <div class="profile-avatar">

                <i class="fa-solid fa-circle-user"></i>

                <h2>
                    Student Profile
                </h2>

            </div>


            <div class="profile-form">

                <label>
                    Full Name
                </label>

                <input
                    type="text"
                    id="studentName"
                    placeholder="Enter your name">


                <label>
                    Email
                </label>

                <input
                    type="email"
                    id="studentEmail"
                    placeholder="Enter your email">


                <label>
                    Course
                </label>

                <input
                    type="text"
                    id="studentCourse"
                    placeholder="Enter your course">


                <label>
                    Year
                </label>

                <input
                    type="text"
                    id="studentYear"
                    placeholder="Enter your year">


                <button
                    class="save-btn"
                    id="saveProfile">

                    Save Profile

                </button>

            </div>

        </div>

    `;


    document
        .getElementById("saveProfile")
        .addEventListener(
            "click",
            function () {

                const name =
                    document
                        .getElementById(
                            "studentName"
                        )
                        .value
                        .trim();


                if (!name) {

                    alert(
                        "Please enter your name."
                    );

                    return;

                }


                localStorage.setItem(
                    "studentName",
                    name
                );


                alert(
                    "Profile saved successfully!"
                );

            }
        );

}



/* =========================================================
   AI ASSISTANT
========================================================= */

function openAI() {


    clearTimer();


    pageTitle.textContent =
        "AI Assistant";


    pageDescription.textContent =
        "Ask questions related to your studies.";


    contentArea.innerHTML = `

        <div class="ai-container">

            <h2>
                🤖 AI Study Assistant
            </h2>


            <div
                class="chat-box"
                id="chatBox">

                <div class="message ai-message">

                    Hello! 

                    Ask me anything about
                    your studies.

                </div>

            </div>


            <div class="ai-input">

                <input
                    id="aiInput"
                    type="text"
                    placeholder="Ask a question...">


                <button id="sendAI">

                    <i class="fa-solid fa-paper-plane"></i>

                </button>

            </div>

        </div>

    `;


    const input =
        document.getElementById(
            "aiInput"
        );


    const button =
        document.getElementById(
            "sendAI"
        );


    const chat =
        document.getElementById(
            "chatBox"
        );


    function sendMessage() {


        const question =
            input.value.trim();


        if (!question)
            return;


        chat.innerHTML += `

            <div class="message user-message">

                ${question}

            </div>

        `;


        input.value = "";


        setTimeout(
            function () {


                let answer =
                    "Revise the topic regularly and practice questions related to it.";


                const q =
                    question.toLowerCase();


                if (
                    q.includes("python")
                ) {

                    answer =
                        "For Python, focus on variables, loops, functions, lists, dictionaries and OOP.";

                }


                else if (
                    q.includes("sql") ||
                    q.includes("dbms")
                ) {

                    answer =
                        "For DBMS and SQL, practice SELECT, JOIN, GROUP BY, normalization, keys and transactions.";

                }


                else if (
                    q.includes("exam")
                ) {

                    answer =
                        "Focus on your incomplete topics first, then attempt quizzes and revise your mistakes.";

                }


                chat.innerHTML += `

                    <div class="message ai-message">

                        ${answer}

                    </div>

                `;


                chat.scrollTop =
                    chat.scrollHeight;


            },
            500
        );

    }


    button.addEventListener(
        "click",
        sendMessage
    );


    input.addEventListener(
        "keypress",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                sendMessage();

            }

        }
    );

}



/* =========================================================
   TIMER
========================================================= */

function openTimer() {


    clearTimer();


    pageTitle.textContent =
        "Study Timer";


    pageDescription.textContent =
        "Track your focused study sessions.";


    timerSeconds =
        25 * 60;


    contentArea.innerHTML = `

        <div class="timer-container">

            <h2>
                 Study Timer
            </h2>

            <p>
                25-minute focused session
            </p>


            <div
                class="timer-display"
                id="timerDisplay">

                25:00

            </div>


            <div class="timer-buttons">

                <button id="startTimer">
                    Start
                </button>

                <button id="pauseTimer">
                    Pause
                </button>

                <button
                    class="reset"
                    id="resetTimer">

                    Reset

                </button>

            </div>

        </div>

    `;


    updateTimerDisplay();


    document
        .getElementById("startTimer")
        .addEventListener(
            "click",
            startTimer
        );


    document
        .getElementById("pauseTimer")
        .addEventListener(
            "click",
            pauseTimer
        );


    document
        .getElementById("resetTimer")
        .addEventListener(
            "click",
            resetTimer
        );

}



/* =========================================================
   START TIMER
========================================================= */

function startTimer() {


    if (timerRunning)
        return;


    timerRunning = true;


    timerInterval =
        setInterval(
            function () {


                if (
                    timerSeconds > 0
                ) {

                    timerSeconds--;

                    updateTimerDisplay();

                }

                else {

                    clearTimer();


                    studentData.studyMinutes += 25;


                    saveData();


                    alert(
                        "🎉 Study session completed!"
                    );

                }


            },
            1000
        );

}



/* =========================================================
   PAUSE
========================================================= */

function pauseTimer() {

    clearTimer();

}



/* =========================================================
   RESET
========================================================= */

function resetTimer() {

    clearTimer();

    timerSeconds =
        25 * 60;

    updateTimerDisplay();

}



/* =========================================================
   CLEAR TIMER
========================================================= */

function clearTimer() {


    if (
        timerInterval !== null
    ) {

        clearInterval(
            timerInterval
        );

    }


    timerInterval = null;

    timerRunning = false;

}



/* =========================================================
   UPDATE TIMER DISPLAY
========================================================= */

function updateTimerDisplay() {


    const display =
        document.getElementById(
            "timerDisplay"
        );


    if (!display)
        return;


    const minutes =
        Math.floor(
            timerSeconds / 60
        );


    const seconds =
        timerSeconds % 60;


    display.textContent =

        String(minutes)
            .padStart(2, "0")

        +

        ":"

        +

        String(seconds)
            .padStart(2, "0");

}



/* =========================================================
   LOGOUT
========================================================= */

function openLogout() {


    clearTimer();


    pageTitle.textContent =
        "Logout";


    pageDescription.textContent =
        "Sign out of your student account.";


    contentArea.innerHTML = `

        <div class="content-box">

            <h2>
                Logout
            </h2>


            <p>
                Are you sure you want to logout?
            </p>


            <br>


            <button
                class="save-btn"
                id="confirmLogout">

                Confirm Logout

            </button>

        </div>

    `;


    document
        .getElementById(
            "confirmLogout"
        )
        .addEventListener(
            "click",
            function () {

                alert(
                    "You have been logged out."
                );

            }
        );

}



/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

menuLinks.forEach(
    link => {


        link.addEventListener(
            "click",
            function (event) {


                event.preventDefault();


                const page =
                    this.dataset.page;


                menuLinks.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                this.classList.add(
                    "active"
                );


                if (
                    page === "dashboard"
                )
                    openDashboard();


                if (
                    page === "reports"
                )
                    openReports();


                if (
                    page === "schedule"
                )
                    openSchedule();


                if (
                    page === "calendar"
                )
                    openCalendar();


                if (
                    page === "logout"
                )
                    openLogout();


            }
        );

    }
);



/* =========================================================
   START APPLICATION
========================================================= */

openDashboard();