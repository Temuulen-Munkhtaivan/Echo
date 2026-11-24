
const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

const form = document.getElementById("editForm");
const message = document.getElementById("message");

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

        document.getElementById("title").value = post.title;
        document.getElementById("content").value = post.content;

        form.action = "/posts/" + postId + "/edit";
        form.hidden = false;
        addCsrfToken(form);
        message.textContent = "";

    } catch (err) {
        message.textContent = "Unable to load post.";
    }
}

loadPost();
