import React, { useState, useEffect } from 'react';

const Architecture = ({ onNavigate }) => {
    const [archData, setArchData] = useState(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/agents/architecture')
            .then(r => r.json())
            .then(data => setArchData(data))
            .catch(() => setArchData(null));
    }, []);

    const askQuestion = async () => {
        if (!question.trim()) return;
        setLoading(true);
        setAnswer('');
        try {
            const res = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Architecture question: ${question}`,
                    session_id: 'arch_page'
                })
            });
            const data = await res.json();
            setAnswer(data.response || data.error || 'AI service offline.');
        } catch {
            setAnswer('⚠️ Could not connect to AI service.');
        } finally {
            setLoading(false);
        }
    };

    const dbColors = { PostgreSQL: '#336791', Qdrant: '#FF6B35', Neo4j: '#008CC1', Redis: '#DC382D' };

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            {/* Header */}
            <section style={{ background: 'var(--dark-slate)', padding: '80px 40px 60px' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '56px', fontWeight: 900, letterSpacing: '-2px', marginBottom: '16px', background: 'linear-gradient(135deg, #fff, #5b7cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        System Architecture
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
                        A polyglot AI-powered platform — multiple agents, multiple databases, one unified experience.
                    </p>
                </div>
            </section>

            <div className="section">
                {/* Data Flow */}
                <div className="section-header" style={{ textAlign: 'left', marginBottom: '40px' }}>
                    <h2>Request Flow</h2>
                    <p>How a user query travels through the system</p>
                </div>

                {archData?.flow && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {archData.flow.map((step, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', paddingBottom: '24px', position: 'relative' }}>
                                <div style={{
                                    flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #5b7cff, #7a5cff)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '14px', zIndex: 1
                                }}>
                                    {i + 1}
                                </div>
                                {i < archData.flow.length - 1 && (
                                    <div style={{ position: 'absolute', left: '19px', top: '40px', bottom: 0, width: '2px', background: 'rgba(91,124,255,0.2)' }} />
                                )}
                                <div style={{ paddingTop: '8px', fontSize: '15px', color: '#d0d4e8', lineHeight: '1.5' }}>{step}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Agents */}
                <div className="section-header" style={{ textAlign: 'left', marginTop: '60px', marginBottom: '32px' }}>
                    <h2>AI Agents</h2>
                    <p>Specialized agents orchestrated by LangGraph</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' }}>
                    {(archData?.agents || [
                        { name: 'Portfolio Assistant', purpose: 'Answers general platform questions', icon: '🤖' },
                        { name: 'Auction Explainer', purpose: 'Explains auction requirements', icon: '📋' },
                        { name: 'Skill Verifier', purpose: 'Generates and evaluates challenges', icon: '✅' },
                        { name: 'Learning Path', purpose: 'Creates personalized roadmaps', icon: '🗺️' },
                        { name: 'Architecture Analyst', purpose: 'Explains system design', icon: '🏗️' },
                    ]).map((agent, i) => (
                        <div key={i} className="problem-card" style={{ cursor: 'default' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{agent.icon}</div>
                            <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>{agent.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{agent.purpose}</p>
                        </div>
                    ))}
                </div>

                {/* Databases */}
                <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
                    <h2>Polyglot Database Layer</h2>
                    <p>Four purpose-built databases working in concert</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' }}>
                    {(archData?.databases || [
                        { name: 'PostgreSQL', role: 'Primary structured data' },
                        { name: 'Qdrant', role: 'Vector embeddings & semantic search' },
                        { name: 'Neo4j', role: 'Skill knowledge graph' },
                        { name: 'Redis', role: 'Session memory & cache' },
                    ]).map((db, i) => (
                        <div key={i} style={{
                            background: 'var(--card-bg)', border: `1px solid ${db.color || Object.values(dbColors)[i] || '#5b7cff'}44`,
                            borderTop: `4px solid ${db.color || Object.values(dbColors)[i] || '#5b7cff'}`,
                            borderRadius: '12px', padding: '24px'
                        }}>
                            <h3 style={{ marginBottom: '8px', fontSize: '18px', color: db.color || Object.values(dbColors)[i] || '#5b7cff' }}>{db.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{db.role}</p>
                        </div>
                    ))}
                </div>

                {/* Ask Anything */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '40px' }}>
                    <h3 style={{ marginBottom: '8px' }}>🤖 Ask About The Architecture</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                        Have questions about how the system works? Ask the AI Architecture Analyst.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <input
                            className="search-input"
                            style={{ flex: 1, minWidth: 0 }}
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && askQuestion()}
                            placeholder="How does Neo4j integrate with the agents?"
                        />
                        <button className="btn btn-primary" onClick={askQuestion} disabled={loading || !question.trim()} style={{ whiteSpace: 'nowrap' }}>
                            {loading ? 'Thinking...' : 'Ask AI'}
                        </button>
                    </div>
                    {answer && (
                        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(91,124,255,0.08)', border: '1px solid rgba(91,124,255,0.2)', fontSize: '14px', lineHeight: '1.7', color: '#d0d4e8' }}>
                            {answer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Architecture;
