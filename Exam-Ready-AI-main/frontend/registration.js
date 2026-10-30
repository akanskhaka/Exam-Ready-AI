// registration.js

const existingUser = localStorage.getItem("registeredUser");

if (existingUser) {
    window.location.replace("login.html");
}

const registrationForm = document.getElementById("registrationForm");

registrationForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const message = document.getElementById("message");

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        message.className = "error";
        return;
    }

    if (password.length < 6) {
        message.textContent =
            "Password must be at least 6 characters.";
        message.className = "error";
        return;
    }

    const user = {
        name: name,
        email: email,
        password: password
    };

    localStorage.setItem(
        "registeredUser",
        JSON.stringify(user)
    );

    message.textContent = "Registration successful!";
    message.className = "success";

    setTimeout(function () {
        window.location.replace("login.html");
    }, 1000);
});