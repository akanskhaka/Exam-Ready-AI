/* =========================================================
   STUDYAI SUBJECT WORKSPACE - FRONTEND ADD-ON
   Load this file AFTER navscript.js.
   Keeps existing studentDashboardData and extends it safely.
========================================================= */

(() => {
    "use strict";

    const DB_NAME = "studyAI-materials";
    const STORE_NAME = "pdfFiles";
    let activeSubjectId = null;
    let activeTab = "overview";

    const $ = (selector, root = document) => root.querySelector(selector);
    const safe = value => typeof escapeHtml === "function"
        ? escapeHtml(value)
        : String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[ch]));

    function id() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function ensureSubjectFields(subject) {
        subject.id ??= id();
        subject.topics = Array.isArray(subject.topics) ? subject.topics : [];
        subject.documents = Array.isArray(subject.documents) ? subject.documents : [];

        subject.topics.forEach(topic => {
            topic.id ??= id();
            topic.unit ??= "General";
            topic.status ??= topic.completed ? "completed" : "not-started";
            topic.revisionCount = Number(topic.revisionCount) || 0;
            topic.lastRevised ??= null;
            topic.studyMinutes = Number(topic.studyMinutes) || 0;
            topic.needsRevision = topic.needsRevision === true;
        });

        subject.documents.forEach(doc => {
            doc.id ??= id();
            doc.topicId ??= "";
            doc.bookmarks = Array.isArray(doc.bookmarks) ? doc.bookmarks : [];
        });
    }

    function persist() {
        studentData.subjects.forEach(ensureSubjectFields);

        if (typeof saveData === "function") {
            saveData();
        }
    }

    function getSubject() {
        return studentData.subjects.find(
            s => String(s.id) === String(activeSubjectId)
        );
    }

    function getUnits(subject) {
        return [...new Set(subject.topics.map(t => t.unit || "General"))];
    }

    function subjectStats(subject) {
        const topics = subject.topics;

        const completed = topics.filter(
            t => t.status === "completed" || t.completed
        ).length;

        const mastery = topics.length
            ? Math.round(
                topics.reduce(
                    (n, t) => n + (
                        Number(t.mastery) || (t.completed ? 100 : 0)
                    ),
                    0
                ) / topics.length
            )
            : 0;

        const quizzes = (studentData.quizzes || []).filter(q =>
            String(q.subjectId || "") === String(subject.id) ||
            String(q.subjectName || "").toLowerCase() === subject.name.toLowerCase()
        );

        const average = quizzes.length
            ? Math.round(
                quizzes.reduce(
                    (n, q) => n + (Number(q.percentage) || 0),
                    0
                ) / quizzes.length
            )
            : 0;

        return {
            total: topics.length,
            completed,
            progress: topics.length
                ? Math.round(completed / topics.length * 100)
                : 0,
            mastery,
            quizzes,
            average
        };
    }

    /* =========================================================
       INDEXED DB - PDF STORAGE
    ========================================================= */

    function openDatabase() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                return reject(
                    new Error("This browser does not support IndexedDB.")
                );
            }

            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function savePdfBlob(documentId, file) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");

            tx.objectStore(STORE_NAME).put({
                id: String(documentId),
                name: file.name,
                blob: file,
                savedAt: Date.now()
            });

            tx.oncomplete = () => {
                db.close();
                resolve();
            };

            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    }

    async function getPdfBlob(documentId) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");

            const request = tx.objectStore(STORE_NAME).get(
                String(documentId)
            );

            request.onsuccess = () => {
                const result = request.result;
                db.close();
                resolve(result?.blob || null);
            };

            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    async function removePdfBlob(documentId) {
        try {
            const db = await openDatabase();

            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readwrite");

                tx.objectStore(STORE_NAME).delete(
                    String(documentId)
                );

                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });

            db.close();
        } catch (error) {
            console.warn("Could not remove stored PDF file", error);
        }
    }

    /* =========================================================
       SUBJECT PAGE
    ========================================================= */

    window.openSubjects = function () {
        clearTimer();

        pageTitle.textContent = "Subjects";
        pageDescription.textContent =
            "Organise your syllabus, materials, practice and revision.";

        studentData.subjects.forEach(ensureSubjectFields);

        contentArea.innerHTML = `
          <section class="sw-workspace">

            <header class="sw-header">

              <div>
                <p class="sw-eyebrow">YOUR LEARNING SPACE</p>

                <h2>Subject workspace</h2>

                <p>
                  Build a clear plan for every subject and track
                  how your understanding improves.
                </p>
              </div>

              <div class="sw-add">

                <input
                  id="swSubjectName"
                  maxlength="80"
                  placeholder="New subject name"
                  aria-label="New subject name"
                >

                <input
                  id="swSubjectDescription"
                  maxlength="500"
                  placeholder="Description (optional)"
                  aria-label="Subject description"
                >

                <button id="swAddSubject" type="button">
                  Add subject
                </button>

              </div>

            </header>

            <div id="swSubjectCards" class="sw-subject-grid"></div>

            <div id="swDetail"></div>

          </section>
        `;

        renderSubjectCards();

        $("#swAddSubject").addEventListener("click", addSubject);

        $("#swSubjectName").addEventListener("keydown", e => {
            if (e.key === "Enter") {
                addSubject();
            }
        });
    };

    /* =========================================================
       ADD SUBJECT
    ========================================================= */

    async function addSubject() {
        const input = $("#swSubjectName");
        const name = input.value.trim();
        const description = $("#swSubjectDescription").value.trim();

        if (!name) {
            return alert("Enter a subject name.");
        }

        if (
            studentData.subjects.some(
                s => s.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            return alert("This subject already exists.");
        }

        let subject;
        try {
            subject = await examReadyApi.post("/subjects", { name, description });
        } catch (error) {
            alert(`Could not save the subject: ${error.message}`);
            return;
        }

        subject.documents = [];
        studentData.subjects.push(subject);

        persist();

        input.value = "";

        renderSubjectCards();

        openSubject(subject.id);
    }

    /* =========================================================
       SUBJECT CARDS
    ========================================================= */

    function renderSubjectCards() {
        const wrap = $("#swSubjectCards");

        if (!wrap) return;

        if (!studentData.subjects.length) {
            wrap.innerHTML = `
              <div class="sw-empty">
                <h3>No subjects yet</h3>
                <p>
                  Add your first subject to create its syllabus
                  and study space.
                </p>
              </div>
            `;

            $("#swDetail").innerHTML = "";

            return;
        }

        wrap.innerHTML = studentData.subjects.map(subject => {
            const stats = subjectStats(subject);

            return `
              <article class="sw-subject-card">

                <div class="sw-card-top">

                  <span class="sw-subject-mark">
                    ${safe(subject.name.slice(0, 1).toUpperCase())}
                  </span>

                  <button
                    class="sw-delete"
                    data-delete-subject="${safe(subject.id)}"
                    type="button"
                    aria-label="Delete ${safe(subject.name)}"
                  >
                    Delete
                  </button>
                  <button
                    class="sw-edit"
                    data-edit-subject="${safe(subject.id)}"
                    type="button"
                  >
                    Edit
                  </button>

                </div>

                <h3>${safe(subject.name)}</h3>

                <p>
                  ${stats.total} topics ·
                  ${subject.documents.length} materials
                </p>

                <div class="sw-progress">
                  <span style="width:${stats.progress}%"></span>
                </div>

                <small>
                  ${stats.progress}% syllabus completed
                </small>

                <button
                  class="sw-open"
                  data-open-subject="${safe(subject.id)}"
                  type="button"
                >
                  Open workspace
                </button>

              </article>
            `;
        }).join("");

        wrap.querySelectorAll("[data-open-subject]").forEach(btn => {
            btn.addEventListener("click", () => {
                openSubject(btn.dataset.openSubject);
            });
        });

        wrap.querySelectorAll("[data-delete-subject]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const subject = studentData.subjects.find(
                    s => String(s.id) === btn.dataset.deleteSubject
                );

                if (
                    !subject ||
                    !confirm(`Delete ${subject.name} and its saved subject data?`)
                ) {
                    return;
                }

                try {
                    await examReadyApi.delete(`/subjects/${subject.id}`);
                } catch (error) {
                    alert(`Could not delete the subject: ${error.message}`);
                    return;
                }

                subject.documents.forEach(doc => removePdfBlob(doc.id));

                studentData.subjects = studentData.subjects.filter(
                    s => String(s.id) !== btn.dataset.deleteSubject
                );

                persist();
                renderSubjectCards();
            });
        });

        wrap.querySelectorAll("[data-edit-subject]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const subject = studentData.subjects.find(
                    item => String(item.id) === btn.dataset.editSubject
                );
                if (!subject) return;

                const name = prompt("Subject name", subject.name);
                if (name === null) return;
                const description = prompt(
                    "Subject description",
                    subject.description || ""
                );
                if (description === null) return;

                try {
                    const updated = await examReadyApi.put(
                        `/subjects/${subject.id}`,
                        { name: name.trim(), description: description.trim() }
                    );
                    Object.assign(subject, updated, {
                        documents: subject.documents,
                        topics: subject.topics
                    });
                    persist();
                    renderSubjectCards();
                } catch (error) {
                    alert(`Could not update the subject: ${error.message}`);
                }
            });
        });
    }

    /* =========================================================
       OPEN SUBJECT WORKSPACE
    ========================================================= */

    function openSubject(subjectId, tab = "overview") {
        activeSubjectId = subjectId;
        activeTab = tab;

        const subject = getSubject();

        if (!subject) return;

        ensureSubjectFields(subject);

        const stats = subjectStats(subject);

        const tabs = [
            ["overview", "Overview"],
            ["syllabus", "Syllabus"],
            ["materials", "Materials"],
            ["practice", "Practice"],
            ["revision", "Smart revision"],
            ["analytics", "Analytics"]
        ];

        $("#swDetail").innerHTML = `
          <section class="sw-detail">

            <div class="sw-detail-heading">

              <div>
                <p class="sw-eyebrow">SUBJECT</p>
                <h2>${safe(subject.name)}</h2>
              </div>

              <button
                type="button"
                class="sw-back"
                id="swBack"
              >
                All subjects
              </button>

            </div>

            <nav class="sw-tabs" aria-label="Subject sections">

              ${tabs.map(([key, label]) => `
                <button
                  type="button"
                  data-tab="${key}"
                  class="${tab === key ? "active" : ""}"
                >
                  ${label}
                </button>
              `).join("")}

            </nav>

            <div id="swPanel"></div>

          </section>
        `;

        $("#swBack").addEventListener("click", () => {
            activeSubjectId = null;
            $("#swDetail").innerHTML = "";
        });

        $("#swDetail").querySelectorAll("[data-tab]").forEach(btn => {
            btn.addEventListener("click", () => {
                openSubject(subjectId, btn.dataset.tab);
            });
        });

        renderTab(subject, tab, stats);

        $("#swDetail").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    /* =========================================================
       TAB CONTROLLER
    ========================================================= */

    function renderTab(subject, tab, stats) {
        const panel = $("#swPanel");

        if (!panel) return;

        if (tab === "overview") {
            const weak = subject.topics.filter(
                t => (Number(t.mastery) || 0) < 50 && !t.completed
            );

            panel.innerHTML = `
              <div class="sw-stat-grid">

                <article>
                  <span>Syllabus</span>
                  <strong>${stats.progress}%</strong>
                  <small>
                    ${stats.completed}/${stats.total} completed
                  </small>
                </article>

                <article>
                  <span>Topic mastery</span>
                  <strong>${stats.mastery}%</strong>
                  <small>Based on topic mastery entries</small>
                </article>

                <article>
                  <span>Quiz average</span>
                  <strong>
                    ${stats.quizzes.length ? stats.average + "%" : "—"}
                  </strong>
                  <small>
                    ${stats.quizzes.length} recorded attempts
                  </small>
                </article>

                <article>
                  <span>Materials</span>
                  <strong>${subject.documents.length}</strong>
                  <small>PDFs attached to this subject</small>
                </article>

              </div>

              <div class="sw-panel-card">

                <h3>Continue learning</h3>

                <p>
                  ${
                    weak.length
                    ? `${weak.length} topic(s) need attention.`
                    : "Add topics and record your practice to build a revision plan."
                  }
                </p>

                <div class="sw-action-row">

                  <button data-go="syllabus">
                    Manage syllabus
                  </button>

                  <button data-go="materials">
                    Open materials
                  </button>

                  <button data-go="revision">
                    Review weak topics
                  </button>

                </div>

              </div>

              <div class="sw-panel-card">

                <h3>Study shortcuts</h3>

                <p>Choose a topic and PDF to get started with this subject.</p>

                <div class="sw-shortcut-controls">
                  <label>
                    Topic
                    <select id="swActionTopic">
                      <option value="">Select a topic</option>
                      ${subject.topics.map(topic => `
                        <option value="${safe(topic.id)}">
                          ${safe(topic.name)}
                        </option>
                      `).join("")}
                    </select>
                  </label>

                  <label>
                    PDF
                    <select id="swActionDocument">
                      <option value="">Select a PDF</option>
                      ${subject.documents.map(doc => `
                        <option value="${safe(doc.id)}">
                          ${safe(doc.name)}
                        </option>
                      `).join("")}
                    </select>
                  </label>
                </div>

                <div class="sw-action-row sw-shortcut-actions">
                  <button type="button" data-shortcut="start">
                    Start Learning
                  </button>
                  <button type="button" data-shortcut="notes">
                    Generate Notes
                  </button>
                  <button type="button" data-shortcut="ai">
                    Ask AI
                  </button>
                  <button type="button" data-shortcut="quiz">
                    Practice Quiz
                  </button>
                  <button type="button" data-shortcut="revision">
                    Mark for Revision
                  </button>
                </div>

                <p id="swActionStatus" class="sw-action-status" role="status"></p>

              </div>
            `;

            panel.querySelectorAll("[data-go]").forEach(b => {
                b.addEventListener("click", () => {
                    openSubject(subject.id, b.dataset.go);
                });
            });

            panel.querySelectorAll("[data-shortcut]").forEach(button => {
                button.addEventListener("click", () => {
                    const topicId = $("#swActionTopic", panel).value;
                    const documentId = $("#swActionDocument", panel).value;
                    const topic = subject.topics.find(
                        item => String(item.id) === topicId
                    );
                    const doc = subject.documents.find(
                        item => String(item.id) === documentId
                    );
                    const status = $("#swActionStatus", panel);

                    if (button.dataset.shortcut === "start") {
                        if (!topic) {
                            status.textContent = "Add or select a topic first.";
                            return;
                        }

                        if (!topic.completed && topic.status !== "completed") {
                            topic.status = "in-progress";
                        }

                        persist();
                        openSubject(subject.id, "syllabus");
                        return;
                    }

                    if (button.dataset.shortcut === "notes") {
                        if (!doc) {
                            status.textContent = "Add or select a PDF first.";
                            return;
                        }

                        openSubject(subject.id, "materials");
                        showNotes(subject, doc.id);
                        return;
                    }

                    if (button.dataset.shortcut === "ai") {
                        openAI({
                            subjectId: subject.id,
                            documentId: doc?.id
                        });
                        return;
                    }

                    if (button.dataset.shortcut === "quiz") {
                        window.location.href =
                            `quiz.html?subjectId=${encodeURIComponent(String(subject.id))}`;
                        return;
                    }

                    if (button.dataset.shortcut === "revision") {
                        if (!topic) {
                            status.textContent = "Add or select a topic first.";
                            return;
                        }

                        topic.needsRevision = true;
                        persist();
                        openSubject(subject.id, "revision");
                    }
                });
            });
        }

        if (tab === "syllabus") {
            renderSyllabus(subject, panel);
        }

        if (tab === "materials") {
            renderMaterials(subject, panel);
        }

        if (tab === "practice") {
            renderPractice(subject, panel);
        }

        if (tab === "revision") {
            renderRevision(subject, panel);
        }

        if (tab === "analytics") {
            renderAnalytics(subject, panel, stats);
        }
    }

    /* =========================================================
       SYLLABUS
    ========================================================= */

    function renderSyllabus(subject, panel) {
        const units = getUnits(subject);

        panel.innerHTML = `
          <div class="sw-panel-card">

            <h3>Add a unit or topic</h3>

            <form id="swTopicForm" class="sw-form-grid">

              <input
                id="swUnit"
                maxlength="80"
                list="swUnits"
                placeholder="Unit / chapter (e.g. Unit 1)"
                required
              >

              <datalist id="swUnits">
                ${units.map(u => `
                  <option value="${safe(u)}"></option>
                `).join("")}
              </datalist>

              <input
                id="swTopic"
                maxlength="120"
                placeholder="Topic name"
                required
              >

              <button type="submit">
                Add topic
              </button>

            </form>

          </div>

          <div class="sw-topic-groups">

            ${
                units.length
                ? units.map(unit => {
                    const topics = subject.topics.filter(
                        t => (t.unit || "General") === unit
                    );

                    return `
                      <section class="sw-unit">

                        <h3>${safe(unit)}</h3>

                        ${topics.map(topic => `
                          <article class="sw-topic-row">

                            <label>

                              <input
                                type="checkbox"
                                data-complete="${safe(topic.id)}"
                                ${topic.completed || topic.status === "completed" ? "checked" : ""}
                              >

                              <span>${safe(topic.name)}</span>

                            </label>

                            <select
                              data-status="${safe(topic.id)}"
                              aria-label="Status for ${safe(topic.name)}"
                            >

                              <option
                                value="not-started"
                                ${topic.status === "not-started" && !topic.completed ? "selected" : ""}
                              >
                                Not started
                              </option>

                              <option
                                value="in-progress"
                                ${topic.status === "in-progress" ? "selected" : ""}
                              >
                                In progress
                              </option>

                              <option
                                value="completed"
                                ${topic.status === "completed" || topic.completed ? "selected" : ""}
                              >
                                Completed
                              </option>

                            </select>

                            <input
                              class="sw-mastery"
                              type="number"
                              min="0"
                              max="100"
                              value="${Number(topic.mastery) || 0}"
                              data-mastery="${safe(topic.id)}"
                              aria-label="Mastery percentage for ${safe(topic.name)}"
                            >

                            <button
                              type="button"
                              class="sw-delete"
                              data-remove-topic="${safe(topic.id)}"
                            >
                              Remove
                            </button>

                          </article>
                        `).join("")}

                      </section>
                    `;
                }).join("")
                : `
                  <div class="sw-empty">
                    No topics yet. Add your first unit and topic above.
                  </div>
                `
            }

          </div>
        `;

        $("#swTopicForm").addEventListener("submit", async e => {
            e.preventDefault();

            const unit = $("#swUnit").value.trim() || "General";
            const name = $("#swTopic").value.trim();

            if (!name) return;

            let topic;
            try {
                topic = await examReadyApi.post(
                    `/subjects/${subject.id}/topics`,
                    { unit, name }
                );
            } catch (error) {
                alert(`Could not save the topic: ${error.message}`);
                return;
            }
            Object.assign(topic, {
                revisionCount: 0,
                lastRevised: null,
                studyMinutes: 0,
                needsRevision: false
            });
            subject.topics.push(topic);

            persist();

            openSubject(subject.id, "syllabus");
            renderSubjectCards();
        });

        panel.querySelectorAll("[data-complete]").forEach(el => {
            el.addEventListener("change", async () => {
                const t = subject.topics.find(
                    t => String(t.id) === el.dataset.complete
                );

                if (!t) return;

                const update = {
                    completed: el.checked,
                    status: el.checked ? "completed" : "in-progress",
                    ...(el.checked && !Number(t.mastery) ? { mastery: 100 } : {})
                };
                try {
                    Object.assign(t, await examReadyApi.put(
                        `/subjects/topics/${t.id}`,
                        update
                    ));
                    persist();
                } catch (error) {
                    alert(`Could not update the topic: ${error.message}`);
                    el.checked = !el.checked;
                    return;
                }

                openSubject(subject.id, "syllabus");
                renderSubjectCards();
            });
        });

        panel.querySelectorAll("[data-status]").forEach(el => {
            el.addEventListener("change", async () => {
                const t = subject.topics.find(
                    t => String(t.id) === el.dataset.status
                );

                if (!t) return;

                const update = {
                    status: el.value,
                    completed: el.value === "completed",
                    ...(el.value === "completed" && !Number(t.mastery)
                        ? { mastery: 100 }
                        : {})
                };
                try {
                    Object.assign(t, await examReadyApi.put(
                        `/subjects/topics/${t.id}`,
                        update
                    ));
                    persist();
                } catch (error) {
                    alert(`Could not update the topic: ${error.message}`);
                    el.value = t.status || "not-started";
                    return;
                }

                openSubject(subject.id, "syllabus");
                renderSubjectCards();
            });
        });

        panel.querySelectorAll("[data-mastery]").forEach(el => {
            el.addEventListener("change", async () => {
                const t = subject.topics.find(
                    t => String(t.id) === el.dataset.mastery
                );

                if (!t) return;

                const mastery = Math.max(
                    0,
                    Math.min(100, Number(el.value) || 0)
                );

                try {
                    Object.assign(t, await examReadyApi.put(
                        `/subjects/topics/${t.id}`,
                        { mastery }
                    ));
                    persist();
                } catch (error) {
                    alert(`Could not update topic mastery: ${error.message}`);
                    el.value = String(Number(t.mastery) || 0);
                }
            });
        });

        panel.querySelectorAll("[data-remove-topic]").forEach(el => {
            el.addEventListener("click", async () => {
                if (!confirm("Remove this topic?")) return;

                const topicId = el.dataset.removeTopic;
                try {
                    await examReadyApi.delete(`/subjects/topics/${topicId}`);
                } catch (error) {
                    alert(`Could not remove the topic: ${error.message}`);
                    return;
                }

                subject.topics = subject.topics.filter(
                    t => String(t.id) !== topicId
                );

                persist();

                openSubject(subject.id, "syllabus");
                renderSubjectCards();
            });
        });
    }

    /* =========================================================
       MATERIALS AND PDF UPLOAD
    ========================================================= */

    function renderMaterials(subject, panel) {
        const docs = subject.documents;

        panel.innerHTML = `
          <div class="sw-panel-card">

            <h3>Upload study PDFs</h3>

            <p>
              PDF text is extracted in your browser. The PDF file itself
              is stored in IndexedDB for preview; extracted text stays
              in your dashboard data.
            </p>

            <div class="sw-upload-row">

              <input
                id="swPdfInput"
                type="file"
                accept="application/pdf,.pdf"
                multiple
              >

              <input
                id="swMaterialSearch"
                type="search"
                placeholder="Search materials by name"
              >

              <select id="swMaterialTopic">

                <option value="">All topics</option>

                ${subject.topics.map(t => `
                  <option value="${safe(t.id)}">
                    ${safe(t.name)}
                  </option>
                `).join("")}

              </select>

            </div>

            <p id="swPdfStatus" role="status"></p>

          </div>

          <div id="swMaterialsList" class="sw-material-list"></div>

          <div id="swPdfPreview" class="sw-preview" hidden></div>
        `;

        const list = $("#swMaterialsList");

        function draw() {
            const query = $("#swMaterialSearch").value.toLowerCase();
            const topicId = $("#swMaterialTopic").value;

            const filtered = docs.filter(d =>
                d.name.toLowerCase().includes(query) &&
                (!topicId || d.topicId === topicId)
            );

            list.innerHTML = filtered.length
                ? filtered.map(d => `
                    <article class="sw-material">

                      <div>
                        <strong>${safe(d.name)}</strong>

                        <small>
                          ${
                            safe(
                                subject.topics.find(
                                    t => String(t.id) === String(d.topicId)
                                )?.name || "Not linked to a topic"
                            )
                          }
                        </small>
                      </div>

                      <div class="sw-action-row">

                        <button
                          type="button"
                          data-preview="${safe(d.id)}"
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          data-summary="${safe(d.id)}"
                        >
                          Generate notes
                        </button>

                        <button
                          type="button"
                          data-ask="${safe(d.id)}"
                        >
                          Ask AI
                        </button>

                        <button
                          type="button"
                          class="sw-delete"
                          data-doc-remove="${safe(d.id)}"
                        >
                          Remove
                        </button>

                      </div>

                    </article>
                `).join("")
                : `
                  <div class="sw-empty">
                    No matching PDFs. Upload a PDF to get started.
                  </div>
                `;

            list.querySelectorAll("[data-preview]").forEach(b => {
                b.addEventListener("click", () => {
                    previewPdf(subject, b.dataset.preview);
                });
            });

            list.querySelectorAll("[data-summary]").forEach(b => {
                b.addEventListener("click", () => {
                    showNotes(subject, b.dataset.summary);
                });
            });

            list.querySelectorAll("[data-ask]").forEach(b => {
                b.addEventListener("click", () => {
                    const doc = docs.find(
                        d => String(d.id) === b.dataset.ask
                    );

                    navigateTo("ai", {
                        subjectId: subject.id,
                        documentId: doc?.id
                    });
                });
            });

            list.querySelectorAll("[data-doc-remove]").forEach(b => {
                b.addEventListener("click", async () => {
                    if (!confirm("Remove this PDF and its extracted text?")) {
                        return;
                    }

                    const index = docs.findIndex(
                        d => String(d.id) === b.dataset.docRemove
                    );

                    if (index < 0) return;

                    const [removed] = docs.splice(index, 1);

                    await removePdfBlob(removed.id);

                    persist();

                    renderMaterials(subject, panel);
                });
            });
        }

        $("#swMaterialSearch").addEventListener("input", draw);
        $("#swMaterialTopic").addEventListener("change", draw);

        $("#swPdfInput").addEventListener("change", async e => {
            const files = [...e.target.files];

            e.target.value = "";

            const status = $("#swPdfStatus");

            for (const file of files) {
                try {
                    if (
                        file.type !== "application/pdf" &&
                        !file.name.toLowerCase().endsWith(".pdf")
                    ) {
                        throw new Error("Choose a PDF file.");
                    }

                    status.textContent = `Reading ${file.name}...`;

                    const data = await extractPdfText(file);

                    const docId = data.id || id();

                    const record = {
                        ...data,
                        id: docId,
                        topicId: "",
                        bookmarks: []
                    };

                    await savePdfBlob(docId, file);

                    docs.push(record);

                    if (!saveData()) {
                        docs.pop();

                        await removePdfBlob(docId);

                        throw new Error(
                            "Could not save extracted PDF text to browser storage."
                        );
                    }

                } catch (err) {
                    status.textContent = `${file.name}: ${err.message}`;
                }
            }

            if (
                !status.textContent.startsWith("Error") &&
                files.length
            ) {
                status.textContent =
                    "Upload complete. Link each PDF to a topic below if needed.";
            }

            renderMaterials(subject, panel);
        });

        draw();

        // Topic links shown as a compact selector per material.
        docs.forEach(doc => {
            doc.topicId ??= "";
        });
    }

    /* =========================================================
       PDF PREVIEW
    ========================================================= */

    async function previewPdf(subject, docId) {
        const doc = subject.documents.find(
            d => String(d.id) === String(docId)
        );

        const target = $("#swPdfPreview");

        if (!doc || !target) return;

        target.hidden = false;

        target.innerHTML = `
          <h3>${safe(doc.name)}</h3>
          <p>Loading PDF preview...</p>
        `;

        try {
            const blob = await getPdfBlob(doc.id);

            if (blob) {
                const url = URL.createObjectURL(blob);

                target.innerHTML = `
                  <div class="sw-preview-head">

                    <h3>${safe(doc.name)}</h3>

                    <button id="swClosePreview" type="button">
                      Close
                    </button>

                  </div>

                  <iframe
                    title="PDF preview: ${safe(doc.name)}"
                    src="${url}"
                    class="sw-pdf-frame"
                  ></iframe>
                `;

                $("#swClosePreview").addEventListener("click", () => {
                    URL.revokeObjectURL(url);
                    target.hidden = true;
                });

            } else {
                target.innerHTML = `
                  <h3>${safe(doc.name)}</h3>

                  <p>
                    The original PDF is not in this browser's file store.
                    Showing extracted text instead.
                  </p>

                  <div class="sw-extracted-pages">

                    ${doc.pages.map((p, i) => `
                      <article>

                        <strong>Page ${i + 1}</strong>

                        <p>
                          ${safe(p || "No selectable text on this page.")}
                        </p>

                      </article>
                    `).join("")}

                  </div>
                `;
            }

        } catch {
            target.innerHTML = `
              <h3>${safe(doc.name)}</h3>

              <p>
                Could not open the original PDF. You can still use
                its extracted text to make notes.
              </p>
            `;
        }
    }

    /* =========================================================
       GENERATE NOTES
    ========================================================= */

    function showNotes(subject, docId) {
        const doc = subject.documents.find(
            d => String(d.id) === String(docId)
        );

        if (!doc) return;

        const notes = typeof summarizePdf === "function"
            ? summarizePdf(doc)
            : (doc.pages || []).join("\n").slice(0, 5000);

        const target = $("#swPdfPreview");

        target.hidden = false;

        target.innerHTML = `
          <div class="sw-preview-head">

            <h3>Extractive notes: ${safe(doc.name)}</h3>

            <button id="swCloseNotes" type="button">
              Close
            </button>

          </div>

          <p class="sw-note-disclaimer">
            These notes select important sentences from the PDF text.
            They are not generated by an external AI model.
          </p>

          <pre class="sw-notes">${safe(notes)}</pre>
        `;

        $("#swCloseNotes").addEventListener("click", () => {
            target.hidden = true;
        });
    }

    /* =========================================================
       PRACTICE AND QUIZ RECORDING
    ========================================================= */

    function renderPractice(subject, panel) {
        const docs = subject.documents;

        panel.innerHTML = `
          <div class="sw-practice-grid">

            <article class="sw-panel-card">

              <h3>Generate notes</h3>

              <p>
                Create a short extractive summary from a selected PDF.
              </p>

              <select id="swPracticeDoc">

                <option value="">Choose a PDF</option>

                ${docs.map(d => `
                  <option value="${safe(d.id)}">
                    ${safe(d.name)}
                  </option>
                `).join("")}

              </select>

              <button type="button" id="swPracticeNotes">
                Generate notes
              </button>

            </article>

            <article class="sw-panel-card">

              <h3>Ask AI about a PDF</h3>

              <p>
                Open the existing document question interface.
              </p>

              <button
                type="button"
                id="swPracticeAI"
                ${docs.length ? "" : "disabled"}
              >
                Open AI assistant
              </button>

            </article>

            <article class="sw-panel-card">

              <h3>Record a quiz result</h3>

              <p>
                Enter your score after completing a practice quiz.
                It will appear in reports and subject analytics.
              </p>

              <form id="swQuizForm" class="sw-quiz-form">

                <input
                  id="swQuizName"
                  placeholder="Quiz name"
                  maxlength="80"
                  required
                >

                <select id="swQuizTopic">

                  <option value="">General subject quiz</option>

                  ${subject.topics.map(t => `
                    <option value="${safe(t.id)}">
                      ${safe(t.name)}
                    </option>
                  `).join("")}

                </select>

                <input
                  id="swQuizScore"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Score %"
                  required
                >

                <button type="submit">
                  Save score
                </button>

              </form>

            </article>

          </div>

          <div id="swPracticeOutput"></div>
        `;

        $("#swPracticeNotes").addEventListener("click", () => {
            const doc = docs.find(
                d => String(d.id) === $("#swPracticeDoc").value
            );

            if (!doc) {
                return alert("Choose a PDF first.");
            }

            const output = $("#swPracticeOutput");

            output.innerHTML = `
              <div class="sw-panel-card">

                <h3>${safe(doc.name)} — notes</h3>

                <pre class="sw-notes">
${safe(summarizePdf(doc))}
                </pre>

              </div>
            `;
        });

        $("#swPracticeAI").addEventListener("click", () => {
            if (docs[0]) {
                navigateTo("ai", {
                    subjectId: subject.id,
                    documentId: docs[0].id
                });
            }
        });

        $("#swQuizForm").addEventListener("submit", e => {
            e.preventDefault();

            const score = Number($("#swQuizScore").value);

            if (
                !Number.isFinite(score) ||
                score < 0 ||
                score > 100
            ) {
                return alert("Enter a score from 0 to 100.");
            }

            const topic = subject.topics.find(
                t => String(t.id) === $("#swQuizTopic").value
            );

            studentData.quizzes.push({
                id: id(),
                name: $("#swQuizName").value.trim(),
                subjectId: subject.id,
                subjectName: subject.name,
                topicId: topic?.id || null,
                topicName: topic?.name || "",
                ...(topic ? { unitName: topic.unit || "General" } : {}),
                percentage: score,
                date: new Date().toISOString()
            });

            if (topic) {
                topic.mastery = Math.round(
                    ((Number(topic.mastery) || 0) + score) / 2
                );
            }

            persist();

            openSubject(subject.id, "analytics");
        });
    }

    /* =========================================================
       SMART REVISION
    ========================================================= */

    function renderRevision(subject, panel) {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const candidates = subject.topics.map(t => {
            const mastery = Number(t.mastery) || (
                t.completed ? 100 : 0
            );

            const daysSince = t.lastRevised
                ? Math.floor(
                    (
                        today -
                        new Date(t.lastRevised + "T00:00:00")
                    ) / 86400000
                )
                : 99;

            const due =
                t.needsRevision ||
                !t.completed ||
                mastery < 60 ||
                daysSince >= 7;

            return {
                ...t,
                mastery,
                daysSince,
                due,
                priority: (
                    t.needsRevision ? 4 :
                    !t.completed ? 3 :
                    mastery < 60 ? 2 :
                    daysSince >= 7 ? 1 : 0
                )
            };

        }).filter(t => t.due).sort(
            (a, b) => b.priority - a.priority || a.mastery - b.mastery
        );

        panel.innerHTML = `
          <div class="sw-panel-card">

            <h3>Topics to revisit</h3>

            <p>
              Suggestions use completion, recorded mastery
              and the last revision date.
            </p>

            ${
                candidates.length
                ? candidates.map(t => `
                    <article class="sw-revision-row">

                      <div>

                        <strong>${safe(t.name)}</strong>

                        <small>
                          ${t.needsRevision ? "Marked for revision · " : ""}
                          ${safe(t.unit)} ·
                          ${t.mastery}% mastery ·
                          ${
                            t.daysSince === 99
                            ? "Not revised yet"
                            : `${t.daysSince} days since revision`
                          }
                        </small>

                      </div>

                      <button
                        type="button"
                        data-revise="${safe(t.id)}"
                      >
                        Mark revised today
                      </button>

                    </article>
                `).join("")
                : `
                  <div class="sw-empty">
                    No topics are currently flagged.
                    Add topics or update mastery after practice.
                  </div>
                `
            }

          </div>
        `;

        panel.querySelectorAll("[data-revise]").forEach(btn => {
            btn.addEventListener("click", () => {
                const topic = subject.topics.find(
                    t => String(t.id) === btn.dataset.revise
                );

                if (!topic) return;

                topic.lastRevised = new Date().toISOString().slice(0, 10);
                topic.needsRevision = false;

                topic.revisionCount =
                    (Number(topic.revisionCount) || 0) + 1;

                studentData.revisions.push({
                    id: id(),
                    subject: subject.name,
                    topic: topic.name,
                    date: topic.lastRevised,
                    topicId: topic.id
                });

                persist();

                renderTab(subject, "revision", subjectStats(subject));
            });
        });
    }

    /* =========================================================
       ANALYTICS
    ========================================================= */

    function renderAnalytics(subject, panel, stats) {
        const topics = subject.topics;

        const weak = topics.filter(
            t => (Number(t.mastery) || 0) < 50
        );

        const strong = topics.filter(
            t => (Number(t.mastery) || 0) >= 80
        );

        const unitStats = getUnits(subject).map(unit => {
            const group = topics.filter(
                t => (t.unit || "General") === unit
            );

            const done = group.filter(
                t => t.completed || t.status === "completed"
            ).length;

            const unitQuizzes = stats.quizzes.filter(quiz => {
                if (quiz.unitName)
                    return quiz.unitName === unit;

                const quizTopic = topics.find(topic =>
                    String(topic.id) === String(quiz.topicId)
                );
                return quizTopic && (quizTopic.unit || "General") === unit;
            });

            return {
                unit,
                done,
                total: group.length,
                quizCount: unitQuizzes.length,
                quizAverage: unitQuizzes.length
                    ? Math.round(
                        unitQuizzes.reduce(
                            (sum, quiz) => sum + (Number(quiz.percentage) || 0),
                            0
                        ) / unitQuizzes.length
                    )
                    : null,
                mastery: group.length
                    ? Math.round(
                        group.reduce(
                            (n, t) => n + (Number(t.mastery) || 0),
                            0
                        ) / group.length
                    )
                    : 0
            };
        });

        const quizRows = stats.quizzes.slice().sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        panel.innerHTML = `
          <div class="sw-stat-grid">

            <article>
              <span>Average score per subject</span>
              <strong>
                ${stats.quizzes.length ? stats.average + "%" : "—"}
              </strong>
              <small>${stats.quizzes.length} attempts</small>
            </article>

            <article>
              <span>Topic mastery</span>
              <strong>${topics.length ? stats.mastery + "%" : "—"}</strong>
              <small>Average across ${topics.length} topics</small>
            </article>

            <article>
              <span>Weak topics</span>
              <strong>${weak.length}</strong>
              <small>Below 50% mastery</small>
            </article>

            <article>
              <span>Strong topics</span>
              <strong>${strong.length}</strong>
              <small>80% mastery or above</small>
            </article>

          </div>

          <div class="sw-panel-card">

            <h3>Unit performance</h3>
            <p class="sw-footnote">
              Each unit shows average topic mastery and average quiz score.
              Assign a unit when taking a quiz to include it here.
            </p>

            ${
                unitStats.length
                ? unitStats.map(u => `
                    <div class="sw-unit-analytics">

                      <div>
                        <strong>${safe(u.unit)}</strong>

                        <span>
                          ${u.done}/${u.total} complete ·
                          ${u.mastery}% topic mastery ·
                          ${u.quizAverage === null
                            ? "No quiz scores"
                            : `${u.quizAverage}% quiz average (${u.quizCount} ${u.quizCount === 1 ? "quiz" : "quizzes"})`}
                        </span>
                      </div>

                      <div class="sw-progress">
                        <span style="width:${u.mastery}%"></span>
                      </div>

                      <div class="sw-progress sw-quiz-progress">
                        <span style="width:${u.quizAverage ?? 0}%"></span>
                      </div>

                    </div>
                `).join("")
                : "<p>Add topics to see unit analytics.</p>"
            }

          </div>

          <div class="sw-panel-card">

            <h3>Topic mastery</h3>

            ${
                topics.length
                ? topics.map(t => `
                    <div class="sw-mastery-row">

                      <span>${safe(t.name)}</span>

                      <div class="sw-progress">
                        <span style="width:${Number(t.mastery) || 0}%"></span>
                      </div>

                      <strong>${Number(t.mastery) || 0}%</strong>

                    </div>
                `).join("")
                : "<p>No topic data yet.</p>"
            }

          </div>

          <div class="sw-panel-card sw-topic-groups">
            <section>
              <h3>Weak topics</h3>
              ${
                weak.length
                    ? `<ul class="sw-topic-list">${weak.map(topic => `
                        <li>${safe(topic.name)} <strong>${Number(topic.mastery) || 0}%</strong></li>
                    `).join("")}</ul>`
                    : "<p>No weak topics. Topics below 50% mastery appear here.</p>"
              }
            </section>
            <section>
              <h3>Strong topics</h3>
              ${
                strong.length
                    ? `<ul class="sw-topic-list">${strong.map(topic => `
                        <li>${safe(topic.name)} <strong>${Number(topic.mastery) || 0}%</strong></li>
                    `).join("")}</ul>`
                    : "<p>No strong topics yet. Topics at 80% mastery or above appear here.</p>"
              }
            </section>
          </div>

          <div class="sw-panel-card">

            <h3>Quiz score history</h3>

            ${
                quizRows.length
                ? `
                  <div class="sw-score-history">

                    ${quizRows.map(q => `
                      <div>

                        <span>${safe(q.name)}</span>

                        <strong>
                          ${Number(q.percentage) || 0}%
                        </strong>

                        <small>
                          ${q.date ? new Date(q.date).toLocaleDateString() : ""}
                        </small>

                      </div>
                    `).join("")}

                  </div>
                `
                : "<p>No quiz scores recorded for this subject yet.</p>"
            }

          </div>

          <p class="sw-footnote">
            Study time per unit is not calculated yet because the
            current timer records total study time, not a subject
            or unit selection.
          </p>
        `;
    }

    /* =========================================================
       INITIALISE SUBJECT DATA
    ========================================================= */

    studentData.subjects.forEach(ensureSubjectFields);

    persist();

    // Update the Subjects page in the existing navigation map.
    window.openSubjects = window.openSubjects;

    if (typeof pages !== "undefined") {
        pages.subjects = window.openSubjects;
    }

})();