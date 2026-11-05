
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./config/db");

const app = express();

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

// =====================================
// HOME API
// =====================================
app.get("/", (req, res) => {
    res.json({
        message: "Barter Trading System API is running!"
    });
});

// =====================================
// DATABASE CONNECTION TEST
// =====================================
app.get("/api/test-db", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT current_database() AS database_name"
        );

        return res.json({
            message: "Database connected successfully!",
            database: result.rows[0].database_name
        });

    } catch (error) {
        console.error("FULL DATABASE ERROR:", error);

        return res.status(500).json({
            message: "Database connection failed.",
            error: error.message
        });
    }
});

// =====================================
// START SERVER
// =====================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
