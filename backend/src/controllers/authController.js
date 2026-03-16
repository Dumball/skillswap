const db = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Insert new user
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, reputation_score, skill_credits',
            [name, email, password_hash]
        );

        const user = newUser.rows[0];
        const token = generateToken(user.id);

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check for user email
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userResult.rows[0];

        // Check password
        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                reputation_score: user.reputation_score,
                skill_credits: user.skill_credits
            },
            token
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Logout user / clear token (Mainly handled on client side by destroying token)
// @route   POST /api/auth/logout
const logoutUser = (req, res) => {
    // In a stateless JWT system, logout is just returning a success message so the client can delete the token
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const userResult = await db.query('SELECT id, name, email, avatar_url, reputation_score, skill_credits FROM users WHERE id = $1', [req.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error retrieving user profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getMe
};
