const deleteDialog = document.getElementById("deleteDialog");
const deleteDialogMessage = document.getElementById("deleteDialogMessage");
const deleteDialogError = document.getElementById("deleteDialogError");

const cancelDeleteButton = document.getElementById("cancelDelete");
const confirmDeleteButton = document.getElementById("confirmDelete");

let pendingDeleteForm = null;

function openDeleteDialog(form, message) {
    pendingDeleteForm = form;

    deleteDialogMessage.textContent = message;
    deleteDialogError.textContent = "";
    deleteDialogError.hidden = true;

    deleteDialog.showModal();
}

cancelDeleteButton.addEventListener("click", () => {
    deleteDialog.close();
});

deleteDialog.addEventListener("close", () => {
    pendingDeleteForm = null;
});

confirmDeleteButton.addEventListener("click", async () => {
    if (!pendingDeleteForm) {
        return;
    }

    const form = pendingDeleteForm;

    confirmDeleteButton.disabled = true;
    cancelDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";

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

        const formData = new URLSearchParams(new FormData(form));
        formData.set("_csrf", tokenData.csrfToken);

        // Send the delete request
        const response = await fetch(form.action, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: formData
        });

        if (response.ok) {
            window.location.reload();
            return;
        }

        if (response.status === 401) {
            deleteDialogError.textContent =
                "Please log in before deleting posts.";

        } else if (response.status === 403) {
            deleteDialogError.textContent =
                "Permission denied or security check failed.";

        } else if (response.status === 404) {
            deleteDialogError.textContent =
                "Post not found or access denied.";

        } else {
            deleteDialogError.textContent =
                "Couldn't delete the post. Please try again.";
        }

        deleteDialogError.hidden = false;

    } catch (error) {
        deleteDialogError.textContent =
            error.message || "Something went wrong.";

        deleteDialogError.hidden = false;

    } finally {
        confirmDeleteButton.disabled = false;
        cancelDeleteButton.disabled = false;
        confirmDeleteButton.textContent = "Delete Post";
    }
});
async function loadPosts() {
    const container = document.getElementById("posts");
    const message = document.getElementById("message");

    try {
        // Retrieve posts from Express
        const response = await fetch("/posts");

        if (!response.ok) {
            throw new Error("Failed to retrieve posts");
        }

        const posts = await response.json();

        // Check who is currently logged in
        const userResponse = await fetch("/me");

        const currentUser = userResponse.ok
            ? await userResponse.json()
            : null;

        message.textContent = "";

        if (posts.length === 0) {
            message.textContent = "No posts yet.";
            return;
        }

        // Display each post
        posts.forEach(post => {
            const article = document.createElement("article");
            const title = document.createElement("h2");
            const author = document.createElement("p");
            const content = document.createElement("p");

            title.textContent = post.title;
            author.textContent = "Posted by " + post.author;
            content.textContent = post.content;

            content.style.whiteSpace = "pre-wrap";

            article.appendChild(title);
            article.appendChild(author);
            article.appendChild(content);

            // Only show Edit if the logged-in user owns the post
            if (currentUser && post.user_id === currentUser.userId) {
                // Edit link
                const editLink = document.createElement("a");

                editLink.href = "/edit-post.html?id=" + post.id;
                editLink.textContent = "Edit";

                article.appendChild(editLink);

                // Delete form
                const deleteForm = document.createElement("form");

                deleteForm.method = "POST";
                deleteForm.action = "/posts/" + post.id + "/delete";

                const deleteButton = document.createElement("button");

                deleteButton.type = "submit";
                deleteButton.textContent = "Delete";

                deleteForm.appendChild(deleteButton);

                // Show Echo confirmation popup
                deleteForm.addEventListener("submit", (event) => {
                    event.preventDefault();

                    openDeleteDialog(
                        deleteForm,
                        "Are you sure you want to delete this post? This cannot be undone."
                    );
                });

                article.appendChild(deleteForm);
                addCsrfToken(deleteForm);
            }
            // Admins can remove posts belonging to other users
            if (
                currentUser &&
                currentUser.role === "admin" &&
                post.user_id !== currentUser.userId
            ) {
                const adminForm = document.createElement("form");

                adminForm.method = "POST";
                adminForm.action = "/admin/posts/" + post.id + "/delete";

                const removeButton = document.createElement("button");

                removeButton.type = "submit";
                removeButton.textContent = "Remove Post";

                adminForm.appendChild(removeButton);

                // Show Echo confirmation popup for admins
                adminForm.addEventListener("submit", (event) => {
                    event.preventDefault();

                    openDeleteDialog(
                        adminForm,
                        "Remove this user's post? This cannot be undone."
                    );
                });

                article.appendChild(adminForm);
                addCsrfToken(adminForm);
            }

            container.appendChild(article);
        });

    } catch (err) {
        message.textContent = "Unable to load posts.";
    }
}

loadPosts();