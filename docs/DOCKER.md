# Talent Match — Docker Deployment Guide

This document describes how to build, run, seed, and manage Talent Match using Docker and Docker Compose.

---

## Architecture Overview

The multi-container Docker Compose setup consists of three services:

1. **`mongo`** (`mongo:7`):
   - Database service with persistent named volume `mongo_data`.
   - Health checked via `mongosh --eval "db.adminCommand('ping')"`.

2. **`server`** (`node:22-alpine`):
   - Node.js backend (Express & Socket.IO).
   - Multi-stage build with `npm ci --omit=dev`.
   - Runs under non-root `node` user in production mode (`NODE_ENV=production`).
   - Health checked via native Node `fetch` on `/api/health`.
   - Published on port `5000:5000`.

3. **`client`** (`node:22-alpine` -> `nginx:1.27-alpine`):
   - Multi-stage build: Vite React SPA compiled in Node 22, served via Nginx 1.27 Alpine.
   - Built with build arguments `VITE_API_BASE_URL=/api` and `VITE_SOCKET_URL=http://localhost:8080`.
   - Nginx handles SPA routing fallbacks (`try_files $uri $uri/ /index.html`) and reverse-proxies `/api/` and `/socket.io/` to `http://server:5000` with WebSocket upgrade headers.
   - Published on port `8080:80`.

---

## 1. Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

---

## 2. Configuration

Copy the example Docker environment configuration file to create your local `.env`:

```bash
# On Linux / macOS
cp .env.docker.example .env

# On Windows (PowerShell)
copy .env.docker.example .env
```

Edit `.env` to configure your values:

- `JWT_SECRET`: A secret string used to sign JSON Web Tokens. Must be at least 32 characters long.
- `GITHUB_TOKEN`: (Optional) GitHub personal access token used by the profile seeder to query live repository metrics without being rate-limited.

---

## 3. Building and Running

To build images and start all services in the foreground:

```bash
docker compose up --build
```

To run in detached (background) mode:

```bash
docker compose up -d --build
```

To monitor logs across all containers:

```bash
docker compose logs -f
```

---

## 4. Seeding the Database

The Talent Match seeder contains a safeguard that prevents accidental data modification in production environments (`refuse to run if NODE_ENV=production`). Because the Compose server runs with `NODE_ENV=production`, execute the one-off seeder container with `NODE_ENV=development`:

### Standard Seed (Accounts, Roles, Openings)

```bash
docker compose run --rm -e NODE_ENV=development server npm run seed
```

### Demo Seed (Includes Sample Applications, Matches, and Chat History)

```bash
docker compose run --rm -e NODE_ENV=development server npm run seed:demo
```

---

## 5. Application URLs & Endpoints

| Service / Endpoint | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:8080](http://localhost:8080) | React SPA served via Nginx |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) | Direct API access |
| **Proxied REST API** | [http://localhost:8080/api](http://localhost:8080/api) | Nginx reverse proxy to server |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Container health endpoint |
| **Socket.IO Endpoint** | [http://localhost:8080/socket.io](http://localhost:8080/socket.io) | Proxied WebSocket / Polling |

### Seeded Credentials

| Role | Email | Password | Status |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@talentmatch.com` | `AdminPassword123!` | Approved |
| **Approved Recruiter** | `recruiter.approved@talentmatch.com` | `RecruiterPassword123!` | Approved |
| **Pending Recruiter** | `recruiter.pending@talentmatch.com` | `RecruiterPassword123!` | Pending |
| **Student (Demo Lead)** | `ashutosh.m@talentmatch.com` | `StudentPassword123!` | Approved |
| **Student** | `shivam.m@talentmatch.com` | `StudentPassword123!` | Approved |
| **Student** | `shivam.k@talentmatch.com` | `StudentPassword123!` | Approved |
| **Student** | `maanas.c@talentmatch.com` | `StudentPassword123!` | Approved |
| **Student** | `swayam.m@talentmatch.com` | `StudentPassword123!` | Approved |

---

## 6. Stopping and Resetting

### Stop Containers

To stop running containers while preserving database volume data:

```bash
docker compose down
```

### Reset Database (Clean Slate)

To stop running containers and completely wipe all persisted database volumes:

```bash
docker compose down -v
```
