import React, { useEffect, useRef, useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';
import SkillVerifier from '../components/ai/SkillVerifier';

const Profile = ({ onNavigate }) => {
    const radarCanvasRef = useRef(null);
    const { user, loading: authLoading } = useContext(AuthContext);
    const [skills, setSkills] = useState([]);
    const [reputationData, setReputationData] = useState({ reviews: [], total_reviews: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user?.id) {
                try {
                    const [skillsRes, repRes] = await Promise.all([
                        apiService.getUserSkills(user.id),
                        apiService.getUserReputation(user.id)
                    ]);
                    setSkills(skillsRes.data);
                    setReputationData(repRes.data);
                } catch (error) {
                    console.error("Error fetching profile data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfileData();
    }, [user]);

    useEffect(() => {
        const radarCanvas = radarCanvasRef.current;
        if (radarCanvas && skills.length > 0) {
            const radarCtx = radarCanvas.getContext('2d');
            
            const handleResize = () => {
                radarCanvas.width = radarCanvas.offsetWidth;
                radarCanvas.height = 400;

                // Aggregate skills by category for the radar chart
                const categoryStats = skills.reduce((acc, skill) => {
                    const cat = skill.skill_category;
                    if (!acc[cat]) acc[cat] = { sum: 0, count: 0 };
                    // Map level string (Beginner, Intermediate, Expert) to numeric values
                    const levelMap = { 'Beginner': 40, 'Intermediate': 70, 'Expert': 100 };
                    acc[cat].sum += levelMap[skill.skill_level] || 50;
                    acc[cat].count += 1;
                    return acc;
                }, {});

                const labels = Object.keys(categoryStats);
                const values = labels.map(label => categoryStats[label].sum / categoryStats[label].count);

                if (labels.length < 3) {
                    // Padding if user has fewer than 3 categories for a better radar look
                    const padding = ['Creativity', 'Logic', 'Strategy'].filter(l => !labels.includes(l));
                    labels.push(...padding.slice(0, 3 - labels.length));
                    while (values.length < labels.length) values.push(20);
                }

                const radarData = { labels, values };

                const centerX = radarCanvas.width / 2;
                const centerY = radarCanvas.height / 2;
                const maxRadius = Math.max(Math.min(centerX, centerY) - 60, 50);
                const levels = 5;
                const angleStep = (Math.PI * 2) / radarData.labels.length;

                // Draw grid
                radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                radarCtx.lineWidth = 1;
                
                for (let level = 1; level <= levels; level++) {
                    radarCtx.beginPath();
                    const radius = (maxRadius / levels) * level;
                    for (let i = 0; i <= radarData.labels.length; i++) {
                        const angle = angleStep * i - Math.PI / 2;
                        const x = centerX + Math.cos(angle) * radius;
                        const y = centerY + Math.sin(angle) * radius;
                        if (i === 0) radarCtx.moveTo(x, y);
                        else radarCtx.lineTo(x, y);
                    }
                    radarCtx.closePath();
                    radarCtx.stroke();
                }

                // Draw axes
                for (let i = 0; i < radarData.labels.length; i++) {
                    const angle = angleStep * i - Math.PI / 2;
                    const x = centerX + Math.cos(angle) * maxRadius;
                    const y = centerY + Math.sin(angle) * maxRadius;
                    
                    radarCtx.beginPath();
                    radarCtx.moveTo(centerX, centerY);
                    radarCtx.lineTo(x, y);
                    radarCtx.stroke();
                    
                    // Labels
                    radarCtx.fillStyle = '#A0A4B8';
                    radarCtx.font = '14px Inter';
                    radarCtx.textAlign = 'center';
                    radarCtx.textBaseline = 'middle';
                    const labelX = centerX + Math.cos(angle) * (maxRadius + 30);
                    const labelY = centerY + Math.sin(angle) * (maxRadius + 30);
                    radarCtx.fillText(radarData.labels[i], labelX, labelY);
                }

                // Draw data
                const gradient = radarCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(maxRadius, 1));
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                gradient.addColorStop(1, 'rgba(122, 92, 255, 0.2)');
                radarCtx.fillStyle = gradient;
                radarCtx.strokeStyle = '#5B7CFF';
                radarCtx.lineWidth = 3;

                radarCtx.beginPath();
                for (let i = 0; i <= radarData.values.length; i++) {
                    const index = i % radarData.values.length;
                    const value = radarData.values[index];
                    const angle = angleStep * index - Math.PI / 2;
                    const radius = (maxRadius * value) / 100;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    
                    if (i === 0) radarCtx.moveTo(x, y);
                    else radarCtx.lineTo(x, y);
                }
                radarCtx.closePath();
                radarCtx.fill();
                radarCtx.stroke();

                // Draw points
                for (let i = 0; i < radarData.values.length; i++) {
                    const value = radarData.values[i];
                    const angle = angleStep * i - Math.PI / 2;
                    const radius = (maxRadius * value) / 100;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    
                    radarCtx.fillStyle = '#5B7CFF';
                    radarCtx.beginPath();
                    radarCtx.arc(x, y, 6, 0, Math.PI * 2);
                    radarCtx.fill();
                    
                    radarCtx.fillStyle = '#FFFFFF';
                    radarCtx.beginPath();
                    radarCtx.arc(x, y, 3, 0, Math.PI * 2);
                    radarCtx.fill();
                }
            };
            
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [radarCanvasRef, skills]);

    if (authLoading || loading) return <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><h2>Loading Profile...</h2></div>;

    if (!user) {
        return (
            <div className="page active" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h2 style={{ marginBottom: '20px' }}>Please login to view your profile</h2>
                <button className="btn btn-primary" onClick={() => onNavigate('login')}>Login</button>
            </div>
        );
    }

    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: 800 }}>Profile Overview</h1>
                    <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>Go to Dashboard</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '40px', marginBottom: '40px' }}>
                    <div className="profile-card">
                        <div className="profile-avatar" style={{ width: '120px', height: '120px', fontSize: '48px', marginBottom: '24px' }}>{initials}</div>
                        <div className="profile-name">{user.name}</div>
                        <div className="profile-email">{user.email}</div>
                        <div className="reputation" style={{ justifyContent: 'center', fontSize: '18px', marginBottom: '24px' }}>
                            ⭐ {user.reputation_score || '0.00'} Reputation
                        </div>
                        <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '24px' }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Active Member</div>
                            <div style={{ color: '#A0A4B8', fontSize: '14px' }}>Role: {user.role || 'User'}</div>
                        </div>
                        <button className="btn btn-secondary" style={{ width: '100%' }}>Edit Profile Settings</button>
                    </div>
                    
                    <div className="stats-card">
                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Skill Radar</h3>
                        {skills.length > 0 ? (
                            <canvas id="radar-chart" ref={radarCanvasRef} style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: 'block' }}></canvas>
                        ) : (
                            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                Add skills to see your radar chart!
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="stats-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '20px' }}>Your Verified Skills</h3>
                        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Manage Skills</button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                        {skills.filter(s => s.verified).length > 0 ? skills.filter(s => s.verified).map(skill => (
                            <div key={skill.id} style={{ width: '100%', marginBottom: '16px', padding: '20px', background: 'rgba(0, 209, 255, 0.05)', borderRadius: '16px', border: '1px solid var(--primary-blue)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{skill.skill_name}</div>
                                        <div style={{ padding: '4px 10px', background: 'rgba(0, 209, 255, 0.1)', color: '#00D1FF', borderRadius: '6px', fontSize: '12px' }}>{skill.skill_level}</div>
                                        <div style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '16px' }}>✓</span> Verified</div>
                                    </div>
                                    <div style={{ color: '#A0A4B8', fontSize: '14px' }}>{skill.skill_category}</div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ color: 'var(--text-secondary)', width: '100%', textAlign: 'center', padding: '20px' }}>
                                No verified skills yet. Head to the <span style={{ color: 'var(--primary-blue)', cursor: 'pointer' }} onClick={() => onNavigate('dashboard')}>Dashboard</span> to verify your expertise!
                            </div>
                        )}
                    </div>
                    
                    <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Recent Reviews ({reputationData.total_reviews})</h3>
                    {reputationData.reviews.length > 0 ? reputationData.reviews.map(review => (
                        <div key={review.id} className="review-card" style={{ padding: '24px', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                        {review.reviewer_name?.[0].toUpperCase()}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{review.reviewer_name}</div>
                                </div>
                                <div className="reputation">⭐ {parseFloat(review.rating).toFixed(1)}</div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#5B7CFF', marginBottom: '8px' }}>For: {review.auction_title}</div>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                "{review.comment || 'No comment provided.'}"
                            </p>
                        </div>
                    )) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No reviews yet.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Profile;
