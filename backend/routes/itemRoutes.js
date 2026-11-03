
const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Image upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(
            null,
            uniqueName + path.extname(file.originalname).toLowerCase()
        );
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

// Get all categories
router.get("/categories", async (req, res) => {
    try {
        const [categories] = await db.query(
    `SELECT
        id,
        category_name AS name
     FROM categories
     ORDER BY category_name ASC`
);

        res.json(categories);
    } catch (error) {
        console.error("Categories error:", error);

        res.status(500).json({
            message: "Failed to load categories."
        });
    }
});


// Get available items
router.get("/", async (req, res) => {
    try {
        const [items] = await db.query(`
            SELECT
                items.*,
                categories.category_name AS category_name,
                users.full_name AS owner_name
            FROM items
            LEFT JOIN categories
                ON items.category_id = categories.id
            JOIN users
                ON items.user_id = users.id
            WHERE items.status = 'Available'
            ORDER BY items.created_at DESC
        `);

        res.json(items);
    } catch (error) {
        console.error("Get items error:", error);

        res.status(500).json({
            message: "Failed to load items.",
            error: error.message
        });
    }
});


// Add a new item (login required)
router.post(
    "/",
    authMiddleware,
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                title,
                description,
                category_id,
                condition_status,
                location,
                desired_exchange
            } = req.body;

            if (
                !title ||
                !description ||
                !category_id ||
                !condition_status ||
                !location ||
                !desired_exchange
            ) {
                return res.status(400).json({
                    message: "Please complete all required fields."
                });
            }

            const image = req.file
                ? `/uploads/${req.file.filename}`
                : null;

            const [result] = await db.query(
                `INSERT INTO items
                (
                    user_id,
                    category_id,
                    title,
                    description,
                    condition_status,
                    image,
                    location,
                    desired_exchange,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
                [
                    req.user.id,
                    category_id,
                    title.trim(),
                    description.trim(),
                    condition_status,
                    image,
                    location.trim(),
                    desired_exchange.trim()
                ]
            );

            res.status(201).json({
                message: "Item posted successfully!",
                item_id: result.insertId,
                image
            });
        } catch (error) {
            console.error("Add item error:", error);

            res.status(500).json({
                message: "Failed to post item."
            });
        }
    }
);

module.exports = router;
