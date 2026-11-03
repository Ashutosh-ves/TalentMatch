# Talent Match — Frontend Client

The frontend client for Talent Match, an AI-informed engineering recruitment and candidate alignment platform connecting university students with recruiters.

## Tech Stack
- **Framework**: React 19 + Vite 6
- **Routing**: React Router v7
- **Data Fetching & Cache**: TanStack React Query v5
- **Styling**: Tailwind CSS v4
- **Real-Time Communication**: Socket.io Client
- **HTTP Client**: Axios

## Prerequisites
- Node.js (v18 or higher recommended)
- Running Talent Match backend server (default: `http://localhost:5000`)

## Environment Setup
Create a `.env` file in the `client/` root (or configure variables in the root `.env`):
```env
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=http://localhost:5000
```

## Available Scripts

In the `client/` directory, you can run:

- `npm run dev`: Starts the Vite development server with HMR on `http://localhost:5173`.
- `npm run build`: Compiles and bundles production-ready assets into `dist/`.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs Oxlint static code analysis across source files.

## Project Structure
```text
client/
├── public/              # Static assets and favicons
├── src/
│   ├── assets/          # Project graphics and imagery
│   ├── components/      # Common, student, and recruiter UI components
│   │   ├── common/      # Shared Navbar, Footer, ProtectedRoute, Layout, ConfirmDialog
│   │   ├── recruiter/   # Recruiter-specific components
│   │   └── student/     # Student-specific components
│   ├── context/         # AuthContext and SocketContext providers
│   ├── hooks/           # Custom hooks (useAuth, useSocket, useDebounce)
│   ├── pages/           # 13 role-specific & shared page views
│   │   ├── admin/       # AdminDashboard
│   │   ├── recruiter/   # RecruiterDashboard, PostEditOpening, OpeningCandidates, CandidateProfile
│   │   └── student/     # StudentDashboard, StudentProfile, OpeningDetails, MyApplications
│   ├── services/        # Axios API client & domain services
│   └── utils/           # Roles, formatters, and helper constants
```
