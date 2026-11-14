# Talent Match — Testing Documentation

This document outlines the testing strategy, manual role and route permission matrix, responsive layout verification across breakpoints, and the automated test suites for Talent Match.

---

## 1. Manual Role & Route Access Matrix

Talent Match implements role-based access control (RBAC) across both frontend navigation guards (`ProtectedRoute.jsx`) and backend Express middleware (`authMiddleware.js`, `roleMiddleware.js`). 

### Access Rules Summary
- **Unauthenticated Visitor**: Can only access public marketing and onboarding routes (`/`, `/login`, `/register`). Any access attempt to protected routes redirects to `/login` preserving the attempted destination in router state (`state: { from: location }`).
- **Student**: Access restricted to student discovery, applications, profile management, and interview chat for their own applications. Direct access attempts to recruiter or admin routes redirect to `/student/dashboard`.
- **Approved Recruiter**: Full access to recruiter dashboard, opening creation/management, candidate rankings, and interview chat for shortlisted candidates. Direct access to student or admin routes redirects to `/recruiter/dashboard`.
- **Pending Recruiter**: Access to recruiter interface is restricted. Read access to dashboard shows pending-approval status. Opening creation and posting attempts return HTTP `403` with exact message: `"Forbidden: Recruiter account status is pending approval"`.
- **Rejected Recruiter**: Access to posting and sensitive recruiter operations returns HTTP `403` with exact message: `"Forbidden: Recruiter account was rejected"`.
- **Admin**: Full access to administrative oversight, recruiter verification queues (`/admin/dashboard`, `/admin/recruiters`), and platform audit controls. Access to student or recruiter-specific operational views redirects to `/admin/dashboard`.

### Route Permission Matrix

| Route Path | Public / Guest | Student | Pending Recruiter | Approved Recruiter | Admin | Behavior When Denied |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/` (Landing Page) | Allowed | Allowed | Allowed | Allowed | Allowed | N/A |
| `/login` | Allowed | Redirects* | Redirects* | Redirects* | Redirects* | Authenticated users redirect to own dashboard (`getRoleDashboard`) |
| `/register` | Allowed | Redirects* | Redirects* | Redirects* | Redirects* | Authenticated users redirect to own dashboard |
| `/student/dashboard` | Denied | **Allowed** | Denied | Denied | Denied | Guest -> `/login`; others -> own role dashboard |
| `/student/profile` | Denied | **Allowed** | Denied | Denied | Denied | Guest -> `/login`; others -> own role dashboard |
| `/student/applications` | Denied | **Allowed** | Denied | Denied | Denied | Guest -> `/login`; others -> own role dashboard |
| `/openings/:id` (Detail) | Denied | **Allowed** | Denied | Denied | Denied | Guest -> `/login`; recruiter views via recruiter dashboard |
| `/recruiter/dashboard` | Denied | Denied | **Allowed** (Pending banner) | **Allowed** | Denied | Guest -> `/login`; others -> own role dashboard |
| `/recruiter/openings/new` | Denied | Denied | **Blocked** (403 Pending) | **Allowed** | Denied | Guest -> `/login`; pending recruiter receives 403 API block |
| `/recruiter/openings/:id/candidates` | Denied | Denied | **Blocked** (403 Pending) | **Allowed** (Own opening) | Denied | Guest -> `/login`; others -> own role dashboard |
| `/recruiter/candidates/:id` | Denied | Denied | **Blocked** (403 Pending) | **Allowed** | Denied | Guest -> `/login`; others -> own role dashboard |
| `/admin/dashboard` | Denied | Denied | Denied | Denied | **Allowed** | Guest -> `/login`; others -> own role dashboard |
| `/admin/recruiters` | Denied | Denied | Denied | Denied | **Allowed** | Guest -> `/login`; others -> own role dashboard |
| `/chat` / `/chat/:applicationId` | Denied | **Allowed** (Own chat) | Denied | **Allowed** (Shortlisted) | Denied | Guest -> `/login`; non-shortlisted applications blocked (403) |

*\* Authenticated users visiting `/login` or `/register` are automatically redirected to their role-specific dashboard.*

---

## 2. Responsive Layout Verification & Overflow Report

All target views were tested across three standard responsive widths (**375px** mobile, **768px** tablet, and **1440px** desktop) using headless Chromium connected through Chrome DevTools Protocol (CDP). For each page and breakpoint, `document.documentElement.clientWidth` and `document.documentElement.scrollWidth` were measured to identify any unintended horizontal overflow (`scrollWidth > clientWidth`).

### Results Table

| View / Page | Target Width | `clientWidth` | `scrollWidth` | Overflow Detected? | Screenshot Artifact |
|---|:---:|:---:|:---:|:---:|---|
| **Landing** | 375 px | 375 px | 375 px | **No** (0 px) | [`docs/screenshots/responsive/landing-375.png`](screenshots/responsive/landing-375.png) |
| **Landing** | 768 px | 768 px | 768 px | **No** (0 px) | [`docs/screenshots/responsive/landing-768.png`](screenshots/responsive/landing-768.png) |
| **Landing** | 1440 px | 1440 px | 1440 px | **No** (0 px) | [`docs/screenshots/responsive/landing-1440.png`](screenshots/responsive/landing-1440.png) |
| **Student Dashboard** | 375 px | 375 px | 375 px | **No** (0 px) | [`docs/screenshots/responsive/student-dashboard-375.png`](screenshots/responsive/student-dashboard-375.png) |
| **Student Dashboard** | 768 px | 753 px\* | 753 px | **No** (0 px) | [`docs/screenshots/responsive/student-dashboard-768.png`](screenshots/responsive/student-dashboard-768.png) |
| **Student Dashboard** | 1440 px | 1425 px\* | 1425 px | **No** (0 px) | [`docs/screenshots/responsive/student-dashboard-1440.png`](screenshots/responsive/student-dashboard-1440.png) |
| **Opening Candidates** | 375 px | 375 px | 435 px | **YES (+60 px)** | [`docs/screenshots/responsive/opening-candidates-375.png`](screenshots/responsive/opening-candidates-375.png) |
| **Opening Candidates** | 768 px | 753 px\* | 753 px | **No** (0 px) | [`docs/screenshots/responsive/opening-candidates-768.png`](screenshots/responsive/opening-candidates-768.png) |
| **Opening Candidates** | 1440 px | 1425 px\* | 1425 px | **No** (0 px) | [`docs/screenshots/responsive/opening-candidates-1440.png`](screenshots/responsive/opening-candidates-1440.png) |
| **Admin Dashboard** | 375 px | 375 px | 375 px | **No** (0 px) | [`docs/screenshots/responsive/admin-dashboard-375.png`](screenshots/responsive/admin-dashboard-375.png) |
| **Admin Dashboard** | 768 px | 753 px\* | 753 px | **No** (0 px) | [`docs/screenshots/responsive/admin-dashboard-768.png`](screenshots/responsive/admin-dashboard-768.png) |
| **Admin Dashboard** | 1440 px | 1425 px\* | 1425 px | **No** (0 px) | [`docs/screenshots/responsive/admin-dashboard-1440.png`](screenshots/responsive/admin-dashboard-1440.png) |

*\* Note: `clientWidth` reflects viewport width minus the browser vertical scrollbar (15px on Windows Chromium).*

### Horizontal Overflow Diagnosis
- **Identified Overflow**: Opening Candidates view at 375px viewport exhibits **+60px** of horizontal overflow (`scrollWidth: 435px` vs `clientWidth: 375px`).
- **Root Cause**: In [`client/src/pages/recruiter/OpeningCandidates.jsx`](../client/src/pages/recruiter/OpeningCandidates.jsx), the candidate action buttons container (`<div className="flex flex-row md:flex-col gap-2.5 ...">`) renders three to four buttons (`Shortlist`, `Reject`, `Profile →`, and conditionally `Chat`) side-by-side on mobile viewports without flex wrapping (`flex-wrap`). The combined min-widths and padding of the action buttons exceed the 375px container width.

---

## 3. Automated Test Suites

### Client Unit & Component Tests (Vitest & Testing Library)
The client includes 17 focused unit and component tests verifying critical application functionality:
- **`ConfirmDialog`**: Esc key and backdrop click closures, focus trapping, and focus restoration to the opening trigger button.
- **`ProtectedRoute`**: Unauthenticated redirection to `/login` with location state, unauthorized role redirection to user's dashboard, and authorized child rendering.
- **`useDebounce`**: Timer advancement, debounced value stabilization, and cancellation on rapid prop changes using Vitest fake timers.
- **`MatchBreakdown`**: Rendering of 3 weighted match dimensions (Skills 60%, GitHub languages 25%, Availability 15%), percentage indicators, and "Not applicable" badge states.
- **`Navbar`**: Mobile drawer button `aria-expanded` state toggling and dismissal on `Escape`.
- **`Login` Error Mapping**: Handling of unreachable servers (no response), HTTP 429 rate limits, HTTP 5xx server errors, and HTTP 401 invalid credentials.

To run the client test suite:
```bash
npm --prefix client test
```

### API Integration Test Suite (Postman / Newman)
A 35-request, 70-assertion Postman collection tests the backend REST API, role-based access control, gating mechanics, and real-time data flows.

#### Key Areas Covered
1. **Health & Auth**: Endpoint health verification, recruiter registration, validation error mapping, duplicate email detection, admin/recruiter/student logins, and `/auth/me`.
2. **Admin Operations**: Pending recruiter posting restrictions (HTTP 403), administrative recruiter approval workflow, and newly approved recruiter opening creation.
3. **Openings and RBAC**: Student opening creation block (403), unauthenticated access block (401), malformed token block (401), student viewing only active openings, recruiter email privacy masking, and student profile privacy enforcement.
4. **Applications**: Duplicate application prevention (400), application status lifecycle (`applied` -> `shortlisted` -> `rejected`), and recruiter review workflow.
5. **Interview Messages & Chat Gating**: Message sending rejected for unshortlisted applications (HTTP 403), message acceptance once shortlisted (HTTP 201), and character length validation (>2000 chars rejected).
6. **Notifications**: Real-time notifications for application submission and shortlisting, single notification read tracking, cross-user notification update isolation (HTTP 403), and mark-all-as-read.
7. **Cleanup**: Idempotent deletion of test openings and cascaded test entities.

#### Running the Postman Collection Locally
Ensure the backend server is running on `http://localhost:5000`:
```bash
node server/server.js
```
Then execute the collection using Newman:
```bash
npx newman@6 run docs/postman/TalentMatch.postman_collection.json -e docs/postman/local.postman_environment.json
```
