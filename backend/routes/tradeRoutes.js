
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

        const result = await db.query(
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
             WHERE tp.proposer_id = $1 OR tp.receiver_id = $1
             ORDER BY tp.created_at DESC`,
            [userId]
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("GET PROPOSALS ERROR:", error);

        return res.status(500).json({
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

        const offeredResult = await db.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id = $1`,
            [offered_item_id]
        );

        if (
            offeredResult.rows.length === 0 ||
            Number(offeredResult.rows[0].user_id) !== Number(proposerId)
        ) {
            return res.status(403).json({
                message: "The offered item does not belong to you."
            });
        }

        if (offeredResult.rows[0].status !== "Available") {
            return res.status(400).json({
                message: "Your offered item is not available."
            });
        }

        const requestedResult = await db.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id = $1`,
            [requested_item_id]
        );

        if (requestedResult.rows.length === 0) {
            return res.status(404).json({
                message: "Requested item not found."
            });
        }

        const requestedItem = requestedResult.rows[0];

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

        const existing = await db.query(
            `SELECT id
             FROM trade_proposals
             WHERE proposer_id = $1
             AND requested_item_id = $2
             AND status = 'Pending'`,
            [proposerId, requested_item_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                message: "You already have a pending proposal for this item."
            });
        }

        const result = await db.query(
            `INSERT INTO trade_proposals
                (proposer_id, receiver_id, offered_item_id,
                 requested_item_id, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
                proposerId,
                receiverId,
                offered_item_id,
                requested_item_id,
                message || null
            ]
        );

        await db.query(
            `INSERT INTO notifications
                (user_id, title, message, notification_type)
             VALUES ($1, $2, $3, $4)`,
            [
                receiverId,
                "New Trade Proposal",
                "Someone has sent you a trade proposal. Check your proposals!",
                "trade"
            ]
        );

        return res.status(201).json({
            message: "Trade proposal sent successfully!",
            proposal_id: result.rows[0].id
        });

    } catch (error) {
        console.error("SEND PROPOSAL ERROR:", error);

        return res.status(500).json({
            message: "Failed to send trade proposal."
        });
    }
});

// =====================================
// ACCEPT TRADE PROPOSAL
// =====================================
router.patch("/proposals/:id/accept", authMiddleware, async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const proposalId = req.params.id;
        const userId = req.user.id;

        const proposalResult = await client.query(
            `SELECT *
             FROM trade_proposals
             WHERE id = $1
             FOR UPDATE`,
            [proposalId]
        );

        if (proposalResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                message: "Trade proposal not found."
            });
        }

        const proposal = proposalResult.rows[0];

        if (Number(proposal.receiver_id) !== Number(userId)) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(403).json({
                message: "You are not authorized to accept this proposal."
            });
        }

        if (proposal.status !== "Pending") {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "This proposal is no longer pending."
            });
        }

        // Lock and verify both items
        const itemIds = [
            proposal.offered_item_id,
            proposal.requested_item_id
        ].sort((a, b) => a - b);

        const itemsResult = await client.query(
            `SELECT id, user_id, status
             FROM items
             WHERE id = ANY($1::integer[])
             ORDER BY id
             FOR UPDATE`,
            [itemIds]
        );

        if (
            itemsResult.rows.length !== 2 ||
            itemsResult.rows.some(item => item.status !== "Available")
        ) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "One or both items are no longer available."
            });
        }

        await client.query(
            `UPDATE trade_proposals
             SET status = 'Accepted'
             WHERE id = $1`,
            [proposalId]
        );

        const tradeResult = await client.query(
            `INSERT INTO trades (proposal_id, status)
             VALUES ($1, 'Agreed')
             RETURNING id`,
            [proposalId]
        );

        const tradeId = tradeResult.rows[0].id;

        await client.query(
            `INSERT INTO trade_history
                (trade_id, actor_id, previous_status, new_status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tradeId,
                userId,
                null,
                "Agreed",
                "Trade proposal accepted."
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.json({
            message: "Trade proposal accepted successfully!",
            trade_id: tradeId,
            status: "Agreed"
        });

    } catch (error) {
        if (client && transactionStarted) {
            await client.query("ROLLBACK").catch(console.error);
            transactionStarted = false;
        }

        console.error("ACCEPT PROPOSAL ERROR:", error);

        return res.status(500).json({
            message: "Failed to accept trade proposal."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================
// DECLINE TRADE PROPOSAL
// =====================================
router.patch("/proposals/:id/decline", authMiddleware, async (req, res) => {
    try {
        const proposalId = req.params.id;
        const userId = req.user.id;

        const result = await db.query(
            `UPDATE trade_proposals
             SET status = 'Declined'
             WHERE id = $1
             AND receiver_id = $2
             AND status = 'Pending'
             RETURNING id`,
            [proposalId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Pending proposal not found or you are not authorized."
            });
        }

        return res.json({
            message: "Trade proposal declined successfully!"
        });

    } catch (error) {
        console.error("DECLINE PROPOSAL ERROR:", error);

        return res.status(500).json({
            message: "Failed to decline trade proposal."
        });
    }
});

// =====================================
// UPDATE TRADE STATUS
// =====================================
router.patch("/:id/status", authMiddleware, async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const tradeId = req.params.id;
        const userId = req.user.id;
        const { status, remarks } = req.body;

        if (!["Exchanged", "Completed"].includes(status)) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "Invalid trade status."
            });
        }

        const tradesResult = await client.query(
            `SELECT
                t.id,
                t.status,
                tp.proposer_id,
                tp.receiver_id
             FROM trades t
             JOIN trade_proposals tp
                ON t.proposal_id = tp.id
             WHERE t.id = $1
             FOR UPDATE OF t`,
            [tradeId]
        );

        if (tradesResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                message: "Trade not found."
            });
        }

        const trade = tradesResult.rows[0];

        const isParticipant =
            Number(trade.proposer_id) === Number(userId) ||
            Number(trade.receiver_id) === Number(userId);

        if (!isParticipant) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(403).json({
                message: "You are not part of this trade."
            });
        }

        if (status === "Exchanged" && trade.status !== "Agreed") {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "Only agreed trades can be marked as exchanged."
            });
        }

        if (status === "Completed") {
            if (trade.status !== "Exchanged") {
                await client.query("ROLLBACK");
                transactionStarted = false;

                return res.status(400).json({
                    message: "Trade must be marked Exchanged first."
                });
            }

            const previousUpdates = await client.query(
                `SELECT actor_id
                 FROM trade_history
                 WHERE trade_id = $1
                 AND new_status = 'Exchanged'
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1`,
                [tradeId]
            );

            if (
                previousUpdates.rows.length === 0 ||
                Number(previousUpdates.rows[0].actor_id) === Number(userId)
            ) {
                await client.query("ROLLBACK");
                transactionStarted = false;

                return res.status(400).json({
                    message: "The other participant must confirm the completion."
                });
            }
        }

        const previousStatus = trade.status;

        await client.query(
            `UPDATE trades
             SET status = $1,
                 completed_at = CASE
                    WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP
                    ELSE completed_at
                 END
             WHERE id = $2`,
            [status, tradeId]
        );

        await client.query(
            `INSERT INTO trade_history
                (trade_id, actor_id, previous_status, new_status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tradeId,
                userId,
                previousStatus,
                status,
                remarks || null
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.json({
            message: `Trade status updated to ${status}!`,
            trade_id: tradeId,
            previous_status: previousStatus,
            status
        });

    } catch (error) {
        if (client && transactionStarted) {
            await client.query("ROLLBACK").catch(console.error);
            transactionStarted = false;
        }

        console.error("UPDATE TRADE STATUS ERROR:", error);

        return res.status(500).json({
            message: "Failed to update trade status."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================
// GET TRADE HISTORY
// =====================================
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
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
             WHERE tp.proposer_id = $1 OR tp.receiver_id = $1
             ORDER BY th.created_at DESC`,
            [userId]
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("GET TRADE HISTORY ERROR:", error);

        return res.status(500).json({
            message: "Failed to retrieve trade history."
        });
    }
});

module.exports = router;
