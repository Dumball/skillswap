import React, { useState } from 'react';
import './index.css';

// Components
import ParticleBackground from './components/ParticleBackground';
import Navigation from './components/Navigation';

// Pages
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateAuction from './pages/CreateAuction';
import AuctionDetail from './pages/AuctionDetail';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import Architecture from './pages/Architecture';
import LearningPath from './components/ai/LearningPath';
import SkillVerifier from './components/ai/SkillVerifier';
import ChatPanel from './components/ai/ChatPanel';

function App() {
    const [activePage, setActivePage] = useState('home');

    const handleNavigate = (page) => {
        setActivePage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderPage = () => {
        switch (activePage) {
            case 'home':
                return <Home onNavigate={handleNavigate} />;
            case 'marketplace':
                return <Marketplace onNavigate={handleNavigate} />;
            case 'dashboard':
                return <Dashboard onNavigate={handleNavigate} />;
            case 'profile':
                return <Profile onNavigate={handleNavigate} />;
            case 'create-auction':
                return <CreateAuction onNavigate={handleNavigate} />;
            case 'auction-detail':
                return <AuctionDetail onNavigate={handleNavigate} />;
            case 'admin':
                return <Admin />;
            case 'login':
                return <Login onNavigate={handleNavigate} />;
            case 'register':
                return <Register onNavigate={handleNavigate} />;
            case 'architecture':
                return <Architecture onNavigate={handleNavigate} />;
            case 'learning-path':
                return <LearningPath onNavigate={handleNavigate} />;
            case 'skill-verifier':
                return <SkillVerifier onNavigate={handleNavigate} />;
            default:
                return <Home onNavigate={handleNavigate} />;
        }
    };

    return (
        <>
            <ParticleBackground />
            <Navigation activePage={activePage} onNavigate={handleNavigate} />
            {renderPage()}
            <ChatPanel />
        </>
    );
}

export default App;
