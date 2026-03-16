const express = require('express');
const router = express.Router();
const { submitRating } = require('../controllers/ratingController');
const { verifyToken } = require('../middlewares/auth');

router.post('/submit', verifyToken, submitRating);
// Let users retrieve ratings via the user profile reputation API!

module.exports = router;
