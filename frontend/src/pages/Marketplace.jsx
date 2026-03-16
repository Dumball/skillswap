import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

const Marketplace = ({ onNavigate }) => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuctions = async () => {
            try {
                const res = await apiService.getAuctions();
                setAuctions(res.data);
            } catch (err) {
                console.error("Failed to fetch auctions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAuctions();
    }, []);

    const calculateTimeLeft = (endTime) => {
        const total = Date.parse(endTime) - Date.parse(new Date());
        if (total <= 0) return "Ended";
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '40px' }}>Live Auctions Marketplace</h1>
                
                <div className="marketplace-header">
                    <div className="filter-bar">
                        <input type="text" className="search-input" placeholder="Search auctions by skill or category..." />
                        <select className="filter-select" id="category-filter">
                            <option value="all">All Categories</option>
                            <option value="design">Design</option>
                            <option value="development">Development</option>
                            <option value="marketing">Marketing</option>
                            <option value="writing">Writing</option>
                            <option value="video">Video</option>
                        </select>
                        <select className="filter-select" id="sort-filter">
                            <option value="recent">Most Recent</option>
                            <option value="bids">Most Bids</option>
                            <option value="ending">Ending Soon</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', margin: '40px 0' }}>Loading live marketplace...</div>
                ) : (
                    <div className="auction-grid">
                        {auctions.map((auction) => (
                            <div key={auction.id} className="auction-card" onClick={() => { localStorage.setItem('currentAuctionId', auction.id); onNavigate('auction-detail'); }}>
                                <div className="auction-header">
                                    <div>
                                        <div className="auction-title">{auction.title}</div>
                                        <div className="auction-category">{auction.skill_category} • Min {auction.minimum_credit_value} Effort</div>
                                    </div>
                                </div>
                                <div className="auction-stats">
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Bids</div>
                                        <div className="auction-stat-value">{auction.total_bids}</div>
                                    </div>
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Time Left</div>
                                        <div className="countdown-timer">{calculateTimeLeft(auction.auction_end_time)}</div>
                                    </div>
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Creator Rep</div>
                                        <div className="reputation">⭐ {auction.creator_reputation || '0.00'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {auctions.length === 0 && <div style={{width: '100%', textAlign: 'center', color: 'var(--text-secondary)'}}>No active auctions at the moment.</div>}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Marketplace;
