/**
 * Agent Routes - Proxies requests to Python FastAPI Agent Microservice
 * All routes under /api/agents/*
 */
const express = require('express');
const router = express.Router();

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

// Simple proxy helper
async function proxyToAgent(path, body, res) {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Agent service error' }));
            return res.status(response.status).json(err);
        }

        const data = await response.json();
        return res.json(data);
    } catch (error) {
        // Agent service might be offline - return friendly fallback
        console.error(`Agent proxy error (${path}):`, error.message);
        return res.status(503).json({
            error: 'AI Agent service is currently offline.',
            message: 'Start the Python agent service with: cd agents && uvicorn main:app --reload',
            fallback: true
        });
    }
}

async function proxyGet(path, res) {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}${path}`);
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        return res.status(503).json({ error: 'AI Agent service is offline', fallback: true });
    }
}

// POST /api/agents/chat - Portfolio Assistant
router.post('/chat', async (req, res) => {
    const { message, session_id } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    await proxyToAgent('/agents/chat', { message, session_id }, res);
});

// POST /api/agents/explain-auction - Auction Explainer
router.post('/explain-auction', async (req, res) => {
    const { auction_id, question } = req.body;
    if (!auction_id) return res.status(400).json({ message: 'auction_id is required' });
    await proxyToAgent('/agents/explain-auction', { auction_id, question }, res);
});

const db = require('../config/db');

function calculateCredits(score) {
    if (score === 100) return 100;
    if (score >= 90) return 75;
    if (score >= 80) return 50;
    if (score >= 70) return 25;
    return 0;
}

// POST /api/agents/verify-skill - Skill Verifier
router.post('/verify-skill', async (req, res) => {
    const { skill_name, user_id, user_answer } = req.body;
    if (!skill_name) return res.status(400).json({ message: 'skill_name is required' });
    
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/agents/verify-skill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_name, user_id: String(user_id), user_answer }),
        });

        const data = await response.json();
        console.log("Agent Response Data:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Only process score threshold if it's an evaluation (user_answer exists)
        if (user_answer) {
            const trulyPassed = data.passed && data.score >= 70;
            let earnedCredits = 0;

            if (trulyPassed) {
                console.log(`User ${user_id} passed verification for ${skill_name} (${data.score}%)`);
                
                // First check if the skill was ALREADY verified to prevent duplicate rewards
                const existingSkillRes = await db.query(
                    'SELECT verified FROM skills WHERE user_id = $1 AND skill_name = $2',
                    [user_id, skill_name]
                );
                
                const wasAlreadyVerified = existingSkillRes.rows.length > 0 && existingSkillRes.rows[0].verified;

                // Update skill record with new score and verified status
                await db.query(
                    'UPDATE skills SET verified = true, verification_score = $1, last_verified_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND skill_name = $3',
                    [data.score, user_id, skill_name]
                );
                
                // Only grant reward credits ONCE per skill verification
                if (!wasAlreadyVerified) {
                    earnedCredits = calculateCredits(data.score);
                    if (earnedCredits > 0) {
                        await db.query(
                            'UPDATE users SET skill_credits = skill_credits + $1 WHERE id = $2',
                            [earnedCredits, user_id]
                        );
                        console.log(`Granted ${earnedCredits} credits to user ${user_id} for scoring ${data.score}`);
                    }
                }
            }

            return res.json({
                ...data,
                passed: trulyPassed,
                success: true,
                score: data.score,
                credits_earned: earnedCredits,
                message: trulyPassed ? "Credits awarded successfully" : "Score too low for verification",
                threshold_info: trulyPassed ? null : (data.score > 0 ? "You need a score of 70 or higher to be verified." : null)
            });
        }

        // Just return the challenge generation data
        return res.json(data);
    } catch (error) {
        console.error('Skill verification proxy error:', error);
        return res.status(503).json({ error: 'AI Agent service is offline' });
    }
});

// POST /api/agents/learning-path - Learning Path
router.post('/learning-path', async (req, res) => {
    const { target_skill, current_skills } = req.body;
    if (!target_skill) return res.status(400).json({ message: 'target_skill is required' });
    await proxyToAgent('/agents/learning-path', { target_skill, current_skills: current_skills || [] }, res);
});

// GET /api/agents/architecture - Architecture metadata
router.get('/architecture', async (req, res) => {
    await proxyGet('/agents/architecture', res);
});

// GET /api/agents/health - Check if agent service is alive
router.get('/health', async (req, res) => {
    await proxyGet('/health', res);
});

module.exports = router;
