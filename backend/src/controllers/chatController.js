const db = require('../config/db');

// @desc    Get chat history for a transaction
// @route   GET /api/chat/:transactionId
const getTransactionMessages = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        // 1. Verify user is part of this transaction
        const txCheck = await db.query(
            'SELECT creator_id, winner_id FROM transactions WHERE id = $1',
            [transactionId]
        );

        if (txCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const { creator_id, winner_id } = txCheck.rows[0];
        if (creator_id !== userId && winner_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to view this chat' });
        }

        // 2. Fetch history
        const messages = await db.query(
            `SELECT m.*, u.name as sender_name 
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.transaction_id = $1
             ORDER BY m.created_at ASC`,
            [transactionId]
        );

        res.json(messages.rows);
    } catch (error) {
        console.error('getTransactionMessages Error:', error);
        res.status(500).json({ message: 'Server error fetching chat history' });
    }
};

module.exports = {
    getTransactionMessages
};
