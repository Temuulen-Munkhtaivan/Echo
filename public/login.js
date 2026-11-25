const loginForm = document.getElementById("loginForm");

const loginErrorDialog = document.getElementById("loginErrorDialog");
const loginErrorMessage = document.getElementById("loginErrorMessage");

const closeLoginError = document.getElementById("closeLoginError");

closeLoginError.addEventListener("click", () => {
    loginErrorDialog.close();
    document.getElementById("password").focus();
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loginButton = loginForm.querySelector('button[type="submit"]');

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        // Get a valid CSRF token
        const tokenResponse = await fetch("/csrf-token", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!tokenResponse.ok) {
            throw new Error("Could not prepare login. Please try again.");
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.csrfToken) {
            throw new Error("Security token missing. Please refresh the page.");
        }

        // Prepare login details
        const formData = new URLSearchParams(new FormData(loginForm));
        formData.set("_csrf", tokenData.csrfToken);

        // Submit without leaving the page
        const response = await fetch("/login", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        if (response.ok) {
            window.location.href = "/";
            return;
        }

        // Handle login errors
        if (response.status === 401) {
            loginErrorMessage.textContent = "Invalid email or password.";
        } else if (response.status === 429) {
            loginErrorMessage.textContent =
                "Too many login attempts. Please wait and try again.";
        } else if (response.status === 403) {
            loginErrorMessage.textContent =
                "Security check failed. Please refresh the page.";
        } else {
            loginErrorMessage.textContent =
                "Something went wrong. Please try again.";
        }

        loginErrorDialog.showModal();

    } catch (error) {
        loginErrorMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        loginErrorDialog.showModal();

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});