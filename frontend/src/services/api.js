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

    // Users
    getUserProfile: (id) => api.get(`/users/profile/${id}`),
    getUserSkills: (id) => api.get(`/users/skills?userId=${id}`),
    getUserReputation: (id) => api.get(`/users/reputation/${id}`),
    getUserStats: () => api.get('/users/stats'),
    addSkill: (data) => api.post('/users/add-skill', data),
    removeSkill: (id) => api.delete(`/users/remove-skill/${id}`),

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
};

export default apiService;
