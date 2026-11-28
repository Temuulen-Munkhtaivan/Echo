const createPostForm = document.querySelector('form[action="/posts"]');

// Keep the existing CSRF protection
addCsrfToken(createPostForm);

const postErrorDialog = document.getElementById("postErrorDialog");
const postErrorMessage = document.getElementById("postErrorMessage");
const closePostError = document.getElementById("closePostError");

let loginRequired = false;

closePostError.addEventListener("click", () => {
    if (loginRequired) {
        window.location.href = "/login.html";
        return;
    }

    postErrorDialog.close();
});

createPostForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const publishButton = createPostForm.querySelector('button[type="submit"]');

    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";

    try {
        // Get a valid CSRF token
        const tokenResponse = await fetch("/csrf-token", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!tokenResponse.ok) {
            throw new Error("Security check failed. Please try again.");
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.csrfToken) {
            throw new Error("Security token missing. Please refresh the page.");
        }

        // Prepare post details
        const formData = new URLSearchParams(new FormData(createPostForm));
        formData.set("_csrf", tokenData.csrfToken);

        // Submit the post
        const response = await fetch("/posts", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        // Successful post
        if (response.ok) {
            window.location.href = "/posts.html";
            return;
        }

        loginRequired = response.status === 401;

        // Handle errors
        if (response.status === 401) {
            postErrorMessage.textContent =
                "Your session has expired. Please log in again.";

        } else if (response.status === 400) {
            postErrorMessage.textContent =
                "Please enter a valid title and content.";

        } else if (response.status === 403) {
            postErrorMessage.textContent =
                "Security check failed. Please refresh the page.";

        } else {
            postErrorMessage.textContent =
                "Something went wrong. Please try again.";
        }

        closePostError.textContent =
            loginRequired ? "Go to Login" : "Try Again";

        postErrorDialog.showModal();

    } catch (error) {
        loginRequired = false;

        postErrorMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        closePostError.textContent = "Try Again";
        postErrorDialog.showModal();

    } finally {
        publishButton.disabled = false;
        publishButton.textContent = "Publish Post";
    }
});