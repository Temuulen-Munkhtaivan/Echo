const { test, expect } = require("@playwright/test");

test("Login form rejects an invalid email", async ({ page }) => {
    // Open the login page
    await page.goto("http://localhost:3000/login.html");

    // Enter an invalid email and a password
    await page.locator("#email").fill("not-an-email");
    await page.locator("#password").fill("ValidPassword123!");

    // Attempt to submit the form
    await page.getByRole("button", { name: "Log In" }).click();

    // Verify the browser stays on the login page
    await expect(page).toHaveURL("http://localhost:3000/login.html");

    // Verify the email field reports a format error
    const invalidEmail = await page.locator("#email").evaluate(
        input => input.validity.typeMismatch
    );

    expect(invalidEmail).toBe(true);
});