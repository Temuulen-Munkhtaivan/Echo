require("dotenv").config();
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const path = require("node:path");
const helmet = require("helmet");
const sqliteStoreModule = require("express-session-sqlite");
const SQLiteStore = (
    sqliteStoreModule.default || sqliteStoreModule
)(session);

const db = require("./database");
const bcrypt = require("bcrypt");
const app = express();
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            upgradeInsecureRequests:
                process.env.NODE_ENV === "production" ? [] : null
        }
    },
    strictTransportSecurity: process.env.NODE_ENV === "production"
}));
const { randomBytes, timingSafeEqual } = require("node:crypto");
const PORT = 3000;
const { rateLimit } = require("express-rate-limit");

app.use(express.urlencoded({ extended: false }));
const sessionSecret = process.env.ECHO_SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("Missing or weak ECHO_SESSION_SECRET.");
}

// Session expiry: 30 minutes
const SESSION_TTL = 30 * 60 * 1000;

// Store sessions in a separate SQLite database
const sessionStore = new SQLiteStore({
    driver: sqlite3.Database,
    path: path.join(__dirname, "sessions.db"),
    ttl: SESSION_TTL,
    cleanupInterval: 5 * 60 * 1000
});

// Configure session management
app.use(session({
    store: sessionStore,
    name: "echo.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_TTL
    }
}));
// Prevent logged-out users from opening the Create Post page
app.get("/create-post.html", (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect("/login.html");
    }

    next();
});

// Serve HTML and CSS files from the public folder.
app.use(express.static("public"));
// Validate CSRF tokens on requests that change data
app.use((req, res, next) => {
    const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

    // GET requests don't need CSRF validation
    if (!protectedMethods.includes(req.method)) {
        return next();
    }

    const submittedToken = req.body?._csrf;
    const sessionToken = req.session?.csrfToken;

    // Tokens must be 64-character hexadecimal strings
    const validTokenFormat = /^[a-f0-9]{64}$/;

    if (
        typeof submittedToken !== "string" ||
        typeof sessionToken !== "string" ||
        !validTokenFormat.test(submittedToken) ||
        !validTokenFormat.test(sessionToken)
    ) {
        return res.status(403).send("Invalid CSRF token.");
    }

    // Compare the tokens securely
    const submittedBuffer = Buffer.from(submittedToken, "hex");
    const sessionBuffer = Buffer.from(sessionToken, "hex");

    if (!timingSafeEqual(submittedBuffer, sessionBuffer)) {
        return res.status(403).send("Invalid CSRF token.");
    }

    next();
});
function formSuccess(req, res, redirectPath, status, message) {
    const isBrowserForm = (req.get("Accept") || "").includes("text/html");

    if (isBrowserForm) {
        return res.redirect(303, redirectPath);
    }

    return res.status(status).send(message);
}
// Limit repeated registration attempts
const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many registration attempts. Please try again in 15 minutes."
});

app.post("/register", registrationLimiter, async (req, res) => {
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

            formSuccess(req, res, "/login.html", 201, "Registration successful!");
        });

    } catch (err) {
        console.error("Password hashing error:", err.message);
        res.status(500).send("Registration failed.");
    }
});
// Limit repeated failed login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many login attempts. Please try again in 15 minutes."
});
app.post("/login", loginLimiter, (req, res) => {
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

                    formSuccess(req, res, "/", 200, "Login successful!");
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

    // Retrieve the logged-in user's role
    const sql = "SELECT id, username, role FROM users WHERE id = ?";

    db.get(sql, [req.session.userId], (err, user) => {
        if (err) {
            console.error("User lookup error:", err.message);
            return res.status(500).send("Failed to retrieve user.");
        }

        if (!user) {
            return res.status(401).send("Please log in.");
        }

        res.json({
            loggedIn: true,
            userId: user.id,
            username: user.username,
            role: user.role
        });
    });
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err.message);
            return res.status(500).send("Logout failed.");
        }

        res.clearCookie("echo.sid");
        res.redirect(303, "/");
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
    res.redirect("/posts.html");
});

// Create a new post
app.post("/posts", (req, res) => {
    // Only logged-in users can create posts
    if (!req.session.userId) {
        const isBrowserForm = (req.get("Accept") || "").includes("text/html");

        if (isBrowserForm) {
            return res.redirect(303, "/login.html");
        }

        return res.status(401).send("Please log in.");
    }

    const { title, content } = req.body || {};

    // Validate the submitted information
    if (
        typeof title !== "string" ||
        typeof content !== "string"
    ) {
        return res.status(400).send("Invalid post details.");
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (
        cleanTitle.length === 0 ||
        cleanTitle.length > 120 ||
        cleanContent.length === 0 ||
        cleanContent.length > 5000
    ) {
        return res.status(400).send("Invalid post details.");
    }

    // Save the post using the logged-in user's ID
    const sql = `
        INSERT INTO posts (user_id, title, content)
        VALUES (?, ?, ?)
    `;

    db.run(
        sql,
        [req.session.userId, cleanTitle, cleanContent],
        function (err) {
            if (err) {
                console.error("Post creation error:", err.message);
                return res.status(500).send("Failed to create post.");
            }

            formSuccess(req, res, "/", 201, "Post published successfully!");
        }
    );
});

// Retrieve published posts
app.get("/posts", (req, res) => {
    const sql = `
        SELECT
            posts.id,
            posts.user_id,
            posts.title,
            posts.content,
            posts.created_at,
            users.username AS author
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY posts.id DESC
    `;

    db.all(sql, [], (err, posts) => {
        if (err) {
            console.error("Error retrieving posts:", err.message);
            return res.status(500).send("Failed to load posts.");
        }

        res.json(posts);
    });
});

// Edit an existing post
app.post("/posts/:id/edit", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send("Please log in.");
    }

    const postId = Number(req.params.id);
    const { title, content } = req.body || {};

    // Validate the post ID
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(400).send("Invalid post ID.");
    }

    // Validate the submitted information
    if (
        typeof title !== "string" ||
        typeof content !== "string"
    ) {
        return res.status(400).send("Invalid post details.");
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (
        cleanTitle.length === 0 ||
        cleanTitle.length > 120 ||
        cleanContent.length === 0 ||
        cleanContent.length > 5000
    ) {
        return res.status(400).send("Invalid post details.");
    }

    const sql = `
        UPDATE posts
        SET title = ?, content = ?
        WHERE id = ? AND user_id = ?
    `;

    db.run(
        sql,
        [cleanTitle, cleanContent, postId, req.session.userId],
        function (err) {
            if (err) {
                console.error("Post update error:", err.message);
                return res.status(500).send("Failed to update post.");
            }

            if (this.changes === 0) {
                return res.status(404).send("Post not found or access denied.");
            }

            formSuccess(req, res, "/", 200, "Post updated successfully!");
        }
    );
});

app.post("/posts/:id/delete", (req, res) => {
    // User must be logged in
    if (!req.session.userId) {
        return res.status(401).send("Please log in.");
    }

    const postId = Number(req.params.id);

    // Validate the post ID
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(400).send("Invalid post ID.");
    }

    // Delete only if the post belongs to this user
    const sql = "DELETE FROM posts WHERE id = ? AND user_id = ?";

    db.run(sql, [postId, req.session.userId], function (err) {
        if (err) {
            console.error("Delete post error:", err.message);
            return res.status(500).send("Failed to delete post.");
        }

        if (this.changes === 0) {
            return res.status(404).send("Post not found or access denied.");
        }

        formSuccess(req, res, "/posts.html", 200, "Post deleted successfully!");
    });
});

app.post("/admin/posts/:id/delete", requireAdmin, (req, res) => {
    const postId = Number(req.params.id);

    // Validate the post ID
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(400).send("Invalid post ID.");
    }

    // Admins can delete any post
    const sql = "DELETE FROM posts WHERE id = ?";

    db.run(sql, [postId], function (err) {
        if (err) {
            console.error("Admin delete error:", err.message);
            return res.status(500).send("Failed to delete post.");
        }

        if (this.changes === 0) {
            return res.status(404).send("Post not found.");
        }

        res.redirect("/posts.html");
    });
});

app.get("/csrf-token", (req, res) => {
    // Generate a token if this session doesn't have one
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(32).toString("hex");
    }

    // Prevent browsers from caching the token
    res.setHeader("Cache-Control", "no-store");

    // Save the token in the user's session
    req.session.save((err) => {
        if (err) {
            console.error("CSRF session error:", err.message);
            return res.status(500).send("Failed to generate CSRF token.");
        }

        res.json({
            csrfToken: req.session.csrfToken
        });
    });
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Echo is running at http://localhost:${PORT}`);
});
