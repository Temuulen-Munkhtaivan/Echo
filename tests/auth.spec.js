const { test, expect } = require("@playwright/test");

test("Unauthenticated users cannot create posts", async ({ request }) => {
    // Get a valid CSRF token for an anonymous session
    const tokenResponse = await request.get(
        "http://localhost:3000/csrf-token"
    );

    expect(tokenResponse.status()).toBe(200);

    const { csrfToken } = await tokenResponse.json();

    // Attempt to create a post without logging in
    const postResponse = await request.post(
        "http://localhost:3000/posts",
        {
            headers: {
                Accept: "application/json"
            },
            form: {
                title: "Unauthorized test post",
                content: "This post should never be created.",
                _csrf: csrfToken
            }
        }
    );

    // Verify the server rejects the request
    expect(postResponse.status()).toBe(401);

    // Verify the authentication error message
    expect(await postResponse.text()).toContain("Please log in.");
});

test("Post creation without a CSRF token is rejected", async ({ request }) => {
    // Create an anonymous session with a CSRF token
    const tokenResponse = await request.get(
        "http://localhost:3000/csrf-token"
    );

    expect(tokenResponse.status()).toBe(200);

    // Attempt to create a post without submitting the token
    const postResponse = await request.post(
        "http://localhost:3000/posts",
        {
            headers: {
                Accept: "application/json"
            },
            form: {
                title: "Missing CSRF test",
                content: "This post should never be created."
            }
        }
    );

    // Verify the CSRF protection rejects the request
    expect(postResponse.status()).toBe(403);
});