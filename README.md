<div align="center">

# TALENT MATCH

### Skills over resumes. Match students to real projects using what they have actually built.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?logo=jsonwebtokens&logoColor=white)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Screenshots](#screenshots)
3. [Features](#features)
4. [How Matching Works](#how-matching-works)
5. [Application Lifecycle](#application-lifecycle)
6. [System Architecture](#system-architecture)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Data Model](#data-model)
10. [API Reference](#api-reference)
11. [Real-Time Events](#real-time-events-socketio)
12. [Security](#security)
13. [Getting Started](#getting-started)
14. [Demo Walkthrough](#demo-walkthrough)
15. [Design System](#design-system)
16. [Deployment](#deployment)
17. [Known Limitations and Roadmap](#known-limitations-and-roadmap)
18. [Full-Stack Project Checklist: Status and Proof](#full-stack-project-checklist-status-and-proof)

---

## Overview

Resumes flatten people. A static PDF cannot show that a student has shipped five React projects, contributes to open source, or is free to start in June. Recruiters, meanwhile, cannot verify any of it before the first interview.

**Talent Match** replaces the resume with a living, skill-based profile:

- **Students** describe their skills, interests and availability, and link their GitHub username. The server pulls their *real* public GitHub activity (repositories, languages, contributions).
- **Companies** post internships and project openings with the skills they need.
- A **matching engine** scores every student against every opening and ranks them in both directions: students see the openings that fit them best, and recruiters see their applicants ranked by fit.
- Recruiters **shortlist** the best candidates, and the two sides move to a **live interview chat** built on WebSockets, with real-time notifications along the way.
- Recruiter accounts are **vetted by an admin** before they can post anything, which keeps the platform trustworthy.

It is a full-stack MERN application with role-based access control, JWT authentication, real-time features, and a design system modelled on editorial, high-contrast interfaces.

> Built as a Full Stack Development mini-project. Every item of the course checklist is tracked, with evidence, in the [last section](#full-stack-project-checklist-status-and-proof).

---

## Screenshots

> Add images to `docs/screenshots/` using the file names below.

| Landing | Student Dashboard |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Student Dashboard](docs/screenshots/student-dashboard.png) |

| Opening Candidates (ranked) | Candidate Profile |
|---|---|
| ![Opening Candidates](docs/screenshots/opening-candidates.png) | ![Candidate Profile](docs/screenshots/candidate-profile.png) |

| Interview Chat | Admin Approvals |
|---|---|
| ![Interview Chat](docs/screenshots/interview-chat.png) | ![Admin Dashboard](docs/screenshots/admin-dashboard.png) |

The original wireframes and the exported design system live in `stitch_talent_match_web_ui.zip`.

---

## Features

### For students
- Create a skill-based profile: **skills, interests, availability, GitHub username, LinkedIn, portfolio**
- **One-click GitHub sync**: repository count, top languages and recent contribution activity are fetched from the GitHub API and cached on the profile
- **Personalised dashboard** of openings ranked by match score, with text search and skill filters
- Open an opening to see the full description and a **match breakdown**, then apply in one click (duplicate applications are blocked at the database level)
- Track every application through its status: *applied, shortlisted, accepted, rejected*
- **Live interview chat** unlocks automatically once a recruiter shortlists you

### For recruiters
- Register a company account, then wait for **admin approval** (a pending or rejected banner is shown until then)
- Create, edit, publish (draft or active) and delete openings
- **Ranked candidate list** for each opening, with search and skill-chip filters
- Read-only **candidate profile** with GitHub stats and a transparent score breakdown
- **Shortlist, accept or reject** candidates, with confirmation dialogs for destructive actions
- Real-time chat with shortlisted candidates

### For admins
- A single, deliberately minimal screen: review **pending recruiter registrations** and approve or reject each one

### Platform-wide
- JWT authentication with three roles (`student`, `recruiter`, `admin`) and server-enforced permissions
- Real-time messaging and notifications over Socket.IO
- Loading skeletons, empty states and error banners on every data-driven page
- Responsive layouts and an accessible modal (focus trap, `Esc` to close)
- Session validation on load, automatic sign-out on expired tokens

---

## How Matching Works

Every student/opening pair gets a score from 0 to 100. The score is built from three transparent components. A component only counts when it is *applicable*, and weights are re-normalised over the applicable ones.

| Component | Weight | How it is computed |
|---|---|---|
| **Skills** | 60% | Share of the opening's `requiredSkills` found in the student's `skills` (case-insensitive) |
| **GitHub languages** | 25% | Of the required skills that are programming languages, the share found in the student's real GitHub `topLanguages` |
| **Availability** | 15% | `100` if the student's availability equals the opening's `availabilityNeeds`, otherwise `0` |

```
score = round( Σ(weight × component score) / Σ(weight of applicable components) )
```

**Worked example.** Opening *Frontend Developer Intern* requires `React, JavaScript, Tailwind CSS, HTML` and wants an `Internship`. A student has `React, JavaScript, Tailwind CSS`, GitHub top languages `JavaScript, TypeScript, CSS`, and is available for an `Internship`.

- Skills: 3 of 4 → **75**
- GitHub: required languages are JavaScript and HTML, the student has JavaScript → **50**
- Availability: Internship = Internship → **100**
- Score = (60×75 + 25×50 + 15×100) / 100 = **73**

The same function powers both directions: students get **recommended openings**, recruiters get **ranked candidates**. Rankings are recomputed live from the current profile, while `Application.matchScore` stores the score at the moment the student applied.

---

## Application Lifecycle

```mermaid
stateDiagram-v2
    [*] --> applied: Student applies
    applied --> shortlisted: Recruiter shortlists
    applied --> rejected: Recruiter rejects
    shortlisted --> accepted: Recruiter accepts
    shortlisted --> rejected: Recruiter rejects
    accepted --> [*]
    rejected --> [*]
```

Chat is only available while an application is `shortlisted` or `accepted`. This is enforced on the server for both REST and WebSocket traffic, not just hidden in the UI.

---

## System Architecture

```mermaid
flowchart LR
    subgraph Browser["Browser: React SPA (Vite + Tailwind)"]
        UI["Pages and components"]
        RQ["TanStack Query cache"]
        CTX["AuthContext / SocketContext"]
    end

    subgraph Server["Node.js: Express 5 API"]
        MW["helmet, CORS, rate limit, morgan"]
        AUTH["JWT auth and role middleware"]
        API["Controllers and routes"]
        SVC["matchService / githubService"]
        WS["Socket.IO server"]
    end

    DB[("MongoDB Atlas via Mongoose")]
    GH["GitHub REST API"]

    UI --> RQ
    RQ -->|"HTTPS /api (Axios + JWT)"| MW
    CTX <-->|"WebSocket (JWT handshake)"| WS
    MW --> AUTH --> API --> SVC
    API --> DB
    WS --> DB
    SVC -->|"public profile, repos, events"| GH
```

**Request flow in one sentence:** the React app calls the REST API through a single Axios instance that attaches the JWT, TanStack Query caches and refreshes the responses, and a separate authenticated Socket.IO connection delivers chat messages and live notifications.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, Vite 8, React Router 7 | Fast dev loop, nested role-based routing |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Utility-first, design tokens in `@theme` |
| Server state | TanStack Query 5 | Caching, loading and error states, invalidation |
| Global state | React Context API | Auth and socket state without Redux overhead |
| HTTP | Axios | Interceptors for the JWT and 401 handling |
| Backend | Node.js, Express 5 | Minimal, well-understood REST layer |
| Database | MongoDB Atlas, Mongoose 9 | Flexible documents, schema validation, populate |
| Real-time | Socket.IO 4 | Rooms, reconnection, authenticated handshake |
| Auth | JSON Web Tokens, bcryptjs | Stateless sessions, salted password hashes |
| Validation | express-validator | Declarative request validation |
| Security | helmet, express-rate-limit, CORS allow-list | Hardened headers, brute-force protection |
| Logging | morgan | Request logs (`dev` locally, `combined` in production) |
| Design | Google Stitch | AI-generated wireframes and design system |

---

## Project Structure

```
TalentMatch/
├── client/                         # React single-page application
│   └── src/
│       ├── components/common/      # Layout, Navbar, Footer, ProtectedRoute, ConfirmDialog
│       ├── context/                # AuthContext, SocketContext
│       ├── hooks/                  # useAuth, useSocket, useDebounce
│       ├── pages/
│       │   ├── Landing.jsx  Login.jsx  Register.jsx  InterviewChat.jsx
│       │   ├── student/            # StudentDashboard, StudentProfile, OpeningDetails, MyApplications
│       │   ├── recruiter/          # RecruiterDashboard, PostEditOpening, OpeningCandidates, CandidateProfile
│       │   └── admin/              # AdminDashboard
│       ├── services/               # api.js (Axios) + one service per API resource
│       └── utils/                  # role helpers
├── server/                         # Express REST API + Socket.IO
│   ├── config/db.js                # Mongoose connection
│   ├── controllers/                # Request handlers per resource
│   ├── middleware/                 # authMiddleware, roleMiddleware, errorMiddleware
│   ├── models/                     # User, Student, Recruiter, Opening, Application, Message, Notification
│   ├── routes/                     # Route definitions and validators
│   ├── services/                   # matchService, githubService, notificationService
│   ├── sockets/chatSocket.js       # Socket.IO handlers
│   ├── scripts/seed.js             # Dev seed (users, profiles, openings, demo data)
│   └── server.js                   # App entry point
├── stitch_talent_match_web_ui.zip  # Wireframes and design system export
└── README.md
```

---

## Data Model

Seven collections in MongoDB. Relationships use `ObjectId` references and Mongoose `populate`.

```mermaid
erDiagram
    USER ||--o| STUDENT : "has profile"
    USER ||--o| RECRUITER : "has profile"
    RECRUITER ||--o{ OPENING : posts
    STUDENT ||--o{ APPLICATION : submits
    OPENING ||--o{ APPLICATION : receives
    APPLICATION ||--o{ MESSAGE : contains
    USER ||--o{ MESSAGE : sends
    USER ||--o{ NOTIFICATION : receives

    USER {
        ObjectId _id PK
        string name
        string email
        string passwordHash
        string role
        string status
        date createdAt
    }
    STUDENT {
        ObjectId _id PK
        ObjectId userId FK
        array skills
        array interests
        string availability
        string githubUsername
        object githubStats
        string linkedinUrl
        string portfolioUrl
    }
    RECRUITER {
        ObjectId _id PK
        ObjectId userId FK
        string companyName
        string websiteUrl
    }
    OPENING {
        ObjectId _id PK
        ObjectId recruiterId FK
        string title
        string description
        array requiredSkills
        string availabilityNeeds
        string status
        date createdAt
    }
    APPLICATION {
        ObjectId _id PK
        ObjectId studentId FK
        ObjectId openingId FK
        string status
        number matchScore
        date appliedAt
    }
    MESSAGE {
        ObjectId _id PK
        ObjectId applicationId FK
        ObjectId senderId FK
        string text
        date timestamp
    }
    NOTIFICATION {
        ObjectId _id PK
        ObjectId userId FK
        string type
        string message
        ObjectId applicationId FK
        ObjectId openingId FK
        boolean isRead
        date createdAt
    }
```

**Key rules and indexes**

| Collection | Rule / Index | Purpose |
|---|---|---|
| User | `email` unique; `role` ∈ student, recruiter, admin; `status` ∈ pending, approved, rejected | One account per email, recruiter vetting |
| Student, Recruiter | unique index on `userId` | Exactly one profile per user |
| Opening | index `{ recruiterId, status }`; `status` ∈ draft, active, closed | Fast "my openings" and public listings |
| Application | **unique** `{ studentId, openingId }`; `status` ∈ applied, shortlisted, accepted, rejected | Prevents duplicate applications at the database level |
| Message | index `{ applicationId, timestamp }` | Ordered chat history |
| Notification | index `{ userId, isRead, createdAt }` | Fast unread counts and recent list |

---

## API Reference

Base URL: `http://localhost:5000/api`. All protected routes need `Authorization: Bearer <token>`.

All responses share one shape: `{ "success": true|false, "message": "...", ...data }`. Errors from validation include an `errors` array. Status codes used: `200, 201, 400, 401, 403, 404, 429, 500`.

**Access legend:** *Public* · *Auth* (any signed-in user) · *Student* · *Recruiter* (must be **approved**) · *Admin*

### Auth: `/api/auth` (rate limited)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create a student or recruiter account (recruiters start as `pending`) |
| POST | `/login` | Public | Verify credentials, return a JWT and the user |
| GET | `/me` | Auth | Current user, used to refresh session and recruiter status |

### Students: `/api/students`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/me` · PUT `/me` · DELETE `/me` | Student | Read, update or delete my profile |
| POST | `/sync-github` | Student | Fetch GitHub stats for a username and cache them on the profile |
| GET | `/` | Admin | List all student profiles |
| POST | `/` | Student | Create a profile |
| GET | `/:id` | Self, Admin, or a recruiter the student applied to | Read one profile |
| PUT · DELETE | `/:id` | Student | Update or delete a profile |

### Recruiters: `/api/recruiters`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET · PUT · DELETE | `/me` | Recruiter / Admin | Manage my company profile |
| GET | `/` | Admin | List recruiter profiles |
| POST | `/` | Recruiter / Admin | Create a company profile |
| GET | `/:id` | Self or Admin | Read one profile |
| PUT · DELETE | `/:id` | Recruiter / Admin | Update or delete a profile |

### Openings: `/api/openings`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List openings (students only ever see `active` ones, or ones they applied to) |
| GET | `/recommendations` | Student | Openings ranked by match score |
| GET | `/my` | Recruiter | My openings with applicant counts |
| POST | `/` | Recruiter | Create an opening |
| GET | `/:id` | Auth | One opening (draft/closed hidden from students unless applied) |
| PUT | `/:id` | Owner / Admin | Update an opening |
| DELETE | `/:id` | Owner / Admin | Delete an opening and its applications |
| GET | `/:id/candidates` | Recruiter | Applicants ranked by match score |

### Applications: `/api/applications`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Student | Apply to an opening (score is stored at apply time) |
| GET | `/my` | Student | My applications |
| GET | `/opening/:openingId` | Recruiter | Applications for one opening |
| GET | `/:id` | Participants / Admin | One application |
| PATCH | `/:id/shortlist` · `/accept` · `/reject` · `/status` | Recruiter | Move an application through its lifecycle |

### Messages: `/api/messages`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/:applicationId` | Participants | Chat history (only while shortlisted or accepted) |
| POST | `/` | Participants | Send a message (same gating) |

### Notifications: `/api/notifications`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | My latest notifications plus unread count |
| PATCH | `/:id/read` · `/read-all` | Auth | Mark one or all as read |

### Admin: `/api/admin`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/recruiters/pending` | Admin | Recruiters awaiting approval |
| PATCH | `/recruiters/:id/approve` · `/reject` · `/status` | Admin | Decide on a recruiter |

### Health
`GET /api/health` returns `{ status: "ok", uptime, timestamp }`.

<details>
<summary><b>Example: register and log in</b></summary>

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Rao","email":"asha@example.com","password":"Str0ngPass!","role":"student"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"Str0ngPass!"}'
# -> { "success": true, "token": "<JWT>", "user": { ... } }

curl http://localhost:5000/api/openings/recommendations \
  -H "Authorization: Bearer <JWT>"
```
</details>

---

## Real-Time Events (Socket.IO)

The client connects with `io(url, { auth: { token } })`. The server verifies the JWT in a handshake middleware, so unauthenticated sockets are rejected.

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| client → server | `join_room` | `{ applicationId }` | Join a conversation (only for participants of a shortlisted/accepted application) |
| client → server | `leave_room` | `{ applicationId }` | Leave a conversation |
| client → server | `send_message` | `{ applicationId, text }` | Send a message (validated, gated, persisted) |
| client → server | `typing` / `stop_typing` | `{ applicationId }` | Typing indicator relay |
| server → client | `joined_room` / `left_room` | `{ applicationId }` | Acknowledgements |
| server → client | `receive_message` | populated message | New message in the room |
| server → client | `typing` / `stop_typing` | `{ applicationId, userId, name }` | Other participant is typing |
| server → client | `user_online` / `user_offline` | `{ applicationId, userId }` | Presence |
| server → client | `notification` | notification document | Live in-app notification (also persisted) |
| server → client | `application_updated` | `{ applicationId, openingId, status }` | Status changed, refresh the UI |
| server → client | `error` | `{ status, message }` | Rejected action (for example chat before shortlisting) |

The client reconnects automatically (up to 10 attempts) and shows a connection banner while offline.

---

## Security

- **Passwords** are salted and hashed with bcrypt (10 rounds); the hash is never selected into API responses.
- **JWT** access tokens (7 day expiry) are verified on every request, and the user is re-read from the database so role and status changes take effect immediately.
- **Role-based access control** is enforced on the server (`roleMiddleware`), and recruiters additionally need `status = approved` for anything that creates or reads hiring data.
- **Ownership checks**: a student can only read their own profile, a recruiter can only read profiles of students who applied to *their* openings, and only owners edit or delete their openings.
- **Input validation** with `express-validator` on every route, plus Mongoose schema validation and enums.
- **Hardening**: `helmet` headers, a CORS allow-list taken from `CLIENT_URL` (applied to Socket.IO as well), and rate limiting on login and registration.
- **Chat gating** is checked on the server for every REST call and every socket event, against the live application status.
- **Secrets** live in `.env` (git-ignored); `.env.example` documents every key. The seed script refuses to run in production.
- **Centralised error handling** maps Mongo duplicate-key errors to `400`, hides stack traces in production, and never logs request bodies.
- **Client**: expired or invalid tokens trigger an automatic sign-out and a clear message.

---

## Getting Started

### Prerequisites
- Node.js 18 or newer
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account
- (Recommended) a GitHub personal access token with **no scopes**, used only to lift the GitHub API rate limit

### 1. Clone and install
```bash
git clone <your-repo-url> TalentMatch
cd TalentMatch

cd server && npm install
cd ../client && npm install
```

### 2. Create the database (MongoDB Atlas)
1. Create a free **M0** cluster (any provider; AWS Mumbai works well in India).
2. **Database Access** → add a database user (save the password).
3. **Network Access** → add your current IP (use `0.0.0.0/0` only for deployment).
4. **Connect → Drivers** → copy the connection string.

### 3. Configure environment variables
Create `server/.env` (see `server/.env.example`):

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/talentmatch` | Atlas connection string (the DB name comes from here) |
| `JWT_SECRET` | a long random string | Signs access tokens |
| `GITHUB_TOKEN` | `ghp_...` | Raises the GitHub rate limit from 60 to 5000 requests per hour |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s), comma separated |
| `NODE_ENV` | `development` | Logging format and seed safety |

The client works with defaults (it proxies `/api` and `/socket.io` to port 5000 through Vite). To override, create `client/.env`:

| Variable | Default |
|---|---|
| `VITE_API_BASE_URL` | `/api` |
| `VITE_SOCKET_URL` | `http://localhost:5000` |

### 4. Seed demo data
```bash
cd server
npm run seed        # users, profiles, openings
npm run seed:demo   # the above, plus sample applications, chat and notifications
```
The seed fetches the real GitHub stats of the demo students, so keep `GITHUB_TOKEN` set.

### 5. Run
```bash
# terminal 1
cd server && npm run dev        # http://localhost:5000

# terminal 2
cd client && npm run dev        # http://localhost:5173
```

Open **http://localhost:5173** and use `localhost`, not `127.0.0.1`, because CORS is restricted to `CLIENT_URL`.

### Test accounts (development seed only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@talentmatch.com` | `AdminPassword123!` |
| Recruiter (approved) | `recruiter.approved@talentmatch.com` | `RecruiterPassword123!` |
| Recruiter (pending) | `recruiter.pending@talentmatch.com` | `RecruiterPassword123!` |
| Students | `ashutosh.m@`, `shivam.m@`, `shivam.k@`, `maanas.c@`, `swayam.m@` + `talentmatch.com` | `StudentPassword123!` |

> Each role keeps its login token in `localStorage`, which all tabs of one browser profile share. **Test two roles at once with two browser profiles** (for example a normal window and an incognito window).

### Scripts

| Location | Command | What it does |
|---|---|---|
| `server` | `npm run dev` | API with auto-reload (nodemon) |
| `server` | `npm start` | API in plain Node (production) |
| `server` | `npm run seed` | Idempotent dev seed |
| `server` | `npm run seed:demo` | Seed plus demo applications, chat and notifications |
| `client` | `npm run dev` | Vite dev server with HMR |
| `client` | `npm run build` | Production bundle in `client/dist` |
| `client` | `npm run lint` | oxlint |
| `client` | `npm run preview` | Serve the production build locally |

---

## Demo Walkthrough

A five-minute path that touches every feature (use two browser profiles).

1. **Admin approves a recruiter.** Sign in as the pending recruiter and see the *Account Under Review* banner and disabled posting. As admin, approve them. The banner clears without logging out.
2. **Student applies.** Sign in as a student who has not applied yet (for example *Shivam K*). The dashboard lists openings ranked by match score. Open one, read the breakdown, and apply. Try applying twice to see the duplicate guard.
3. **Recruiter reviews.** As the approved recruiter, the bell lights up instantly. Open *Opening Candidates*, search and filter by skill, open a candidate profile and review the real GitHub stats and score breakdown, then **shortlist**.
4. **Live chat.** The student gets a toast and a bell update, opens *Messages*, and the two sides chat in real time with typing and presence indicators.
5. **Close the loop.** The recruiter accepts or rejects (with a confirmation dialog), and the student's status badge updates live.

---

## Design System

Wireframes and screens were generated with **Google Stitch** from a written design brief, then audited against the planned views. The aesthetic is editorial and high-contrast: monochrome surfaces, one confident accent colour, sharp corners and hairline borders.

| Token | Value |
|---|---|
| Display / headline font | Hanken Grotesk |
| Body font | Inter |
| Data / label font | JetBrains Mono |
| Surface | `#f9f9f9` background, `#000000` primary |
| Accent | `#0055FF` (match scores and active states) |

Tokens are defined once in `client/src/index.css` under `@theme` and consumed as Tailwind utilities.

---

## Deployment

Planned topology (free tiers):

| Part | Platform |
|---|---|
| Frontend | Vercel (set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the API URL) |
| Backend | Render web service (`npm start`, set `app.set('trust proxy', 1)` behind the proxy) |
| Database | MongoDB Atlas M0 |

Set `CLIENT_URL` on the backend to the deployed frontend origin, and allow the host's outbound traffic in Atlas Network Access.

---

## Known Limitations and Roadmap

**Known limitations**
- JWTs are kept in `localStorage` (simple, but exposed to XSS) and there are no refresh tokens.
- Recruiters rank and shortlist only students who **applied**; they cannot yet browse non-applicants.
- Status transitions are not a strict state machine on the server.
- GitHub data uses the public API with a server token, not GitHub OAuth.

**Roadmap**
- GitHub OAuth sign-in and richer repository insights
- Recruiter talent pool of top-matching students who have not applied
- AI-assisted resume review, skill-gap analysis and interview question generation
- Dockerised stack and automated CI/CD

---

## Full-Stack Project Checklist: Status and Proof

**Legend:** ✅ Done and verified in the code · 🟡 Implemented, final verification pending · ⬜ Not started

**Overall: 68 of 103 items verified done (66%)** · 9 implemented, awaiting final verification · 26 not started

`█████████████░░░░░░░` 66%

| Section | ✅ Done | 🟡 Pending check | ⬜ Not started |
|---|---|---|---|
| 1. Frontend Development | 13 | 0 | 2 |
| 2. React Concepts | 8 | 0 | 0 |
| 3. State Management | 3 | 0 | 0 |
| 4. Backend REST API | 5 | 0 | 0 |
| 5. MongoDB + Mongoose | 6 | 0 | 0 |
| 6. Secure REST API | 6 | 0 | 0 |
| 7. Authentication and Authorization | 10 | 0 | 0 |
| 8. Real-Time Features | 2 | 3 | 0 |
| 9. Docker | 0 | 0 | 5 |
| 10. DevOps and Deployment | 2 | 2 | 6 |
| 11. Project Quality | 8 | 4 | 2 |
| 12. Testing | 0 | 0 | 5 |
| 13. Final Deliverables | 5 | 0 | 6 |


### 1. Frontend Development (React + Tailwind CSS)

| Item | Status | Proof |
|---|---|---|
| Mobile, tablet and desktop layouts | ✅ | Responsive Tailwind breakpoints (`md:`, `lg:`) on every page; grids collapse to one column on mobile |
| Responsive navigation / menu | ⬜ | `client/src/components/common/Navbar.jsx` hides links below `md`; a mobile menu is the next task |
| Proper spacing and typography | ✅ | Type scale and fonts defined in `client/src/index.css` (`@theme`) |
| Dark / light mode (optional) | ⬜ | Optional, single theme by design |
| Tailwind used throughout | ✅ | `@tailwindcss/vite` plugin in `client/vite.config.js`; utilities used across all pages |
| Utility classes used effectively | ✅ | Design tokens consumed as utilities (`bg-primary`, `text-match-indicator`, …) |
| Reusable UI components | ✅ | `ConfirmDialog.jsx`, `Layout.jsx`, `Navbar.jsx`, `Footer.jsx`, `ProtectedRoute.jsx` |
| Hover, focus and transition effects | ✅ | 100+ `hover:` and `transition` utilities, plus `focus:` states |
| Consistent colour palette | ✅ | Single `@theme` palette in `index.css`, one accent `#0055FF` |
| Forms with validation | ✅ | `Register.jsx` (per-field validation), `Login.jsx`, `PostEditOpening.jsx`, `StudentProfile.jsx` |
| Loading indicators | ✅ | `animate-pulse` skeletons on data pages, submit spinners in forms |
| Error messages | ✅ | Error banners with retry on every query-driven page, server errors surfaced in forms |
| Success notifications | ✅ | Inline success banners after saves and actions (live toast layer arrives with notifications) |
| Modal / dialog implementation | ✅ | `ConfirmDialog.jsx` (ARIA dialog, focus trap, `Esc`), used in `RecruiterDashboard`, `OpeningCandidates`, `CandidateProfile`, `AdminDashboard` |
| Search / filter functionality | ✅ | Candidate search and skill chips in `OpeningCandidates.jsx`; search and skill filter in `StudentDashboard.jsx`; conversation search in `InterviewChat.jsx` |

### 2. React Concepts

| Item | Status | Proof |
|---|---|---|
| `useState` for local state | ✅ | Form, filter and dialog state across pages |
| API calls in `useEffect` | ✅ | `AuthContext.jsx` validates the session with `GET /auth/me` inside `useEffect`; other server data goes through TanStack Query |
| Cleanup functions | ✅ | `AuthContext.jsx` (`isMounted` flag), `SocketContext.jsx` (`socket.disconnect()`), `useDebounce.js` (`clearTimeout`) |
| Proper dependency arrays | ✅ | Explicit deps in the effects above, memoised callbacks via `useCallback` |
| Global data with Context API | ✅ | `AuthContext.jsx`, `SocketContext.jsx` |
| Context Provider implemented | ✅ | Providers wrapped in `App.jsx` |
| At least one custom hook | ✅ | `useDebounce.js`, `useAuth.js`, `useSocket.js` |
| Hook reused in multiple components | ✅ | `useDebounce` in `OpeningCandidates`, `StudentDashboard`, `InterviewChat`; `useAuth` across the app |

### 3. State Management (Context API chosen)

| Item | Status | Proof |
|---|---|---|
| Global state implemented | ✅ | Auth user, token, role and status in `AuthContext.jsx` |
| Multiple contexts | ✅ | `AuthContext` and `SocketContext` |
| Efficient state updates | ✅ | Memoised `logout` / `refreshUser`; server data cached and invalidated by TanStack Query |

### 4. Backend REST API

| Item | Status | Proof |
|---|---|---|
| RESTful endpoints designed | ✅ | `server/routes/*.js`; see [API Reference](#api-reference) |
| CRUD operations completed | ✅ | Openings, student and recruiter profiles, applications |
| Proper HTTP methods | ✅ | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` used by intent |
| Correct status codes | ✅ | `201` on create, `400` validation, `401` unauthenticated, `403` forbidden, `404` missing, `429` rate limited |
| API documentation available | ✅ | [API Reference](#api-reference) in this README (Postman collection to follow) |

### 5. MongoDB + Mongoose

| Item | Status | Proof |
|---|---|---|
| MongoDB database connected | ✅ | `server/config/db.js` (Atlas via `MONGODB_URI`) |
| Mongoose schemas created | ✅ | `server/models/` (User, Student, Recruiter, Opening, Application, Message, Notification) |
| Validation implemented | ✅ | `required`, enums, lowercase/trim on schemas, plus request validation |
| Relationships (reference / populate) | ✅ | `ObjectId` refs with `populate` in application, opening and message controllers |
| Indexes where required | ✅ | Unique `{studentId, openingId}` on Application; unique `userId` on Student and Recruiter; compound indexes on Message, Opening, Notification |
| Database queries optimised | ✅ | `Application.exists`, `.distinct`, field projection and batched `$in` lookups instead of loading whole documents |

### 6. Secure REST API

| Item | Status | Proof |
|---|---|---|
| Input validation | ✅ | `express-validator` chains plus `validationResult` in controllers |
| Error handling middleware | ✅ | `server/middleware/errorMiddleware.js` |
| Environment variables (`.env`) | ✅ | `dotenv`; `.env` git-ignored; documented in `server/.env.example` |
| Password hashing with bcrypt | ✅ | `authController.js` (`bcrypt.genSalt(10)` + `hash`) |
| Sensitive data protected | ✅ | `-passwordHash` projection, admin-only list endpoints, ownership checks, `helmet`, CORS allow-list, auth rate limit |
| Proper logging | ✅ | `morgan` request logging; error middleware logs method, URL and message (never bodies) |

### 7. Authentication and Authorization

| Item | Status | Proof |
|---|---|---|
| User registration | ✅ | `POST /api/auth/register`, `Register.jsx` |
| User login | ✅ | `POST /api/auth/login`, `Login.jsx` |
| JWT token generation | ✅ | `server/utils/generateToken.js` (7 day expiry) |
| Protected routes | ✅ | Server: `authMiddleware`; client: `ProtectedRoute.jsx` with `allowedRoles` |
| Token verification middleware | ✅ | `server/middleware/authMiddleware.js` |
| Logout implemented | ✅ | `logout()` in `AuthContext.jsx` clears token and user; Axios interceptor signs out on `401` |
| Admin role | ✅ | Admin dashboard and `/api/admin/*` |
| User roles (student, recruiter) | ✅ | Role-specific routes on client and server |
| Role-based access control | ✅ | `server/middleware/roleMiddleware.js`, recruiter `approved` gate, ownership checks |
| Unauthorized access handled | ✅ | `401` / `403` JSON, redirect to the correct dashboard, session-expired banner |

### 8. Real-Time Features (WebSockets)

| Item | Status | Proof |
|---|---|---|
| WebSocket / Socket.IO implemented | ✅ | `server/sockets/chatSocket.js` with JWT handshake; `client/src/context/SocketContext.jsx` |
| Real-time updates | 🟡 | Messages are live (`receive_message`); live application status updates arrive with `application_updated` |
| Live notifications | 🟡 | Persisted notifications plus `notification` socket event and navbar bell |
| Live chat | ✅ | `InterviewChat.jsx` with message history and live delivery; gated to shortlisted/accepted on the server |
| Connection / disconnection handling | 🟡 | Client reconnect and offline banner are done; server presence (`user_online` / `user_offline`) pending final check |

### 9. Docker

| Item | Status | Proof |
|---|---|---|
| Dockerfile created | ⬜ | Planned |
| `.dockerignore` configured | ⬜ | Planned |
| Application runs inside Docker | ⬜ | Planned |
| Environment variables configured | ⬜ | Planned |
| Docker Compose used | ⬜ | Planned (client, server, local Mongo) |

### 10. DevOps and Deployment

| Item | Status | Proof |
|---|---|---|
| Frontend deployed | ⬜ | Planned: Vercel |
| Backend deployed | ⬜ | Planned: Render |
| Database connected | ✅ | MongoDB Atlas cluster in use |
| Environment variables configured | 🟡 | Documented in `.env.example`; to be set on the hosts |
| Production build successful | 🟡 | `npm run build` produces `client/dist` (re-confirm before release) |
| GitHub repository created | ✅ | This repository |
| GitHub Actions workflow configured | ⬜ | Planned |
| Automatic deployment enabled | ⬜ | Planned |
| Build passes successfully | ⬜ | Planned (after the workflow exists) |
| Deployment to Render / Vercel working | ⬜ | Planned |

### 11. Project Quality

| Item | Status | Proof |
|---|---|---|
| Modular folder structure | ✅ | [Project Structure](#project-structure): routes, controllers, services, models, middleware, sockets |
| Clean code | ✅ | Linted client (`oxlint`), layered server, JSDoc on services |
| Reusable components | ✅ | `components/common/` and shared hooks |
| Comments where necessary | ✅ | Explanatory comments on access rules, indexes and gating logic |
| No unused files or code | 🟡 | Boilerplate removed; the duplicate root `.env.example` is still to be deleted |
| Regular commits | 🟡 | See the commit history |
| Meaningful commit messages | 🟡 | See the commit history |
| Feature branches used | 🟡 | See the branch and PR history |
| README completed | ✅ | This document |
| Installation steps | ✅ | [Getting Started](#getting-started) |
| Project architecture | ✅ | [System Architecture](#system-architecture) and [Data Model](#data-model) |
| API documentation | ✅ | [API Reference](#api-reference) |
| Screenshots | ⬜ | Add to `docs/screenshots/` (placeholders above) |
| Deployment links | ⬜ | Add after deployment |

### 12. Testing (Recommended)

| Item | Status | Proof |
|---|---|---|
| API tested using Postman | ⬜ | Collection to be committed under `docs/postman/` |
| Frontend tested | ⬜ | Manual flows in [Demo Walkthrough](#demo-walkthrough); automated tests not added |
| Error scenarios tested | ⬜ | To be recorded in the Postman collection |
| Authentication tested | ⬜ | To be recorded in the Postman collection |
| Responsive design tested | ⬜ | To be recorded with screenshots at 375, 768 and 1440 px |

### 13. Final Deliverables

| Item | Status | Proof |
|---|---|---|
| GitHub repository | ✅ | This repository |
| Live frontend URL | ⬜ | Pending deployment |
| Live backend URL | ⬜ | Pending deployment |
| API documentation | ✅ | [API Reference](#api-reference) |
| README.md | ✅ | This file |
| Dockerfile | ⬜ | Pending |
| GitHub Actions workflow | ⬜ | Pending |
| Database schema | ✅ | [Data Model](#data-model) and `server/models/` |
| Sample test user | ✅ | [Test accounts](#test-accounts-development-seed-only) created by `npm run seed` |
| Project presentation (PPT) | ⬜ | Pending |
| Demo video (optional) | ⬜ | Optional |

---

<div align="center">

Built by **&lt;Ashutosh Mishra D15A&gt;** · Full Stack Development Mini-Project

</div>