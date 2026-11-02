import { Link } from 'react-router-dom';

export function StudentDashboard() {
  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <span className="font-label-mono text-xs uppercase tracking-widest text-text-muted">
            Student Portal
          </span>
          <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold tracking-tighter text-primary mt-1">
            Recommended Openings
          </h1>
          <p className="font-body-md text-text-muted mt-2">
            Discover opportunities matched with your GitHub repositories and verified skill profile.
          </p>
        </div>

        {/* Quick test links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Link
            to="/student/openings/sample-123"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              View Sample Opening
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /student/openings/:id
            </div>
          </Link>

          <Link
            to="/student/applications"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              My Applications
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /student/applications
            </div>
          </Link>

          <Link
            to="/student/profile"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              Student Profile
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /student/profile
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
