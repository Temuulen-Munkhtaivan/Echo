async function loadRecentPosts() {
    const container = document.getElementById("recent-posts");

    try {
        const response = await fetch("/posts");

        if (!response.ok) {
            throw new Error("Failed to load posts");
        }

        const posts = await response.json();

        container.replaceChildren();

        if (posts.length === 0) {
            const message = document.createElement("p");

            message.textContent =
                "No posts yet. Be the first to share!";

            container.appendChild(message);
            return;
        }

        // Display the three newest posts
        posts.slice(0, 3).forEach(post => {
            const article = document.createElement("article");

            const title = document.createElement("h2");
            title.textContent = post.title;

            const author = document.createElement("p");
            author.textContent = `Posted by ${post.author}`;

            const content = document.createElement("p");

            content.textContent =
                post.content.length > 180
                    ? post.content.slice(0, 180) + "..."
                    : post.content;

            article.appendChild(title);
            article.appendChild(author);
            article.appendChild(content);

            container.appendChild(article);
        });

    } catch (err) {
        console.error("Error loading posts:", err);

        container.textContent = "Unable to load posts.";
    }
}

loadRecentPosts();