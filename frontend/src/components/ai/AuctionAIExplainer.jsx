import React, { useState } from 'react';

const AuctionAIExplainer = ({ auctionId, auctionTitle }) => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const explain = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/agents/explain-auction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auction_id: String(auctionId),
                    question: question || `Explain this auction: "${auctionTitle}" and what skills are needed to bid on it.`
                })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({ response: '❌ AI service unavailable. Make sure the Python agent service is running.', error: true });
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{
                    padding: '10px 20px', borderRadius: '10px', border: '1px solid #5b7cff',
                    background: 'rgba(91,124,255,0.1)', color: '#5b7cff', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600, transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,124,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(91,124,255,0.1)'}
            >
                🤖 Explain This Auction
            </button>
        );
    }

    return (
        <div style={{
            background: 'rgba(91,124,255,0.05)', border: '1px solid rgba(91,124,255,0.25)',
            borderRadius: '16px', padding: '24px', marginTop: '20px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#5b7cff' }}>🤖 AI Auction Explainer</h3>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#a0a4b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder={`Ask about "${auctionTitle}"...`}
                    onKeyDown={e => e.key === 'Enter' && explain()}
                    style={{
                        flex: 1, padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', fontSize: '13px', outline: 'none'
                    }}
                />
                <button
                    onClick={explain}
                    disabled={loading}
                    style={{
                        padding: '10px 18px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #5b7cff, #7a5cff)',
                        border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600,
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? '...' : 'Explain'}
                </button>
            </div>

            {result && (
                <div>
                    <div style={{
                        fontSize: '13px', lineHeight: '1.7', color: '#d0d4e8',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                        padding: '16px', marginBottom: '12px'
                    }}>
                        {result.response}
                    </div>
                    {result.similar_auctions?.length > 0 && (
                        <div>
                            <div style={{ fontSize: '11px', color: '#a0a4b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Similar Auctions</div>
                            {result.similar_auctions.map((a, i) => (
                                <div key={i} style={{ fontSize: '12px', color: '#5b7cff', padding: '4px 0' }}>
                                    • {a.title || `Auction #${a.id}`} ({Math.round(a.score * 100)}% match)
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AuctionAIExplainer;
