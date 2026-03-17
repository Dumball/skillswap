import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const CreateAuction = ({ onNavigate }) => {
    const { user } = useContext(AuthContext);
    const [skills, setSkills] = useState([]);
    const [hasVerifiedSkill, setHasVerifiedSkill] = useState(false);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skill_required: '',
        skill_category: 'Design',
        minimum_credit_value: 100,
        endTimeHours: 48
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const checkSkills = async () => {
            if (user?.id) {
                try {
                    const res = await apiService.getUserSkills(user.id);
                    const userSkills = res.data;
                    setSkills(userSkills);
                    setHasVerifiedSkill(userSkills.some(s => s.verified));
                } catch (err) {
                    console.error("Error fetching skills for verification check:", err);
                } finally {
                    setLoadingSkills(false);
                }
            } else if (!localStorage.getItem('token')) {
                setLoadingSkills(false);
            }
        };
        checkSkills();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!hasVerifiedSkill) {
            setError("You must have at least one verified skill to create an auction.");
            setLoading(false);
            return;
        }

        // Convert hours to actual ISO datetime
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + parseInt(formData.endTimeHours));

        try {
            const res = await apiService.createAuction({
                title: formData.title,
                description: formData.description,
                skill_required: formData.skill_required,
                skill_category: formData.skill_category,
                minimum_credit_value: formData.minimum_credit_value,
                duration_hours: formData.endTimeHours
            });
            // Go to the newly created auction
            localStorage.setItem('currentAuctionId', res.data.auction.id);
            if (onNavigate) onNavigate('auction-detail');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create auction');
        } finally {
            setLoading(false);
        }
    };

    if (loadingSkills) return <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><h2>Checking verification status...</h2></div>;

    if (!hasVerifiedSkill) {
        return (
            <div className="page active">
                <section className="section" style={{ textAlign: 'center', paddingTop: '100px' }}>
                    <div className="stats-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
                        <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Verification Required</h2>
                        <p style={{ color: '#A0A4B8', marginBottom: '32px', lineHeight: '1.6' }}>
                            To maintain the quality of SkillSwap, you must have at least one verified skill before you can create an auction and request services from others.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => { window.history.pushState(null, '', '?tab=verify-skill'); onNavigate('dashboard'); }}>Verify a Skill Now</button>
                            <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Back to Dashboard</button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="section">
                <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '40px' }}>Create New Auction</h1>
                
                <div className="stats-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}
                    {success && <div className="success-msg" style={{ marginBottom: '20px' }}>{success}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Auction Title</label>
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="e.g., Need a Professional Logo Design" 
                                style={{ width: '100%' }} 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Required Skill</label>
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="e.g., React, Python, UI Design" 
                                style={{ width: '100%' }} 
                                value={formData.skill_required}
                                onChange={e => setFormData({...formData, skill_required: e.target.value})}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Description</label>
                            <textarea 
                                className="search-input" 
                                placeholder="Describe what you need in detail..." 
                                style={{ width: '100%', minHeight: '150px', resize: 'vertical' }}
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                required
                            ></textarea>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Category</label>
                                <select 
                                    className="filter-select" 
                                    style={{ width: '100%' }}
                                    value={formData.skill_category}
                                    onChange={e => setFormData({...formData, skill_category: e.target.value})}
                                >
                                    <option value="Design">Design</option>
                                    <option value="Development">Development</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Writing">Writing</option>
                                    <option value="Video">Video</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Estimated Skill Effort</label>
                                <input 
                                    type="number" 
                                    className="search-input" 
                                    placeholder="100" 
                                    style={{ width: '100%' }} 
                                    value={formData.minimum_credit_value}
                                    onChange={e => setFormData({...formData, minimum_credit_value: Number(e.target.value)})}
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Duration (hours)</label>
                            <input 
                                type="number" 
                                className="search-input" 
                                placeholder="48" 
                                style={{ width: '100%' }} 
                                value={formData.endTimeHours}
                                onChange={e => setFormData({...formData, endTimeHours: Number(e.target.value)})}
                                min="1"
                                required
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Auction'}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default CreateAuction;
