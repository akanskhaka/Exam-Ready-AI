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

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const storedUser = localStorage.getItem("registeredUser");
    if (!storedUser) {
        statusMessage.textContent = "No registered account was found.";
        return;
    }

    let user;
    try {
        user = JSON.parse(storedUser);
    } catch (error) {
        console.error("Could not read registered account:", error);
        statusMessage.textContent = "Could not read the saved account. Please register again.";
        return;
    }

    if (emailInput.value.trim() !== user.email || passwordInput.value !== user.password) {
        statusMessage.textContent = "Incorrect email or password.";
        return;
    }

    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("userName", user.name);
    statusMessage.textContent = "Login successful!";

    window.location.replace("./dashboard.html");
});
