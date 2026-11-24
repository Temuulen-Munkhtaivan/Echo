const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "echo-insecure.db"),
    (err) => {
        if (err) {
            console.error("Database error:", err.message);
            process.exit(1);
        }

        console.log("Connected to Echo database.");
    }
);

db.run("PRAGMA foreign_keys = ON");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    )
`, (err) => {
    if (err) {
        console.error("Error creating users table:", err.message);
        return;
    }

    console.log("Users table ready.");

    // Check whether the role column already exists
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error("Error checking users table:", err.message);
            return;
        }

        const hasRole = columns.some(column => column.name === "role");

        if (hasRole) {
            console.log("User roles ready.");
            return;
        }

        // Add the role column without deleting existing users
        db.run(`
            ALTER TABLE users
            ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
            CHECK (role IN ('user', 'admin'))
        `, (err) => {
            if (err) {
                console.error("Error adding user roles:", err.message);
            } else {
                console.log("User roles added.");
            }
        });
    });
});

db.run(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`, (err) => {
    if (err) {
        console.error("Error creating posts table:", err.message);
    } else {
        console.log("Posts table ready.");
    }
});

module.exports = db;
