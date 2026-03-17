import axios from 'axios';

// The proxy in vite.config.js forwards '/api' to 'http://localhost:5000/api'
const api = axios.create({
    baseURL: '/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercept requests to inject the Bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercept responses to handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error("Unauthorized! Logging out...");
            localStorage.removeItem('token');
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

// Generic API wrapper
const apiService = {
    // Auth
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),

    // Auctions
    getAuctions: () => api.get('/auctions/all'),
    getAuctionById: (id) => api.get(`/auctions/${id}`),
    createAuction: (data) => api.post('/auctions/create', data),
    getDashboardData: () => api.get('/auctions/dashboard'),

    // Bids
    getBidsForAuction: (auctionId) => api.get(`/bids/auction/${auctionId}`),
    placeBid: (data) => api.post('/bids/place', data),
    acceptBid: (id) => api.put(`/bids/${id}/accept`),
    declineBid: (id) => api.put(`/bids/${id}/decline`),
    removeBid: (id) => api.delete(`/bids/${id}/remove`),

    // Users
    getUserProfile: (id) => api.get(`/users/profile/${id}`),
    getUserSkills: (id) => api.get(`/users/skills?userId=${id}`),
    getUserReputation: (id) => api.get(`/users/reputation/${id}`),
    getUserStats: () => api.get('/users/stats'),
    addSkill: (data) => api.post('/users/add-skill', data),
    removeSkill: (id) => api.delete(`/users/remove-skill/${id}`),
    generateSkillTest: (data) => api.post('/skills/generate-test', data),

    // Agents
    verifySkill: (data) => api.post('/agents/verify-skill', data),
    explainAuction: (data) => api.post('/agents/explain-auction', data),
    getLearningPath: (data) => api.post('/agents/learning-path', data),
    getArchitecture: () => api.get('/agents/architecture'),
    getAgentHealth: () => api.get('/agents/health'),

    // Transactions
    getTransactions: (id) => api.get(`/transactions/user/${id || ''}`),
    createTransaction: (data) => api.post('/transactions/create', data),
    completeTransaction: (data) => api.put('/transactions/complete', data),
    disputeTransaction: (data) => api.put('/transactions/dispute', data),

    // Activity
    getActivity: () => api.get('/activity'),

    // Chat
    getChatHistory: (transactionId) => api.get(`/chat/${transactionId}`),

    // Admin
    getAdminDashboard: () => api.get('/admin/dashboard'),
    getAdminUsers: () => api.get('/admin/users'),
    banAdminUser: (id) => api.put(`/admin/ban-user/${id}`),
    unbanAdminUser: (id) => api.put(`/admin/unban-user/${id}`),
    getAdminPendingSkills: () => api.get('/admin/skills/pending'),
    verifyAdminSkill: (id) => api.put(`/admin/skills/verify/${id}`),
    rejectAdminSkill: (id) => api.put(`/admin/skills/reject/${id}`),
    getAdminAuctions: () => api.get('/admin/auctions'),
    closeAdminAuction: (id) => api.put(`/admin/auctions/close/${id}`),
    deleteAdminAuction: (id) => api.delete(`/admin/auctions/${id}`),
    getAdminBids: () => api.get('/admin/bids'),
    getAdminTransactions: () => api.get('/admin/transactions'),
    resolveAdminDispute: (id) => api.put(`/admin/transactions/resolve/${id}`),
};

export default apiService;
