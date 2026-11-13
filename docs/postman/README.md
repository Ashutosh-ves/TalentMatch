# Talent Match — Automated Postman Test Suite

This directory contains the automated API test collection and environment definitions for Talent Match.

---

## Files

- **`TalentMatch.postman_collection.json`**: The complete v2.1.0 Postman collection containing 30+ assertions across 7 categorized folders.
- **`local.postman_environment.json`**: Environment configuration pointing to the local standalone server (`http://localhost:5000/api`).
- **`ci.postman_environment.json`**: Environment configuration pointing to the Docker Compose stack / Nginx reverse proxy (`http://localhost:8080/api`).

---

## 1. Running with Newman CLI

Newman runs the entire collection headlessly from your terminal without needing the Postman GUI.

### Against Local Server (`PORT=5000`)

Ensure the backend server is running and seeded (`npm run seed`), then execute:

```bash
npx newman@6 run docs/postman/TalentMatch.postman_collection.json -e docs/postman/local.postman_environment.json --reporters cli
```

### Against Docker Compose Stack (`PORT=8080`)

Ensure the Docker Compose stack is running (`docker compose up -d`) and seeded, then execute:

```bash
npx newman@6 run docs/postman/TalentMatch.postman_collection.json -e docs/postman/ci.postman_environment.json --reporters cli
```

---

## 2. Importing into Postman GUI

1. Open the Postman desktop application.
2. Click the **Import** button in the top left corner.
3. Drag and drop all three JSON files from `docs/postman/`:
   - `TalentMatch.postman_collection.json`
   - `local.postman_environment.json`
   - `ci.postman_environment.json`
4. In the top-right environment selector, choose either **TalentMatch Local Environment** or **TalentMatch CI Environment**.
5. Select the **Talent Match API Integration Tests** collection and click **Run collection**.

---

## 3. Rate-Limit Conscious Test Design

In production mode (`NODE_ENV=production`), the Talent Match authentication routes (`/api/auth/login` and `/api/auth/register`) are rate-limited to **20 requests per 15 minutes** per IP address.

To ensure reliable CI test execution without triggering HTTP 429 rate limit errors:
- The entire suite makes only **8 total register and login calls** (well under the 12-call budget).
- Authenticated JWT tokens are saved once into collection variables:
  - `{{adminToken}}`
  - `{{recruiterToken}}`
  - `{{pendingRecruiterToken}}`
  - `{{studentToken}}`
  - `{{student2Token}}`
- All downstream tests reuse these tokens, keeping the test suite lean, deterministic, and fast.

---

## 4. Test Suite Structure & Assertion Coverage

| Folder | Focus Areas | Key Assertions |
| :--- | :--- | :--- |
| **01 - Health & Auth** | Health endpoint & authentication edge cases | Server health 200 `status: ok`; dynamic user registration 201; duplicate email rejection 400; registration validation errors 400; multi-role logins (Admin, Recruiter, Students) 200; invalid password rejection 401; `/auth/me` identity verification 200. |
| **02 - Admin** | Recruiter onboarding & approval gating | Freshly registered recruiter posting rejection 403; admin approval action 200; newly approved recruiter posting opening 201. |
| **03 - Openings and RBAC** | Role permissions & data privacy | Student opening creation rejection 403; missing token rejection 401; invalid token rejection 401; student viewing active openings only (ignoring `?status=draft`); student opening payload hiding recruiter email/role/status; student `/students` listing rejection 403; cross-student profile inspection rejection 403. |
| **04 - Applications** | Application lifecycle & constraints | Student application creation 201; duplicate application rejection 400; recruiter shortlist transition 200; recruiter accept transition 200; status update endpoint verification. |
| **05 - Messages** | Chat gating & length constraints | Message sending rejection while application is in "applied" status 403; message sending permitted once shortlisted 201; message exceeding 2000 characters validation rejection 400. |
| **06 - Notifications** | Event dispatch & ownership scoping | Recruiter receives `application_received` notification 200; student receives `application_shortlisted` notification 200; cross-user notification update rejection 403; single notification mark-as-read 200; bulk mark-all-as-read 200. |
| **07 - Cleanup** | Cascade cleanup | Deletion of created opening and associated cascade records 200. |
