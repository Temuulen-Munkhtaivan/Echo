const { test, expect } = require("@playwright/test");

test("Posts page and post list load successfully", async ({ page, request }) => {
    // Open the posts page
    const pageResponse = await page.goto(
        "http://localhost:3000/posts.html"
    );

    // Verify the page loads successfully
    expect(pageResponse.status()).toBe(200);

    // Verify the page heading
    await expect(
        page.getByRole("heading", { name: "Echo Posts" })
    ).toBeVisible();

    // Request the posts from the Express API
    const postsResponse = await request.get(
        "http://localhost:3000/posts"
    );

    // Verify the API responds successfully
    expect(postsResponse.status()).toBe(200);

    // Verify the API returns a list of posts
    const posts = await postsResponse.json();

    expect(Array.isArray(posts)).toBe(true);
});