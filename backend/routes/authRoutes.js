
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// PROFILE IMAGE UPLOAD SETUP
const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "profile"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only JPG, PNG, and WEBP images are allowed.")
            );
        }

        cb(null, true);
    }
});

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUsers = await db.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUsers.rows.length > 0) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (full_name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash
            ]
        );

        return res.status(201).json({
            message: "Account registered successfully!",
            user: {
                id: result.rows[0].id,
                full_name: full_name.trim(),
                email: normalizedEmail
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        return res.status(500).json({
            message: "Registration failed."
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await db.query(
            `SELECT id, full_name, email, password_hash, role
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed."
        });
    }
});

// GET PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, full_name, email, profile_image,
                    location, bio, role, created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User profile not found."
            });
        }

        return res.json({
            message: "Profile retrieved successfully!",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Failed to retrieve profile."
        });
    }
});

// UPDATE PROFILE
router.put(
    "/profile",
    authMiddleware,
    upload.single("profile_image"),
    async (req, res) => {
        try {
            const { full_name, location, bio } = req.body;

            if (!full_name || !full_name.trim()) {
                return res.status(400).json({
                    message: "Full name is required."
                });
            }

            const values = [
                full_name.trim(),
                location?.trim() || null,
                bio?.trim() || null
            ];

            let sql = `
                UPDATE users
                SET full_name = $1,
                    location = $2,
                    bio = $3
            `;

            if (req.file) {
                values.push(`/uploads/profile/${req.file.filename}`);
                sql += `, profile_image = $${values.length}`;
            }

            values.push(req.user.id);
            sql += ` WHERE id = $${values.length}`;

            await db.query(sql, values);

            const updatedUsers = await db.query(
                `SELECT id, full_name, email, profile_image,
                        location, bio, role, created_at
                 FROM users
                 WHERE id = $1`,
                [req.user.id]
            );

            if (updatedUsers.rows.length === 0) {
                return res.status(404).json({
                    message: "User profile not found."
                });
            }

            return res.json({
                message: "Profile updated successfully!",
                user: updatedUsers.rows[0]
            });

        } catch (error) {
            console.error("Update profile error:", error);

            return res.status(500).json({
                message: "Failed to update profile."
            });
        }
    }
);

// CHANGE PASSWORD
router.put("/change-password", authMiddleware, async (req, res) => {
    try {
        const {
            current_password,
            new_password,
            confirm_password
        } = req.body;

        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({
                message: "Please complete all password fields."
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                message: "New password must be at least 8 characters."
            });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({
                message: "New password and confirmation do not match."
            });
        }

        if (current_password === new_password) {
            return res.status(400).json({
                message: "New password must be different from current password."
            });
        }

        const result = await db.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        const passwordMatch = await bcrypt.compare(
            current_password,
            result.rows[0].password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        const newPasswordHash = await bcrypt.hash(new_password, 10);

        await db.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [newPasswordHash, req.user.id]
        );

        return res.json({
            message: "Password changed successfully!"
        });

    } catch (error) {
        console.error("Change password error:", error);

        return res.status(500).json({
            message: "Failed to change password."
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
