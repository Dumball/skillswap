const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getUserTransactions, 
    completeTransaction, 
    disputeTransaction 
} = require('../controllers/transactionController');
const { verifyToken } = require('../middlewares/auth');

router.post('/create', verifyToken, createTransaction);
router.get('/user/:id', verifyToken, getUserTransactions);
router.put('/complete', verifyToken, completeTransaction);
router.put('/dispute', verifyToken, disputeTransaction);

module.exports = router;
