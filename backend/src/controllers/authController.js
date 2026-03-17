const db = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    console.log('\n[REGISTER] 🔵 Request received');
    console.log('[REGISTER] Body:', JSON.stringify(req.body, null, 2));
    
    try {
        let { name, email, password, auto_suffix } = req.body;

        // Validation
        if (!name || !email || !password) {
            console.log('[REGISTER] ❌ Validation failed: Missing fields');
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        
        console.log('[REGISTER] ✅ Input validation passed');
        console.log('[REGISTER] 🔍 Checking if email exists:', email);

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            console.log('[REGISTER] ⚠️  Email already exists:', email);
            // Development Mode Enhancement: Auto-suffix
            if (process.env.NODE_ENV === 'development' && auto_suffix) {
                let suffix = 1;
                let baseEmail = email.split('@')[0];
                let domain = email.split('@')[1];
                let newEmail = `${baseEmail}+${suffix}@${domain}`;
                
                while ((await db.query('SELECT * FROM users WHERE email = $1', [newEmail])).rows.length > 0) {
                    suffix++;
                    newEmail = `${baseEmail}+${suffix}@${domain}`;
                }
                email = newEmail;
                console.log('[REGISTER] 🔄 Auto-suffixed email to:', email);
            } else {
                return res.status(409).json({ 
                    success: false,
                    error: "EMAIL_EXISTS",
                    message: 'This email is already registered. Please login or use a different email.' 
                });
            }
        }
        
        console.log('[REGISTER] 🔐 Hashing password...');
        // Hash password
        const password_hash = await hashPassword(password);
        console.log('[REGISTER] ✅ Password hashed');

        // Insert new user with 100 starting credits
        console.log('[REGISTER] 💾 Inserting user into database...');
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, skill_credits) VALUES ($1, $2, $3, 100) RETURNING id, name, email, reputation_score, skill_credits',
            [name, email, password_hash]
        );
        
        if (!newUser.rows[0]) {
            throw new Error('User insert returned no rows');
        }

        const user = newUser.rows[0];
        console.log('[REGISTER] ✅ User inserted successfully, ID:', user.id);
        
        console.log('[REGISTER] 🎫 Generating token...');
        const token = generateToken(user.id);
        console.log('[REGISTER] ✅ Token generated');

        console.log('[REGISTER] ✅ Registration successful for:', email);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('[REGISTER] ❌ Error:', error.message);
        console.error('[REGISTER] Stack:', error.stack);
        
        // Handle postgres unique constraint error just in case
        if (error.code === '23505') {
            console.log('[REGISTER] ℹ️  Duplicate email constraint');
            return res.status(409).json({ 
                success: false,
                error: "EMAIL_EXISTS",
                message: 'This email is already registered.' 
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
