// dashboard.js

const isLoggedIn =
    sessionStorage.getItem("isLoggedIn");

if (isLoggedIn !== "true") {
    window.location.replace("login.html");
}

const userName =
    sessionStorage.getItem("userName");

document.getElementById("userName").textContent =
    userName || "User";


document
    .getElementById("logoutBtn")
    .addEventListener("click", function () {

        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userName");

        window.location.replace("login.html");
    });