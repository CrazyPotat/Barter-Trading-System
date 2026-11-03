
const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET USER NOTIFICATIONS
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [notifications] = await db.query(
            `SELECT *
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 30`,
            [userId]
        );

        const [unread] = await db.query(
            `SELECT COUNT(*) AS unread_count
             FROM notifications
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        res.json({
            notifications,
            unread_count: unread[0].unread_count
        });

    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve notifications."
        });
    }
});

// MARK ONE NOTIFICATION AS READ
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE notifications
             SET is_read = 1
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        res.json({
            message: "Notification marked as read."
        });

    } catch (error) {
        console.error("MARK NOTIFICATION ERROR:", error);

        res.status(500).json({
            message: "Failed to update notification."
        });
    }
});

// MARK ALL NOTIFICATIONS AS READ
router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications
             SET is_read = 1
             WHERE user_id = ? AND is_read = 0`,
            [req.user.id]
        );

        res.json({
            message: "All notifications marked as read."
        });

    } catch (error) {
        console.error("MARK ALL NOTIFICATIONS ERROR:", error);

        res.status(500).json({
            message: "Failed to update notifications."
        });
    }
});

module.exports = router;
