const db = require('../config/db');

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:id
const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const userResult = await db.query(
            'SELECT id, name, email, avatar_url, reputation_score, skill_credits, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('getUserProfile Error:', error);
        res.status(500).json({ message: 'Server error retrieving user profile' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile/update
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, avatar_url } = req.body;

        const updateResult = await db.query(
            'UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, email, avatar_url, reputation_score, skill_credits',
            [name, avatar_url, userId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: updateResult.rows[0]
        });
    } catch (error) {
        console.error('updateUserProfile Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// @desc    Get user skills
// @route   GET /api/users/skills
const getUserSkills = async (req, res) => {
    try {
        // Can get skills of the logged in user, or another user if id is provided in query
        const targetUserId = req.query.userId || req.user.id;
        
        const skillsResult = await db.query(
            'SELECT * FROM skills WHERE user_id = $1 ORDER BY created_at DESC',
            [targetUserId]
        );

        res.json(skillsResult.rows);
    } catch (error) {
        console.error('getUserSkills Error:', error);
        res.status(500).json({ message: 'Server error retrieving skills' });
    }
};

// @desc    Add a new skill to user profile
// @route   POST /api/users/add-skill
const addSkill = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skill_name, skill_category, skill_level, portfolio_link } = req.body;

        if (!skill_name || !skill_category || !skill_level) {
            return res.status(400).json({ message: 'Please provide skill name, category, and level' });
        }

        const newSkill = await db.query(
            'INSERT INTO skills (user_id, skill_name, skill_category, skill_level, portfolio_link) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, skill_name, skill_category, skill_level, portfolio_link]
        );

        res.status(201).json({
            message: 'Skill added successfully',
            skill: newSkill.rows[0]
        });
    } catch (error) {
        console.error('addSkill Error:', error);
        res.status(500).json({ message: 'Server error adding skill' });
    }
};

// @desc    Remove a skill from user profile
// @route   DELETE /api/users/remove-skill/:id
const removeSkill = async (req, res) => {
    try {
        const userId = req.user.id;
        const skillId = req.params.id;

        // Verify ownership before deleting
        const skillCheck = await db.query('SELECT user_id FROM skills WHERE id = $1', [skillId]);
        
        if (skillCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Skill not found' });
        }

        if (skillCheck.rows[0].user_id !== userId) {
            return res.status(403).json({ message: 'User not authorized to delete this skill' });
        }

        await db.query('DELETE FROM skills WHERE id = $1', [skillId]);

        res.json({ message: 'Skill removed successfully' });
    } catch (error) {
        console.error('removeSkill Error:', error);
        res.status(500).json({ message: 'Server error removing skill' });
    }
};

// @desc    Get user reputation history / ratings received
// @route   GET /api/users/reputation/:id
const getUserReputation = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const ratingsResult = await db.query(
            `SELECT r.*, u.name as reviewer_name, a.title as auction_title 
             FROM ratings r 
             JOIN users u ON r.from_user_id = u.id 
             JOIN auctions a ON r.auction_id = a.id 
             WHERE r.to_user_id = $1 
             ORDER BY r.created_at DESC`,
            [userId]
        );

        res.json({
            total_reviews: ratingsResult.rows.length,
            reviews: ratingsResult.rows
        });
    } catch (error) {
        console.error('getUserReputation Error:', error);
        res.status(500).json({ message: 'Server error retrieving reputation history' });
    }
};

// @desc    Get user stats for dashboard
// @route   GET /api/users/stats
const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get various stats in parallel
        const [userRes, exchangeRes, ratingRes] = await Promise.all([
            db.query('SELECT skill_credits, reputation_score FROM users WHERE id = $1', [userId]),
            db.query('SELECT COUNT(*) FROM transactions WHERE creator_id = $1 OR winner_id = $1', [userId]),
            db.query('SELECT AVG(rating_score) as avg_rating FROM ratings WHERE to_user_id = $1', [userId])
        ]);

        const stats = {
            skill_credits: userRes.rows[0]?.skill_credits || 0,
            total_exchanges: parseInt(exchangeRes.rows[0]?.count || 0),
            average_rating: parseFloat(ratingRes.rows[0]?.avg_rating || 0).toFixed(1)
        };

        res.json(stats);
    } catch (error) {
        console.error('getUserStats Error:', error);
        res.status(500).json({ message: 'Server error retrieving user stats' });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserSkills,
    addSkill,
    removeSkill,
    getUserReputation,
    getUserStats
};
