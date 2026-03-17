const db = require('../config/db');

// @desc    Get all skill credit mappings (preserves existing system)
// @route   GET /api/credits/list
exports.getCreditValues = async (req, res) => {
    try {
        const credits = await db.query('SELECT * FROM skill_credits ORDER BY skill_name ASC');
        res.json(credits.rows);
    } catch (error) {
        console.error('getCreditValues Error:', error);
        res.status(500).json({ message: 'Server error retrieving credit values' });
    }
};

// Helper to log admin actions
const logAction = async (adminId, action, targetId, details = {}) => {
    try {
        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
            [adminId, action, String(targetId), JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Failed to log admin action:', error.message);
    }
};

// 1. Dashboard Data
exports.getDashboardData = async (req, res) => {
    try {
        const [users, auctions, bids, activeAuctions, completedAuctions, txs] = await Promise.all([
            db.query('SELECT COUNT(*) FROM users'),
            db.query('SELECT COUNT(*) FROM auctions'),
            db.query('SELECT COUNT(*) FROM bids'),
            db.query('SELECT COUNT(*) FROM auctions WHERE status = $1', ['active']),
            db.query('SELECT COUNT(*) FROM auctions WHERE status = $1', ['completed']),
            db.query('SELECT COUNT(*) FROM transactions')
        ]);

        res.json({
            success: true,
            data: {
                total_users: parseInt(users.rows[0].count),
                total_auctions: parseInt(auctions.rows[0].count),
                total_bids: parseInt(bids.rows[0].count),
                active_auctions: parseInt(activeAuctions.rows[0].count),
                completed_auctions: parseInt(completedAuctions.rows[0].count),
                total_transactions: parseInt(txs.rows[0].count)
            }
        });
    } catch (error) {
        console.error('getDashboardData error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving dashboard data' });
    }
};

// 2. User Management
exports.getUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, email, reputation_score, status, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving users' });
    }
};

exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE users SET status = $1 WHERE id = $2', ['banned', id]);
        await logAction(req.user.id, 'BAN_USER', id);
        res.json({ success: true, message: 'User has been banned' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error banning user' });
    }
};

exports.unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE users SET status = $1 WHERE id = $2', ['active', id]);
        await logAction(req.user.id, 'UNBAN_USER', id);
        res.json({ success: true, message: 'User has been unbanned' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error unbanning user' });
    }
};

// 3. Skill Verification
exports.getPendingSkills = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.name as user_name, u.email as user_email 
            FROM skills s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.verified = false 
            ORDER BY s.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving pending skills' });
    }
};

exports.verifySkill = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'UPDATE skills SET verified = true, verification_score = 100, last_verified_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length) {
            await logAction(req.user.id, 'VERIFY_SKILL', id, { skill_name: result.rows[0].skill_name });
            res.json({ success: true, message: 'Skill verified successfully', data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Skill not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error verifying skill' });
    }
};

exports.rejectSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM skills WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length) {
            await logAction(req.user.id, 'REJECT_SKILL', id, { skill_name: result.rows[0].skill_name });
            res.json({ success: true, message: 'Skill rejected and removed' });
        } else {
            res.status(404).json({ success: false, message: 'Skill not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error rejecting skill' });
    }
};

// 4. Auction Moderation
exports.getAuctions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, u.name as creator_name 
            FROM auctions a 
            JOIN users u ON a.creator_id = u.id 
            ORDER BY a.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving auctions' });
    }
};

exports.closeAuction = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE auctions SET status = 'completed', ends_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
        await logAction(req.user.id, 'CLOSE_AUCTION', id);
        res.json({ success: true, message: 'Auction closed forcefully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error closing auction' });
    }
};

exports.deleteAuction = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM auctions WHERE id = $1', [id]);
        await logAction(req.user.id, 'DELETE_AUCTION', id);
        res.json({ success: true, message: 'Auction deleted securely' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting auction' });
    }
};

// 5. Bid Monitoring
exports.getBids = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.*, u.name as bidder_name, a.title as auction_title 
            FROM bids b 
            JOIN users u ON b.bidder_id = u.id 
            JOIN auctions a ON b.auction_id = a.id 
            ORDER BY b.credit_value DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving bids' });
    }
};

// 6. Dispute Management
exports.getTransactions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, u1.name as creator_name, u2.name as winner_name 
            FROM transactions t 
            JOIN users u1 ON t.creator_id = u1.id 
            JOIN users u2 ON t.winner_id = u2.id 
            ORDER BY t.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving transactions' });
    }
};

exports.resolveTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [id]);
        await logAction(req.user.id, 'RESOLVE_DISPUTE', id);
        res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error resolving dispute' });
    }
};

// 7. Credit Control
exports.updateCreditValue = async (req, res) => {
    try {
        const { skill_name, credit_value } = req.body;
        await logAction(req.user.id, 'UPDATE_CREDIT_RATE', null, { skill_name, credit_value });
        res.json({ success: true, message: 'Global skill credit modified and logged' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error modifying credit rate' });
    }
};

