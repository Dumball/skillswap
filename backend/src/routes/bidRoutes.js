const express = require('express');
const router = express.Router();
const { placeBid, getAuctionBids, getUserBids } = require('../controllers/bidController');
const { verifyToken } = require('../middlewares/auth');

router.post('/place', verifyToken, placeBid);
router.get('/auction/:auctionId', getAuctionBids); // Publicly viewable bids on active queries
router.get('/user/:userId', verifyToken, getUserBids);

const { acceptBid, declineBid, removeBid } = require('../controllers/bidController');
router.put('/:id/accept', verifyToken, acceptBid);
router.put('/:id/decline', verifyToken, declineBid);
router.delete('/:id/remove', verifyToken, removeBid);

module.exports = router;
