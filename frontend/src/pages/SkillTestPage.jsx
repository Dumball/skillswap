import React, { useEffect, useState, useCallback } from 'react';
import apiService from '../services/api';
import useAuth from '../hooks/useAuth';
import SkillVerifier from '../components/ai/SkillVerifier';

const SkillTestPage = ({ onNavigate }) => {
    const { user, loading: authLoading } = useAuth();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSkillId, setActiveSkillId] = useState(null);
    const [verifiedSkills, setVerifiedSkills] = useState(new Set());

    const fetchSkills = useCallback(async () => {
        if (!user) return;
        try {
            const res = await apiService.getUserSkills(user.id);
            setSkills(res.data);
            // Track already verified
            const verified = new Set(res.data.filter(s => s.verified).map(s => s.id));
            setVerifiedSkills(verified);
        } catch (err) {
            console.error('Failed to fetch skills', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            onNavigate('login');
            return;
        }
        fetchSkills();
    }, [user, authLoading]);

    const handleVerified = (skillId) => {
        setVerifiedSkills(prev => new Set([...prev, skillId]));
        fetchSkills();
    };

    const unverifiedSkills = skills.filter(s => !s.verified);
    const verifiedSkillList = skills.filter(s => s.verified);

    if (authLoading || loading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading your skills...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px' }}>
                        🏆 Skill Verification Center
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px' }}>
                        Take a test to verify your expertise. Score <strong style={{ color: 'var(--primary-blue)' }}>70% or above</strong> to get your skill verified and unlock the ability to create auctions.
                    </p>
                </div>

                {skills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎯</div>
                        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No Skills Added Yet</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                            Add skills to your profile first, then come back to verify them.
                        </p>
                        <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
                            Add Skills on Dashboard
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

                        {/* Left — Unverified Skills */}
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', color: '#fbbf24' }}>
                                    NEEDS VERIFICATION
                                </span>
                                {unverifiedSkills.length} Skills
                            </h2>

                            {unverifiedSkills.length === 0 ? (
                                <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                                    <p style={{ color: '#22c55e', fontWeight: 600 }}>All your skills are verified!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {unverifiedSkills.map(skill => (
                                        <div
                                            key={skill.id}
                                            className="stats-card"
                                            style={{ transition: 'box-shadow 0.2s', cursor: 'default' }}
                                        >
                                            {/* Skill Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '18px' }}>{skill.skill_name}</div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                                                        {skill.skill_category} · {skill.skill_level}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setActiveSkillId(activeSkillId === skill.id ? null : skill.id)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '8px 20px', fontSize: '13px' }}
                                                >
                                                    {activeSkillId === skill.id ? '✕ Close Test' : '🎯 Take Test'}
                                                </button>
                                            </div>

                                            {/* Inline Verifier */}
                                            {activeSkillId === skill.id && (
                                                <SkillVerifier
                                                    skillName={skill.skill_name}
                                                    userId={user.id}
                                                    onVerified={() => handleVerified(skill.id)}
                                                />
                                            )}

                                            {/* Unlock hint */}
                                            {activeSkillId !== skill.id && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                                    🔒 Verify this skill to unlock auction creation
                                                </div>
                                            )}

                                            {/* Show CTA if just verified */}
                                            {verifiedSkills.has(skill.id) && (
                                                <div style={{ marginTop: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#22c55e', fontSize: '15px' }}>✅ Skill Verified!</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>You can now create auctions with this skill.</div>
                                                    </div>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '10px 20px', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
                                                        onClick={() => onNavigate('create-auction')}
                                                    >
                                                        🎯 Create Auction
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right — Verified Skills */}
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', color: '#22c55e' }}>
                                    VERIFIED
                                </span>
                                {verifiedSkillList.length} Skills
                            </h2>

                            {verifiedSkillList.length === 0 ? (
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    Pass a test to see verified skills here.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {verifiedSkillList.map(skill => (
                                        <div
                                            key={skill.id}
                                            style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    ✅ {skill.skill_name}
                                                </div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                                                    {skill.skill_category} · Score: {skill.verification_score ? `${skill.verification_score}%` : 'Verified'}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '8px 16px', fontSize: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22c55e' }}
                                                onClick={() => onNavigate('create-auction')}
                                            >
                                                + Create Auction
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Info Box */}
                            <div style={{ marginTop: '32px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '16px', padding: '24px' }}>
                                <h4 style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--primary-blue)' }}>ℹ️ How It Works</h4>
                                <ol style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px' }}>
                                    <li>Click <strong>"Take Test"</strong> on any unverified skill</li>
                                    <li>Answer 5 MCQs + 1 practical question</li>
                                    <li>Score <strong>70%+</strong> to get verified</li>
                                    <li>Unlock <strong>auction creation</strong> for that skill</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default SkillTestPage;
