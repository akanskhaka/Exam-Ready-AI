(function () {
    "use strict";

    const select = document.getElementById("aiDocumentSelect");
    const summarizeButton = document.getElementById("summarizePDF");
    const clearButton = document.getElementById("clearAIChat");
    const shuffleButton = document.getElementById("shuffleSuggestions");
    const input = document.getElementById("aiInput");
    const characterCount = document.getElementById("aiCharacterCount");
    const sendButton = document.getElementById("sendAI");
    const form = document.getElementById("aiQuestionForm");
    const chat = document.getElementById("chatBox");
    const suggestions = document.getElementById("aiSuggestions");
    const connectionStatus = document.getElementById("aiConnectionStatus");
    const params = new URLSearchParams(window.location.search);

    let documents = [];
    let responsePending = false;
    let suggestionOffset = 0;
    let lastQuestion = "";

    const generalSuggestions = [
        "Create an exam revision plan",
        "Explain the most important concepts",
        "Give me five practice questions",
        "What should I revise first?",
        "Create a short memory checklist"
    ];

    if (!sessionStorage.getItem("accessToken")) {
        window.location.replace("./login.html");
        return;
    }

    function loadDocuments() {
        let dashboardData = {};
        try {
            dashboardData = JSON.parse(localStorage.getItem("studentDashboardData") || "{}");
        } catch (error) {
            console.error("Could not read dashboard data:", error);
        }

        const subjects = Array.isArray(dashboardData.subjects) ? dashboardData.subjects : [];
        documents = subjects.flatMap((subject, subjectIndex) =>
            (Array.isArray(subject.documents) ? subject.documents : []).map((document, documentIndex) => ({
                key: `${subjectIndex}:${documentIndex}`,
                subject,
                document
            }))
        );

        documents.forEach(({ key, subject, document }) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = `${subject.name || "Subject"} - ${document.name || "Study PDF"}`;
            select.appendChild(option);
        });

        const initial = documents.find(({ subject, document }) =>
            String(subject.id) === params.get("subjectId") &&
            String(document.id) === params.get("documentId")
        );
        if (initial) select.value = initial.key;
        else if (documents.length === 1) select.value = documents[0].key;
        if (documents.length === 0) {
            appendMessage("ai-message", "No study PDFs are available yet. Upload a PDF in Subjects to get PDF-based answers.");
        }
    }

    function appendMessage(className, text, actions) {
        const message = document.createElement("div");
        message.className = `message ${className}`;
        message.textContent = text;

        if (className === "ai-message" && actions !== false) {
            const toolbar = document.createElement("div");
            toolbar.className = "ai-message-actions";

            const copy = document.createElement("button");
            copy.type = "button";
            copy.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
            copy.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    copy.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                    window.setTimeout(() => {
                        copy.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
                    }, 1400);
                } catch (error) {
                    copy.textContent = "Copy unavailable";
                }
            });

            toolbar.appendChild(copy);
            message.appendChild(toolbar);
        }

        chat.appendChild(message);
        chat.scrollTop = chat.scrollHeight;
        return message;
    }

    function appendError(text) {
        const message = appendMessage("ai-message ai-error", text, false);
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "ai-retry-button";
        retry.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Try again';
        retry.addEventListener("click", () => {
            message.remove();
            input.value = lastQuestion;
            sendMessage();
        });
        message.appendChild(retry);
    }

    function getSelectedDocuments() {
        if (select.value === "all") return documents;
        return documents.filter(item => item.key === select.value);
    }

    function getDocumentText(document) {
        return (Array.isArray(document.pages) ? document.pages : [])
            .join("\n\n")
            .slice(0, 30000);
    }

    function updateSuggestions() {
        const selected = getSelectedDocuments();
        let questions = [...generalSuggestions];

        if (selected.length > 0) {
            const text = selected
                .map(({ document }) => getDocumentText(document))
                .join("\n")
                .toLowerCase();
            const words = (text.match(/[a-zA-Z][a-zA-Z0-9-]{3,}/g) || [])
                .filter(word => !["with", "from", "that", "this", "were", "have", "your", "page"].includes(word));
            const unique = [...new Set(words)].slice(suggestionOffset, suggestionOffset + 3);
            questions = [
                "Summarize the main ideas",
                unique[0] ? `Explain "${unique[0]}" in simple terms` : "Explain the key concepts",
                "Turn this into exam practice questions",
                "Create a 7-day revision plan",
                "What topics need the most revision?"
            ];
        }

        suggestions.replaceChildren();
        questions.slice(0, 4).forEach(question => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ai-suggestion";
            chip.textContent = question;
            chip.addEventListener("click", () => {
                if (question === "Summarize the main ideas") {
                    summarizeSelectedDocuments();
                    return;
                }
                input.value = question;
                updateControls();
                sendMessage();
            });
            suggestions.appendChild(chip);
        });
    }

    function updateControls() {
        const selected = getSelectedDocuments();
        characterCount.textContent = `${input.value.length}/500`;
        sendButton.disabled = responsePending || !input.value.trim();
        summarizeButton.disabled = responsePending || selected.length === 0;
        input.disabled = responsePending;
    }

    async function checkConnection() {
        try {
            const result = await examReadyApi.get("/ai/health");
            connectionStatus.textContent = result.status === "ready" ? "AI Ready" : "API Key Missing";
            connectionStatus.className =
                `ai-status ${result.status === "ready" ? "ai-status-ready" : "ai-status-warning"}`;
        } catch (error) {
            connectionStatus.textContent = "Offline";
            connectionStatus.className = "ai-status ai-status-warning";
        }
    }

    async function summarizeSelectedDocuments() {
        const selected = getSelectedDocuments();
        if (selected.length === 0) {
            appendMessage("ai-message", "Choose a PDF first to summarize it.");
            return;
        }

        responsePending = true;
        updateControls();

        for (const { subject, document } of selected) {
            const loading = appendMessage(
                "ai-message ai-typing",
                `Summarizing "${document.name}"...`,
                false
            );

            try {
                const text = getDocumentText(document);
                if (!text.trim()) throw new Error("This PDF has no extracted text.");
                const result = await examReadyApi.post("/ai/summarize", {
                    title: `${subject.name || "Subject"} - ${document.name || "Study PDF"}`,
                    text
                });
                loading.remove();
                appendMessage("ai-message", `Summary of "${document.name}":\n\n${result.summary}`);
            } catch (error) {
                loading.remove();
                appendError(error.message || "Could not summarize this PDF.");
            }
        }

        responsePending = false;
        updateControls();
    }

    async function sendMessage(event) {
        if (event) event.preventDefault();
        const question = input.value.trim();
        if (!question || responsePending) return;

        lastQuestion = question;
        appendMessage("user-message", question, false);
        input.value = "";
        responsePending = true;
        updateControls();

        const loading = appendMessage("ai-message ai-typing", "Reviewing your study material...", false);
        const context = getSelectedDocuments()
            .map(({ subject, document }) =>
                `${subject.name || "Subject"} - ${document.name || "Study PDF"}\n${getDocumentText(document)}`
            )
            .join("\n\n")
            .slice(0, 30000);

        try {
            const result = await examReadyApi.post("/ai/answer", {
                question,
                context: context || "No study PDF was selected."
            });
            loading.remove();
            appendMessage("ai-message", result.answer);
        } catch (error) {
            loading.remove();
            appendError(error.message || "I could not answer that question.");
        } finally {
            responsePending = false;
            updateControls();
        }
    }

    loadDocuments();
    checkConnection();
    updateSuggestions();
    updateControls();

    summarizeButton.addEventListener("click", summarizeSelectedDocuments);
    select.addEventListener("change", () => {
        suggestionOffset = 0;
        updateSuggestions();
        updateControls();
    });
    shuffleButton.addEventListener("click", () => {
        suggestionOffset = (suggestionOffset + 3) % 30;
        updateSuggestions();
    });
    input.addEventListener("input", updateControls);
    form.addEventListener("submit", sendMessage);
    clearButton.addEventListener("click", () => {
        if (responsePending) return;
        chat.replaceChildren();
        appendMessage("ai-message", "Chat cleared. Ask me about your selected study PDF.");
    });
})();
