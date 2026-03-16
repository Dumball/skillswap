const express = require('express');
const router = express.Router();
const { 
    getCreditValues, 
    updateCreditValue, 
    getAdminUsers, 
    getDisputedTransactions, 
    banUser, 
    verifySkill 
} = require('../controllers/adminController');
const { verifyToken, adminOnlyAccess } = require('../middlewares/auth');

// Public route for mappings
router.get('/credits/list', getCreditValues);

// Admin-only Routes
router.put('/update-credit-values', verifyToken, adminOnlyAccess, updateCreditValue);
router.get('/users', verifyToken, adminOnlyAccess, getAdminUsers);
router.get('/reported-transactions', verifyToken, adminOnlyAccess, getDisputedTransactions);
router.put('/ban-user', verifyToken, adminOnlyAccess, banUser);
router.put('/verify-skill', verifyToken, adminOnlyAccess, verifySkill);

module.exports = router;
