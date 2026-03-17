import React, { useEffect, useState, useContext } from 'react';
import apiService from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import AuctionAIExplainer from '../components/ai/AuctionAIExplainer';

const AuctionDetail = () => {
    const { user } = useContext(AuthContext);
    const auctionId = localStorage.getItem('currentAuctionId');
    const [auction, setAuction] = useState(null);
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, message: '', onConfirm: null });
    
    // Bid form state
    const [bidAmount, setBidAmount] = useState('');
    const [bidDescription, setBidDescription] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!auctionId) return;

        // 1. Fetch Auction Details and initial Bids
        const fetchData = async () => {
            try {
                const [auctionRes, bidsRes] = await Promise.all([
                    apiService.getAuctionById(auctionId),
                    apiService.getBidsForAuction(auctionId)
                ]);
                setAuction(auctionRes.data);
                setBids(bidsRes.data);
            } catch (err) {
                console.error("Failed to fetch auction/bids", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // 2. Setup Socket.io connection for realtime updates
        const socket = io('/auctions'); // Uses proxy in vite.config.js
        
        socket.on('connect', () => {
            console.log('Connected to auction socket:', socket.id);
            socket.emit('joinAuctionRoom', auctionId);
        });

        socket.on('newBidReceived', (newBid) => {
            console.log("Socket: New bid received!", newBid);
            // Append incoming live bid to top of list
            setBids(prev => [newBid, ...prev]);
        });
        
        socket.on('winnerSelected', () => {
            // Trigger refresh or update state visually
            fetchData();
        });

        return () => {
            socket.disconnect();
        };
    }, [auctionId]);

    const handlePlaceBid = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await apiService.placeBid({
                auction_id: auctionId,
                skill_offered: auction.skill_required, // Defaulting to the required skill for now
                credit_value: parseInt(bidAmount),
                description: bidDescription
            });
            
            console.log('Bid placed successfully:', res.data.bid);
            setBids(prev => [res.data.bid, ...prev]);
            setBidAmount('');
            setBidDescription('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place bid');
        }
    };

    const handleAcceptBid = (bidId) => {
        setConfirmConfig({
            show: true,
            message: "Are you sure you want to accept this bid? This will close the auction and decline all other offers.",
            onConfirm: async () => {
                try {
                    await apiService.acceptBid(bidId);
                    // Refresh data
                    const [auctionRes, bidsRes] = await Promise.all([
                        apiService.getAuctionById(auctionId),
                        apiService.getBidsForAuction(auctionId)
                    ]);
                    setAuction(auctionRes.data);
                    setBids(bidsRes.data);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to accept bid');
                }
            }
        });
    };

    const handleDeclineBid = (bidId) => {
        setConfirmConfig({
            show: true,
            message: "Are you sure you want to decline this offer?",
            onConfirm: async () => {
                try {
                    await apiService.declineBid(bidId);
                    setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: 'declined' } : b));
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to decline bid');
                }
            }
        });
    };

    const handleRemoveBid = (bidId) => {
        setConfirmConfig({
            show: true,
            message: "Are you sure you want to remove your bid?",
            onConfirm: async () => {
                try {
                    await apiService.removeBid(bidId);
                    setBids(prev => prev.filter(b => b.id !== bidId));
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to remove bid');
                }
            }
        });
    };

    const calculateTimeLeft = (endTime) => {
        const total = Date.parse(endTime) - Date.parse(new Date());
        if (total <= 0) return "Auction Ended";
        const d = Math.floor(total / (1000 * 60 * 60 * 24));
        const h = Math.floor((total / (1000 * 60 * 60)) % 24);
        const m = Math.floor((total / 1000 / 60) % 60);
        return `${d}d ${h}h ${m}m`;
    };

    if (loading) return <div style={{textAlign:'center', marginTop: '100px'}}>Loading Auction Details...</div>;
    if (!auction) return <div style={{textAlign:'center', marginTop: '100px'}}>Auction not found.</div>;

    const initials = auction.creator_name ? auction.creator_name.split(' ').map(n=>n[0]).join('') : 'U';

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                <div className="auction-detail-grid">
                    <div>
                        <div className="auction-detail-card">
                            <div className="auction-detail-header">
                                <div className="auction-category">{auction.skill_category}</div>
                                <h1 className="auction-detail-title">{auction.title}</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.6 }}>
                                    {auction.description}
                                </p>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                                <div className="stat-item">
                                    <div className="stat-value">{auction.minimum_credit_value}</div>
                                    <div className="stat-label">Min Skill Effort</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{bids.length}</div>
                                    <div className="stat-label">Total Offers</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value countdown-timer" style={{fontSize: '20px'}}>{calculateTimeLeft(auction.auction_end_time)}</div>
                                    <div className="stat-label">Time Left</div>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--card-border)' }}>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Exchange Requested by</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '24px' }}>{initials}</div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{auction.creator_name || 'Anonymous User'}</div>
                                        <div className="reputation">⭐ {auction.creator_reputation || '0.0'} reputation</div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Explainer Panel */}
                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--card-border)' }}>
                                <AuctionAIExplainer
                                    auctionId={auctionId}
                                    auctionTitle={auction.title}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="bidding-panel">
                            {user && user.id !== auction.creator_id && auction.status === 'active' && (
                                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--card-border)' }}>
                                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Offer Your Skill</h3>
                                    <p style={{ fontSize: '13px', color: '#A0A4B8', marginBottom: '20px' }}>Describe how you can help with "{auction.skill_required}"</p>
                                    {error && <div style={{color:'#ff4d4d', fontSize:'14px', marginBottom:'10px'}}>{error}</div>}
                                    <form onSubmit={handlePlaceBid}>
                                        <textarea 
                                            placeholder="Detail your offer... What exactly will you do for this user?" 
                                            value={bidDescription}
                                            onChange={e => setBidDescription(e.target.value)}
                                            required
                                            rows="4"
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px', marginBottom: '16px', resize: 'vertical' }}
                                        ></textarea>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#A0A4B8' }}>Est. Effort (Equivalent to Credits)</label>
                                        <input 
                                            type="number" 
                                            placeholder="e.g. 150" 
                                            value={bidAmount}
                                            onChange={e => setBidAmount(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px', marginBottom: '20px' }}
                                        />
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '50px' }}>Send Skill Offer</button>
                                    </form>
                                </div>
                            )}

                            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Current Offers ({bids.length})</h3>
                            <div id="bids-container" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                {bids.length === 0 ? <div style={{color:'var(--text-secondary)'}}>No bids yet. Be the first!</div> : null}
                                {bids.map((bidder) => {
                                    const bidderInitials = bidder.bidder_name ? bidder.bidder_name.split(' ').map(n => n[0]).join('') : 'U';
                                    return (
                                        <div key={bidder.id} className="bid-item" style={{ animationDelay: `0.1s` }}>
                                            <div className="bid-header">
                                                <div className="bidder-avatar">{bidderInitials}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div className="bidder-name">{bidder.bidder_name || 'User'}</div>
                                                    <div className="reputation">⭐ {bidder.bidder_reputation || '0.0'}</div>
                                                </div>
                                                {user && user.id === auction.creator_id && auction.status === 'active' && bidder.status !== 'declined' && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => handleAcceptBid(bidder.id)}
                                                            className="btn" 
                                                            style={{padding: '6px 12px', fontSize: '11px', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}
                                                        >
                                                            Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeclineBid(bidder.id)}
                                                            className="btn" 
                                                            style={{padding: '6px 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontWeight: 500}}
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}
                                                {user && user.id === bidder.bidder_id && auction.status === 'active' && (
                                                    <button 
                                                        onClick={() => handleRemoveBid(bidder.id)}
                                                        className="btn" 
                                                        style={{padding: '6px 12px', fontSize: '11px', background: 'rgba(160, 164, 184, 0.1)', color: '#A0A4B8', border: '1px solid #A0A4B8', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                {bidder.status !== 'pending' && (
                                                    <span style={{ 
                                                        padding: '4px 8px', 
                                                        borderRadius: '4px', 
                                                        fontSize: '10px', 
                                                        fontWeight: 700, 
                                                        textTransform: 'uppercase',
                                                        background: bidder.status === 'accepted' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: bidder.status === 'accepted' ? '#22c55e' : '#ef4444',
                                                        border: `1px solid ${bidder.status === 'accepted' ? '#22c55e' : '#ef4444'}`
                                                    }}>
                                                        {bidder.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="bid-offer" style={{ color: '#E0E4F0' }}>{bidder.description}</div>
                                            <div className="bid-credits" style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>Value: {bidder.credit_value} Effort</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {confirmConfig.show && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 50 }}>
                    <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '400px' }}>
                        <p style={{ color: 'white', marginBottom: '16px' }}>{confirmConfig.message}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setConfirmConfig({ show: false, message: '', onConfirm: null })}
                                style={{ padding: '8px 16px', color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    confirmConfig.onConfirm();
                                    setConfirmConfig({ show: false, message: '', onConfirm: null });
                                }}
                                style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctionDetail;
