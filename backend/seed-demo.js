const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Seeding demo data...');

    // 1. Create Demo Users
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    const users = [
      ['Alice Smith', 'alice@example.com', passwordHash, 500, 4.8],
      ['Bob Jones', 'bob@example.com', passwordHash, 300, 4.5],
      ['Charlie Brown', 'charlie@example.com', passwordHash, 1000, 4.9],
    ];

    const userIds = [];
    for (const [name, email, hash, credits, score] of users) {
      const res = await pool.query(
        'INSERT INTO users (name, email, password_hash, skill_credits, reputation_score) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET skill_credits = $4 RETURNING id',
        [name, email, hash, credits, score]
      );
      userIds.push(res.rows[0].id);
      console.log(`User created: ${name} (${res.rows[0].id})`);
    }

    // 2. Create Demo Skills for Users
    const skills = [
      [userIds[0], 'React Development', 'Web Development', 'Expert', true, 95],
      [userIds[1], 'Graphic Design', 'Design', 'Intermediate', true, 82],
      [userIds[2], 'Node.js', 'Web Development', 'Expert', true, 90],
    ];

    for (const [uid, name, cat, level, verified, score] of skills) {
      await pool.query(
        'INSERT INTO skills (user_id, skill_name, skill_category, skill_level, verified, verification_score) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [uid, name, cat, level, verified, score]
      );
    }
    console.log('Demo skills added.');

    // 3. Create Live Auctions
    const auctions = [
      [
        'Custom Logo Design', 
        'I need a modern, minimalist logo for my new AI startup. Looking for 3 concepts and 2 revisions.',
        'Graphic Design', 'Design', userIds[0], 50, 
        new Date(Date.now() + 86400000 * 3) // 3 days from now
      ],
      [
        'Next.js Performance Audit',
        'Looking for someone to optimize my landing page and improve Lighthouse scores.',
        'React Development', 'Web Development', userIds[1], 150,
        new Date(Date.now() + 86400000 * 5)
      ],
      [
        'Python Script for Web Scraping',
        'Need a script to scrape product data from an e-commerce site and save to CSV.',
        'Python', 'Data Science', userIds[2], 80,
        new Date(Date.now() + 86400000 * 2)
      ],
      [
        'Full-stack E-commerce Platform',
        'Need a developer to build a complete e-commerce solution with Next.js and Stripe.',
        'Full-stack', 'Web Development', userIds[0], 500,
        new Date(Date.now() + 86400000 * 7)
      ],
      [
        'Marketing Strategy for SaaS',
        'Looking for a growth hacker to help us scale our B2B SaaS product.',
        'Growth Hacking', 'Marketing', userIds[1], 300,
        new Date(Date.now() + 86400000 * 4)
      ],
      [
        'Video Editing for YouTube',
        'I have 5 hours of raw footage that needs to be edited into a 15-min tutorial.',
        'Premiere Pro', 'Video', userIds[2], 120,
        new Date(Date.now() + 86400000 * 1)
      ],
      [
        'SEO Content Writing',
        'Need 5 high-quality blog posts about AI and machine learning.',
        'SEO Writing', 'Writing', userIds[0], 200,
        new Date(Date.now() + 86400000 * 6)
      ]
    ];

    for (const [title, desc, sreq, scat, cid, minv, endt] of auctions) {
      await pool.query(
        'INSERT INTO auctions (title, description, skill_required, skill_category, creator_id, minimum_credit_value, auction_end_time, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [title, desc, sreq, scat, cid, minv, endt, 'active']
      );
    }
    console.log('Demo auctions added.');

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
