
const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// GET USER NOTIFICATIONS
// =====================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const notificationsResult = await db.query(
            `SELECT *
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 30`,
            [userId]
        );

        const unreadResult = await db.query(
            `SELECT COUNT(*) AS unread_count
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );

        return res.json({
            notifications: notificationsResult.rows,
            unread_count: Number(unreadResult.rows[0].unread_count)
        });

    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error);

        return res.status(500).json({
            message: "Failed to retrieve notifications."
        });
    }
});

// =====================================
// MARK ONE NOTIFICATION AS READ
// =====================================
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        return res.json({
            message: "Notification marked as read."
        });

    } catch (error) {
        console.error("MARK NOTIFICATION ERROR:", error);

        return res.status(500).json({
            message: "Failed to update notification."
        });
    }
});

// =====================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================
router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        return res.json({
            message: "All notifications marked as read."
        });

    } catch (error) {
        console.error("MARK ALL NOTIFICATIONS ERROR:", error);

        return res.status(500).json({
            message: "Failed to update notifications."
        });
    }
});

module.exports = router;
