const express = require('express');
const router = express.Router();
const { getUserActivity } = require('../controllers/activityController');
const { verifyToken } = require('../middlewares/auth');

router.get('/', verifyToken, getUserActivity);

module.exports = router;
