const socketIo = require('socket.io');
const db = require('../config/db');

const initSockets = (server) => {
    // Setup socket.io with CORS for the frontend port
    const io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST']
        }
    });

    const auctionNamespace = io.of('/auctions');

    auctionNamespace.on('connection', (socket) => {
        console.log(`New client connected to auctions: ${socket.id}`);

        // Join an auction room based on auction ID
        socket.on('joinAuctionRoom', (auctionId) => {
            socket.join(`auction_${auctionId}`);
            console.log(`Client ${socket.id} joined room auction_${auctionId}`);
        });

        // Broadcast a new bid received
        socket.on('newBidPlaced', (data) => {
            const { auctionId, bidDetails, auctionTitle } = data;
            // Send to everyone in the room except the sender
            socket.to(`auction_${auctionId}`).emit('newBidReceived', bidDetails);
            
            // Broadcast global activity
            auctionNamespace.emit('newActivity', {
                type: 'bid',
                created_at: new Date(),
                auction_title: auctionTitle || 'Auction Interaction',
                value: bidDetails.credit_value_offered
            });
        });

        // Broadcast a manual timer update
        socket.on('auctionTimerSync', (data) => {
            const { auctionId, timeLeft } = data;
            socket.to(`auction_${auctionId}`).emit('auctionTimerUpdate', { timeLeft });
        });

        // Broadcast when auction ends natively
        socket.on('auctionEnded', (auctionId) => {
            auctionNamespace.to(`auction_${auctionId}`).emit('auctionEnded', { message: 'Auction has ended!' });
        });

        // Broadcast when the creator chooses a winner
        socket.on('bidWinnerSelected', (data) => {
            const { auctionId, winningBidId, auctionTitle } = data;
            auctionNamespace.to(`auction_${auctionId}`).emit('winnerSelected', { winningBidId });

            // Broadcast global activity
            auctionNamespace.emit('newActivity', {
                type: 'transaction',
                created_at: new Date(),
                auction_title: auctionTitle || 'Auction Interaction',
                value: 'Winner Chosen'
            });
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected from auctions: ${socket.id}`);
        });
    });

    // Chat Namespace for Transactions
    const chatNamespace = io.of('/chat');

    chatNamespace.on('connection', (socket) => {
        console.log(`New client connected to chat: ${socket.id}`);

        socket.on('joinRoom', (transactionId) => {
            socket.join(`chat_${transactionId}`);
            console.log(`Client ${socket.id} joined chat room chat_${transactionId}`);
        });

        socket.on('sendMessage', async (data) => {
            const { transactionId, senderId, senderName, text, timestamp } = data;
            
            try {
                // Save message to database
                await db.query(
                    'INSERT INTO messages (transaction_id, sender_id, text, created_at) VALUES ($1, $2, $3, $4)',
                    [transactionId, senderId, text, timestamp]
                );

                // Broadcast to others in the same chat room
                socket.to(`chat_${transactionId}`).emit('message', {
                    senderId,
                    senderName,
                    text,
                    timestamp
                });
            } catch (err) {
                console.error('Error saving chat message:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected from chat: ${socket.id}`);
        });
    });

    return io;
};

module.exports = initSockets;
