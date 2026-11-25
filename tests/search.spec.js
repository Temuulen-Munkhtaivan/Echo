const { test, expect } = require("@playwright/test");

test("Search shows a message when no posts match", async ({ page }) => {
    const searchTerm = "zz-playwright-no-match-847291";

    // Open Echo's search page
    await page.goto("http://localhost:3000/search");

    // Enter a search term
    await page.getByLabel("Search term").fill(searchTerm);

    // Submit the search form
    await page.getByRole("button", { name: "Search" }).click();

    // Verify the correct search URL
    await expect(page).toHaveURL(
        `http://localhost:3000/search?q=${searchTerm}`
    );

    // Verify the application displays the search term
    await expect(
        page.getByText(`Search results for: ${searchTerm}`)
    ).toBeVisible();

    // Verify the no-results message
    await expect(
        page.getByText("No matching posts found.")
    ).toBeVisible();
});