const db = require("./database");

// Get the username from the terminal
const username = process.argv[2];

if (!username) {
    console.log("Please provide a username.");
    db.close();
} else {
    // Change the user's role to admin
    const sql = "UPDATE users SET role = 'admin' WHERE username = ?";

    db.run(sql, [username], function (err) {
        if (err) {
            console.error("Error updating role:", err.message);
            return db.close();
        }

        if (this.changes === 0) {
            console.log("User not found.");
            return db.close();
        }

        // Verify the new role
        db.get(
            "SELECT username, role FROM users WHERE username = ?",
            [username],
            (err, user) => {
                if (err) {
                    console.error("Verification error:", err.message);
                } else {
                    console.log(`${user.username} now has role: ${user.role}`);
                }

                db.close();
            }
        );
    });
}