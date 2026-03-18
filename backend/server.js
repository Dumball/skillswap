const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const dotenv = require('dotenv');

// Load environment config
dotenv.config();

// Load database initialization
const { initDatabase } = require('./src/config/db');

// Initialize express app
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.io
const initSockets = require('./src/sockets');
const io = initSockets(server);

// Security Middlewares
app.use(compression());
app.use(helmet());

// CORS Configuration - Allow frontend and localhost for development
const corsOptions = {
    origin: '*', // Allow all origins for now (can restrict to FRONTEND_URL later)
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Log CORS info
console.log('\n[CORS] Configuration:')
console.log('[CORS] Allowed origins: *')
console.log('[CORS] Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH')
console.log('[CORS] Headers: Content-Type, Authorization, Accept\n');
app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // Increased for development
    message: 'Too many requests from this IP, please try again after 1 minute.',
});
app.use('/api/', apiLimiter);

// Load API Routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const auctionRoutes = require('./src/routes/auctionRoutes');
const bidRoutes = require('./src/routes/bidRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const ratingRoutes = require('./src/routes/ratingRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); // Includes credits too
const agentRoutes = require('./src/routes/agentRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const skillRoutes = require('./src/routes/skillRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', adminRoutes); // Reusing the router for /credits/list
app.use('/api/agents', agentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/chat', chatRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is up and running', socketIo: 'Initialized' });
});

// Error Handling Middleware Boilerplate
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

console.log('\n' + '='.repeat(50));
console.log('🚀 SkillSwap Backend Server Starting...');
console.log('='.repeat(50));
console.log('📌 Environment:', process.env.NODE_ENV || 'development');
console.log('📌 Port:', PORT);
console.log('📌 Frontend URL:', process.env.FRONTEND_URL || 'any origin');
console.log('='.repeat(50) + '\n');

// Start server and initialize database
const startServer = async () => {
    console.log('🔄 Initializing database...');
    await initDatabase();
    
    server.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 Register: POST http://localhost:${PORT}/api/auth/register`);
        console.log(`🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
    });
};

startServer();
