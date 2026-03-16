const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const dotenv = require('dotenv');

// Load environment config
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const initSockets = require('./src/sockets');
const io = initSockets(server);

// Security Middlewares
app.use(compression());
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
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

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is up and running', socketIo: 'Initialized' });
});

// Error Handling Middleware Boilerplate
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
