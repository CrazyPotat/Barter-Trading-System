
const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// GET ALL SENT AND RECEIVED PROPOSALS
// =====================================
router.get("/proposals", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [proposals] = await db.query(
            `SELECT
                tp.*,
                proposer.full_name AS proposer_name,
                receiver.full_name AS receiver_name,
                offered.title AS offered_item_title,
                offered.image AS offered_item_image,
                requested.title AS requested_item_title,
                requested.image AS requested_item_image
             FROM trade_proposals tp
             JOIN users proposer ON tp.proposer_id = proposer.id
             JOIN users receiver ON tp.receiver_id = receiver.id
             JOIN items offered ON tp.offered_item_id = offered.id
             JOIN items requested ON tp.requested_item_id = requested.id
             WHERE tp.proposer_id = ? OR tp.receiver_id = ?
             ORDER BY tp.created_at DESC`,
            [userId, userId]
        );

        res.json(proposals);

    } catch (error) {
        console.error("GET PROPOSALS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve trade proposals."
        });
    }
});


// =====================================
// SEND TRADE PROPOSAL
// =====================================
router.post("/proposals", authMiddleware, async (req, res) => {
    try {
        const proposerId = req.user.id;

        const {
            offered_item_id,
            requested_item_id,
            message
        } = req.body;

        if (!offered_item_id || !requested_item_id) {
            return res.status(400).json({
                message: "Please select both items."
            });
        }

        if (Number(offered_item_id) === Number(requested_item_id)) {
            return res.status(400).json({
                message: "You cannot trade an item for itself."
            });
        }

        // Check offered item
        const [offeredItems] = await db.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id = ?`,
            [offered_item_id]
        );

        if (
            offeredItems.length === 0 ||
            Number(offeredItems[0].user_id) !== Number(proposerId)
        ) {
            return res.status(403).json({
                message: "The offered item does not belong to you."
            });
        }

        if (offeredItems[0].status !== "Available") {
            return res.status(400).json({
                message: "Your offered item is not available."
            });
        }

        // Check requested item
        const [requestedItems] = await db.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id = ?`,
            [requested_item_id]
        );

        if (requestedItems.length === 0) {
            return res.status(404).json({
                message: "Requested item not found."
            });
        }

        const requestedItem = requestedItems[0];

        if (Number(requestedItem.user_id) === Number(proposerId)) {
            return res.status(400).json({
                message: "You cannot propose a trade for your own item."
            });
        }

        if (requestedItem.status !== "Available") {
            return res.status(400).json({
                message: "Requested item is no longer available."
            });
        }

        const receiverId = requestedItem.user_id;

        // Prevent duplicate pending proposals
        const [existing] = await db.query(
            `SELECT id
             FROM trade_proposals
             WHERE proposer_id = ?
             AND requested_item_id = ?
             AND status = 'Pending'`,
            [proposerId, requested_item_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "You already have a pending proposal for this item."
            });
        }

        const [result] = await db.query(
            `INSERT INTO trade_proposals
                (proposer_id, receiver_id, offered_item_id,
                 requested_item_id, message)
             VALUES (?, ?, ?, ?, ?)`,
            [
                proposerId,
                receiverId,
                offered_item_id,
                requested_item_id,
                message || null
            ]
        );
        // CREATE NOTIFICATION FOR RECEIVER
await db.query(
    `INSERT INTO notifications
        (user_id, title, message, notification_type)
     VALUES (?, ?, ?, ?)`,
    [
        receiverId,
        "New Trade Proposal",
        "Someone has sent you a trade proposal. Check your proposals!",
        "trade"
    ]
);

        res.status(201).json({
            message: "Trade proposal sent successfully!",
            proposal_id: result.insertId
        });

    } catch (error) {
        console.error("SEND PROPOSAL ERROR:", error);

        res.status(500).json({
            message: "Failed to send trade proposal."
        });
    }
});


// =====================================
// ACCEPT TRADE PROPOSAL
// =====================================
router.patch("/proposals/:id/accept", authMiddleware, async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const proposalId = req.params.id;
        const userId = req.user.id;

        const [proposals] = await connection.query(
            `SELECT *
             FROM trade_proposals
             WHERE id = ?
             FOR UPDATE`,
            [proposalId]
        );

        if (proposals.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Trade proposal not found."
            });
        }

        const proposal = proposals[0];

        if (Number(proposal.receiver_id) !== Number(userId)) {
            await connection.rollback();

            return res.status(403).json({
                message: "You are not authorized to accept this proposal."
            });
        }

        if (proposal.status !== "Pending") {
            await connection.rollback();

            return res.status(400).json({
                message: "This proposal is no longer pending."
            });
        }

        // Lock and verify both items
        const itemIds = [
            proposal.offered_item_id,
            proposal.requested_item_id
        ].sort((a, b) => a - b);

        const [items] = await connection.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id IN (?, ?)
             ORDER BY id
             FOR UPDATE`,
            itemIds
        );

        if (
            items.length !== 2 ||
            items.some(item => item.status !== "Available")
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "One or both items are no longer available."
            });
        }

        await connection.query(
            `UPDATE trade_proposals
             SET status = 'Accepted'
             WHERE id = ?`,
            [proposalId]
        );

        const [tradeResult] = await connection.query(
            `INSERT INTO trades (proposal_id, status)
             VALUES (?, 'Agreed')`,
            [proposalId]
        );
        await connection.query(
    `INSERT INTO trade_history
        (trade_id, actor_id, previous_status, new_status, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [
        tradeResult.insertId,
        userId,
        null,
        "Agreed",
        "Trade proposal accepted."
    ]
);

        await connection.commit();

        res.json({
            message: "Trade proposal accepted successfully!",
            trade_id: tradeResult.insertId,
            status: "Agreed"
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("ACCEPT PROPOSAL ERROR:", error);

        res.status(500).json({
            message: "Failed to accept trade proposal."
        });

    } finally {
        if (connection) connection.release();
    }
});


// =====================================
// DECLINE TRADE PROPOSAL
// =====================================
router.patch("/proposals/:id/decline", authMiddleware, async (req, res) => {
    try {
        const proposalId = req.params.id;
        const userId = req.user.id;

        const [result] = await db.query(
            `UPDATE trade_proposals
             SET status = 'Declined'
             WHERE id = ?
             AND receiver_id = ?
             AND status = 'Pending'`,
            [proposalId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Pending proposal not found or you are not authorized."
            });
        }

        res.json({
            message: "Trade proposal declined successfully!"
        });

    } catch (error) {
        console.error("DECLINE PROPOSAL ERROR:", error);

        res.status(500).json({
            message: "Failed to decline trade proposal."
        });
    }
});

// =====================================
// UPDATE TRADE STATUS
// =====================================
router.patch("/:id/status", authMiddleware, async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const tradeId = req.params.id;
        const userId = req.user.id;
        const { status, remarks } = req.body;

        if (!["Exchanged", "Completed"].includes(status)) {
            await connection.rollback();
            return res.status(400).json({
                message: "Invalid trade status."
            });
        }

        // Check trade and its participants
        const [trades] = await connection.query(
            `SELECT
                t.id,
                t.status,
                tp.proposer_id,
                tp.receiver_id
             FROM trades t
             JOIN trade_proposals tp
                ON t.proposal_id = tp.id
             WHERE t.id = ?
             FOR UPDATE`,
            [tradeId]
        );

        if (trades.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Trade not found."
            });
        }

        const trade = trades[0];

        const isParticipant =
            Number(trade.proposer_id) === Number(userId) ||
            Number(trade.receiver_id) === Number(userId);

        if (!isParticipant) {
            await connection.rollback();
            return res.status(403).json({
                message: "You are not part of this trade."
            });
        }

        // First confirmation: Agreed -> Exchanged
        if (status === "Exchanged") {
            if (trade.status !== "Agreed") {
                await connection.rollback();
                return res.status(400).json({
                    message: "Only agreed trades can be marked as exchanged."
                });
            }
        }

        // Second confirmation: Exchanged -> Completed
        if (status === "Completed") {
            if (trade.status !== "Exchanged") {
                await connection.rollback();
                return res.status(400).json({
                    message: "Trade must be marked Exchanged first."
                });
            }

            // Require the other participant to confirm
            const [previousUpdates] = await connection.query(
                `SELECT actor_id
                 FROM trade_history
                 WHERE trade_id = ?
                 AND new_status = 'Exchanged'
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1`,
                [tradeId]
            );

            if (
                previousUpdates.length === 0 ||
                Number(previousUpdates[0].actor_id) === Number(userId)
            ) {
                await connection.rollback();
                return res.status(400).json({
                    message: "The other participant must confirm the completion."
                });
            }
        }

        const previousStatus = trade.status;

        await connection.query(
            `UPDATE trades
             SET status = ?,
                 completed_at = CASE
                    WHEN ? = 'Completed' THEN CURRENT_TIMESTAMP
                    ELSE completed_at
                 END
             WHERE id = ?`,
            [status, status, tradeId]
        );

        await connection.query(
            `INSERT INTO trade_history
                (trade_id, actor_id, previous_status, new_status, remarks)
             VALUES (?, ?, ?, ?, ?)`,
            [
                tradeId,
                userId,
                previousStatus,
                status,
                remarks || null
            ]
        );

        await connection.commit();

        res.json({
            message: `Trade status updated to ${status}!`,
            trade_id: tradeId,
            previous_status: previousStatus,
            status
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("UPDATE TRADE STATUS ERROR:", error);

        res.status(500).json({
            message: "Failed to update trade status."
        });

    } finally {
        if (connection) connection.release();
    }
});
// =====================================
// GET TRADE HISTORY
// =====================================
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [history] = await db.query(
            `SELECT
                th.id AS history_id,
                th.trade_id,
                th.actor_id,
                tp.proposer_id,
                tp.receiver_id,
                th.previous_status,
                th.new_status,
                th.remarks,
                th.created_at,
                t.status AS current_status,
                proposer.full_name AS proposer_name,
                receiver.full_name AS receiver_name,
                offered.title AS offered_item_title,
                requested.title AS requested_item_title
             FROM trade_history th
             JOIN trades t ON th.trade_id = t.id
             JOIN trade_proposals tp ON t.proposal_id = tp.id
             JOIN users proposer ON tp.proposer_id = proposer.id
             JOIN users receiver ON tp.receiver_id = receiver.id
             JOIN items offered ON tp.offered_item_id = offered.id
             JOIN items requested ON tp.requested_item_id = requested.id
             WHERE tp.proposer_id = ? OR tp.receiver_id = ?
             ORDER BY th.created_at DESC`,
            [userId, userId]
        );

        res.json(history);

    } catch (error) {
        console.error("GET TRADE HISTORY ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve trade history."
        });
    }
});

module.exports = router;
