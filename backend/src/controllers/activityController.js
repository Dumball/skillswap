const db = require('../config/db');

// @desc    Get recent activity for a user (bids placed/received + transactions)
// @route   GET /api/activity
const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;

        const activityResult = await db.query(
            `(
              -- Bids PLACED by the user
              SELECT
                'bid_placed' as type,
                b.created_at,
                a.title as auction_title,
                a.id as auction_id,
                b.credit_value,
                b.skill_offered,
                u.name as other_user_name,
                NULL as status
              FROM bids b
              JOIN auctions a ON b.auction_id = a.id
              JOIN users u ON a.creator_id = u.id
              WHERE b.bidder_id = $1
            )
            UNION ALL
            (
              -- Bids RECEIVED on the user's auctions
              SELECT
                'bid_received' as type,
                b.created_at,
                a.title as auction_title,
                a.id as auction_id,
                b.credit_value,
                b.skill_offered,
                u.name as other_user_name,
                NULL as status
              FROM bids b
              JOIN auctions a ON b.auction_id = a.id
              JOIN users u ON b.bidder_id = u.id
              WHERE a.creator_id = $1 AND b.bidder_id != $1
            )
            UNION ALL
            (
              -- Transactions involving the user
              SELECT
                'transaction' as type,
                t.created_at,
                a.title as auction_title,
                a.id as auction_id,
                NULL as credit_value,
                NULL as skill_offered,
                CASE WHEN t.creator_id = $1 THEN wu.name ELSE cu.name END as other_user_name,
                t.status
              FROM transactions t
              JOIN auctions a ON t.auction_id = a.id
              JOIN users cu ON t.creator_id = cu.id
              JOIN users wu ON t.winner_id = wu.id
              WHERE t.creator_id = $1 OR t.winner_id = $1
            )
            ORDER BY created_at DESC
            LIMIT 15`,
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
