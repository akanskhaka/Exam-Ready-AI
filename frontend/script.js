// ==========================================
// LOGIN PAGE JAVASCRIPT
// ==========================================

const signupForm = document.getElementById("signupForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberCheckbox = document.getElementById("remember");
const togglePassword = document.getElementById("togglePassword");
const createAccount = document.getElementById("createAccount");


// ==========================================
// SHOW / HIDE PASSWORD
// ==========================================

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.innerHTML =
            '<i class="fa-solid fa-eye-slash"></i>';

        togglePassword.setAttribute(
            "aria-label",
            "Hide password"
        );

    } else {

        passwordInput.type = "password";

        togglePassword.innerHTML =
            '<i class="fa-solid fa-eye"></i>';

        togglePassword.setAttribute(
            "aria-label",
            "Show password"
        );
    }

});


// ==========================================
// LOGIN FORM
// ==========================================

signupForm.addEventListener("submit", async function (event) {

    // Prevent page refresh
    event.preventDefault();


    // Get values from form
    const username = usernameInput.value.trim();
    const password = passwordInput.value;


    // ======================================
    // BASIC VALIDATION
    // ======================================

    if (username === "") {

        alert("Please enter your name.");
        usernameInput.focus();
        return;

    }


    if (password === "") {

        alert("Please enter your password.");
        passwordInput.focus();
        return;

    }


    if (password.length < 6) {

        alert("Password must contain at least 6 characters.");
        passwordInput.focus();
        return;

    }


    // ======================================
    // DISABLE BUTTON WHILE LOGGING IN
    // ======================================

    const loginButton =
        signupForm.querySelector(".login-button");

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";


    try {

        // ==================================
        // SEND DATA TO PYTHON BACKEND
        // ==================================

        const response = await fetch(
            "http://127.0.0.1:5000/api/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    // Your HTML calls this username.
                    // Backend can treat it as name/email
                    // depending on your database design.
                    username: username,

                    password: password

                })
            }
        );


        // Convert response to JSON
        const data = await response.json();


        // ==================================
        // LOGIN SUCCESS
        // ==================================

        if (response.ok && data.success) {

            alert("Login successful!");


            // --------------------------------
            // Store logged-in student details
            // --------------------------------

            const student = data.student;


            if (rememberCheckbox.checked) {

                localStorage.setItem(
                    "student",
                    JSON.stringify(student)
                );

            } else {

                sessionStorage.setItem(
                    "student",
                    JSON.stringify(student)
                );

            }


            // --------------------------------
            // Redirect to dashboard
            // --------------------------------

            window.location.href = "dashboard.html";


        } else {

            // ==================================
            // LOGIN FAILED
            // ==================================

            alert(
                data.message ||
                "Invalid username or password."
            );

            loginButton.disabled = false;
            loginButton.textContent = "Log in";
        }


    } catch (error) {

        // ==================================
        // SERVER CONNECTION ERROR
        // ==================================

        console.error("Login error:", error);

        alert(
            "Unable to connect to the server.\n\n" +
            "Please make sure your Python backend is running."
        );

        loginButton.disabled = false;
        loginButton.textContent = "Log in";
    }

});


// ==========================================
// CREATE ACCOUNT
// ==========================================

createAccount.addEventListener("click", function (event) {

    event.preventDefault();

    // Change this to your registration page
    window.location.href = "dashboard.html"
});