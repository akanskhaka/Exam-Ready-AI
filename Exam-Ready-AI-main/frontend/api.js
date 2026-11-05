(function () {
    "use strict";

    const API_BASE_URL = "http://127.0.0.1:5002/api";

    async function request(path, options = {}) {
        const token = sessionStorage.getItem("accessToken");
        if (!token) {
            const error = new Error("Please log in to continue.");
            error.status = 401;
            throw error;
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        };
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        });

        let result;
        try {
            result = await response.json();
        } catch (error) {
            console.error("Could not read the API response:", error);
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            const apiError = new Error(result.message || "The request failed.");
            apiError.status = response.status;
            throw apiError;
        }

        return result;
    }

    window.examReadyApi = {
        get: path => request(path),
        post: (path, body) => request(path, {
            method: "POST",
            body: JSON.stringify(body)
        }),
        put: (path, body) => request(path, {
            method: "PUT",
            body: JSON.stringify(body)
        }),
        delete: path => request(path, { method: "DELETE" })
    };
})();
