const API_URL = "http://127.0.0.1:5002/api/auth/register";

const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
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
        ? '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>'
        : '<i class="fa-regular fa-eye" aria-hidden="true"></i>';
});

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    statusMessage.textContent = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name) {
        statusMessage.textContent = "Please enter your name.";
        nameInput.focus();
        return;
    }

    if (!emailInput.validity.valid) {
        statusMessage.textContent = "Please enter a valid email address.";
        emailInput.focus();
        return;
    }

    if (password.length < 6) {
        statusMessage.textContent = "Password must contain at least 6 characters.";
        passwordInput.focus();
        return;
    }

    if (password !== confirmPasswordInput.value) {
        statusMessage.textContent = "Passwords do not match.";
        confirmPasswordInput.focus();
        return;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        let result;
        try {
            result = await response.json();
        } catch (error) {
            console.error("Could not read the registration response:", error);
            statusMessage.textContent =
                "The server returned an invalid response. Please try again.";
            return;
        }

        if (!response.ok) {
            statusMessage.textContent =
                result.message || "Registration failed. Please try again.";
            return;
        }

        statusMessage.textContent = "Registration successful. Redirecting to login...";
        setTimeout(function () {
            window.location.replace("./login.html");
        }, 1000);
    } catch (error) {
        console.error("Could not reach the registration service:", error);
        statusMessage.textContent =
            "Could not connect to the server. Make sure the backend is running and try again.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
    }
});
