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
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
});

registerForm.addEventListener("submit", function (event) {
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

    let existingUser;
    try {
        existingUser = localStorage.getItem("registeredUser");
    } catch (error) {
        console.error("Could not access browser storage:", error);
        statusMessage.textContent = "Account storage is unavailable in this browser.";
        return;
    }

    if (existingUser) {
        statusMessage.textContent =
            "An account is already registered in this browser. Please log in.";
        return;
    }

    try {
        localStorage.setItem("registeredUser", JSON.stringify({
            name: name,
            email: email,
            password: password
        }));
    } catch (error) {
        console.error("Could not save registered account:", error);
        statusMessage.textContent = "Could not save your account. Please try again.";
        return;
    }

    window.location.replace("./login.html");
});