import { useParams, Link } from 'react-router-dom';

export function PostEditOpening() {
  const { id } = useParams();
  const isEditing = Boolean(id);

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
          {isEditing ? `Editing Opening ID: ${id}` : 'New Opening Creation'}
        </span>
        <h1 className="font-display-xl text-3xl md:text-4xl font-bold tracking-tight text-primary mt-4 mb-2">
          {isEditing ? 'Edit Opening' : 'Post New Opening'}
        </h1>
        <p className="font-body-md text-text-muted mb-6">
          Define technical requirements, role specifications, and skill criteria.
        </p>

        <div className="p-8 border border-dashed border-border-hairline text-center font-label-mono text-sm text-text-muted">
          Opening creation and edit form will be implemented in the recruiter phase.
        </div>
      </div>
    </div>
  );
}

export default PostEditOpening;
