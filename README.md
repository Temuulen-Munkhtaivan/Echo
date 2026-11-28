# Echo — Secure Branch

Echo is a simple blogging website built for my Secure Application Programming project at the National College of Ireland. This branch focuses on protecting user accounts, posts, and sessions.

## Features

- User registration, login, and logout
- Create, view, edit, and delete posts
- Homepage with recent posts
- Admin role for post moderation

## Security

The secure version uses bcrypt password hashing, parameterized SQL queries, access controls, CSRF tokens, login rate limiting, secure HTTP headers (Helmet/CSP), and SQLite-backed sessions.

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with an `ECHO_SESSION_SECRET`. Generate a random value using:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

3. Start the application:

```bash
node app.js
```

4. Open http://localhost:3000

To give a registered test user admin access, run:

```bash
node set-admin.js USERNAME
```

**Note:** Keep `.env` and database files out of Git.