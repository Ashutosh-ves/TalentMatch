import { Link } from 'react-router-dom';

export function RecruiterDashboard() {
  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="font-label-mono text-xs uppercase tracking-widest text-text-muted">
              Recruiter Portal
            </span>
            <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold tracking-tighter text-primary mt-1">
              Active Job Postings
            </h1>
            <p className="font-body-md text-text-muted mt-2">
              Manage your engineering openings and review ranked candidate pipelines.
            </p>
          </div>

          <Link
            to="/recruiter/openings/new"
            className="px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors"
          >
            + Post New Opening
          </Link>
        </div>

        {/* Quick test links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Link
            to="/recruiter/openings/new"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              Post Opening
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /recruiter/openings/new
            </div>
          </Link>

          <Link
            to="/recruiter/openings/sample-123/candidates"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              View Opening Candidates
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /recruiter/openings/:id/candidates
            </div>
          </Link>

          <Link
            to="/recruiter/candidates/sample-456"
            className="p-6 bg-surface-container-lowest border border-border-hairline hover:border-primary transition-all group"
          >
            <div className="font-display-xl font-bold text-lg text-primary group-hover:text-match-indicator">
              Candidate Profile
            </div>
            <div className="font-label-mono text-xs text-text-muted mt-1">
              Route: /recruiter/candidates/:id
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RecruiterDashboard;
