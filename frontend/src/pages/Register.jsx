import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Register = ({ onNavigate }) => {
    const { register } = useContext(AuthContext);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    const [errorCode, setErrorCode] = useState('');

    const handleSubmit = async (e, autoSuffix = false) => {
        if (e) e.preventDefault();
        setError('');
        setErrorCode('');
        
        try {
            await register(formData.name, formData.email, formData.password, autoSuffix);
            onNavigate('dashboard');
        } catch (err) {
            const data = err.response?.data;
            if (data?.error === 'EMAIL_EXISTS') {
                setErrorCode('EMAIL_EXISTS');
                setError(data.message);
            } else {
                setError(data?.message || 'Registration failed');
            }
        }
    };

    return (
        <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '16px', border: '1px solid var(--card-border)', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Create Account</h2>
                {error && (
                    <div style={{ 
                        background: 'rgba(255, 77, 77, 0.1)', 
                        border: '1px solid #ff4d4d', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        color: '#ff4d4d', 
                        marginBottom: '20px', 
                        textAlign: 'center',
                        fontSize: '14px'
                    }}>
                        {error}
                        {errorCode === 'EMAIL_EXISTS' && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button 
                                    onClick={() => onNavigate('login')}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                                >
                                    Login Instead
                                </button>
                                {window.location.hostname === 'localhost' && (
                                    <button 
                                        onClick={() => handleSubmit(null, true)}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'rgba(0, 209, 255, 0.2)' }}
                                    >
                                        Try with Auto-Suffix (Dev only)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Full Name</label>
                        <input 
                            type="text" 
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px' }}
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required 
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
                        <input 
                            type="email" 
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px' }}
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required 
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
                        <input 
                            type="password" 
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px' }}
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>Register</button>
                </form>
                
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => onNavigate('login')}>Login</span>
                </div>
            </div>
        </div>
    );
};

export default Register;
