async function updateNavigation() {
    let loggedIn = false;
    let username = "";
    let role = "";

    try {
        const response = await fetch("/me", {
            cache: "no-store"
        });

        if (response.ok) {
            const user = await response.json();

            loggedIn = user.loggedIn === true;
            username = user.username || "";
            role = user.role || "";
        }

    } catch (err) {
        console.error("Could not check login status:", err);
    }

    // Links visible when logged in
    document.getElementById("createPostLink").hidden = !loggedIn;
    document.getElementById("logoutForm").hidden = !loggedIn;

    // Links visible when logged out
    document.getElementById("loginLink").hidden = loggedIn;
    document.getElementById("registerLink").hidden = loggedIn;

    // Display username
    const usernameDisplay = document.getElementById("usernameDisplay");

    if (usernameDisplay) {
        if (loggedIn) {
            usernameDisplay.textContent =
                username + (role === "admin" ? " (Admin)" : "");

            usernameDisplay.hidden = false;
        } else {
            usernameDisplay.textContent = "";
            usernameDisplay.hidden = true;
        }
    }
}

updateNavigation();