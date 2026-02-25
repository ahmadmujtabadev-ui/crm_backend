// src/server.js (CommonJS)
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();

const PORT = process.env.PORT || 9200;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch((e) => {
    console.error("Failed to bootstrap", e);
    process.exit(1);
  });