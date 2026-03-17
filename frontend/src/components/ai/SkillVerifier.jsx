import React, { useState } from 'react';
import apiService from '../../services/api';

const SkillVerifier = ({ skillName: initialSkillName, userId, onVerified }) => {
    const [skillName, setSkillName] = useState(initialSkillName || '');
    const [phase, setPhase] = useState('idle'); // idle | loading | testing | evaluating | result
    const [testData, setTestData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { index: answer_text_or_option }
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const showMessage = (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    };

    const startTest = async () => {
        setPhase('loading');
        try {
            console.log("Generating test for:", skillName);
            const res = await apiService.generateSkillTest({ skill_name: skillName });
            if (res.data.success) {
                // New structure has a 'test' wrapper; fallback for old structure if needed
                const questions = res.data.test ? res.data.test.questions : res.data.questions;
                setTestData(questions);
                setPhase('testing');
                setCurrentQuestionIndex(0);
                setAnswers({});
            } else {
                throw new Error(res.data.message || "Failed to generate test");
            }
        } catch (err) {
            console.error("Skill Verifier error:", err);
            showMessage("Unable to generate test. Try again later.");
            setPhase('idle');
        }
    };

    const handleAnswerChange = (val) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: val }));
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < testData.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            submitFullTest();
        }
    };

    const submitFullTest = async () => {
        setPhase('evaluating');
        try {
            // Calculate MCQ score locally for immediate feedback
            let correctMCQs = 0;
            let totalMCQs = 0;
            const mcqResponses = [];
            const practicalResponse = [];

            testData.forEach((q, idx) => {
                const userAnswer = answers[idx];
                if (q.type === 'mcq') {
                    totalMCQs++;
                    if (userAnswer === q.correct_answer) correctMCQs++;
                    mcqResponses.push({ question: q.question, answer: userAnswer, correct: userAnswer === q.correct_answer });
                } else {
                    practicalResponse.push({ question: q.question, answer: userAnswer });
                }
            });

            const mcqScore = totalMCQs > 0 ? (correctMCQs / totalMCQs) * 100 : 100;

            // Call verify API for final aggregate evaluation (practical portion)
            const res = await apiService.verifySkill({
                skill_name: skillName,
                user_id: userId,
                user_answer: JSON.stringify({ mcqScore, mcqResponses, practicalResponse }),
                is_full_test: true 
            });

            setResult(res.data);
            setPhase('result');
            if (res.data.passed && typeof onVerified === 'function') {
                onVerified();
            }
        } catch (err) {
            console.error("Evaluation error:", err);
            setPhase('testing');
        }
    };

    const reset = () => {
        setPhase('idle');
        setTestData(null);
        setAnswers({});
        setResult(null);
    };

    const currentQuestion = testData ? testData[currentQuestionIndex] : null;
    const progress = testData ? ((currentQuestionIndex + 1) / testData.length) * 100 : 0;

    return (
        <div style={{ marginTop: '12px', minHeight: '200px' }}>
            {error && (
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    color: '#ef4444', 
                    fontSize: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <span>⚠️</span> {error}
                </div>
            )}

            {phase === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                    <button onClick={startTest} disabled={!skillName} className="btn btn-primary" style={{ width: '100%', py: '14px', borderRadius: '14px' }}>
                        🎯 Start Automated Skill Test
                    </button>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Multiple choice and practical questions to verify your expertise.
                    </p>
                </div>
            )}

            {phase === 'loading' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <div style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>Crafting your test...</div>
                </div>
            )}

            {phase === 'testing' && currentQuestion && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            QUESTION {currentQuestionIndex + 1} OF {testData.length}
                        </span>
                        <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary-blue)', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', lineHeight: '1.4' }}>
                        {currentQuestion.question}
                    </h4>

                    {currentQuestion.type === 'mcq' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {currentQuestion.options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswerChange(option)}
                                    style={{
                                        textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid',
                                        borderColor: answers[currentQuestionIndex] === option ? 'var(--primary-blue)' : 'rgba(255,255,255,0.1)',
                                        background: answers[currentQuestionIndex] === option ? 'rgba(0,209,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px'
                                    }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            className="search-input"
                            style={{ width: '100%', minHeight: '150px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            placeholder="Type your practical answer or code here..."
                            value={answers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                        />
                    )}

                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button onClick={reset} className="btn btn-secondary" style={{ opacity: 0.6 }}>Cancel</button>
                        <button 
                            onClick={nextQuestion} 
                            disabled={!answers[currentQuestionIndex]}
                            className="btn btn-primary"
                        >
                            {currentQuestionIndex === testData.length - 1 ? 'Finish Test' : 'Next Question →'}
                        </button>
                    </div>
                </div>
            )}

            {phase === 'evaluating' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <div style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>Analyzing results...</div>
                </div>
            )}

            {phase === 'result' && result && (
                <div style={{ background: result.passed ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${result.passed ? '#22c55e' : '#ef4444'}33`, borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: result.passed ? '#22c55e' : '#ef4444', fontWeight: 800, fontSize: '20px' }}>
                            {result.passed ? '🎉 PASSED' : '❌ NOT PASSED'}
                        </h3>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: result.passed ? '#22c55e' : '#ef4444' }}>
                            {result.score}%
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                        {result.evaluation}
                    </p>
                    <button onClick={reset} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
                </div>
            )}
        </div>
    );
};

export default SkillVerifier;
