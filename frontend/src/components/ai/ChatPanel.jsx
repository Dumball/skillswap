import React, { useState, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import apiService from '../../services/api';

const ChatPanel = () => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 Hi! I\'m the SkillSwap AI assistant. Ask me anything about the platform, how auctions work, or skill exchanges!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => `session_${Date.now()}`);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Build the API URL using environment variable or fallback to relative path
            const apiUrl = import.meta.env.VITE_API_URL 
                ? `${import.meta.env.VITE_API_URL}/api/agents/chat`
                : '/api/agents/chat';
            
            console.log('[CHAT] Sending message to:', apiUrl);
            
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, session_id: sessionId })
            });
            
            console.log('[CHAT] Response status:', res.status);
            
            const data = await res.json();
            console.log('[CHAT] Response data:', data);
            
            if (data.fallback || !res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI service is offline. Start the Python agent service to enable AI features.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response received' }]);
            }
        } catch (error) {
            console.error('[CHAT] Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Could not connect to the AI service.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '28px', right: '28px', zIndex: 1000,
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #5b7cff, #7a5cff)',
                    border: 'none', cursor: 'pointer', fontSize: '26px',
                    boxShadow: '0 8px 30px rgba(91,124,255,0.5)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="AI Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '100px', right: '28px', zIndex: 1000,
                    width: '360px', maxHeight: '520px',
                    background: '#121318', border: '1px solid rgba(91,124,255,0.3)',
                    borderRadius: '20px', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    animation: 'fadeInPage 0.2s forwards'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #1a1d2e, #12151e)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <span style={{ fontSize: '22px' }}>🤖</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>SkillSwap Assistant</div>
                            <div style={{ fontSize: '11px', color: '#5b7cff' }}>● Online</div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                                    fontSize: '13px', lineHeight: '1.5',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #5b7cff, #7a5cff)'
                                        : 'rgba(255,255,255,0.06)',
                                    color: 'white',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '14px',
                                    borderBottomLeftRadius: msg.role === 'user' ? '14px' : '4px',
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', fontSize: '13px', color: '#a0a4b8' }}>
                                    🤔 Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask anything..."
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', fontSize: '13px', outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{
                                padding: '10px 16px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #5b7cff, #7a5cff)',
                                border: 'none', color: 'white', cursor: 'pointer',
                                fontSize: '16px', opacity: loading || !input.trim() ? 0.5 : 1
                            }}
                        >→</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatPanel;
