import React, { useEffect, useState } from 'react';

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
    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: 800 }}>Admin Dashboard</h1>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button className="btn btn-secondary">Platform Settings</button>
                        <button className="btn btn-primary">Generate Reports</button>
                    </div>
                </div>
                
                <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    <div className="stats-card">
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Users</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                            <AnimatedCounter end={12458} duration={2000} />
                        </div>
                        <div style={{ color: '#00D1FF', fontSize: '12px', marginTop: '8px' }}>↑ 12% this month</div>
                    </div>
                    <div className="stats-card">
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Active Auctions</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                            <AnimatedCounter end={342} duration={2000} />
                        </div>
                        <div style={{ color: '#00D1FF', fontSize: '12px', marginTop: '8px' }}>↑ 5% this week</div>
                    </div>
                    <div className="stats-card">
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Completed Exchanges</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                            <AnimatedCounter end={8921} duration={2000} />
                        </div>
                        <div style={{ color: '#00D1FF', fontSize: '12px', marginTop: '8px' }}>↑ 18% all time</div>
                    </div>
                    <div className="stats-card">
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Pending Disputes</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#FF5B5B' }}>14</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Requires attention</div>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Active Disputes</h3>
                        <div className="admin-table-container">
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Users Involved</th>
                                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>#DSP-8492</td>
                                        <td style={{ padding: '16px 8px' }}>Alex M. / Sarah T.</td>
                                        <td style={{ padding: '16px 8px' }}><span style={{ padding: '4px 8px', background: 'rgba(255, 91, 91, 0.1)', color: '#FF5B5B', borderRadius: '4px', fontSize: '12px' }}>Awaiting Review</span></td>
                                        <td style={{ padding: '16px 8px' }}><button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Resolve</button></td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>#DSP-8490</td>
                                        <td style={{ padding: '16px 8px' }}>David L. / Emma R.</td>
                                        <td style={{ padding: '16px 8px' }}><span style={{ padding: '4px 8px', background: 'rgba(255, 168, 0, 0.1)', color: '#FFA800', borderRadius: '4px', fontSize: '12px' }}>In Progress</span></td>
                                        <td style={{ padding: '16px 8px' }}><button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Details</button></td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>#DSP-8485</td>
                                        <td style={{ padding: '16px 8px' }}>John K. / Lisa W.</td>
                                        <td style={{ padding: '16px 8px' }}><span style={{ padding: '4px 8px', background: 'rgba(255, 168, 0, 0.1)', color: '#FFA800', borderRadius: '4px', fontSize: '12px' }}>In Progress</span></td>
                                        <td style={{ padding: '16px 8px' }}><button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Details</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>System Status</h3>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Server Load</span>
                                <span style={{ color: '#00D1FF' }}>42%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '42%', height: '100%', background: 'linear-gradient(90deg, #5B7CFF, #00D1FF)' }}></div>
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Database Capacity</span>
                                <span style={{ color: '#00D1FF' }}>78%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #5B7CFF, #00D1FF)' }}></div>
                            </div>
                        </div>
                        
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>API Rate Limit</span>
                                <span style={{ color: '#00D1FF' }}>25%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg, #5B7CFF, #00D1FF)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Admin;
