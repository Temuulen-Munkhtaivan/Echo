async function updateNavigation() {
    let loggedIn = false;

    try {
        const response = await fetch("/me");
        loggedIn = response.ok;
    } catch (err) {
        console.error("Could not check login status:", err);
    }

    document.getElementById("createPostLink").hidden = !loggedIn;
    document.getElementById("logoutForm").hidden = !loggedIn;

    document.getElementById("loginLink").hidden = loggedIn;
    document.getElementById("registerLink").hidden = loggedIn;
}

updateNavigation();