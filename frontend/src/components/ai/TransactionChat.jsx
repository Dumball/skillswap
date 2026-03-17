import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from "../../context/AuthContext";
import { io } from 'socket.io-client';
import apiService from '../../services/api';

const TransactionChat = ({ transactionId, otherUserName, onClose }) => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [socket, setSocket] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await apiService.getChatHistory(transactionId);
                const formattedMessages = res.data.map(m => ({
                    transactionId: m.transaction_id,
                    senderId: m.sender_id,
                    senderName: m.sender_name,
                    text: m.text,
                    timestamp: m.created_at
                }));
                setMessages(formattedMessages);
            } catch (err) {
                console.error("Failed to fetch chat history:", err);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();

        const socketUrl = window.location.origin.replace('5173', '5000') || 'http://localhost:5000';
        const newSocket = io(`${socketUrl}/chat`, {
            path: '/socket.io',
            query: { transactionId }
        });

        newSocket.on('connect', () => {
            console.log('Connected to chat room:', transactionId);
            newSocket.emit('joinRoom', transactionId);
        });

        newSocket.on('message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, [transactionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket) return;

        const msg = {
            transactionId,
            senderId: user.id,
            senderName: user.name,
            text: input,
            timestamp: new Date().toISOString()
        };

        socket.emit('sendMessage', msg);
        setMessages(prev => [...prev, msg]);
        setInput('');
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '380px',
            height: '500px',
            background: '#0F111A',
            border: '1px solid var(--neon-blue)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '16px 20px',
                background: 'rgba(0, 209, 255, 0.1)',
                borderBottom: '1px solid rgba(0, 209, 255, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>Chat with {otherUserName}</div>
                    <div style={{ fontSize: '11px', color: '#00D1FF' }}>Active Connection</div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyLoading ? (
                    <div style={{ color: '#A0A4B8', textAlign: 'center', marginTop: '100px', fontSize: '14px' }}>Loading conversation...</div>
                ) : messages.length === 0 ? (
                    <div style={{ color: '#A0A4B8', textAlign: 'center', marginTop: '100px', fontSize: '14px' }}>
                        Connected! Start discussing your skill swap.
                    </div>
                ) : null}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}>
                        <div style={{
                            padding: '10px 14px',
                            background: msg.senderId === user.id ? 'var(--neon-blue)' : 'rgba(255,255,255,0.05)',
                            borderRadius: msg.senderId === user.id ? '14px 14px 0 14px' : '0 14px 14px 14px',
                            fontSize: '14px'
                        }}>
                            {msg.text}
                        </div>
                        <div style={{ fontSize: '10px', color: '#A0A4B8', marginTop: '4px', textAlign: msg.senderId === user.id ? 'right' : 'left' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} style={{ padding: '16px', borderTop: '1px solid rgba(0, 209, 255, 0.1)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <button type="submit" style={{
                        background: 'var(--neon-blue)',
                        border: 'none',
                        color: 'white',
                        padding: '0 16px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}>Send</button>
                </div>
            </form>
        </div>
    );
};

export default TransactionChat;
