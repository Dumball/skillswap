const db = require('../config/db');

// @desc    Select a winner (create transaction)
// @route   POST /api/transactions/create
const createTransaction = async (req, res) => {
    try {
        const creator_id = req.user.id;
        const { auction_id, bid_id } = req.body;

        if (!auction_id || !bid_id) {
            return res.status(400).json({ message: 'Please provide auction_id and bid_id' });
        }

        // Verify auction ownership and status
        const auctionCheck = await db.query(
            'SELECT creator_id, status FROM auctions WHERE id = $1',
            [auction_id]
        );

        if (auctionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        const auction = auctionCheck.rows[0];

        if (auction.creator_id !== creator_id) {
            return res.status(403).json({ message: 'Only the auction creator can select a winner' });
        }

        if (auction.status === 'completed' || auction.status === 'cancelled') {
            return res.status(400).json({ message: `Cannot select winner for a ${auction.status} auction` });
        }

        // Verify bid belongs to auction
        const bidCheck = await db.query(
            'SELECT bidder_id, skill_offered FROM bids WHERE id = $1 AND auction_id = $2',
            [bid_id, auction_id]
        );

        if (bidCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Bid not found for this auction' });
        }

        const bid = bidCheck.rows[0];

        // Start Transaction block (ACID)
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Mark auction as completed
            await client.query("UPDATE auctions SET status = 'completed' WHERE id = $1", [auction_id]);

            // 2. Create transaction record mapping the agreed skill exchange
            const newTransaction = await client.query(
                `INSERT INTO transactions (auction_id, winner_id, creator_id, agreed_skill) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [auction_id, bid.bidder_id, creator_id, bid.skill_offered]
            );

            await client.query('COMMIT');
            
            res.status(201).json({
                message: 'Winner selected! Transaction initialized.',
                transaction: newTransaction.rows[0]
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('createTransaction Error:', error);
        res.status(500).json({ message: 'Server error initiating skill swap' });
    }
};

// @desc    Get transactions for a user (either as buyer or seller)
// @route   GET /api/transactions/user/:id
const getUserTransactions = async (req, res) => {
    try {
        const userId = req.params.id || req.user.id;

        const transactionsResult = await db.query(
            `SELECT t.*, a.title, u_winner.name as winner_name, u_creator.name as creator_name
             FROM transactions t
             JOIN auctions a ON t.auction_id = a.id
             JOIN users u_winner ON t.winner_id = u_winner.id
             JOIN users u_creator ON t.creator_id = u_creator.id
             WHERE t.creator_id = $1 OR t.winner_id = $1
             ORDER BY t.created_at DESC`,
            [userId]
        );

        res.json(transactionsResult.rows);
    } catch (error) {
        console.error('getUserTransactions Error:', error);
        res.status(500).json({ message: 'Server error retrieving transactions' });
    }
};

// @desc    Mark a transaction as completed and verify skill exchange
// @route   PUT /api/transactions/complete
const completeTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { transaction_id } = req.body;

        const transactionCheck = await db.query(
            'SELECT * FROM transactions WHERE id = $1',
            [transaction_id]
        );

        if (transactionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const transaction = transactionCheck.rows[0];

        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: `Transaction is already ${transaction.status}` });
        }

        // Technically, you might want both to sign off, but for MVP let the creator verify receipt
        if (transaction.creator_id !== userId && transaction.winner_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized to complete this transaction' });
        }

        const updatedTransaction = await db.query(
            `UPDATE transactions SET status = 'completed' WHERE id = $1 RETURNING *`,
            [transaction_id]
        );

        res.json({
            message: 'Transaction successfully completed!',
            transaction: updatedTransaction.rows[0]
        });

    } catch (error) {
        console.error('completeTransaction Error:', error);
        res.status(500).json({ message: 'Server error completing transaction' });
    }
};

// @desc    Mark a transaction as disputed
// @route   PUT /api/transactions/dispute
const disputeTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { transaction_id, reason } = req.body; // Reason is passed for AdminLogs, but we just set status

        const transactionCheck = await db.query('SELECT creator_id, winner_id, status FROM transactions WHERE id = $1', [transaction_id]);
        
        if (transactionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transactionCheck.rows[0].creator_id !== userId && transactionCheck.rows[0].winner_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updatedTransaction = await db.query(
            `UPDATE transactions SET status = 'disputed' WHERE id = $1 RETURNING *`,
            [transaction_id]
        );

        res.json({
            message: 'Transaction disputed. An admin will review.',
            transaction: updatedTransaction.rows[0]
        });

    } catch (error) {
        console.error('disputeTransaction Error:', error);
        res.status(500).json({ message: 'Server error disputing transaction' });
    }
};

module.exports = {
    createTransaction,
    getUserTransactions,
    completeTransaction,
    disputeTransaction
};
