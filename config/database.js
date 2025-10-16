const mongoose = require('mongoose');
require('dotenv').config(); // Load variables from .env

// Use environment variable if available, otherwise fall back to local DB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mini_project2";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Database connected successfully"))
  .catch(err => console.error("❌ Database connection error:", err));

const db = mongoose.connection;
module.exports = db;