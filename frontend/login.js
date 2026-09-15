// login.js

const registeredUser =
    localStorage.getItem("registeredUser");

// No registered user → registration page
if (!registeredUser) {
    window.location.replace("registration.html");
}

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const user = JSON.parse(
        localStorage.getItem("registeredUser")
    );

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");

    if (
        email === user.email &&
        password === user.password
    ) {

        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userName", user.name);

        message.textContent = "Login successful!";
        message.className = "success";

        setTimeout(function () {
            window.location.replace("dashboard.html");
        }, 700);

    } else {

        message.textContent =
            "Incorrect email or password.";

        message.className = "error";
    }
});