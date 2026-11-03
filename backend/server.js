
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");

const app = express();
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use(cors());
app.use(express.json());

// Serve uploaded item images
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/notifications", notificationRoutes);
const PORT = process.env.PORT || 5000;

// Home API
app.get("/", (req, res) => {
    res.json({
        message: "Barter Trading System API is running!"
    });
});

// Database connection test
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            message: "Database connected successfully!",
            database: rows[0].database_name
        });

    } catch (error) {
    console.error("FULL DATABASE ERROR:", error);

    res.status(500).json({
        message: "Database connection failed.",
        error: error.message
    });
}
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
