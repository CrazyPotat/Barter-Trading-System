
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CLOUDINARY CONFIGURATION
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// CLOUDINARY IMAGE STORAGE
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "barterhub/items",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        resource_type: "image"
    }
});

// IMAGE UPLOAD CONFIGURATION
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

// GET ALL CATEGORIES
router.get("/categories", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                category_name AS name
             FROM categories
             ORDER BY category_name ASC`
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("Categories error:", error);

        return res.status(500).json({
            message: "Failed to load categories."
        });
    }
});

// GET ALL AVAILABLE ITEMS
router.get("/", async (req, res) => {
    try {
        const result = await db.query(`
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

        return res.json(result.rows);

    } catch (error) {
        console.error("Get items error:", error);

        return res.status(500).json({
            message: "Failed to load items."
        });
    }
});

// ADD A NEW ITEM
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

            const image = req.file ? req.file.path : null;

            const result = await db.query(
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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Available')
                RETURNING id`,
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

            return res.status(201).json({
                message: "Item posted successfully!",
                item_id: result.rows[0].id,
                image
            });

        } catch (error) {
            console.error("Add item error:", error);

            return res.status(500).json({
                message: "Failed to post item."
            });
        }
    }
);

// GET AVAILABLE ITEMS OWNED BY LOGGED-IN USER
router.get("/my-items", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                items.*,
                categories.category_name AS category_name,
                users.full_name AS owner_name
             FROM items
             LEFT JOIN categories
                ON items.category_id = categories.id
             JOIN users
                ON items.user_id = users.id
             WHERE items.user_id = $1
             AND items.status = 'Available'
             ORDER BY items.created_at DESC`,
            [req.user.id]
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("Get my items error:", error);

        return res.status(500).json({
            message: "Failed to retrieve your items."
        });
    }
});

// UPDATE AN ITEM
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

        const result = await db.query(
            `UPDATE items
             SET
                category_id = $1,
                title = $2,
                description = $3,
                condition_status = $4,
                location = $5,
                desired_exchange = $6
             WHERE id = $7
             AND user_id = $8
             AND status = 'Available'
             RETURNING id`,
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

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Item not found, not owned by you, or unavailable for editing."
            });
        }

        return res.json({
            message: "Item updated successfully!"
        });

    } catch (error) {
        console.error("Update item error:", error);

        return res.status(500).json({
            message: "Failed to update item."
        });
    }
});

// SOFT DELETE AN ITEM
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `UPDATE items
             SET status = 'Inactive'
             WHERE id = $1
             AND user_id = $2
             AND status = 'Available'
             RETURNING id`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Item not found, not owned by you, or unavailable for deletion."
            });
        }

        return res.json({
            message: "Item deleted successfully!"
        });

    } catch (error) {
        console.error("Delete item error:", error);

        return res.status(500).json({
            message: "Failed to delete item."
        });
    }
});

// HANDLE UPLOAD ERRORS
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            message: error.code === "LIMIT_FILE_SIZE"
                ? "Image must not exceed 5MB."
                : error.message
        });
    }

    if (error) {
        return res.status(400).json({
            message: error.message
        });
    }

    next();
});

module.exports = router;
