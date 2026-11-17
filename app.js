const express = require("express");
const app = express();

const PORT = 3000;

// Serve HTML and CSS files from the public folder.
app.use(express.static("public"));

app.listen(PORT, () => {
    console.log(`Echo is running at http://localhost:${PORT}`);
});
