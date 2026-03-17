const express = require('express');
const router = express.Router();
const { getTransactionMessages } = require('../controllers/chatController');
const { verifyToken } = require('../middlewares/auth');

router.get('/:transactionId', verifyToken, getTransactionMessages);

module.exports = router;
