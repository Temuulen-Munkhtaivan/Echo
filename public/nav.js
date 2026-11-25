async function updateNavigation() {
    let loggedIn = false;

    try {
        const response = await fetch("/me", {
            cache: "no-store"
        });

        if (response.ok) {
            const user = await response.json();
            loggedIn = user.loggedIn === true;
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
}

updateNavigation();