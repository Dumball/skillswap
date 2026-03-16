import React, { useEffect, useRef, useState } from 'react';
import apiService from '../services/api';

const Home = ({ onNavigate }) => {
    const marketplace3dRef = useRef(null);
    const exchangeAnimRef = useRef(null);
    const networkCanvasRef = useRef(null);
    const tooltipRef = useRef(null);
    
    const [recentAuctions, setRecentAuctions] = useState([]);
    const [loadingAuctions, setLoadingAuctions] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await apiService.getAuctions();
                setRecentAuctions(res.data.slice(0, 3)); // Only show top 3 on home
            } catch (err) {
                console.error("Failed fetching recent auctions", err);
            } finally {
                setLoadingAuctions(false);
            }
        };
        fetchRecent();
    }, []);

    const calculateTimeLeft = (endTime) => {
        const total = Date.parse(endTime) - Date.parse(new Date());
        if (total <= 0) return "Ended";
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        return `${hours}h ${minutes}m`;
    };

    useEffect(() => {
// ... preserving other animations ...
        const marketplace3d = marketplace3dRef.current;
        if (marketplace3d) {
            const skills = [
                { name: 'Python Tutoring', desc: '2 hours session', angle: 0 },
                { name: 'Logo Design', desc: 'Professional branding', angle: 60 },
                { name: 'SEO Optimization', desc: 'Website audit', angle: 120 },
                { name: 'Video Editing', desc: '5-minute video', angle: 180 },
                { name: 'Social Media Graphics', desc: '10 post designs', angle: 240 },
                { name: 'Resume Writing', desc: 'ATS-optimized', angle: 300 }
            ];
            
            // Clean up existing elements to prevent duplicates in strict mode
            marketplace3d.querySelectorAll('.skill-card-3d, .connection-line').forEach(e => e.remove());

            skills.forEach((skill, index) => {
                const card = document.createElement('div');
                card.className = 'skill-card-3d';
                card.innerHTML = `<h4>${skill.name}</h4><p>${skill.desc}</p>`;
                
                const radius = 250;
                const angleRad = (skill.angle * Math.PI) / 180;
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;
                
                card.style.left = `calc(50% + ${x}px)`;
                card.style.top = `calc(50% + ${y}px)`;
                card.style.transform = `translate(-50%, -50%) rotateY(${Math.random() * 20 - 10}deg)`;
                card.style.animationDelay = `${index * 0.2}s`;
                
                marketplace3d.appendChild(card);
                
                const line = document.createElement('div');
                line.className = 'connection-line';
                const length = Math.sqrt(x * x + y * y);
                const angle = Math.atan2(y, x) * 180 / Math.PI;
                line.style.width = `${length}px`;
                line.style.left = '50%';
                line.style.top = '50%';
                line.style.transform = `rotate(${angle}deg)`;
                line.style.animationDelay = `${index * 0.3}s`;
                marketplace3d.appendChild(line);
            });

            let orbitAngle = 0;
            let animationId;
            const animateOrbit = () => {
                orbitAngle += 0.002;
                const cards = marketplace3d.querySelectorAll('.skill-card-3d');
                cards.forEach((card, index) => {
                    const baseAngle = (skills[index].angle * Math.PI) / 180;
                    const currentAngle = baseAngle + orbitAngle;
                    const radius = 250;
                    const x = Math.cos(currentAngle) * radius;
                    const y = Math.sin(currentAngle) * radius;
                    card.style.left = `calc(50% + ${x}px)`;
                    card.style.top = `calc(50% + ${y}px)`;
                });
                animationId = requestAnimationFrame(animateOrbit);
            };
            animateOrbit();

            const handleMouseMove = (e) => {
                const rect = marketplace3d.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                
                const cards = marketplace3d.querySelectorAll('.skill-card-3d');
                cards.forEach(card => {
                    const depth = 20;
                    const moveX = x * depth;
                    const moveY = y * depth;
                    card.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
                });
            };
            marketplace3d.addEventListener('mousemove', handleMouseMove);

            return () => {
                cancelAnimationFrame(animationId);
                marketplace3d.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [marketplace3dRef]);

    useEffect(() => {
        // ===== EXCHANGE ANIMATION =====
        const exchangeAnim = exchangeAnimRef.current;
        if (exchangeAnim) {
            const bids = [
                { text: 'I will teach Python for 2 hours', position: { top: '15%', left: '10%' }, delay: 0.5 },
                { text: 'I will optimize your website SEO', position: { top: '20%', right: '10%' }, delay: 1 },
                { text: 'I will design your social media kit', position: { bottom: '20%', left: '8%' }, delay: 1.5, selected: true }
            ];

            exchangeAnim.querySelectorAll('.bid-card').forEach(e => e.remove());

            bids.forEach(bid => {
                const bidCard = document.createElement('div');
                bidCard.className = `bid-card ${bid.selected ? 'selected' : ''}`;
                bidCard.innerHTML = `<h4>Skill Offer</h4><p>${bid.text}</p>`;
                bidCard.style.animationDelay = `${bid.delay}s`;
                Object.assign(bidCard.style, bid.position);
                exchangeAnim.appendChild(bidCard);
            });
        }
    }, [exchangeAnimRef]);

    useEffect(() => {
        // ===== NETWORK VISUALIZATION =====
        const networkCanvas = networkCanvasRef.current;
        const tooltip = tooltipRef.current;
        
        if (networkCanvas && tooltip) {
            const networkCtx = networkCanvas.getContext('2d');
            
            networkCanvas.width = networkCanvas.offsetWidth;
            networkCanvas.height = networkCanvas.offsetHeight;

            const nodes = [];
            const nodeCount = 20;

            class Node {
                constructor() {
                    this.x = Math.random() * networkCanvas.width;
                    this.y = Math.random() * networkCanvas.height;
                    this.radius = 8;
                    this.speedX = Math.random() * 0.5 - 0.25;
                    this.speedY = Math.random() * 0.5 - 0.25;
                    this.pulsePhase = Math.random() * Math.PI * 2;
                    this.user = {
                        name: ['Alex', 'Sarah', 'Mike', 'Emma', 'David'][Math.floor(Math.random() * 5)],
                        skills: ['Design', 'Development', 'Marketing'].slice(0, Math.floor(Math.random() * 2) + 1),
                        reputation: (4.5 + Math.random() * 0.5).toFixed(1)
                    };
                }

                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;

                    if (this.x > networkCanvas.width - this.radius || this.x < this.radius) this.speedX *= -1;
                    if (this.y > networkCanvas.height - this.radius || this.y < this.radius) this.speedY *= -1;
                    
                    this.pulsePhase += 0.05;
                }

                draw() {
                    const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
                    const gradient = networkCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
                    gradient.addColorStop(0, `rgba(91, 124, 255, ${0.4 * pulse})`);
                    gradient.addColorStop(1, 'rgba(91, 124, 255, 0)');
                    
                    networkCtx.fillStyle = gradient;
                    networkCtx.beginPath();
                    networkCtx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                    networkCtx.fill();
                    
                    networkCtx.fillStyle = '#5B7CFF';
                    networkCtx.beginPath();
                    networkCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    networkCtx.fill();
                }

                isHovered(mouseX, mouseY) {
                    const dist = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
                    return dist < this.radius * 3;
                }
            }

            for (let i = 0; i < nodeCount; i++) {
                nodes.push(new Node());
            }

            function drawConnections() {
                nodes.forEach((node, i) => {
                    nodes.slice(i + 1).forEach(otherNode => {
                        const dist = Math.sqrt((node.x - otherNode.x) ** 2 + (node.y - otherNode.y) ** 2);
                        if (dist < 150) {
                            const opacity = (1 - dist / 150) * 0.2;
                            networkCtx.strokeStyle = `rgba(91, 124, 255, ${opacity})`;
                            networkCtx.lineWidth = 1;
                            networkCtx.beginPath();
                            networkCtx.moveTo(node.x, node.y);
                            networkCtx.lineTo(otherNode.x, otherNode.y);
                            networkCtx.stroke();
                        }
                    });
                });
            }

            let animationId;
            function animateNetwork() {
                networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
                drawConnections();
                nodes.forEach(node => {
                    node.update();
                    node.draw();
                });
                animationId = requestAnimationFrame(animateNetwork);
            }

            animateNetwork();

            const handleMouseMove = (e) => {
                const rect = networkCanvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                let hoveredNode = null;
                nodes.forEach(node => {
                    if (node.isHovered(mouseX, mouseY)) {
                        hoveredNode = node;
                    }
                });
                
                if (hoveredNode) {
                    tooltip.innerHTML = `
                        <div class="user-avatar" style="width: 50px; height: 50px; font-size: 20px;">${hoveredNode.user.name[0]}</div>
                        <div style="font-weight: 600; margin-bottom: 4px;">${hoveredNode.user.name}</div>
                        <div class="reputation" style="margin-bottom: 12px;">⭐ ${hoveredNode.user.reputation}</div>
                        <div class="user-skills">
                            ${hoveredNode.user.skills.map(skill => `<div class="skill-tag">${skill}</div>`).join('')}
                        </div>
                    `;
                    tooltip.style.left = `${e.clientX + 20}px`;
                    tooltip.style.top = `${e.clientY + 20}px`;
                    tooltip.classList.add('visible');
                } else {
                    tooltip.classList.remove('visible');
                }
            };

            const handleMouseLeave = () => {
                tooltip.classList.remove('visible');
            };

            const handleResize = () => {
                networkCanvas.width = networkCanvas.offsetWidth;
                networkCanvas.height = networkCanvas.offsetHeight;
            };

            window.addEventListener('resize', handleResize);
            networkCanvas.addEventListener('mousemove', handleMouseMove);
            networkCanvas.addEventListener('mouseleave', handleMouseLeave);

            return () => {
                cancelAnimationFrame(animationId);
                window.removeEventListener('resize', handleResize);
                networkCanvas.removeEventListener('mousemove', handleMouseMove);
                networkCanvas.removeEventListener('mouseleave', handleMouseLeave);
            };
        }
    }, [networkCanvasRef, tooltipRef]);

    return (
        <div className="page active" style={{ display: 'block', opacity: 1, animation: 'none' }}>
            <section className="hero" style={{ minHeight: '140vh', paddingTop: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '60px' }}>
                <div className="hero-content" style={{ zIndex: 10, position: 'relative', width: '100%' }}>
                    <h1>Bid Skills. Not Money.</h1>
                    <p className="hero-subtitle">The first auction marketplace where talent replaces currency.</p>
                    <div className="hero-cta-group" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => onNavigate('create-auction')}>Start Skill Auction</button>
                        <button className="btn btn-secondary" onClick={() => onNavigate('marketplace')}>Explore Live Auctions</button>
                    </div>
                </div>

                <div id="marketplace-3d" ref={marketplace3dRef} style={{ position: 'relative', width: '100%', height: '600px', zIndex: 1 }}>
                    <div className="hub-sphere"></div>
                </div>
            </section>

            <section className="section" style={{ background: 'var(--dark-slate)' }}>
                <div className="section-header">
                    <h2>The Problem with Traditional Freelancing</h2>
                    <p>Money shouldn't be the only barrier to accessing talent</p>
                </div>
                <div className="problem-grid">
                    <div className="problem-card">
                        <div className="problem-icon">💸</div>
                        <h3>Cash Flow Barriers</h3>
                        <p>Startups and individuals often lack budget but have valuable skills to exchange.</p>
                    </div>
                    <div className="problem-card">
                        <div className="problem-icon">⏱️</div>
                        <h3>Delayed Payments</h3>
                        <p>Traditional platforms involve payment delays, fees, and transaction friction.</p>
                    </div>
                    <div className="problem-card">
                        <div className="problem-icon">🔗</div>
                        <h3>Missed Connections</h3>
                        <p>Talented professionals can't collaborate because of currency constraints.</p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="section-header">
                    <h2>How Skill Bidding Works</h2>
                    <p>See how our platform creates direct skill-for-skill exchanges</p>
                </div>

                <div id="exchange-animation" ref={exchangeAnimRef}>
                    <div className="request-card-center">
                        <h3>Need a Logo Design</h3>
                        <p>Looking for professional branding</p>
                    </div>
                </div>

                <div className="steps-grid">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <h3>Post Skill Request</h3>
                        <p>Describe what skill you need and set a skill credit value</p>
                    </div>
                    <div className="step-card">
                        <div className="step-number">2</div>
                        <h3>Receive Skill Bids</h3>
                        <p>Professionals bid with their own skills instead of money</p>
                    </div>
                    <div className="step-card">
                        <div className="step-number">3</div>
                        <h3>Select Best Exchange</h3>
                        <p>Choose the skill offer that best matches your needs</p>
                    </div>
                </div>
            </section>

            <section className="section" style={{ background: 'var(--dark-slate)' }}>
                <div className="section-header">
                    <h2>Live Skill Auctions</h2>
                    <p>Real-time marketplace where talent meets opportunity</p>
                </div>
                
                {loadingAuctions ? (
                    <div style={{ textAlign: 'center', margin: '40px 0' }}>Loading live auctions...</div>
                ) : (
                    <div className="auction-grid">
                        {recentAuctions.map(auction => (
                            <div key={auction.id} className="auction-card" onClick={() => { localStorage.setItem('currentAuctionId', auction.id); onNavigate('auction-detail'); }}>
                                <div className="auction-header">
                                    <div>
                                        <div className="auction-title">{auction.title}</div>
                                        <div className="auction-category">{auction.skill_category}</div>
                                    </div>
                                </div>
                                <div className="auction-stats">
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Bids</div>
                                        <div className="auction-stat-value">{auction.total_bids}</div>
                                    </div>
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Time Left</div>
                                        <div className="countdown-timer">{calculateTimeLeft(auction.auction_end_time)}</div>
                                    </div>
                                    <div className="auction-stat">
                                        <div className="auction-stat-label">Creator Rep</div>
                                        <div className="reputation">⭐ {auction.creator_reputation || '0.00'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {recentAuctions.length === 0 && <div style={{width: '100%', textAlign: 'center'}}>No recent auctions.</div>}
                    </div>
                )}
                
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button className="btn btn-primary" onClick={() => onNavigate('marketplace')}>View All Auctions</button>
                </div>
            </section>

            <section className="section">
                <div className="section-header">
                    <h2>Skill Credit Economy</h2>
                    <p>Every skill has a value measured in credits</p>
                </div>
                <div id="credit-tokens">
                    <div className="token-comparison">
                        <div className="token-3d"></div>
                        <div className="token-label">1 Hour Python Tutoring</div>
                        <div className="token-value">50 Credits</div>
                    </div>
                    <div className="token-comparison">
                        <div className="token-3d" style={{ animationDelay: '-3.3s' }}></div>
                        <div className="token-label">Logo Design</div>
                        <div className="token-value">100 Credits</div>
                    </div>
                    <div className="token-comparison">
                        <div className="token-3d" style={{ animationDelay: '-6.6s' }}></div>
                        <div className="token-label">SEO Audit</div>
                        <div className="token-value">80 Credits</div>
                    </div>
                </div>
            </section>

            <section className="section" style={{ background: 'var(--dark-slate)' }}>
                <div className="section-header">
                    <h2>Living Talent Network</h2>
                    <p>Watch skills flow between professionals in real-time</p>
                </div>
                <canvas id="network-canvas" ref={networkCanvasRef}></canvas>
                <div className="user-node-card" id="node-tooltip" ref={tooltipRef}></div>
            </section>

            <section className="section">
                <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--card-border)', borderRadius: '20px' }}>
                    <h2 style={{ fontSize: '48px', marginBottom: '24px' }}>Ready to Join the Skill Economy?</h2>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>Start exchanging your skills today and unlock a new way of collaboration</p>
                    <div className="hero-cta-group">
                        <button className="btn btn-primary" onClick={() => onNavigate('create-auction')}>Create Your First Auction</button>
                        <button className="btn btn-secondary" onClick={() => onNavigate('marketplace')}>Browse Opportunities</button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
