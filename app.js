const express = require("express");
require("./database");
const db = require("./database");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.urlencoded({ extended: false }));
const PORT = 3000;

// Serve HTML and CSS files from the public folder.
app.use(express.static("public"));

app.post("/register", async (req, res) => {
    const { username, email, password } = req.body || {};

    // Check the submitted information
    if (
        typeof username !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).send("Invalid registration details.");
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
        return res.status(400).send("Invalid username.");
    }

    if (
        cleanEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
        return res.status(400).send("Invalid email address.");
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(400).send("Invalid password length.");
    }

    try {
        // Hash the password before saving it
        const passwordHash = await bcrypt.hash(password, 12);

        const sql = `
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `;

        db.run(sql, [cleanUsername, cleanEmail, passwordHash], (err) => {
            if (err) {
                if (err.code === "SQLITE_CONSTRAINT") {
                    return res.status(409).send("Username or email already exists.");
                }

                console.error("Registration database error:", err.message);
                return res.status(500).send("Registration failed.");
            }

            res.status(201).send("Registration successful!");
        });

    } catch (err) {
        console.error("Password hashing error:", err.message);
        res.status(500).send("Registration failed.");
    }
});

app.listen(PORT, () => {
    console.log(`Echo is running at http://localhost:${PORT}`);
});
