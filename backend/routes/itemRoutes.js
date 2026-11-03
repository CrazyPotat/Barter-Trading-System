const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary image storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "barterhub/items",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        resource_type: "image"
    }
});

// Image upload configuration
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
    ? req.file.path
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
// Get available items owned by the logged-in user
router.get("/my-items", authMiddleware, async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT
                items.*,
                categories.category_name AS category_name,
                users.full_name AS owner_name
             FROM items
             LEFT JOIN categories
                ON items.category_id = categories.id
             JOIN users
                ON items.user_id = users.id
             WHERE items.user_id = ?
             AND items.status = 'Available'
             ORDER BY items.created_at DESC`,
            [req.user.id]
        );

        res.json(items);
    } catch (error) {
        console.error("Get my items error:", error);

        res.status(500).json({
            message: "Failed to retrieve your items."
        });
    }
});

// Update an item owned by the logged-in user
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            category_id,
            condition_status,
            location,
            desired_exchange
        } = req.body;

        if (
            !title?.trim() ||
            !description?.trim() ||
            !category_id ||
            !condition_status ||
            !location?.trim() ||
            !desired_exchange?.trim()
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        const validConditions = [
            "New",
            "Like New",
            "Good",
            "Fair",
            "Poor"
        ];

        if (!validConditions.includes(condition_status)) {
            return res.status(400).json({
                message: "Invalid item condition."
            });
        }

        const [result] = await db.query(
            `UPDATE items
             SET
                category_id = ?,
                title = ?,
                description = ?,
                condition_status = ?,
                location = ?,
                desired_exchange = ?
             WHERE id = ?
             AND user_id = ?
             AND status = 'Available'`,
            [
                category_id,
                title.trim(),
                description.trim(),
                condition_status,
                location.trim(),
                desired_exchange.trim(),
                id,
                req.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Item not found, not owned by you, or unavailable for editing."
            });
        }

        res.json({
            message: "Item updated successfully!"
        });
    } catch (error) {
        console.error("Update item error:", error);

        res.status(500).json({
            message: "Failed to update item."
        });
    }
});


// Soft-delete an item owned by the logged-in user
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE items
             SET status = 'Inactive'
             WHERE id = ?
             AND user_id = ?
             AND status = 'Available'`,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Item not found, not owned by you, or unavailable for deletion."
            });
        }

        res.json({
            message: "Item deleted successfully!"
        });
    } catch (error) {
        console.error("Delete item error:", error);

        res.status(500).json({
            message: "Failed to delete item."
        });
    }
});

module.exports = router;
