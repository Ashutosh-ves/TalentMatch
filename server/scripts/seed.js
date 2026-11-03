const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (server/.env and root .env fallback)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const Student = require('../models/Student');
const Recruiter = require('../models/Recruiter');
const Opening = require('../models/Opening');
const Application = require('../models/Application');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const { fetchGithubUserData } = require('../services/githubService');
const { computeMatch } = require('../services/matchService');

// Profile overrides: customise student extraSkills, availability and interests here
const PROFILE_OVERRIDES = {
  'student.alex@talentmatch.com': {
    skills: ['React', 'JavaScript', 'Tailwind CSS', 'HTML', 'Git'],
    availability: 'Internship',
    interests: ['Frontend Engineering', 'UI/UX Design', 'Web Performance'],
    githubStats: { repoCount: 8, contributions: 25, topLanguages: ['JavaScript', 'HTML'] },
  },
  'student.devin@talentmatch.com': {
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    availability: 'Full-time',
    interests: ['Backend Systems', 'Microservices', 'Distributed Data'],
    githubStats: { repoCount: 4, contributions: 6, topLanguages: ['Python'] },
  },
  'ashutosh.m@talentmatch.com': {
    extraSkills: ['React', 'Node.js', 'Tailwind CSS', 'Django', 'FastAPI'],
    availability: 'Internship',
    interests: ['Full-Stack Development', 'Open Source', 'Applied AI'],
  },
  'shivam.m@talentmatch.com': {
    extraSkills: [],
    availability: 'Full-time',
    interests: ['Open Source', 'Web Development'],
  },
  'shivam.k@talentmatch.com': {
    extraSkills: [],
    availability: 'Part-time',
    interests: ['Open Source', 'Web Development'],
  },
  'maanas.c@talentmatch.com': {
    extraSkills: [],
    availability: 'Contract',
    interests: ['Open Source', 'Web Development'],
  },
  'swayam.m@talentmatch.com': {
    extraSkills: [],
    availability: 'Internship',
    interests: ['Open Source', 'Web Development'],
  },
};

// Demo applications mapping (seeded when running with --demo)
const DEMO_APPLICATIONS = [
  {
    studentEmail: 'ashutosh.m@talentmatch.com',
    openingTitle: 'Frontend Developer Intern',
    status: 'shortlisted',
  },
  {
    studentEmail: 'shivam.m@talentmatch.com',
    openingTitle: 'Backend Developer Intern',
    status: 'accepted',
  },
  {
    studentEmail: 'swayam.m@talentmatch.com',
    openingTitle: 'Frontend Developer Intern',
    status: 'rejected',
  },
  {
    studentEmail: 'maanas.c@talentmatch.com',
    openingTitle: 'Backend Developer Intern',
    status: 'applied',
  },
  {
    studentEmail: 'student.alex@talentmatch.com',
    openingTitle: 'Frontend Developer Intern',
    status: 'applied',
  },
  {
    studentEmail: 'student.devin@talentmatch.com',
    openingTitle: 'Frontend Developer Intern',
    status: 'applied',
  },
  // Shivam K gets no application, so he can apply live during the demo
];

async function seed() {
  // Refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed script refused to run in production environment (NODE_ENV=production).');
    process.exit(1);
  }

  const isDemo = process.argv.includes('--demo');
  console.log(`\n=============================================================`);
  console.log(`         STARTING DATABASE SEEDING (Mode: ${isDemo ? 'DEMO' : 'STANDARD'})        `);
  console.log(`=============================================================`);

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
    // -------------------------------------------------------------
    // 1. CLEAN UP OBSOLETE DATA (IDEMPOTENT)
    // -------------------------------------------------------------
    console.log('\n[1/5] Checking database state and cleaning obsolete records...');

    // Clean up old openings if with outdated titles
    const existingApprovedUser = await User.findOne({ email: 'recruiter.approved@talentmatch.com' });
    if (existingApprovedUser) {
      const obsoleteOpenings = await Opening.find({
        recruiterId: existingApprovedUser._id,
        title: { $in: ['Senior Frontend Engineer', 'Cloud Backend Architect'] },
      });
      const obsoleteOpeningIds = obsoleteOpenings.map((o) => o._id);

      if (obsoleteOpeningIds.length > 0) {
        const obsoleteApps = await Application.find({ openingId: { $in: obsoleteOpeningIds } });
        const obsoleteAppIds = obsoleteApps.map((a) => a._id);

        await Message.deleteMany({ applicationId: { $in: obsoleteAppIds } });
        await Notification.deleteMany({
          $or: [
            { openingId: { $in: obsoleteOpeningIds } },
            { applicationId: { $in: obsoleteAppIds } },
          ],
        });
        await Application.deleteMany({ openingId: { $in: obsoleteOpeningIds } });
        await Opening.deleteMany({ _id: { $in: obsoleteOpeningIds } });
        console.log(`  ✓ Removed ${obsoleteOpeningIds.length} obsolete openings and all related docs.`);
      } else {
        console.log('  ✓ No obsolete openings found.');
      }
    }

    // -------------------------------------------------------------
    // 2. ADMIN & RECRUITERS (CLEAN REALISTIC NAMES)
    // -------------------------------------------------------------
    console.log('\n[2/5] Upserting Admin & Recruiters with company names...');

    const admin = await upsertUser({
      name: 'System Administrator',
      email: 'admin@talentmatch.com',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'approved',
    });

    const approvedRecruiter = await upsertUser({
      name: 'Priya Nair',
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

    const pendingRecruiter = await upsertUser({
      name: 'Rohan Mehta',
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
    console.log('  ✓ Admin, Priya Nair (Nexus Tech Global), and Rohan Mehta (Apex Innovations) upserted.');

    // -------------------------------------------------------------
    // 3. STUDENT PROFILES WITH VARIED AVAILABILITY & SKILLS
    // -------------------------------------------------------------
    console.log('\n[3/5] Upserting student profiles with diverse availability and skills...');

    const STUDENTS_CONFIG = [
      {
        name: 'Alex Rivera',
        email: 'student.alex@talentmatch.com',
        githubUsername: 'alex-rivera-tm',
        isStatic: true,
      },
      {
        name: 'Devin Vance',
        email: 'student.devin@talentmatch.com',
        githubUsername: 'devin-vance-tm',
        isStatic: true,
      },
      {
        name: 'Ashutosh M',
        email: 'ashutosh.m@talentmatch.com',
        githubUsername: 'Ashutosh-ves',
      },
      {
        name: 'Shivam M',
        email: 'shivam.m@talentmatch.com',
        githubUsername: 'Thetwobraincells',
      },
      {
        name: 'Shivam K',
        email: 'shivam.k@talentmatch.com',
        githubUsername: 'ShivammKshirsagar',
      },
      {
        name: 'Maanas C',
        email: 'maanas.c@talentmatch.com',
        githubUsername: 'MVC2408',
      },
      {
        name: 'Swayam M',
        email: 'swayam.m@talentmatch.com',
        githubUsername: 'swayammankar',
      },
    ];

    const githubSummaryTable = [];
    const failedFetches = [];
    const seededStudents = {};

    for (const studentDef of STUDENTS_CONFIG) {
      const user = await upsertUser({
        name: studentDef.name,
        email: studentDef.email,
        password: 'StudentPassword123!',
        role: 'student',
        status: 'approved',
      });

      const existingProfile = await Student.findOne({ userId: user._id });
      const override = PROFILE_OVERRIDES[studentDef.email] || {};

      let githubStats = override.githubStats || existingProfile?.githubStats || { contributions: 0, topLanguages: [], repoCount: 0 };
      let fetchSuccess = false;

      if (!studentDef.isStatic) {
        try {
          const fetchedStats = await fetchGithubUserData(studentDef.githubUsername);
          if (fetchedStats) {
            githubStats = fetchedStats;
            fetchSuccess = true;
          }
        } catch (err) {
          console.warn(`  ⚠️  [WARNING] Could not fetch GitHub metrics for ${studentDef.name} (@${studentDef.githubUsername}): ${err.message}`);
          failedFetches.push({ name: studentDef.name, username: studentDef.githubUsername, error: err.message });
          if (!existingProfile?.githubStats?.repoCount) {
            githubStats = { contributions: 0, topLanguages: [], repoCount: 0 };
          }
        }
      } else {
        fetchSuccess = true;
      }

      // Compute skills & availability
      let combinedSkills;
      if (override.skills) {
        combinedSkills = override.skills;
      } else {
        const topLangs = Array.isArray(githubStats.topLanguages) ? githubStats.topLanguages.slice(0, 5) : [];
        combinedSkills = Array.from(new Set([...topLangs, ...(override.extraSkills || [])]));
      }

      const availability = override.availability || 'Internship';
      const interests = override.interests && override.interests.length > 0
        ? override.interests
        : ['Open Source', 'Web Development'];

      const studentDoc = await Student.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          skills: combinedSkills,
          interests,
          availability,
          githubUsername: studentDef.githubUsername,
          githubStats,
          linkedinUrl: '',
          portfolioUrl: '',
        },
        { upsert: true, returnDocument: 'after' }
      );

      seededStudents[studentDef.email] = { user, studentDoc };

      githubSummaryTable.push({
        'Student Name': studentDef.name,
        Email: studentDef.email,
        Availability: availability,
        'GitHub Username': `@${studentDef.githubUsername}`,
        'Repo Count': githubStats.repoCount ?? 0,
        'Contributions (YTD)': githubStats.contributions ?? 0,
        'Top Languages': (githubStats.topLanguages || []).join(', ') || 'None',
        'API Fetch Status': studentDef.isStatic ? 'Seeded Baseline' : (fetchSuccess ? 'Live API Success' : (githubStats.repoCount ? 'Retained Cache' : 'Empty (Failed)')),
      });
    }

    // -------------------------------------------------------------
    // 4. REALISTIC JOB OPENINGS (OWNED BY PRIYA NAIR / NEXUS TECH)
    // -------------------------------------------------------------
    console.log('\n[4/5] Upserting realistic job openings...');

    const OPENINGS_CONFIG = [
      {
        title: 'Frontend Developer Intern',
        status: 'active',
        availabilityNeeds: 'Internship',
        requiredSkills: ['React', 'JavaScript', 'Tailwind CSS', 'HTML'],
        description:
          'Join our core engineering team to build responsive, accessible web interfaces using React, JavaScript, and Tailwind CSS. You will collaborate closely with UI designers and senior engineers to deliver seamless user experiences.',
      },
      {
        title: 'Backend Developer Intern',
        status: 'active',
        availabilityNeeds: 'Full-time',
        requiredSkills: ['Python', 'JavaScript', 'Node.js', 'Docker'],
        description:
          'Work alongside platform engineers to develop scalable REST APIs, microservices, and containerized backends using Python, Node.js, and Docker. You will contribute to database performance optimizations, automated testing pipelines, and cloud service deployments.',
      },
      {
        title: 'Open-Source Contributor: Developer Tooling',
        status: 'draft',
        availabilityNeeds: 'Part-time',
        requiredSkills: ['TypeScript', 'Python', 'Git'],
        description:
          'Help design and maintain developer tools, CLI utilities, and open-source SDKs across TypeScript and Python ecosystems. You will triage community feedback, improve documentation and automated CI/CD workflows, and author modular open-source libraries.',
      },
    ];

    const seededOpenings = {};
    for (const opDef of OPENINGS_CONFIG) {
      const opening = await Opening.findOneAndUpdate(
        { recruiterId: approvedRecruiter._id, title: opDef.title },
        {
          recruiterId: approvedRecruiter._id,
          title: opDef.title,
          description: opDef.description,
          requiredSkills: opDef.requiredSkills,
          availabilityNeeds: opDef.availabilityNeeds,
          status: opDef.status,
        },
        { upsert: true, returnDocument: 'after' }
      );
      seededOpenings[opDef.title] = opening;
      console.log(`  ✓ Opening "${opening.title}" (${opening.status}) upserted.`);
    }

    // -------------------------------------------------------------
    // 5. DEMO MODE DATA SEEDING (APPLICATIONS, CHAT, NOTIFICATIONS)
    // -------------------------------------------------------------
    let demoApplicationsReport = [];
    if (isDemo) {
      console.log('\n[5/5] Demo mode active: Upserting applications, conversation, and notifications...');

      for (const demoApp of DEMO_APPLICATIONS) {
        const studentInfo = seededStudents[demoApp.studentEmail];
        const opening = seededOpenings[demoApp.openingTitle];

        if (!studentInfo || !opening) {
          console.warn(`  ⚠️  Skipping demo application for ${demoApp.studentEmail} -> ${demoApp.openingTitle} (missing record)`);
          continue;
        }

        const { score: matchScore, breakdown: matchBreakdown } = computeMatch(studentInfo.studentDoc, opening);

        const app = await Application.findOneAndUpdate(
          { studentId: studentInfo.user._id, openingId: opening._id },
          {
            $set: {
              status: demoApp.status,
              matchScore,
            },
            $setOnInsert: {
              studentId: studentInfo.user._id,
              openingId: opening._id,
              appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            },
          },
          { upsert: true, returnDocument: 'after' }
        );

        // 5a. Seed Recruiter Notification: "application_received"
        await Notification.findOneAndUpdate(
          {
            userId: approvedRecruiter._id,
            type: 'application_received',
            applicationId: app._id,
          },
          {
            $set: {
              message: `${studentInfo.user.name} applied to ${opening.title}`,
              isRead: false,
            },
            $setOnInsert: {
              userId: approvedRecruiter._id,
              type: 'application_received',
              applicationId: app._id,
              openingId: opening._id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
          },
          { upsert: true, returnDocument: 'after' }
        );

        // 5b. Seed Student Notification (shortlisted/accepted/rejected only)
        if (['shortlisted', 'accepted', 'rejected'].includes(demoApp.status)) {
          let notifType;
          let notifMessage;
          if (demoApp.status === 'shortlisted') {
            notifType = 'application_shortlisted';
            notifMessage = `Your application for "${opening.title}" has been shortlisted!`;
          } else if (demoApp.status === 'accepted') {
            notifType = 'application_accepted';
            notifMessage = `Congratulations! Your application for "${opening.title}" has been accepted!`;
          } else if (demoApp.status === 'rejected') {
            notifType = 'application_rejected';
            notifMessage = `Your application for "${opening.title}" was not selected.`;
          }

          await Notification.findOneAndUpdate(
            {
              userId: studentInfo.user._id,
              type: notifType,
              applicationId: app._id,
            },
            {
              $set: {
                message: notifMessage,
                isRead: false,
              },
              $setOnInsert: {
                userId: studentInfo.user._id,
                type: notifType,
                applicationId: app._id,
                openingId: opening._id,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              },
            },
            { upsert: true, returnDocument: 'after' }
          );
        }

        // 5c. Seed short 4-message conversation on the shortlisted application only if no messages exist yet
        let messagesSeeded = false;
        if (demoApp.status === 'shortlisted') {
          const existingMsgCount = await Message.countDocuments({ applicationId: app._id });
          if (existingMsgCount === 0) {
            const now = Date.now();
            await Message.create([
              {
                applicationId: app._id,
                senderId: approvedRecruiter._id,
                text: 'Hi Ashutosh, thank you for applying! We were impressed by your React and full-stack projects on GitHub.',
                timestamp: new Date(now - 30 * 60 * 1000),
              },
              {
                applicationId: app._id,
                senderId: studentInfo.user._id,
                text: "Hi Priya, thank you! I'm really excited about Nexus Tech Global's product roadmap.",
                timestamp: new Date(now - 25 * 60 * 1000),
              },
              {
                applicationId: app._id,
                senderId: approvedRecruiter._id,
                text: "We'd love to schedule a 30-minute introductory call this week. Would Thursday afternoon work for you?",
                timestamp: new Date(now - 18 * 60 * 1000),
              },
              {
                applicationId: app._id,
                senderId: studentInfo.user._id,
                text: 'Thursday afternoon works great for me! Looking forward to discussing the role.',
                timestamp: new Date(now - 10 * 60 * 1000),
              },
            ]);
            messagesSeeded = true;
          }
        }

        demoApplicationsReport.push({
          Student: studentInfo.user.name,
          Email: studentInfo.user.email,
          Opening: opening.title,
          Status: app.status,
          'Match Score': `${app.matchScore}%`,
          'Conversation Seeded': demoApp.status === 'shortlisted' ? (messagesSeeded ? '4 messages (Created)' : '4 messages (Retained)') : 'None',
        });
      }
    } else {
      console.log('\n[5/5] Standard mode: Skipping demo applications (run `npm run seed:demo` for pipeline data).');
    }

    // -------------------------------------------------------------
    // 6. OUTPUT & SUMMARY TABLES
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('             TALENT MATCH DEMO CREDENTIALS                   ');
    console.log('=============================================================');
    console.table([
      { Role: 'Admin', Name: admin.name, Email: admin.email, Password: 'AdminPassword123!', Status: admin.status },
      { Role: 'Approved Recruiter', Name: approvedRecruiter.name, Email: approvedRecruiter.email, Password: 'RecruiterPassword123!', Status: approvedRecruiter.status },
      { Role: 'Pending Recruiter', Name: pendingRecruiter.name, Email: pendingRecruiter.email, Password: 'RecruiterPassword123!', Status: pendingRecruiter.status },
      ...STUDENTS_CONFIG.map((s, idx) => ({
        Role: `Student ${idx + 1}`,
        Name: s.name,
        Email: s.email,
        Password: 'StudentPassword123!',
        Status: 'approved',
      })),
    ]);

    console.log('\n=============================================================');
    console.log('              FETCHED GITHUB METRICS SUMMARY                 ');
    console.log('=============================================================');
    console.table(githubSummaryTable);

    if (failedFetches.length > 0) {
      console.log('\n⚠️  FAILED GITHUB FETCHES:');
      console.table(failedFetches);
    } else {
      console.log('\n✓ All GitHub profiles successfully resolved.');
    }

    if (isDemo && demoApplicationsReport.length > 0) {
      console.log('\n=============================================================');
      console.log('               SEEDED DEMO APPLICATION PIPELINE             ');
      console.log('=============================================================');
      console.table(demoApplicationsReport);
    }

    console.log('\nDatabase seeding completed successfully!');
  } catch (error) {
    console.error('Seeding execution error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seed();
