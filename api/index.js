// api/index.js (CommonJS)
const app = require("../app");
const connectDB = require("../config/db");
let dbConnection;

module.exports = async function handler(req, res) {
  if (req.url && req.url.includes("favicon")) {
    return res.status(204).end();
  }

  if (req.url === "/" && req.method === "GET") {
    return res.status(200).json({
      message: "API is running",
      status: "ok",
    });
  }

  try {
    if (!dbConnection) {
      dbConnection = connectDB();
    }
    await dbConnection;
  } catch (error) {
    console.error("Database connection failed:", error);
    return res.status(500).json({
      error: "Database connection issues failed",
    });
  }

  return app(req, res);
};