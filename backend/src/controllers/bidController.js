const db = require('../config/db');

// @desc    Place a bid on an auction
// @route   POST /api/bids/place
const placeBid = async (req, res) => {
    try {
        const bidder_id = req.user.id;
        const { auction_id, skill_offered, credit_value, description } = req.body;

        if (!auction_id || !skill_offered || !credit_value) {
            return res.status(400).json({ message: 'Please provide auction_id, skill_offered, and credit_value' });
        }

        // Validate auction
        const auctionCheck = await db.query(
            'SELECT creator_id, status, minimum_credit_value, auction_end_time FROM auctions WHERE id = $1',
            [auction_id]
        );

        if (auctionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        const auction = auctionCheck.rows[0];

        if (auction.status !== 'active' || new Date(auction.auction_end_time) < new Date()) {
            return res.status(400).json({ message: 'Auction is no longer active' });
        }

        if (auction.creator_id === bidder_id) {
            return res.status(400).json({ message: 'You cannot bid on your own auction' });
        }

        if (credit_value < auction.minimum_credit_value) {
            return res.status(400).json({ message: `Bid must meet the minimum credit value of ${auction.minimum_credit_value}` });
        }
        
        // Prevent duplicate bids from same user on same auction, unless replacing
        const existingBidCheck = await db.query('SELECT id FROM bids WHERE auction_id = $1 AND bidder_id = $2', [auction_id, bidder_id]);
        if (existingBidCheck.rows.length > 0) {
            // Update existing bid instead of creating new
            const updatedBid = await db.query(
                `UPDATE bids SET skill_offered = $1, credit_value = $2, description = $3 
                 WHERE auction_id = $4 AND bidder_id = $5 RETURNING *`,
                [skill_offered, credit_value, description, auction_id, bidder_id]
            );

            // Fetch enriched bid data for frontend
            const enrichedBid = await db.query(
                `SELECT b.*, u.name as bidder_name, u.avatar_url as bidder_avatar, u.reputation_score as bidder_reputation 
                 FROM bids b
                 JOIN users u ON b.bidder_id = u.id
                 WHERE b.id = $1`,
                [updatedBid.rows[0].id]
            );

            return res.status(200).json({ 
                message: 'Bid updated successfully', 
                bid: enrichedBid.rows[0] 
            });
        }

        const newBid = await db.query(
            `INSERT INTO bids (auction_id, bidder_id, skill_offered, credit_value, description) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [auction_id, bidder_id, skill_offered, credit_value, description]
        );

        // Fetch enriched bid data for frontend
        const enrichedBid = await db.query(
            `SELECT b.*, u.name as bidder_name, u.avatar_url as bidder_avatar, u.reputation_score as bidder_reputation 
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.id = $1`,
            [newBid.rows[0].id]
        );

        res.status(201).json({
            message: 'Bid placed successfully',
            bid: enrichedBid.rows[0]
        });
    } catch (error) {
        console.error('placeBid Error:', error);
        res.status(500).json({ message: 'Server error placing bid' });
    }
};

// @desc    Get all bids for a specific auction
// @route   GET /api/bids/auction/:auctionId
const getAuctionBids = async (req, res) => {
    try {
        const auction_id = req.params.auctionId;

        const bidsResult = await db.query(
            `SELECT b.*, u.name as bidder_name, u.avatar_url as bidder_avatar, u.reputation_score as bidder_reputation 
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = $1
             ORDER BY b.credit_value DESC, b.created_at ASC`,
            [auction_id]
        );

        res.json(bidsResult.rows);
    } catch (error) {
        console.error('getAuctionBids Error:', error);
        res.status(500).json({ message: 'Server error retrieving bids' });
    }
};

// @desc    Get all bids placed by a user
// @route   GET /api/bids/user/:userId
const getUserBids = async (req, res) => {
    try {
        const user_id = req.params.userId || req.user.id;

        const bidsResult = await db.query(
            `SELECT b.*, a.title as auction_title, a.status as auction_status 
             FROM bids b
             JOIN auctions a ON b.auction_id = a.id
             WHERE b.bidder_id = $1
             ORDER BY b.created_at DESC`,
            [user_id]
        );

        res.json(bidsResult.rows);
    } catch (error) {
        console.error('getUserBids Error:', error);
        res.status(500).json({ message: 'Server error retrieving user bids' });
    }
};

module.exports = {
    placeBid,
    getAuctionBids,
    getUserBids
};
