const express = require('express');
const router = express.Router();
const { generateTest } = require('../controllers/skillController');
const { verifyToken } = require('../middlewares/auth');

router.post('/generate-test', verifyToken, generateTest);

module.exports = router;
