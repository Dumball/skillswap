import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navigation = ({ activePage, onNavigate }) => {
    const { user, logout } = useContext(AuthContext);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'marketplace', label: 'Marketplace' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'profile', label: 'Profile' },
        { id: 'create-auction', label: 'Create Auction' },
        { id: 'learning-path', label: '🗺️ Learning Path' },
    ];

    return (
        <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
            <div className="nav-container">
                <div 
                    className="logo" 
                    onClick={() => onNavigate('home')}
                >
                    SkillSwap
                </div>
                <div className="nav-links">
                    {navItems.map(item => (
                        <a 
                            key={item.id}
                            className={activePage === item.id ? 'active' : ''}
                            onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}
                            href={`#${item.id}`}
                        >
                            {item.label}
                        </a>
                    ))}
                    {user ? (
                        <>
                            {user.role === 'admin' && (
                                <a 
                                    className={`nav-cta ${activePage === 'admin' ? 'active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}
                                    href="#admin"
                                >
                                    Admin
                                </a>
                            )}
                            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '16px', cursor: 'pointer' }}>
                                <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '16px' }} title={user.name}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span onClick={() => { logout(); onNavigate('home'); }} style={{ color: '#ff4d4d', fontSize: '14px', cursor: 'pointer' }}>Logout</span>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <a 
                                className={`nav-cta ${activePage === 'login' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); onNavigate('login'); }}
                                href="#login"
                                style={{ background: 'transparent', border: '1px solid var(--neon-blue)' }}
                            >
                                Login
                            </a>
                            <a 
                                className={`nav-cta ${activePage === 'register' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); onNavigate('register'); }}
                                href="#register"
                            >
                                Sign Up
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
