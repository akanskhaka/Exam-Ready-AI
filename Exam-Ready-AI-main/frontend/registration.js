const API_URL = "http://127.0.0.1:5002/api/auth/register";

const registrationForm = document.getElementById("registrationForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const message = document.getElementById("message");

registrationForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    message.className = "error";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name) {
        message.textContent = "Please enter your full name.";
        nameInput.focus();
        return;
    }

    if (!emailInput.validity.valid) {
        message.textContent = "Please enter a valid email address.";
        emailInput.focus();
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        passwordInput.focus();
        return;
    }

    if (password !== confirmPasswordInput.value) {
        message.textContent = "Passwords do not match.";
        confirmPasswordInput.focus();
        return;
    }

    const submitButton = registrationForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "REGISTERING...";

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
            message.textContent = "The server returned an invalid response. Please try again.";
            return;
        }

        if (!response.ok) {
            message.textContent = result.message || "Registration failed. Please try again.";
            return;
        }

        message.className = "success";
        message.textContent = "Registration successful. Redirecting to login...";
        setTimeout(function () {
            window.location.replace("./login.html");
        }, 1000);
    } catch (error) {
        console.error("Could not reach the registration service:", error);
        message.textContent =
            "Could not connect to the server. Make sure the backend is running and try again.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "CREATE ACCOUNT";
    }
});
