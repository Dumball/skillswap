const db = require('../config/db');

// @desc    Calculate and update user's average reputation score
const updateReputationScore = async (user_id) => {
    const scoreResult = await db.query(
        `SELECT AVG(rating_score) as avg_score FROM ratings WHERE to_user_id = $1`,
        [user_id]
    );
    const avgScore = scoreResult.rows[0].avg_score || 0;
    
    await db.query(`UPDATE users SET reputation_score = $1 WHERE id = $2`, [avgScore, user_id]);
};

// @desc    Submit a new rating (after a completed transaction)
// @route   POST /api/ratings/submit
const submitRating = async (req, res) => {
    try {
        const from_user_id = req.user.id;
        const { to_user_id, auction_id, rating_score, review } = req.body;

        if (!to_user_id || !auction_id || !rating_score) {
            return res.status(400).json({ message: 'Must provide to_user_id, auction_id, and rating_score' });
        }

        if (rating_score < 1 || rating_score > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        
        // Prevent multiple ratings from same user for the same auction transaction
        const existingRating = await db.query(
            'SELECT id FROM ratings WHERE from_user_id = $1 AND auction_id = $2',
            [from_user_id, auction_id]
        );

        if (existingRating.rows.length > 0) {
            return res.status(400).json({ message: 'You have already rated this exchange' });
        }

        // Must be a completed transaction between the two users
        const transactionCheck = await db.query(
            `SELECT * FROM transactions WHERE auction_id = $1 AND status = 'completed'`,
            [auction_id]
        );

        if (transactionCheck.rows.length === 0) {
            return res.status(400).json({ message: 'No completed transaction exists to rate' });
        }

        const trans = transactionCheck.rows[0];
        const validParticipants = [trans.creator_id, trans.winner_id];

        if (!validParticipants.includes(from_user_id) || !validParticipants.includes(to_user_id)) {
            return res.status(403).json({ message: 'Invalid participants for this rating' });
        }

        const newRating = await db.query(
            `INSERT INTO ratings (from_user_id, to_user_id, auction_id, rating_score, review) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [from_user_id, to_user_id, auction_id, rating_score, review]
        );

        await updateReputationScore(to_user_id);

        res.status(201).json({ message: 'Rating submitted successfully!', rating: newRating.rows[0] });

    } catch (error) {
        console.error('submitRating Error:', error);
        res.status(500).json({ message: 'Server error submitting rating' });
    }
};

module.exports = { submitRating };
