const db = require('../config/db');

// @desc    Get recent activity for a user
// @route   GET /api/activity
const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;

        const activityResult = await db.query(
            `(SELECT 'bid' as type, b.created_at, a.title as auction_title, b.credit_value::text as value
              FROM bids b
              JOIN auctions a ON b.auction_id = a.id
              WHERE b.bidder_id = $1 OR a.creator_id = $1)
             UNION ALL
             (SELECT 'transaction' as type, t.created_at, a.title as auction_title, t.status as value
              FROM transactions t
              JOIN auctions a ON t.auction_id = a.id
              WHERE t.creator_id = $1 OR t.winner_id = $1)
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId]
        );

        res.json(activityResult.rows);
    } catch (error) {
        console.error('getUserActivity Error:', error);
        res.status(500).json({ message: 'Server error retrieving user activity' });
    }
};

module.exports = {
    getUserActivity
};
