
const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

const form = document.getElementById("editForm");
const message = document.getElementById("message");
let originalTitle = "";
let originalContent = "";

async function loadPost() {
    if (!postId || !/^[1-9]\d*$/.test(postId)) {
        message.textContent = "Invalid post ID.";
        return;
    }

    try {
        const response = await fetch("/posts");

        if (!response.ok) {
            throw new Error("Failed to load posts");
        }

        const posts = await response.json();
        const post = posts.find(item => String(item.id) === postId);

        if (!post) {
            message.textContent = "Post not found.";
            return;
        }

        originalTitle = post.title;
        originalContent = post.content;

        document.getElementById("title").value = originalTitle;
        document.getElementById("content").value = originalContent;

        form.action = "/posts/" + postId + "/edit";
        form.hidden = false;
        addCsrfToken(form);
        message.textContent = "";

    } catch (err) {
        message.textContent = "Unable to load post.";
    }
}
// Edit Post Error Popup

const editErrorDialog = document.getElementById("editErrorDialog");
const editErrorMessage = document.getElementById("editErrorMessage");
const closeEditError = document.getElementById("closeEditError");

let loginRequiredOnEdit = false;

closeEditError.addEventListener("click", () => {
    if (loginRequiredOnEdit) {
        window.location.href = "/login.html";
        return;
    }

    editErrorDialog.close();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveButton = form.querySelector('button[type="submit"]');

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

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

        // Prepare updated post
        const formData = new URLSearchParams(new FormData(form));
        formData.set("_csrf", tokenData.csrfToken);

        // Submit changes without leaving the page
        const response = await fetch(form.action, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        // Successful update
        if (response.ok) {
            window.location.href = "/posts.html";
            return;
        }

        loginRequiredOnEdit = response.status === 401;

        // Handle errors
        if (response.status === 400) {
            const titleInput = document.getElementById("title");
            const contentInput = document.getElementById("content");

            // Restore the original title if accidentally erased
            if (!titleInput.value.trim()) {
                titleInput.value = originalTitle;
            }

            // Restore the original content if accidentally erased
            if (!contentInput.value.trim()) {
                contentInput.value = originalContent;
            }

            editErrorMessage.textContent =
                "Please enter a valid title and content.";

        } else if (response.status === 401) {
            editErrorMessage.textContent =
                "Your session has expired. Please log in again.";

        } else if (response.status === 403) {
            editErrorMessage.textContent =
                "Security check failed. Please refresh the page.";

        } else if (response.status === 404) {
            editErrorMessage.textContent =
                "Post not found or you don't have permission to edit it.";

        } else {
            editErrorMessage.textContent =
                "Something went wrong. Please try again.";
        }

        closeEditError.textContent =
            loginRequiredOnEdit ? "Go to Login" : "Try Again";

        editErrorDialog.showModal();

    } catch (error) {
        loginRequiredOnEdit = false;

        editErrorMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        closeEditError.textContent = "Try Again";
        editErrorDialog.showModal();

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});

loadPost();
