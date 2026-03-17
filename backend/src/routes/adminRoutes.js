const express = require('express');
const router = express.Router();

const { verifyToken, adminOnlyAccess } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

// Legacy unauthenticated route
router.get('/list', adminController.getCreditValues);

// All following admin routes must pass verifyToken AND adminOnlyAccess
router.use(verifyToken, adminOnlyAccess);

// 1. Dashboard
router.get('/dashboard', adminController.getDashboardData);

// 2. User Management
router.get('/users', adminController.getUsers);
router.put('/ban-user/:id', adminController.banUser);
router.put('/unban-user/:id', adminController.unbanUser);

// 3. Skill Verification Handling
router.get('/skills/pending', adminController.getPendingSkills);
router.put('/skills/verify/:id', adminController.verifySkill);
router.put('/skills/reject/:id', adminController.rejectSkill);

// 4. Auction Moderation
router.get('/auctions', adminController.getAuctions);
router.put('/auctions/close/:id', adminController.closeAuction);
router.delete('/auctions/:id', adminController.deleteAuction);

// 5. Bid Monitoring
router.get('/bids', adminController.getBids);

// 6. Dispute & Transaction Oversight
router.get('/transactions', adminController.getTransactions);
router.put('/transactions/resolve/:id', adminController.resolveTransaction);

// 7. Credits
router.put('/credits/update', adminController.updateCreditValue);

module.exports = router;
