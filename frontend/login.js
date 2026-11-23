const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const statusMessage = document.getElementById("statusMessage");

togglePassword.addEventListener("click", function () {
    const isPasswordHidden = passwordInput.type === "password";
    passwordInput.type = isPasswordHidden ? "text" : "password";
    togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "Hide password" : "Show password"
    );
    togglePassword.innerHTML = isPasswordHidden
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    statusMessage.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        statusMessage.textContent = "Enter your email and password.";
        return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const result = await examReadyApi.postPublic("/auth/login", {
            email,
            password
        });

        if (!result.token || !result.user || result.user.id == null || !result.user.name) {
            statusMessage.textContent = "The server returned an incomplete login response. Please try again.";
            return;
        }

        try {
            sessionStorage.setItem("accessToken", result.token);
            sessionStorage.setItem("userId", String(result.user.id));
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("userName", result.user.name);
        } catch (error) {
            console.error("Could not save the login session:", error);
            statusMessage.textContent = "Could not save your login session in this browser.";
            return;
        }

        statusMessage.textContent = "Login successful!";
        window.location.replace("./dashboard.html");
    } catch (error) {
        if (error.status) {
            statusMessage.textContent = error.message || "Login failed. Please try again.";
        } else {
            console.error("Could not reach the login service:", error);
            statusMessage.textContent =
                "Could not connect to the server. Make sure the backend is running and try again.";
        }
    } finally {
        submitButton.disabled = false;
    }
});
