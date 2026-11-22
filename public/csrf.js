let csrfTokenRequest = null;
async function addCsrfToken(form) {
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');

    // Prevent submission until the token is ready
    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        // Request a CSRF token from the server
        if (!csrfTokenRequest) {
            csrfTokenRequest = fetch("/csrf-token", {
                cache: "no-store"
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to retrieve CSRF token.");
                }

                return response.json();
            })
            .catch(err => {
                csrfTokenRequest = null;
                throw err;
            });
        }

        const data = await csrfTokenRequest;

        // Add the token as a hidden form field
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "_csrf";
        input.value = data.csrfToken;

        form.appendChild(input);

        // The form is ready
        if (submitButton) {
            submitButton.disabled = false;
        }

    } catch (err) {
        console.error("CSRF error:", err);
        alert("Unable to prepare the form securely. Please refresh.");
    }
}