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
        await examReadyApi.postPublic("/auth/register", {
            name,
            email,
            password
        });

        message.className = "success";
        message.textContent = "Registration successful. Redirecting to login...";
        setTimeout(function () {
            window.location.replace("./login.html");
        }, 1000);
    } catch (error) {
        if (error.status) {
            message.textContent = error.message || "Registration failed. Please try again.";
        } else {
            console.error("Could not reach the registration service:", error);
            message.textContent =
                "Could not connect to the server. Make sure the backend is running and try again.";
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "CREATE ACCOUNT";
    }
});
