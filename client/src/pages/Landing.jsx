import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleDashboard } from '../utils/roles';

export function Landing() {
  const { isAuthenticated, role } = useAuth();

  return (
    <div className="py-12 flex flex-col justify-center items-start min-h-[500px]">
      <div className="inline-block px-3 py-1 mb-6 text-xs font-label-mono uppercase tracking-widest bg-surface-container border border-border-hairline">
        Application Shell • Phase 1
      </div>
      <h1 className="font-display-xl text-4xl md:text-7xl font-extrabold tracking-tighter text-primary mb-6">
        SKILLS OVER RESUMES.
      </h1>
      <p className="font-body-lg text-lg text-on-surface-variant max-w-2xl mb-10">
        Showcase your GitHub projects. Get matched with top companies through project-based discovery.
      </p>

      {isAuthenticated ? (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={getRoleDashboard(role)}
            className="font-label-mono text-xs uppercase tracking-widest bg-primary text-on-primary px-8 py-4 hover:bg-match-indicator transition-colors"
          >
            Go to {role} Dashboard
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/register"
            className="font-label-mono text-xs uppercase tracking-widest bg-primary text-on-primary px-8 py-4 hover:bg-match-indicator transition-colors text-center"
          >
            Register as Student
          </Link>
          <Link
            to="/login"
            className="font-label-mono text-xs uppercase tracking-widest bg-white border border-border-hairline text-primary px-8 py-4 hover:border-primary transition-colors text-center"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default Landing;
