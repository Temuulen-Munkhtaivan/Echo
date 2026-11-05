
const express = require("express");
const app = express();

const PORT = 3000;

app.get("/", (req, res) => {
    res.send("<h1>Echo</h1><p>Welcome to Echo!</p>");
});

app.listen(PORT, () => {
    console.log(`Echo is running at http://localhost:${PORT}`);
});
