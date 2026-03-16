const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile, 
    getUserSkills, 
    addSkill, 
    removeSkill, 
    getUserReputation,
    getUserStats
} = require('../controllers/userController');
const { verifyToken } = require('../middlewares/auth');

router.get('/profile/:id', getUserProfile); // Public profile view
router.put('/profile/update', verifyToken, updateUserProfile);

router.get('/skills', verifyToken, getUserSkills); // Pass ?userId= for other users, or self by default
router.post('/add-skill', verifyToken, addSkill);
router.delete('/remove-skill/:id', verifyToken, removeSkill);

router.get('/reputation/:id', getUserReputation); // Public reputation history
router.get('/stats', verifyToken, getUserStats);

module.exports = router;
