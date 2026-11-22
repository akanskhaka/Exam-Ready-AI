(function () {
    "use strict";

    const API_BASE_URL = "http://127.0.0.1:5002/api";

    async function request(path, options = {}, requiresAuth = true) {
        const token = sessionStorage.getItem("accessToken");
        if (requiresAuth && !token) {
            const error = new Error("Please log in to continue.");
            error.status = 401;
            throw error;
        }

        const headers = {
            ...(requiresAuth && token ? { "Authorization": `Bearer ${token}` } : {}),
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
            const apiError = new Error("The server returned an invalid response.");
            apiError.status = response.status;
            throw apiError;
        }

        if (!response.ok) {
            const apiMessage = result.message || result.msg || result.error;
            const apiError = new Error(
                typeof apiMessage === "string" && apiMessage
                    ? apiMessage
                    : `The request failed (HTTP ${response.status}).`
            );
            apiError.status = response.status;
            throw apiError;
        }

        return result;
    }

    window.examReadyApi = {
        get: path => request(path),
        postPublic: (path, body) => request(path, {
            method: "POST",
            body: JSON.stringify(body)
        }, false),
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
