const express = require('express');
const router = express.Router();
const { 
    createAuction, 
    getAllAuctions, 
    getAuctionById, 
    updateAuction, 
    deleteAuction,
    getUserDashboardData
} = require('../controllers/auctionController');
const { verifyToken } = require('../middlewares/auth');

router.post('/create', verifyToken, createAuction);
router.get('/all', getAllAuctions); // Publicly viewable
router.get('/dashboard', verifyToken, getUserDashboardData);
router.get('/:id', getAuctionById); // Publicly viewable
router.put('/update/:id', verifyToken, updateAuction);
router.delete('/delete/:id', verifyToken, deleteAuction);

module.exports = router;
