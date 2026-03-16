const db = require('../config/db');

// @desc    Create a new auction
// @route   POST /api/auctions/create
const createAuction = async (req, res) => {
    try {
        const creator_id = req.user.id;
        const { title, description, skill_required, skill_category, minimum_credit_value, duration_hours } = req.body;

        if (!title || !description || !skill_required || !skill_category || !minimum_credit_value || !duration_hours) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Enforce verified skill requirement
        const skillCheck = await db.query(
            'SELECT id FROM skills WHERE user_id = $1 AND verified = true LIMIT 1',
            [creator_id]
        );

        if (skillCheck.rows.length === 0) {
            return res.status(403).json({ message: 'You must have at least one verified skill to create an auction.' });
        }

        const endTime = new Date();
        endTime.setHours(endTime.getHours() + parseInt(duration_hours));

        const newAuction = await db.query(
            `INSERT INTO auctions 
             (title, description, skill_required, skill_category, creator_id, minimum_credit_value, auction_end_time) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, skill_required, skill_category, creator_id, minimum_credit_value, endTime]
        );

        res.status(201).json({
            message: 'Auction created successfully',
            auction: newAuction.rows[0]
        });
    } catch (error) {
        console.error('createAuction Error:', error);
        res.status(500).json({ message: 'Server error creating auction' });
    }
};

// @desc    Get all active auctions
// @route   GET /api/auctions/all
const getAllAuctions = async (req, res) => {
    try {
        const auctionsResult = await db.query(
            `SELECT a.*, u.name as creator_name, u.reputation_score as creator_reputation, 
             (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
             FROM auctions a
             JOIN users u ON a.creator_id = u.id
             WHERE a.status = 'active' AND a.auction_end_time > CURRENT_TIMESTAMP
             ORDER BY a.created_at DESC`
        );

        res.json(auctionsResult.rows);
    } catch (error) {
        console.error('getAllAuctions Error:', error);
        res.status(500).json({ message: 'Server error retrieving auctions' });
    }
};

// @desc    Get complete auction details by ID
// @route   GET /api/auctions/:id
const getAuctionById = async (req, res) => {
    try {
        const auctionId = req.params.id;
        
        const auctionResult = await db.query(
            `SELECT a.*, u.name as creator_name, u.avatar_url as creator_avatar, u.reputation_score as creator_reputation
             FROM auctions a
             JOIN users u ON a.creator_id = u.id
             WHERE a.id = $1`,
            [auctionId]
        );

        if (auctionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        // Check if auction is expired
        const auction = auctionResult.rows[0];
        if (auction.status === 'active' && new Date(auction.auction_end_time) < new Date()) {
            await db.query(`UPDATE auctions SET status = 'completed' WHERE id = $1`, [auctionId]);
            auction.status = 'completed';
        }

        res.json(auction);
    } catch (error) {
        console.error('getAuctionById Error:', error);
        res.status(500).json({ message: 'Server error retrieving auction details' });
    }
};

// @desc    Update an auction
// @route   PUT /api/auctions/update/:id
const updateAuction = async (req, res) => {
    try {
        const auctionId = req.params.id;
        const userId = req.user.id;
        const { title, description } = req.body;

        // Verify ownership
        const auctionCheck = await db.query('SELECT creator_id, status FROM auctions WHERE id = $1', [auctionId]);
        
        if (auctionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }
        
        if (auctionCheck.rows[0].creator_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this auction' });
        }

        if (auctionCheck.rows[0].status !== 'active') {
            return res.status(400).json({ message: 'Cannot update a completed or cancelled auction' });
        }

        const updateResult = await db.query(
            `UPDATE auctions SET title = COALESCE($1, title), description = COALESCE($2, description) 
             WHERE id = $3 RETURNING *`,
            [title, description, auctionId]
        );

        res.json({ message: 'Auction updated successfully', auction: updateResult.rows[0] });
    } catch (error) {
        console.error('updateAuction Error:', error);
        res.status(500).json({ message: 'Server error updating auction' });
    }
};

// @desc    Delete/Cancel an auction
// @route   DELETE /api/auctions/delete/:id
const deleteAuction = async (req, res) => {
    try {
        const auctionId = req.params.id;
        const userId = req.user.id;

        const auctionCheck = await db.query('SELECT creator_id FROM auctions WHERE id = $1', [auctionId]);
        
        if (auctionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }
        
        if (auctionCheck.rows[0].creator_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this auction' });
        }

        await db.query(`UPDATE auctions SET status = 'cancelled' WHERE id = $1`, [auctionId]);

        res.json({ message: 'Auction cancelled successfully' });
    } catch (error) {
        console.error('deleteAuction Error:', error);
        res.status(500).json({ message: 'Server error cancelling auction' });
    }
};

// @desc    Get user's dashboard data (active auctions and recent exchanges)
// @route   GET /api/auctions/dashboard
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        const [activeAuctions, recentExchanges] = await Promise.all([
            db.query(
                `SELECT a.*, (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
                 FROM auctions a
                 WHERE a.creator_id = $1 AND a.status = 'active' AND a.auction_end_time > CURRENT_TIMESTAMP
                 ORDER BY a.created_at DESC`,
                [userId]
            ),
            db.query(
                `SELECT t.*, a.title, a.skill_category, 
                        u_winner.name as winner_name, u_creator.name as creator_name
                 FROM transactions t
                 JOIN auctions a ON t.auction_id = a.id
                 JOIN users u_winner ON t.winner_id = u_winner.id
                 JOIN users u_creator ON t.creator_id = u_creator.id
                 WHERE t.creator_id = $1 OR t.winner_id = $1
                 ORDER BY t.created_at DESC
                 LIMIT 5`,
                [userId]
            )
        ]);

        res.json({
            activeAuctions: activeAuctions.rows,
            recentExchanges: recentExchanges.rows
        });
    } catch (error) {
        console.error('getUserDashboardData Error:', error);
        res.status(500).json({ message: 'Server error retrieving dashboard data' });
    }
};

module.exports = {
    createAuction,
    getAllAuctions,
    getAuctionById,
    updateAuction,
    deleteAuction,
    getUserDashboardData
};
