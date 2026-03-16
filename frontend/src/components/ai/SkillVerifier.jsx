import React, { useState } from 'react';
import apiService from '../../services/api';

const SkillVerifier = ({ skillName: initialSkillName, userId, onVerified }) => {
    const [skillName, setSkillName] = useState(initialSkillName || '');
    const [phase, setPhase] = useState('idle'); // idle | loading | challenge | evaluating | result
    const [challenge, setChallenge] = useState(null);
    const [answer, setAnswer] = useState('');
    const [result, setResult] = useState(null);

    const startChallenge = async () => {
        setPhase('loading');
        try {
            console.log("Starting challenge for:", skillName);
            const res = await apiService.verifySkill({ skill_name: skillName, user_id: userId });
            console.log("Challenge API Response:", res.data);
            setChallenge(res.data);
            setPhase('challenge');
        } catch (err) {
            console.error("Skill Verifier error:", err);
            setPhase('idle');
        }
    };

    const submitAnswer = async () => {
        setPhase('evaluating');
        try {
            const res = await apiService.verifySkill({ 
                skill_name: skillName, 
                user_id: userId, 
                user_answer: answer 
            });
            setResult(res.data);
            setPhase('result');
            if (res.data.passed && typeof onVerified === 'function') {
                onVerified(); // Trigger refresh in parent
            }
        } catch (err) {
            console.error("Skill Verifier error:", err);
            setPhase('challenge');
        }
    };

    const reset = () => { setPhase('idle'); setChallenge(null); setAnswer(''); setResult(null); };

    const scoreColor = result ? (result.passed ? '#22c55e' : '#ef4444') : '#5b7cff';

    return (
        <div style={{ marginTop: '12px' }}>
            {phase === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                    {!initialSkillName && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#a0a4b8', fontSize: '14px' }}>Skill to Verify</label>
                            <input 
                                type="text"
                                className="search-input"
                                value={skillName}
                                onChange={e => setSkillName(e.target.value)}
                                placeholder="e.g. React, Python, UI Design"
                                style={{ width: '100%', marginBottom: '10px' }}
                            />
                        </div>
                    )}
                    <button
                        onClick={startChallenge}
                        disabled={!skillName}
                        style={{
                            padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                            border: '1px solid rgba(91,124,255,0.4)', background: 'rgba(91,124,255,0.1)',
                            color: '#5b7cff', cursor: 'pointer', transition: 'all 0.2s',
                            opacity: skillName ? 1 : 0.5
                        }}
                    >
                        ✅ Start Skill Verification
                    </button>
                    {!initialSkillName && (
                        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                            Our AI will generate a personalized challenge based on the skill provided.
                        </p>
                    )}
                </div>
            )}

            {phase === 'loading' && (
                <div style={{ fontSize: '13px', color: '#a0a4b8', padding: '8px 0' }}>🤖 Generating challenge...</div>
            )}

            {phase === 'challenge' && challenge && (
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(91,124,255,0.2)',
                    borderRadius: '12px', padding: '20px', marginTop: '8px'
                }}>
                    <div style={{ fontWeight: 700, marginBottom: '12px', color: '#5b7cff', fontSize: '14px' }}>
                        🎯 {skillName} Skill Challenge
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '16px', color: '#d0d4e8' }}>
                        {challenge.challenge || "No challenge text provided by AI. Please try again."}
                    </div>
                    {challenge.hints?.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: '#a0a4b8', marginBottom: '6px' }}>HINTS</div>
                            {challenge.hints.map((h, i) => <div key={i} style={{ fontSize: '12px', color: '#7a5cff', marginBottom: '4px' }}>• {h}</div>)}
                        </div>
                    )}
                    <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={6}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px', fontSize: '13px',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button onClick={submitAnswer} disabled={!answer.trim()} style={{
                            padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                            background: 'linear-gradient(135deg, #5b7cff, #7a5cff)', border: 'none',
                            color: 'white', cursor: 'pointer', opacity: !answer.trim() ? 0.5 : 1
                        }}>
                            Submit Answer
                        </button>
                        <button onClick={reset} style={{ padding: '10px 16px', borderRadius: '8px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a4b8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                    </div>
                </div>
            )}

            {phase === 'evaluating' && (
                <div style={{ fontSize: '13px', color: '#a0a4b8', padding: '8px 0' }}>🔍 Evaluating your answer...</div>
            )}

            {phase === 'result' && result && (
                <div style={{
                    background: result.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${scoreColor}44`, borderRadius: '12px', padding: '20px', marginTop: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: scoreColor }}>
                            {result.passed ? '✅ Skill Verified!' : '❌ Not Passed'}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '22px', color: scoreColor }}>{result.score}/100</div>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '12px', color: '#d0d4e8' }}>{result.evaluation}</div>
                    {result.threshold_info && (
                        <div style={{ fontSize: '13px', color: '#fb923c', marginBottom: '12px', fontWeight: 600 }}>
                            ⚠️ {result.threshold_info}
                        </div>
                    )}
                    {result.strengths?.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '4px' }}>STRENGTHS</div>
                            {result.strengths.map((s, i) => <div key={i} style={{ fontSize: '12px', color: '#d0d4e8' }}>✓ {s}</div>)}
                        </div>
                    )}
                    {result.improvements?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#fb923c', marginBottom: '4px' }}>IMPROVEMENTS</div>
                            {result.improvements.map((im, i) => <div key={i} style={{ fontSize: '12px', color: '#d0d4e8' }}>→ {im}</div>)}
                        </div>
                    )}
                    <button onClick={reset} style={{ padding: '8px 16px', borderRadius: '8px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#a0a4b8', cursor: 'pointer', fontSize: '12px' }}>Try Again</button>
                </div>
            )}
        </div>
    );
};

export default SkillVerifier;
