const { test, expect } = require("@playwright/test");

test("Homepage loads successfully", async ({ page }) => {
    // Open Echo's homepage
    const response = await page.goto("http://localhost:3000/");

    // Check that the server returned HTTP 200
    expect(response.status()).toBe(200);

    // Check that the homepage displays Echo
    await expect(page.locator("h1")).toContainText(/Echo/i);
});