const express = require("express");
const db = require("./database");
const bcrypt = require("bcrypt");
const app = express();
const session = require("express-session");
const { randomBytes } = require("node:crypto");
const PORT = 3000;

app.use(express.urlencoded({ extended: false }));
// Generate a secret for local development
const sessionSecret = process.env.ECHO_SESSION_SECRET ||
    randomBytes(32).toString("hex");

// Configure session management
app.use(session({
    name: "echo.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 30 * 60 * 1000
    }
}));
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
app.post("/login", (req, res) => {
    const { email, password } = req.body || {};

    // Validate the submitted information
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        email.length > 254 ||
        password.length < 12 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(401).send("Invalid email or password.");
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the user in the database
    const sql = "SELECT * FROM users WHERE email = ?";

    db.get(sql, [cleanEmail], async (err, user) => {
        if (err) {
            console.error("Login database error:", err.message);
            return res.status(500).send("Login failed.");
        }

        if (!user) {
            return res.status(401).send("Invalid email or password.");
        }

        try {
            // Compare the password with the stored hash
            const passwordMatches = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!passwordMatches) {
                return res.status(401).send("Invalid email or password.");
            }

            // Create a fresh session after successful login
            req.session.regenerate((err) => {
                if (err) {
                    console.error("Session error:", err.message);
                    return res.status(500).send("Login failed.");
                }

                // Remember the logged-in user's ID
                req.session.userId = user.id;

                req.session.save((err) => {
                    if (err) {
                        console.error("Session save error:", err.message);
                        return res.status(500).send("Login failed.");
                    }

                    res.send("Login successful!");
                });
            });

        } catch (err) {
            console.error("Password verification error:", err.message);
            res.status(500).send("Login failed.");
        }
    });
});

app.get("/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send("Please log in.");
    }

    res.json({
        loggedIn: true,
        userId: req.session.userId
    });
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err.message);
            return res.status(500).send("Logout failed.");
        }

        res.clearCookie("echo.sid");
        res.redirect("/login.html");
    });
});

// Check whether the logged-in user is an administrator
function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).send("Please log in.");
    }

    const sql = "SELECT role FROM users WHERE id = ?";

    db.get(sql, [req.session.userId], (err, user) => {
        if (err) {
            console.error("Authorization error:", err.message);
            return res.status(500).send("Unable to verify permissions.");
        }

        if (!user || user.role !== "admin") {
            return res.status(403).send("Access denied.");
        }

        next();
    });
}

// Administrator-only route
app.get("/admin", requireAdmin, (req, res) => {
    res.send("Welcome to the Echo Admin Area!");
});

app.listen(PORT, () => {
    console.log(`Echo is running at http://localhost:${PORT}`);
});
