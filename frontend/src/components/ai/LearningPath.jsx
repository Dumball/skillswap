import React, { useState } from 'react';

const LearningPath = ({ onNavigate }) => {
    const [targetSkill, setTargetSkill] = useState('');
    const [currentSkills, setCurrentSkills] = useState('');
    const [path, setPath] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState(null); // { text, type: 'error' | 'success' }

    const showNotification = (text, type = 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    const generatePath = async () => {
        if (!targetSkill.trim()) return;
        setLoading(true);
        setError('');
        setPath(null);

        try {
            // Build the API URL using environment variable or fallback to relative path
            const apiUrl = import.meta.env.VITE_API_URL 
                ? `${import.meta.env.VITE_API_URL}/api/agents/learning-path`
                : '/api/agents/learning-path';
            
            console.log('[LEARNING] Generating path via:', apiUrl);
            console.log('[LEARNING] Target skill:', targetSkill);
            
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_skill: targetSkill.trim(),
                    current_skills: currentSkills.split(',').map(s => s.trim()).filter(Boolean)
                })
            });
            
            console.log('[LEARNING] Response status:', res.status);
            
            const data = await res.json();
            console.log('[LEARNING] Response data:', data);
            
            if (data.fallback || data.error || !res.ok) {
                setError('AI service is offline. Start the Python agent service to use this feature.');
            } else {
                setPath(data);
            }
        } catch (error) {
            console.error('[LEARNING] Error:', error);
            setError('Could not connect to AI service.');
        } finally {
            setLoading(false);
        }
    };

    const stageColors = ['#5b7cff', '#7a5cff', '#a55cff', '#c55cff', '#e55cff', '#ff5ca5'];

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <div className="section">
                <div className="section-header">
                    <h2>🗺️ AI Learning Path Generator</h2>
                    <p>Get a personalized skill roadmap powered by our AI and skill knowledge graph</p>
                </div>

                {message && (
                    <div style={{
                        padding: '16px 24px',
                        borderRadius: '16px',
                        background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        border: message.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                        color: message.type === 'error' ? '#ef4444' : '#22c55e',
                        marginBottom: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
                        {message.text}
                    </div>
                )}

                <div style={{
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '20px', padding: '40px', marginBottom: '40px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                🎯 Target Skill
                            </label>
                            <input
                                type="text"
                                value={targetSkill}
                                onChange={e => setTargetSkill(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && generatePath()}
                                className="search-input"
                                placeholder="e.g. Machine Learning, React, Graphic Design..."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                🧠 Your Current Skills (optional, comma-separated)
                            </label>
                            <input
                                type="text"
                                value={currentSkills}
                                onChange={e => setCurrentSkills(e.target.value)}
                                className="search-input"
                                placeholder="e.g. Python, JavaScript, Photoshop..."
                            />
                        </div>
                        <button
                            onClick={generatePath}
                            disabled={loading || !targetSkill.trim()}
                            className="btn btn-primary"
                            style={{ alignSelf: 'flex-start', opacity: loading || !targetSkill.trim() ? 0.6 : 1 }}
                        >
                            {loading ? '🤖 Generating Roadmap...' : '🗺️ Generate My Learning Path'}
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '13px' }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {path && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <h3 style={{ margin: 0 }}>Your Roadmap to <span style={{ color: '#5b7cff' }}>{path.target_skill}</span></h3>
                                <button
                                    onClick={() => {
                                        const text = path.path.map(s => `Stage ${s.stage}: ${s.title}\nDuration: ${s.duration}\nTopics: ${s.topics.join(', ')}\nTip: ${s.skill_swap_tip}\n`).join('\n---\n\n');
                                        navigator.clipboard.writeText(text);
                                        showNotification('Roadmap copied to clipboard!', 'success');
                                    }}
                                    style={{
                                        padding: '4px 12px', fontSize: '11px', borderRadius: '15px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#a0a4b8', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a0a4b8'; }}
                                >
                                    📋 Copy Text
                                </button>
                            </div>
                            {path.prerequisites_found?.length > 0 && (
                                <div style={{ fontSize: '13px', color: '#a0a4b8' }}>
                                    Prerequisites: {path.prerequisites_found.join(', ')}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {Array.isArray(path.path) && path.path.map((stage, i) => (
                                <div key={i} style={{
                                    background: 'var(--card-bg)', border: `1px solid ${stageColors[i % stageColors.length]}44`,
                                    borderLeft: `4px solid ${stageColors[i % stageColors.length]}`,
                                    borderRadius: '16px', padding: '28px',
                                    transition: 'transform 0.2s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '13px', color: stageColors[i % stageColors.length], fontWeight: 600, marginBottom: '4px' }}>
                                                STAGE {stage.stage}
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '18px' }}>{stage.title}</h4>
                                        </div>
                                        <div style={{
                                            fontSize: '12px', padding: '4px 12px', borderRadius: '20px',
                                            background: `${stageColors[i % stageColors.length]}22`,
                                            color: stageColors[i % stageColors.length]
                                        }}>
                                            ⏱ {stage.duration}
                                        </div>
                                    </div>

                                    {stage.topics && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{ fontSize: '11px', color: '#a0a4b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Topics</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {stage.topics.map((t, j) => (
                                                    <span key={j} style={{
                                                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {stage.skill_swap_tip && (
                                        <div style={{
                                            padding: '12px 16px', borderRadius: '10px',
                                            background: 'rgba(91,124,255,0.08)', border: '1px solid rgba(91,124,255,0.2)',
                                            fontSize: '13px', color: '#a0c4ff'
                                        }}>
                                            💡 <strong>SkillSwap tip:</strong> {stage.skill_swap_tip}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '40px' }}>
                            <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('marketplace')}>
                                Find Skills on Marketplace →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningPath;
