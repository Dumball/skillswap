require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runTest() {
    try {
        console.log('Testing Admin Database Role Assignment...');
        const userQuery = await pool.query("SELECT * FROM users WHERE name = 'Shivang' OR email LIKE '%@%' LIMIT 1");
        const adminUser = userQuery.rows[0];
        
        if (!adminUser || adminUser.role !== 'admin') {
            throw new Error('Admin user not found or not promoted');
        }

        console.log(`✅ Admin User verified: ${adminUser.name} (${adminUser.id})`);

        // Generate JWT
        const token = jwt.sign(
            { id: adminUser.id, role: adminUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Testing GET /api/admin/dashboard endpoint...');
        
        const response = await fetch('http://localhost:5000/api/admin/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Dashboard endpoint returns success:', result.data);
        } else {
            console.error('❌ Dashboard endpoint failed:', result);
        }

    } catch (e) {
        console.error('❌ Test failed:', e);
    } finally {
        await pool.end();
    }
}

runTest();
