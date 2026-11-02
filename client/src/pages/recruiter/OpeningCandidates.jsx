import { useParams, Link } from 'react-router-dom';

export function OpeningCandidates() {
  const { id } = useParams();

  return (
    <div className="py-8">
      <div className="mb-4">
        <Link
          to="/recruiter/dashboard"
          className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-surface-container-lowest border border-border-hairline p-8">
        <span className="font-label-mono text-xs uppercase bg-surface-container px-2.5 py-1 text-primary border border-border-hairline">
          Opening ID: {id}
        </span>
        <h1 className="font-display-xl text-3xl md:text-4xl font-bold tracking-tight text-primary mt-4 mb-2">
          Ranked Candidates
        </h1>
        <p className="font-body-md text-text-muted mb-6">
          Candidates ranked by code alignment score and relevant commit experience.
        </p>

        <div className="p-8 border border-dashed border-border-hairline text-center font-label-mono text-sm text-text-muted">
          Ranked candidates pipeline will be implemented in the recruiter phase.
        </div>
      </div>
    </div>
  );
}

export default OpeningCandidates;
