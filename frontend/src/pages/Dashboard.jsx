import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import useAuth from '../hooks/useAuth';
import { io } from 'socket.io-client';
import SkillVerifier from '../components/ai/SkillVerifier';
import TransactionChat from '../components/ai/TransactionChat';

const AnimatedCounter = ({ end, duration }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let current = 0;
        const range = end - 0;
        const increment = range / (duration / 16);
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setCount(Math.round(end));
                clearInterval(timer);
            } else {
                setCount(Math.round(current));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [end, duration]);

    return <span>{count}</span>;
};

const Dashboard = ({ onNavigate }) => {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({ skill_credits: 0, total_exchanges: 0, average_rating: 0 });
    const [dashboardData, setDashboardData] = useState({ activeAuctions: [], recentExchanges: [] });
    const [skills, setSkills] = useState([]);
    const [showAddSkill, setShowAddSkill] = useState(false);
    const [newSkill, setNewSkill] = useState({
        skill_name: '',
        skill_category: 'Design',
        skill_level: 'Beginner',
        portfolio_link: ''
    });
    const [adding, setAdding] = useState(false);
    const [activity, setActivity] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // { id, otherName }
    const [dataLoading, setDataLoading] = useState(true);
    const [message, setMessage] = useState(null); // { text, type: 'error' | 'success' }
    const [confirmingDelete, setConfirmingDelete] = useState(null); // skillId

    const showNotification = (text, type = 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    const fetchAllData = async () => {
        try {
            const [statsRes, dashRes, activityRes, skillsRes] = await Promise.all([
                apiService.getUserStats(),
                apiService.getDashboardData(),
                apiService.getActivity(),
                apiService.getUserSkills(user.id)
            ]);
            setStats(statsRes.data);
            setDashboardData(dashRes.data);
            setActivity(activityRes.data);
            setSkills(skillsRes.data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setDataLoading(false);
        }
    };

    // Redirect Effect
    useEffect(() => {
        if (!authLoading && !user) {
            const timer = setTimeout(() => onNavigate('login'), 3000);
            return () => clearTimeout(timer);
        }
    }, [authLoading, user, onNavigate]);

    useEffect(() => {
        if (user) {
            fetchAllData();

            // Sockets for real-time updates
            const socketUrl = window.location.origin.replace('5173', '5000') || 'http://localhost:5000';
            const socket = io(`${socketUrl}/auctions`, {
                path: '/socket.io'
            });

            socket.on('connect', () => {
                console.log('Connected to dashboard socket');
            });

            // Listen for global activity or user specific alerts
            socket.on('newActivity', (newAction) => {
                setActivity(prev => [newAction, ...prev].slice(0, 10));
            });

            // Custom listener for bids if the user is involved
            socket.on('newBidReceived', (data) => {
                // Refresh dashboard data if a bid affects current user's auctions
                fetchAllData();
            });

            return () => socket.disconnect();
        }
    }, [user]);

    const handleRemoveSkill = async (skillId) => {
        try {
            await apiService.removeSkill(skillId);
            setConfirmingDelete(null);
            fetchAllData();
            showNotification("Skill removed successfully", "success");
        } catch (err) {
            console.error("Error removing skill:", err);
            showNotification("Failed to remove skill. Please try again.");
        }
    };

    const handleAddSkill = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await apiService.addSkill({
                ...newSkill
            });
            setShowAddSkill(false);
            setNewSkill({ skill_name: '', skill_category: 'Design', skill_level: 'Beginner', portfolio_link: '' });
            
            // Refresh all dashboard data to sync stats and categories
            await fetchAllData(); 
        } catch (err) {
            console.error("Error adding skill:", err);
            showNotification("Error adding skill. Check if backend is running.");
        } finally {
            setAdding(false);
        }
    };

    // Multi-state UI Handling
    if (authLoading) {
        return (
            <div className="page active" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--neon-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
                <h2 style={{ color: 'var(--text-secondary)' }}>Verifying your identity...</h2>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="page active" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Access Restricted</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px' }}>
                    You are not logged in. Please log in to access your skills, swaps, and dashboard.
                </p>
                <button className="btn btn-primary" onClick={() => onNavigate('login')} style={{ padding: '12px 32px' }}>
                    Go to Login
                </button>
                <p style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Redirecting to login shortly...</p>
            </div>
        );
    }

    if (dataLoading) {
        return (
            <div className="page active" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--neon-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
                <h2 style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</h2>
            </div>
        );
    }

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            {/* Global Notification Banner */}
            {message && (
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    right: '40px',
                    zIndex: 2000,
                    padding: '16px 24px',
                    borderRadius: '12px',
                    background: message.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    animation: 'slideInRight 0.3s ease'
                }}>
                    <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
                    {message.text}
                </div>
            )}

            <section className="section">
                <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '40px' }}>Your Dashboard</h1>
                
                <div className="dashboard-grid">
                    <div className="profile-card">
                        <div className="profile-avatar">{initials}</div>
                        <div className="profile-name">{user?.name}</div>
                        <div className="profile-email">{user?.email}</div>
                        <div className="reputation" style={{ justifyContent: 'center', fontSize: '18px', marginBottom: '24px' }}>⭐ {stats.average_rating} ({stats.total_exchanges} exchanges)</div>
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('profile')}>View Profile</button>
                    </div>
                    
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Your Stats</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value">
                                    <AnimatedCounter end={stats.skill_credits} duration={2000} />
                                </div>
                                <div className="stat-label">Skill Credits</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">
                                    <AnimatedCounter end={stats.total_exchanges} duration={2000} />
                                </div>
                                <div className="stat-label">Exchanges</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">{stats.average_rating}</div>
                                <div className="stat-label">Rating</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '40px' }}>
                    <div className="stats-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px' }}>Your Expertise</h3>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => setShowAddSkill(true)}
                                style={{ 
                                    boxShadow: '0 0 15px rgba(91, 124, 255, 0.4)',
                                    animation: 'pulse 2s infinite'
                                }}
                            >
                                ✨ Add New Skill
                            </button>
                        </div>

                        {showAddSkill && (
                            <div className="auction-detail-card" style={{ marginBottom: '32px', border: '1px solid var(--neon-blue)', padding: '24px', background: 'rgba(0, 209, 255, 0.05)' }}>
                                <h4 style={{ marginBottom: '20px' }}>What are you good at?</h4>
                                <form onSubmit={handleAddSkill}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Skill Name</label>
                                            <input 
                                                type="text" 
                                                className="search-input" 
                                                placeholder="e.g. React, UX Design" 
                                                style={{ width: '100%' }}
                                                value={newSkill.skill_name}
                                                onChange={e => setNewSkill({...newSkill, skill_name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Category</label>
                                            <select 
                                                className="filter-select" 
                                                style={{ width: '100%', height: '44px', color: 'white', background: 'rgba(255,255,255,0.05)' }}
                                                value={newSkill.skill_category}
                                                onChange={e => {
                                                    console.log("Category changed to:", e.target.value);
                                                    setNewSkill({...newSkill, skill_category: e.target.value});
                                                }}
                                            >
                                                <option value="Design">Design</option>
                                                <option value="Development">Development</option>
                                                <option value="Marketing">Marketing</option>
                                                <option value="Writing">Writing</option>
                                                <option value="Video">Video</option>
                                                <option value="Data Science">Data Science</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button type="submit" className="btn btn-primary" disabled={adding}>
                                            {adding ? 'Adding...' : 'Save Skill'}
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddSkill(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {/* Verified Skills */}
                            <div className="verified-skills-list">
                                <h4 style={{ fontSize: '16px', color: 'var(--neon-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🛡️</span> Verified Expertise ({skills.filter(s => s.verified).length})
                                </h4>
                                {skills.filter(s => s.verified).length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                        {skills.filter(s => s.verified).map(skill => (
                                            <div key={skill.id} style={{ 
                                                padding: '16px 20px', 
                                                background: 'rgba(0, 209, 255, 0.05)', 
                                                borderRadius: '12px', 
                                                border: '1px solid rgba(0, 209, 255, 0.3)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontWeight: 600 }}>{skill.skill_name}</span>
                                                    <span style={{ fontSize: '12px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>✓ Verified</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {confirmingDelete === skill.id ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleRemoveSkill(skill.id)}
                                                                style={{ padding: '4px 12px', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', fontSize: '11px', cursor: 'pointer' }}
                                                            >
                                                                Delete
                                                            </button>
                                                            <button 
                                                                onClick={() => setConfirmingDelete(null)}
                                                                style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '11px', cursor: 'pointer' }}
                                                            >
                                                                Back
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setConfirmingDelete(skill.id)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px', opacity: 0.7 }}
                                                            title="Remove Skill"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: '#666', fontSize: '14px', fontStyle: 'italic', paddingLeft: '8px' }}>No skills verified yet.</div>
                                )}
                            </div>

                            {/* Unverified Skills */}
                            <div className="unverified-skills-list">
                                <h4 style={{ fontSize: '16px', color: '#A0A4B8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⏳</span> Verification Needed ({skills.filter(s => !s.verified).length})
                                </h4>
                                {skills.filter(s => !s.verified).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {skills.filter(s => !s.verified).map(skill => (
                                            <div key={skill.id} style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{skill.skill_name}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ color: '#A0A4B8', fontSize: '12px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{skill.skill_category}</span>
                                                        {confirmingDelete === skill.id ? (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button 
                                                                    onClick={() => handleRemoveSkill(skill.id)}
                                                                    style={{ padding: '4px 8px', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', fontSize: '10px', cursor: 'pointer' }}
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmingDelete(null)}
                                                                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '10px', cursor: 'pointer' }}
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setConfirmingDelete(skill.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', opacity: 0.6 }}
                                                                title="Remove Skill"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <SkillVerifier skillName={skill.skill_name} userId={user.id} onVerified={fetchAllData} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                        {skills.length === 0 ? "Add your first skill to start swapping." : "All your skills are verified! 🚀"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', justifyContent: 'center', height: '50px', fontSize: '16px' }}
                                onClick={() => onNavigate('create-auction')}
                            >
                                🎯 Request a Skill Swap
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ width: '100%', justifyContent: 'center', height: '50px' }}
                                onClick={() => onNavigate('marketplace')}
                            >
                                🔍 Browse Open Requests
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ width: '100%', justifyContent: 'center', height: '50px', background: 'rgba(91, 124, 255, 0.05)', border: '1px solid rgba(91, 124, 255, 0.2)' }}
                                onClick={() => onNavigate('learning-path')}
                            >
                                🗺️ View My Learning Path
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ width: '100%', justifyContent: 'center', height: '50px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                                onClick={() => onNavigate('skill-test')}
                            >
                                🏆 Verify My Skills
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '40px' }}>
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Active Auctions ({dashboardData.activeAuctions.length})</h3>
                        {dashboardData.activeAuctions.length > 0 ? dashboardData.activeAuctions.map(auction => (
                            <div key={auction.id} className="auction-card" style={{ marginBottom: '16px' }}>
                                <div className="auction-title">{auction.title}</div>
                                <div className="auction-category">{auction.skill_category}</div>
                                <div className="auction-stats">
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Bids</div>
                                        <div className="auction-stat-value">{auction.total_bids}</div>
                                    </div>
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Ends</div>
                                        <div className="countdown-timer">{new Date(auction.auction_end_time).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No active auctions.</div>
                        )}
                    </div>
                    
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Skill Swap Connections ({dashboardData.recentExchanges.length})</h3>
                        {dashboardData.recentExchanges.length > 0 ? dashboardData.recentExchanges.map(tx => {
                            const otherName = tx.creator_id === user.id ? tx.winner_name : tx.creator_name;
                            return (
                                <div key={tx.id} className="auction-card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div className="auction-title">{tx.title}</div>
                                        <div className="auction-category">Swap with <span style={{ color: 'var(--neon-blue)' }}>{otherName}</span></div>
                                        <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            Status: <span style={{ color: tx.status === 'completed' ? '#22c55e' : '#FFD700' }}>{tx.status}</span>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ padding: '8px 16px', fontSize: '12px', background: 'rgba(0, 209, 255, 0.1)', border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)' }}
                                        onClick={() => setActiveChat({ id: tx.id, otherName })}
                                    >
                                        💬 Chat
                                    </button>
                                </div>
                            );
                        }) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No active connections yet.</div>
                        )}
                    </div>
                </div>
                
                {activeChat && (
                    <TransactionChat 
                        transactionId={activeChat.id} 
                        otherUserName={activeChat.otherName} 
                        onClose={() => setActiveChat(null)} 
                    />
                )}
                
                <div className="activity-feed">
                    <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Recent Activity</h3>
                    {activity.length > 0 ? activity.map((item, index) => {
                        const timeAgo = (dateStr) => {
                            const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
                            if (diff < 60) return `${diff}s ago`;
                            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                            return `${Math.floor(diff / 86400)}d ago`;
                        };

                        const icon = item.type === 'bid_placed' ? '➡️' : item.type === 'bid_received' ? '📥' : '🔁';
                        const label = item.type === 'bid_placed'
                            ? <><strong>You bid</strong> on &quot;{item.auction_title}&quot; — {item.credit_value} credits for <em>{item.skill_offered}</em> (to {item.other_user_name})</>
                            : item.type === 'bid_received'
                            ? <><strong>{item.other_user_name}</strong> bid on your &quot;{item.auction_title}&quot; — {item.credit_value} credits for <em>{item.skill_offered}</em></>
                            : <>Exchange for &quot;{item.auction_title}&quot; with <strong>{item.other_user_name}</strong> — <span style={{ color: item.status === 'completed' ? '#22c55e' : '#fbbf24' }}>{item.status}</span></>;

                        return (
                            <div key={index} className="activity-item">
                                <div className="activity-icon">{icon}</div>
                                <div className="activity-content">
                                    <div className="activity-title" style={{ lineHeight: 1.5 }}>{label}</div>
                                    <div className="activity-time">{timeAgo(item.created_at)}</div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No recent activity.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
