const db = require('../config/db');

// @desc    Get all skill credit mappings
// @route   GET /api/credits/list
const getCreditValues = async (req, res) => {
    try {
        const credits = await db.query('SELECT * FROM skill_credits ORDER BY skill_name ASC');
        res.json(credits.rows);
    } catch (error) {
        console.error('getCreditValues Error:', error);
        res.status(500).json({ message: 'Server error retrieving credit values' });
    }
};

// ================= ADMIN ROUTES ================== //

// Helper to log admin actions
const logAdminAction = async (admin_id, action_type, target_user_id, description) => {
    await db.query(
        'INSERT INTO admin_logs (admin_id, action_type, target_user_id, description) VALUES ($1, $2, $3, $4)',
        [admin_id, action_type, target_user_id, description]
    );
};

// @desc    Update or insert a skill credit mapping
// @route   PUT /api/admin/update-credit-values
const updateCreditValue = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { skill_name, credit_value } = req.body;

        if (!skill_name || !credit_value) return res.status(400).json({ message: 'Provide skill_name and credit_value' });

        const upsertQuery = `
            INSERT INTO skill_credits (skill_name, credit_value, last_updated) 
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (skill_name) 
            DO UPDATE SET credit_value = EXCLUDED.credit_value, last_updated = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        
        const result = await db.query(upsertQuery, [skill_name, credit_value]);
        
        await logAdminAction(adminId, 'UPDATE_CREDIT_VALUE', null, `Updated '${skill_name}' to ${credit_value} credits.`);

        res.json({ message: 'Credit value updated', data: result.rows[0] });

    } catch (error) {
        console.error('updateCreditValue Error:', error);
        res.status(500).json({ message: 'Server error updating credits' });
    }
};

// @desc    Get top users for review (or all)
// @route   GET /api/admin/users
const getAdminUsers = async (req, res) => {
    try {
        const users = await db.query('SELECT id, name, email, reputation_score, created_at FROM users ORDER BY created_at DESC LIMIT 100');
        res.json(users.rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get commonly reported or disputed transactions
// @route   GET /api/admin/reported-transactions
const getDisputedTransactions = async (req, res) => {
    try {
        const disputes = await db.query(`SELECT * FROM transactions WHERE status = 'disputed' ORDER BY created_at DESC`);
        res.json(disputes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Ban or delete a malicious user
// @route   PUT /api/admin/ban-user
const banUser = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { user_id, reason } = req.body;

        // Optionally, add an 'is_banned' column to users, but right now we delete/cascade or simply scrub
        await db.query('DELETE FROM users WHERE id = $1', [user_id]);
        
        await logAdminAction(adminId, 'BAN_USER', user_id, `Banned user. Reason: ${reason}`);

        res.json({ message: 'User banned and removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify a user's skill (grants a badge to them)
// @route   PUT /api/admin/verify-skill
const verifySkill = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { skill_id, user_id } = req.body;

        await db.query('UPDATE skills SET verified = TRUE WHERE id = $1 RETURNING *', [skill_id]);
        
        await logAdminAction(adminId, 'VERIFY_SKILL', user_id, `Verified skill ID ${skill_id}`);

        res.json({ message: 'Skill verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getCreditValues,
    updateCreditValue,
    getAdminUsers,
    getDisputedTransactions,
    banUser,
    verifySkill
};
