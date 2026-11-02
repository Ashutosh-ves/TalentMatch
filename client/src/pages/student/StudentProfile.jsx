import { Link } from 'react-router-dom';

export function StudentProfile() {
  return (
    <div className="py-8">
      <div className="mb-4">
        <Link
          to="/student/dashboard"
          className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-surface-container-lowest border border-border-hairline p-8">
        <h1 className="font-display-xl text-3xl md:text-4xl font-bold tracking-tight text-primary mb-2">
          Student Profile Setup
        </h1>
        <p className="font-body-md text-text-muted mb-6">
          Connect your GitHub account, manage repositories, and review extracted skills.
        </p>

        <div className="p-8 border border-dashed border-border-hairline text-center font-label-mono text-sm text-text-muted">
          GitHub integration and skill management will be implemented in the student phase.
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
