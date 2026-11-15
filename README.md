<div align="center">

# TALENT MATCH

### Skills over resumes. Match students to real projects using what they have actually built.

[![CI](https://github.com/Ashutosh-ves/TalentMatch/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashutosh-ves/TalentMatch/actions/workflows/ci.yml)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?logo=jsonwebtokens&logoColor=white)

**Live app:** [talent-match-sage.vercel.app](https://talent-match-sage.vercel.app) · **API:** [talentmatch-wh9o.onrender.com](https://talentmatch-wh9o.onrender.com)

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
14. [Docker, CI and API Tests](#docker-ci-and-api-tests)
15. [Demo Walkthrough](#demo-walkthrough)
16. [Design System](#design-system)
17. [Deployment](#deployment)
18. [Known Limitations and Roadmap](#known-limitations-and-roadmap)
19. [Full-Stack Project Checklist: Status and Proof](#full-stack-project-checklist-status-and-proof)

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

| Landing | Student Dashboard |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Student Dashboard](docs/screenshots/student-dashboard.png) |

| Opening Candidates (ranked) | Candidate Profile |
|---|---|
| ![Opening Candidates](docs/screenshots/opening-candidates.png) | ![Candidate Profile](docs/screenshots/candidate-profile.png) |

| Interview Chat | Admin Approvals |
|---|---|
| ![Interview Chat](docs/screenshots/interview-chat.png) | ![Admin Dashboard](docs/screenshots/admin-dashboard.png) |

<p align="center">
  <img src="docs/screenshots/mobile-menu.png" alt="Mobile navigation drawer at 375 px" width="260"><br>
  <sub>Mobile navigation drawer (375 px)</sub>
</p>

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
│   ├── src/
│   │   ├── components/common/      # Layout, Navbar, Footer, ProtectedRoute, ConfirmDialog, MatchBreakdown
│   │   ├── context/                # AuthContext, SocketContext
│   │   ├── hooks/                  # useAuth, useSocket, useDebounce
│   │   ├── pages/
│   │   │   ├── Landing.jsx  Login.jsx  Register.jsx  InterviewChat.jsx
│   │   │   ├── student/            # StudentDashboard, StudentProfile, OpeningDetails, MyApplications
│   │   │   ├── recruiter/          # RecruiterDashboard, PostEditOpening, OpeningCandidates, CandidateProfile
│   │   │   └── admin/              # AdminDashboard
│   │   ├── services/               # api.js (Axios) + one service per API resource
│   │   ├── utils/                  # role helpers
│   │   └── test/                   # Vitest unit and component tests
│   ├── Dockerfile  nginx.conf      # Production image: Vite build served by nginx (proxies /api and /socket.io)
│   └── vercel.json                 # SPA rewrite for Vercel
├── server/                         # Express REST API + Socket.IO
│   ├── config/                     # db.js (Mongoose), env.js (startup validation)
│   ├── controllers/                # Request handlers per resource
│   ├── middleware/                 # authMiddleware, roleMiddleware, errorMiddleware
│   ├── models/                     # User, Student, Recruiter, Opening, Application, Message, Notification
│   ├── routes/                     # Route definitions and validators
│   ├── services/                   # matchService, githubService, notificationService
│   ├── sockets/chatSocket.js       # Socket.IO handlers
│   ├── scripts/seed.js             # Dev seed (users, profiles, openings, demo data)
│   ├── utils/                      # generateToken, attachCompanyName
│   ├── Dockerfile                  # Multi-stage, non-root production image
│   └── server.js                   # App entry point
├── docs/
│   ├── postman/                    # Postman collection + environments (run in CI with Newman)
│   ├── screenshots/                # Images used in this README (+ responsive/ viewport captures)
│   ├── DOCKER.md                   # Docker usage notes
│   └── TESTING.md                  # Role/route matrix, responsive results, test suites
├── .github/workflows/ci.yml        # CI: lint, build, boot, Docker Compose, API tests
├── docker-compose.yml              # mongo + server + client (nginx)
├── .env.docker.example             # Variables for Docker Compose
├── stitch_talent_match_web_ui.zip  # Wireframes and design system export (kept as design evidence)
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

## Docker, CI and API Tests

### Run the whole stack with Docker (optional)

Docker Compose starts MongoDB, the API and the production client (nginx) on one network. The browser talks to a single origin, `http://localhost:8080`; nginx proxies `/api` and `/socket.io` (with WebSocket upgrade) to the API.

```bash
cp .env.docker.example .env          # then set JWT_SECRET (32+ characters) and optionally GITHUB_TOKEN
docker compose up --build            # app at http://localhost:8080, API at http://localhost:5000

# seed demo data (the seed refuses to run when NODE_ENV=production, so override it)
docker compose run --rm -e NODE_ENV=development server npm run seed

docker compose down                  # add -v to also reset the database volume
```

| Service | Image | Notes |
|---|---|---|
| `mongo` | `mongo:7` | Named volume, healthcheck |
| `server` | built from `server/Dockerfile` | Node 22 Alpine, multi-stage, non-root user, `/api/health` healthcheck |
| `client` | built from `client/Dockerfile` | Vite build served by nginx 1.27 with SPA fallback |

More detail in [`docs/DOCKER.md`](docs/DOCKER.md).

### Continuous integration

`.github/workflows/ci.yml` (workflow name `CI`) runs on every push and pull request to `main`:

| Job | What it proves |
|---|---|
| **Client Lint, Test and Build** | `npm ci`, `npm run lint`, `npm test` (17 Vitest tests), `npm run build` on Node 22 |
| **Server Test and Seed** | Syntax check of every server file, boots the API against a Mongo service container, seeds it, and logs in as admin |
| **Docker Compose Integration** | Builds both images, starts the full stack, waits for `/api/health` through nginx, seeds, runs the Postman suite with Newman, checks the served HTML and an admin login through the proxy |

### Frontend unit tests (Vitest)

17 tests cover the pieces most likely to break: the accessible `ConfirmDialog` (Esc, backdrop, focus return), `ProtectedRoute` redirects, the `useDebounce` hook, the `MatchBreakdown` rendering, the mobile navigation drawer, and the honest login error messages.

```bash
npm --prefix client test
```

Test strategy, the role and route access matrix, and the responsive viewport results are documented in [`docs/TESTING.md`](docs/TESTING.md).

### API tests (Postman / Newman)

The collection in `docs/postman/` has 70 assertions over 35 requests: health, authentication (register, login, `/me`, wrong password, validation and duplicate-email errors), admin approval, role and ownership checks, applications, chat gating, and notifications. It creates its own data and deletes it afterwards.

```bash
# API running locally and seeded (npm run dev, npm run seed)
npx newman@6 run docs/postman/TalentMatch.postman_collection.json \
  -e docs/postman/local.postman_environment.json
```

Or import the collection and an environment file into Postman. See [`docs/postman/README.md`](docs/postman/README.md).

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

| Part | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `client`; `client/vercel.json` rewrites all paths to `index.html` |
| Backend | Render web service, Docker runtime | Root directory `server`; the same image CI builds; health check path `/api/health` |
| Database | MongoDB Atlas M0 | Network Access must allow Render (`0.0.0.0/0`) |

**Live deployment:** frontend at https://talent-match-sage.vercel.app, API at https://talentmatch-wh9o.onrender.com (health check: `https://talentmatch-wh9o.onrender.com/api/health`).

**Environment variables**

| Where | Variable | Value |
|---|---|---|
| Render | `NODE_ENV` | `production` (enables the strict auth rate limit and `trust proxy`) |
| Render | `MONGODB_URI`, `JWT_SECRET`, `GITHUB_TOKEN` | Atlas connection string, a random 32+ character secret, a no-scope GitHub token |
| Render | `CLIENT_URL` | The exact Vercel origin, for example `https://talentmatch.vercel.app` |
| Vercel | `VITE_API_BASE_URL` | `https://<service>.onrender.com/api` |
| Vercel | `VITE_SOCKET_URL` | `https://<service>.onrender.com` |

The API refuses to start in production without `JWT_SECRET`, `MONGODB_URI` and `CLIENT_URL`. Render deploys after the `CI` workflow passes.

> The free Render tier sleeps after about 15 minutes without traffic, so the first request can take around a minute. Open `/api/health` before a demo.

---

## Known Limitations and Roadmap

**Known limitations**
- JWTs are kept in `localStorage` (simple, but exposed to XSS) and there are no refresh tokens.
- Recruiters rank and shortlist only students who **applied**; they cannot yet browse non-applicants.
- Status transitions are not a strict state machine on the server.
- GitHub data uses the public API with a server token, not GitHub OAuth.
- The free hosting tier sleeps when idle, so the first request after a pause is slow.

**Roadmap**
- GitHub OAuth sign-in and richer repository insights
- Recruiter talent pool of top-matching students who have not applied
- AI-assisted resume review, skill-gap analysis and interview question generation
- Automated frontend tests and end-to-end browser tests

---

## Full-Stack Project Checklist: Status and Proof

**Legend:** ✅ Done and verified in the code · 🟡 Implemented, final verification pending · ⬜ Not started

**Overall: 100 of 102 items verified done (98%)** · 0 implemented, awaiting final verification · 2 not started

`████████████████████` 98%

| Section | ✅ Done | 🟡 Pending check | ⬜ Not started |
|---|---|---|---|
| 1. Frontend Development | 14 | 0 | 1 |
| 2. React Concepts | 8 | 0 | 0 |
| 3. State Management | 3 | 0 | 0 |
| 4. Backend REST API | 5 | 0 | 0 |
| 5. MongoDB + Mongoose | 6 | 0 | 0 |
| 6. Secure REST API | 6 | 0 | 0 |
| 7. Authentication and Authorization | 10 | 0 | 0 |
| 8. Real-Time Features | 5 | 0 | 0 |
| 9. Docker | 5 | 0 | 0 |
| 10. DevOps and Deployment | 10 | 0 | 0 |
| 11. Project Quality | 14 | 0 | 0 |
| 12. Testing | 5 | 0 | 0 |
| 13. Final Deliverables | 9 | 0 | 1 |

### 1. Frontend Development (React + Tailwind CSS)

| Item | Status | Proof |
|---|---|---|
| Mobile, tablet and desktop layouts | ✅ | Responsive Tailwind breakpoints (`md:`, `lg:`) on every page; grids collapse to one column on mobile |
| Responsive navigation / menu | ✅ | `client/src/components/common/Navbar.jsx`: below `md` a hamburger opens an accessible slide-over drawer (ARIA dialog, focus trap, `Esc`, outside click, scroll lock) with the same role-specific links; the notification bell stays visible |
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
| Real-time updates | ✅ | Messages via `receive_message`; status changes via `application_updated` (emitted in `applicationController.js`, handled in `SocketContext.jsx` by invalidating the affected queries) |
| Live notifications | ✅ | `Notification` model + `notificationService.createAndEmit` (saves, then emits `notification` to `user_<id>`); REST in `notificationController.js`; navbar bell with unread badge, plus toasts in `SocketContext.jsx` |
| Live chat | ✅ | `InterviewChat.jsx` with message history and live delivery; gated to shortlisted/accepted on the server |
| Connection / disconnection handling | ✅ | Client auto-reconnect with offline banner and automatic room re-join; server presence (`user_online` / `user_offline`) and `disconnecting` cleanup in `chatSocket.js` |

### 9. Docker

| Item | Status | Proof |
|---|---|---|
| Dockerfile created | ✅ | `server/Dockerfile` (multi-stage, non-root, healthcheck) and `client/Dockerfile` (Vite build served by nginx) |
| `.dockerignore` configured | ✅ | `server/.dockerignore` and `client/.dockerignore` exclude `node_modules`, `.env*`, `dist`, `.git` |
| Application runs inside Docker | ✅ | The `Docker Compose Integration` CI job builds the images, starts mongo + server + nginx client, and runs the API test suite against `http://localhost:8080` |
| Environment variables configured | ✅ | `environment:` block in `docker-compose.yml`, placeholders in `.env.docker.example` |
| Docker Compose used | ✅ | `docker-compose.yml` with `mongo`, `server` and `client` services, healthchecks and a named volume |

### 10. DevOps and Deployment

| Item | Status | Proof |
|---|---|---|
| Frontend deployed | ✅ | Vercel: https://talent-match-sage.vercel.app |
| Backend deployed | ✅ | Render (Docker runtime): https://talentmatch-wh9o.onrender.com; `GET /` returns the API status JSON |
| Database connected | ✅ | MongoDB Atlas cluster in use |
| Environment variables configured | ✅ | Set in the Render and Vercel dashboards as listed in [Deployment](#deployment); templates in `server/.env.example`, `client/.env.example` |
| Production build successful | ✅ | CI job `Client Lint and Build` runs `npm run build`; the client Docker image builds the same bundle |
| GitHub repository created | ✅ | This repository |
| GitHub Actions workflow configured | ✅ | `.github/workflows/ci.yml` (three jobs: client, server, Docker Compose) |
| Automatic deployment enabled | ✅ | Render auto-deploys only after the `CI` workflow passes; Vercel deploys on every push to `main` |
| Build passes successfully | ✅ | `CI` badge at the top; Render only deploys after all three CI jobs (client, server, Docker + Postman) pass |
| Deployment to Render / Vercel working | ✅ | Live URLs above; login, API and WebSocket traffic work across the two origins |

### 11. Project Quality

| Item | Status | Proof |
|---|---|---|
| Modular folder structure | ✅ | [Project Structure](#project-structure): routes, controllers, services, models, middleware, sockets |
| Clean code | ✅ | Linted client (`oxlint`), layered server, JSDoc on services |
| Reusable components | ✅ | `components/common/` and shared hooks |
| Comments where necessary | ✅ | Explanatory comments on access rules, indexes and gating logic |
| No unused files or code | ✅ | Boilerplate and duplicate env templates removed; the Stitch export zip is kept on purpose as design evidence |
| Regular commits | ✅ | Commit history of this repository on GitHub |
| Meaningful commit messages | ✅ | Commit history of this repository on GitHub |
| Feature branches used | ✅ | Branch and pull request history of this repository on GitHub (each PR runs the `CI` workflow before merge) |
| README completed | ✅ | This document |
| Installation steps | ✅ | [Getting Started](#getting-started) |
| Project architecture | ✅ | [System Architecture](#system-architecture) and [Data Model](#data-model) |
| API documentation | ✅ | [API Reference](#api-reference) |
| Screenshots | ✅ | Seven images in `docs/screenshots/`, shown in [Screenshots](#screenshots) |
| Deployment links | ✅ | Live app and API links at the top of this README |

### 12. Testing (Recommended)

| Item | Status | Proof |
|---|---|---|
| API tested using Postman | ✅ | `docs/postman/` collection (35 requests, 70 assertions) runs in CI with Newman and gates every deployment |
| Frontend tested | ✅ | 17 Vitest component and hook tests in `client/src/test/`, run in CI before every build; manual flows in [Demo Walkthrough](#demo-walkthrough) and `docs/TESTING.md` |
| Error scenarios tested | ✅ | Collection covers `400` validation and duplicates, `401` bad or missing tokens, `403` role and ownership violations |
| Authentication tested | ✅ | Collection covers register, login, `/auth/me`, wrong password, and the recruiter approval gate |
| Responsive design tested | ✅ | `docs/TESTING.md`: 12 measurements at 375, 768 and 1440 px (no horizontal overflow after the candidates-page fix) and captures in `docs/screenshots/responsive/` |

### 13. Final Deliverables

| Item | Status | Proof |
|---|---|---|
| GitHub repository | ✅ | This repository |
| Live frontend URL | ✅ | https://talent-match-sage.vercel.app |
| Live backend URL | ✅ | https://talentmatch-wh9o.onrender.com |
| API documentation | ✅ | [API Reference](#api-reference) |
| README.md | ✅ | This file |
| Dockerfile | ✅ | `server/Dockerfile`, `client/Dockerfile`, `docker-compose.yml` |
| GitHub Actions workflow | ✅ | `.github/workflows/ci.yml` |
| Database schema | ✅ | [Data Model](#data-model) and `server/models/` |
| Sample test user | ✅ | [Test accounts](#test-accounts-development-seed-only) created by `npm run seed` |
| Project presentation (PPT) | ⬜ | Pending |

---

<div align="center">

Built by **Ashutosh Mishra (D15A)** · Full Stack Development Mini-Project

</div>