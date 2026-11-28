const registerForm = document.getElementById("registerForm");

const registerErrorDialog = document.getElementById("registerErrorDialog");
const registerErrorMessage = document.getElementById("registerErrorMessage");
const closeRegisterError = document.getElementById("closeRegisterError");

closeRegisterError.addEventListener("click", () => {
    registerErrorDialog.close();
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const registerButton = registerForm.querySelector('button[type="submit"]');

    registerButton.disabled = true;
    registerButton.textContent = "Registering...";

    try {
        // Get CSRF token
        const tokenResponse = await fetch("/csrf-token", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!tokenResponse.ok) {
            throw new Error("Could not prepare registration. Please try again.");
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.csrfToken) {
            throw new Error("Security token missing. Please refresh the page.");
        }

        // Prepare registration details
        const formData = new URLSearchParams(new FormData(registerForm));
        formData.set("_csrf", tokenData.csrfToken);

        // Submit registration
        const response = await fetch("/register", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        // Successful registration
        if (response.ok) {
            window.location.href = "/login.html";
            return;
        }

        // Registration errors
        if (response.status === 409) {
            registerErrorMessage.textContent =
                "Username or email already exists.";

        } else if (response.status === 400) {
            const message = (await response.text()).trim();

            registerErrorMessage.textContent =
                message.length <= 150 && !message.startsWith("<")
                    ? message || "Invalid registration details."
                    : "Invalid registration details.";

        } else if (response.status === 403) {
            registerErrorMessage.textContent =
                "Security check failed. Please refresh the page.";

        } else if (response.status === 429) {
            registerErrorMessage.textContent =
                "Too many attempts. Please wait and try again.";

        } else {
            registerErrorMessage.textContent =
                "Registration failed. Please try again.";
        }

        registerErrorDialog.showModal();

    } catch (error) {
        registerErrorMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        registerErrorDialog.showModal();

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Register";
    }
});