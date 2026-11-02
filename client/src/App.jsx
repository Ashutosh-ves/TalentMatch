import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public and Shared Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import InterviewChat from './pages/InterviewChat';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import OpeningDetails from './pages/student/OpeningDetails';
import MyApplications from './pages/student/MyApplications';
import StudentProfile from './pages/student/StudentProfile';

// Recruiter Pages
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import PostEditOpening from './pages/recruiter/PostEditOpening';
import OpeningCandidates from './pages/recruiter/OpeningCandidates';
import CandidateProfile from './pages/recruiter/CandidateProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* All views wrapped with the shared Layout shell */}
            <Route element={<Layout />}>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Student Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/openings/:id" element={<OpeningDetails />} />
                <Route path="/student/applications" element={<MyApplications />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>

              {/* Recruiter Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['recruiter']} />}>
                <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
                <Route path="/recruiter/openings/new" element={<PostEditOpening />} />
                <Route path="/recruiter/openings/:id/edit" element={<PostEditOpening />} />
                <Route path="/recruiter/openings/:id/candidates" element={<OpeningCandidates />} />
                <Route path="/recruiter/candidates/:id" element={<CandidateProfile />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>

              {/* Shared Authenticated Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student', 'recruiter', 'admin']} />}>
                <Route path="/chat" element={<InterviewChat />} />
                <Route path="/chat/:applicationId" element={<InterviewChat />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
