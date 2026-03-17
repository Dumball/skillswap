import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

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

const Admin = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await apiService.getAdminDashboard();
            setStats(res.data.data);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const loadUsers = async () => {
        try { const res = await apiService.getAdminUsers(); setUsers(res.data.data); } catch (e) { console.error(e); }
    };

    const loadAuctions = async () => {
        try { const res = await apiService.getAdminAuctions(); setAuctions(res.data.data); } catch (e) { console.error(e); }
    };

    const loadSkills = async () => {
        try { const res = await apiService.getAdminPendingSkills(); setSkills(res.data.data); } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (activeTab === 'dashboard') loadDashboard();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'auctions') loadAuctions();
        if (activeTab === 'skills') loadSkills();
    }, [activeTab]);

    const handleBan = async (id, currentStatus) => {
        try {
            if (currentStatus === 'active') await apiService.banAdminUser(id);
            else await apiService.unbanAdminUser(id);
            loadUsers();
        } catch (e) { alert('Failed to change user status'); }
    };

    const handleVerifySkill = async (id, approve) => {
        try {
            if (approve) await apiService.verifyAdminSkill(id);
            else await apiService.rejectAdminSkill(id);
            loadSkills();
        } catch (e) { alert('Failed to moderate skill'); }
    };

    const handleDeleteAuction = async (id) => {
        if (!window.confirm("Delete this auction?")) return;
        try {
            await apiService.deleteAdminAuction(id);
            loadAuctions();
        } catch (e) { alert('Failed to delete auction'); }
    };

    const handleCloseAuction = async (id) => {
        if (!window.confirm("Force close this auction?")) return;
        try {
            await apiService.closeAdminAuction(id);
            loadAuctions();
        } catch (e) { alert('Failed to close auction'); }
    };

    if (loading && activeTab === 'dashboard') return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Admin Panel...</div>;

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, paddingBottom: '100px' }}>
            <section className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: 800 }}>Admin Panel</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={activeTab === 'dashboard' ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab('dashboard')}>Metrics</button>
                        <button className={activeTab === 'users' ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab('users')}>Users</button>
                        <button className={activeTab === 'auctions' ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab('auctions')}>Auctions</button>
                        <button className={activeTab === 'skills' ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab('skills')}>Skills</button>
                    </div>
                </div>
                
                {activeTab === 'dashboard' && stats && (
                    <>
                        <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Users</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.total_users} duration={1000} />
                                </div>
                            </div>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Active Auctions</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.active_auctions} duration={1000} />
                                </div>
                            </div>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Completed Exchanges</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.completed_auctions} duration={1000} />
                                </div>
                            </div>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Auctions</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.total_auctions} duration={1000} />
                                </div>
                            </div>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Bids Placed</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.total_bids} duration={1000} />
                                </div>
                            </div>
                            <div className="stats-card">
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Transactions</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                                    <AnimatedCounter end={stats.total_transactions} duration={1000} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'users' && (
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>User Management</h3>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Name</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Email</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Status</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '16px 8px' }}>{u.name} {u.role === 'admin' ? '🛡️' : ''}</td>
                                        <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>{u.email}</td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <span style={{ color: u.status === 'banned' ? '#FF5B5B' : '#00D1FF' }}>{u.status}</span>
                                        </td>
                                        <td style={{ padding: '16px 8px' }}>
                                            {u.role !== 'admin' && (
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                    onClick={() => handleBan(u.id, u.status)}
                                                >
                                                    {u.status === 'active' ? 'Ban' : 'Unban'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'skills' && (
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Pending Skill Verifications</h3>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>User</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Skill</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Level</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {skills.length === 0 ? <tr><td colSpan="4" style={{ padding: '16px 8px' }}>No pending skills.</td></tr> : null}
                                {skills.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '16px 8px' }}>{s.user_name}</td>
                                        <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{s.skill_name}</td>
                                        <td style={{ padding: '16px 8px' }}>{s.skill_level}</td>
                                        <td style={{ padding: '16px 8px', display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleVerifySkill(s.id, true)}>Verify</button>
                                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleVerifySkill(s.id, false)}>Reject</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'auctions' && (
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Auction Moderation</h3>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Creator</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Title</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Status</th>
                                    <th style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auctions.map(a => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '16px 8px' }}>{a.creator_name}</td>
                                        <td style={{ padding: '16px 8px' }}>{a.title}</td>
                                        <td style={{ padding: '16px 8px' }}>{a.status}</td>
                                        <td style={{ padding: '16px 8px', display: 'flex', gap: '8px' }}>
                                            {a.status === 'active' && <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleCloseAuction(a.id)}>Force Close</button>}
                                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 91, 91, 0.1)', color: '#FF5B5B' }} onClick={() => handleDeleteAuction(a.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Admin;
