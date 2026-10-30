// dashboard.js

const userName =
    sessionStorage.getItem("userName");

const userNameElement = document.getElementById("userName");
if (userNameElement) {
    userNameElement.textContent = userName || "User";
}


const logoutButton = document.getElementById("logoutBtn");
if (logoutButton) {
    logoutButton.addEventListener("click", function () {

        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userName");

        window.location.replace("./dashboard.html");
    });
}