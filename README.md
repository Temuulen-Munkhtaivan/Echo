# Echo — Insecure Branch

Echo is a simple blogging website built for my Secure Application Programming project at the National College of Ireland.

This branch is used to demonstrate and compare weaker security controls with the secure version.

## Features

- User registration, login, and logout
- Create, view, edit, and delete posts
- Homepage with recent posts
- Admin role for post moderation

## Security Differences

Unlike the secure branch, this version does not include CSRF token validation, login rate limiting, or Helmet/CSP protection. It also uses in-memory sessions instead of persistent SQLite sessions.

Some protections, including bcrypt password hashing and parameterized SQL queries, are still present.

The detailed comparison will be covered in the project report.

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Start the application:

```bash
node app.js
```

3. Open http://127.0.0.1:3000

This branch uses a separate local database, `echo-insecure.db`.

**Warning:** This version is intended for local security testing only. Do not deploy it publicly or commit real credentials.