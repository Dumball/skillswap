const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

exports.generateTest = async (req, res) => {
    const { skill_name, difficulty = 'medium' } = req.body;
    if (!skill_name) {
        return res.status(400).json({ success: false, message: 'skill_name is required' });
    }

    try {
        console.log(`Generating test for ${skill_name}...`);
        const response = await fetch(`${AGENT_SERVICE_URL}/agents/generate-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_name, difficulty }),
        });

        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Agent service responded with error');
    } catch (error) {
        console.error('Test generation error:', error.message);
        
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Unable to generate a valid verification test for this skill. Please try again later.' 
        });
    }
};
