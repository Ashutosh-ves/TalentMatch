const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const Student = require('../models/Student');
const Recruiter = require('../models/Recruiter');
const Opening = require('../models/Opening');

async function seed() {
  // Refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed script refused to run in production environment (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('--- STARTING DATABASE SEEDING ---');
  await connectDB();

  // Helper for idempotent upsert of Users
  async function upsertUser({ name, email, password, role, status }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          status,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    return user;
  }

  try {
    // 1. Admin
    const admin = await upsertUser({
      name: 'System Administrator',
      email: 'admin@talentmatch.com',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'approved',
    });

    // 2. Approved Recruiter
    const approvedRecruiter = await upsertUser({
      name: 'Sarah Connor (Approved Recruiter)',
      email: 'recruiter.approved@talentmatch.com',
      password: 'RecruiterPassword123!',
      role: 'recruiter',
      status: 'approved',
    });
    await Recruiter.findOneAndUpdate(
      { userId: approvedRecruiter._id },
      {
        userId: approvedRecruiter._id,
        companyName: 'Nexus Tech Global',
        websiteUrl: 'https://nexustech.io',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 3. Pending Recruiter
    const pendingRecruiter = await upsertUser({
      name: 'John Matrix (Pending Recruiter)',
      email: 'recruiter.pending@talentmatch.com',
      password: 'RecruiterPassword123!',
      role: 'recruiter',
      status: 'pending',
    });
    await Recruiter.findOneAndUpdate(
      { userId: pendingRecruiter._id },
      {
        userId: pendingRecruiter._id,
        companyName: 'Apex Innovations',
        websiteUrl: 'https://apexinnovations.dev',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 4. Student 1 (Frontend specialist)
    const student1 = await upsertUser({
      name: 'Alex Rivera',
      email: 'student.alex@talentmatch.com',
      password: 'StudentPassword123!',
      role: 'student',
      status: 'approved',
    });
    await Student.findOneAndUpdate(
      { userId: student1._id },
      {
        userId: student1._id,
        skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Tailwind CSS'],
        interests: ['Frontend Engineering', 'UI/UX Design', 'Fullstack Development'],
        availability: 'Immediate',
        githubUsername: 'alexrivera-dev',
        githubStats: {
          contributions: 145,
          topLanguages: ['TypeScript', 'JavaScript', 'HTML'],
          repoCount: 16,
        },
        linkedinUrl: 'https://linkedin.com/in/alex-rivera-dev',
        portfolioUrl: 'https://alexrivera.dev',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 5. Student 2 (Backend specialist)
    const student2 = await upsertUser({
      name: 'Devin Vance',
      email: 'student.devin@talentmatch.com',
      password: 'StudentPassword123!',
      role: 'student',
      status: 'approved',
    });
    await Student.findOneAndUpdate(
      { userId: student2._id },
      {
        userId: student2._id,
        skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker'],
        interests: ['Backend Systems', 'Distributed Systems', 'DevOps'],
        availability: '2 Weeks Notice',
        githubUsername: 'devinvance-py',
        githubStats: {
          contributions: 92,
          topLanguages: ['Python', 'SQL', 'Shell'],
          repoCount: 11,
        },
        linkedinUrl: 'https://linkedin.com/in/devin-vance-py',
        portfolioUrl: 'https://devinvance.io',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 6. Job Openings owned by Approved Recruiter
    // Active Opening
    const activeOpening = await Opening.findOneAndUpdate(
      { recruiterId: approvedRecruiter._id, title: 'Senior Frontend Engineer' },
      {
        recruiterId: approvedRecruiter._id,
        title: 'Senior Frontend Engineer',
        description: 'Lead architecture of responsive modern web applications with React, TypeScript and Tailwind CSS.',
        requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
        availabilityNeeds: 'Immediate',
        status: 'active',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Draft Opening
    const draftOpening = await Opening.findOneAndUpdate(
      { recruiterId: approvedRecruiter._id, title: 'Cloud Backend Architect' },
      {
        recruiterId: approvedRecruiter._id,
        title: 'Cloud Backend Architect',
        description: 'Design and deploy scalable backend services and microservices.',
        requiredSkills: ['Python', 'PostgreSQL', 'Docker'],
        availabilityNeeds: 'Flexible',
        status: 'draft',
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('\n=============================================================');
    console.log('             TALENT MATCH SEEDED CREDENTIALS                 ');
    console.log('=============================================================');
    console.table([
      { Role: 'Admin', Name: admin.name, Email: admin.email, Password: 'AdminPassword123!', Status: admin.status },
      { Role: 'Approved Recruiter', Name: approvedRecruiter.name, Email: approvedRecruiter.email, Password: 'RecruiterPassword123!', Status: approvedRecruiter.status },
      { Role: 'Pending Recruiter', Name: pendingRecruiter.name, Email: pendingRecruiter.email, Password: 'RecruiterPassword123!', Status: pendingRecruiter.status },
      { Role: 'Student 1', Name: student1.name, Email: student1.email, Password: 'StudentPassword123!', Status: student1.status },
      { Role: 'Student 2', Name: student2.name, Email: student2.email, Password: 'StudentPassword123!', Status: student2.status },
    ]);
    console.log('Openings seeded for approved recruiter:');
    console.log(`- Active: "${activeOpening.title}" (ID: ${activeOpening._id})`);
    console.log(`- Draft:  "${draftOpening.title}" (ID: ${draftOpening._id})`);
    console.log('=============================================================\n');

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seed();
