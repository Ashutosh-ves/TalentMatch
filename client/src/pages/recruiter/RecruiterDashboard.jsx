import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { openingService } from '../../services/openingService';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

function OpeningCard({ opening, onDeleteClick }) {
  const { data: candidatesData } = useQuery({
    queryKey: ['openingCandidatesCount', opening._id],
    queryFn: () => openingService.getOpeningRankedCandidates(opening._id),
    enabled: Boolean(opening._id),
  });

  const applicantCount = candidatesData?.count ?? 0;
  const isDraft = opening.status === 'draft';
  const isActive = opening.status === 'active';

  return (
    <article className="bg-surface-container-lowest border border-border-hairline p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex flex-col gap-2">
        <h3 className="font-headline-md text-xl md:text-2xl font-bold text-primary">
          <Link
            to={`/recruiter/openings/${opening._id}/candidates`}
            className="hover:text-match-indicator transition-colors"
          >
            {opening.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-3 font-label-mono text-xs text-text-muted">
          <span className="font-semibold text-primary">
            {applicantCount} {applicantCount === 1 ? 'Applicant' : 'Applicants'}
          </span>
          <span>•</span>
          <span
            className={
              isActive
                ? 'text-match-indicator font-semibold'
                : isDraft
                ? 'text-text-muted'
                : 'text-text-muted'
            }
          >
            Status: {opening.status ? opening.status.charAt(0).toUpperCase() + opening.status.slice(1) : 'Active'}
          </span>
          {opening.availabilityNeeds && (
            <>
              <span>•</span>
              <span>{opening.availabilityNeeds}</span>
            </>
          )}
          {opening.companyName && (
            <>
              <span>•</span>
              <span className="text-primary font-medium">{opening.companyName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <Link
          to={`/recruiter/openings/${opening._id}/edit`}
          className="px-4 py-3 border border-border-hairline bg-transparent text-text-muted hover:text-primary hover:border-primary font-label-mono text-xs uppercase tracking-wider transition-colors text-center"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDeleteClick(opening)}
          className="px-4 py-3 border border-border-hairline bg-transparent text-text-muted hover:text-error hover:border-error font-label-mono text-xs uppercase tracking-wider transition-colors text-center cursor-pointer"
          title="Delete opening"
        >
          Delete
        </button>
        <Link
          to={`/recruiter/openings/${opening._id}/candidates`}
          className="flex-1 md:flex-none px-6 py-3 border border-border-hairline bg-transparent text-primary hover:border-primary hover:bg-black hover:text-white font-label-mono text-xs uppercase tracking-wider transition-all text-center font-bold"
        >
          View Pipeline
        </Link>
      </div>
    </article>
  );
}

export function RecruiterDashboard() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [openingToDelete, setOpeningToDelete] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Refresh user data on mount to catch status updates from admin
  useEffect(() => {
    refreshUser?.();
  }, [refreshUser]);

  const isPending = user?.status === 'pending';
  const isRejected = user?.status === 'rejected';
  const canPost = !isPending && !isRejected;

  const {
    data: openingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myOpenings'],
    queryFn: openingService.getMyOpenings,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => openingService.deleteOpening(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOpenings'] });
      setFeedback({
        type: 'success',
        message: 'Job opening has been deleted successfully.',
      });
      setOpeningToDelete(null);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to delete opening.',
      });
      setOpeningToDelete(null);
    },
  });

  const openings = openingsData?.openings || [];

  return (
    <div className="flex flex-col gap-8 py-6">
      {/* Rejected Status Banner */}
      {isRejected && (
        <div className="w-full bg-error-container border border-error/50 p-4 -mt-2 mb-2">
          <div className="flex items-center gap-3 text-on-error-container">
            <span className="material-symbols-outlined text-xl text-error shrink-0">cancel</span>
            <p className="font-body-md text-xs md:text-sm">
              <strong className="font-bold">Account Registration Rejected.</strong> Your company account
              was not approved by an administrator. Posting actions are disabled. Please contact support
              if you believe this is an error.
            </p>
          </div>
        </div>
      )}

      {/* Pending Approval Banner matching stitch_talent_match_recruiter_dashboard */}
      {isPending && (
        <div className="w-full bg-error-container border border-error/30 p-4 -mt-2 mb-2">
          <div className="flex items-center gap-3 text-on-error-container">
            <span className="material-symbols-outlined text-xl text-error shrink-0">info</span>
            <p className="font-body-md text-xs md:text-sm">
              <strong className="font-bold">Account Under Review.</strong> You can draft postings,
              but they will not be visible to students until an administrator verifies your company
              profile.
            </p>
          </div>
        </div>
      )}

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 flex items-center justify-between border-l-4 ${
            feedback.type === 'success'
              ? 'bg-surface-container text-primary border-primary'
              : 'bg-error-container text-on-error-container border-error'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-label-mono">
            <span className="material-symbols-outlined text-base">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-text-muted hover:text-primary font-bold text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Dashboard Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border-hairline pb-8">
        <div>
          <span className="font-label-mono text-xs uppercase tracking-widest text-text-muted">
            Recruiter Studio • {user?.companyName || user?.name || 'Company'}
          </span>
          <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold text-primary tracking-tighter mt-1">
            Recruiter Dashboard
          </h1>
          <p className="font-body-md text-sm text-text-muted mt-2">
            Manage your engineering job postings and review ranked student pipelines.
          </p>
        </div>

        <div>
          {canPost ? (
            <Link
              to="/recruiter/openings/new"
              className="inline-flex items-center justify-center bg-primary text-on-primary font-label-mono text-xs px-8 py-4 uppercase tracking-widest hover:bg-match-indicator transition-colors font-bold shrink-0"
            >
              + Post New Opening
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title={
                isRejected
                  ? 'Posting is disabled because your account registration was rejected.'
                  : 'Posting is disabled while your recruiter account is pending review.'
              }
              className="inline-flex items-center justify-center bg-surface-container text-text-muted font-label-mono text-xs px-8 py-4 uppercase tracking-widest border border-border-hairline cursor-not-allowed font-bold shrink-0 opacity-60"
            >
              + Post New Opening (Disabled)
            </button>
          )}
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-border-hairline p-8 animate-pulse"
            >
              <div className="h-6 bg-surface-container w-1/3 mb-4"></div>
              <div className="h-4 bg-surface-container w-1/4"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error">
          <p className="font-bold font-label-sm text-sm">Failed to load openings</p>
          <p className="text-xs font-body-md mt-1">{error.message}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && openings.length === 0 && (
        <div className="bg-surface-container-lowest border border-dashed border-border-hairline p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
            post_add
          </span>
          <h3 className="font-headline-md text-lg font-bold text-primary mb-2">
            No Job Postings Yet
          </h3>
          <p className="font-body-md text-xs text-text-muted max-w-md mx-auto mb-6">
            Create your first engineering role requirement to discover ranked student portfolios.
          </p>
          {canPost ? (
            <Link
              to="/recruiter/openings/new"
              className="inline-block px-8 py-3.5 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors font-bold"
            >
              Post Your First Role
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-block px-8 py-3.5 bg-surface-container text-text-muted font-label-mono text-xs uppercase tracking-wider border border-border-hairline cursor-not-allowed font-bold opacity-60"
            >
              Post Your First Role (Disabled)
            </button>
          )}
        </div>
      )}

      {/* Postings List Section */}
      {!isLoading && openings.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-xl font-bold text-primary">Your Postings</h2>
            <span className="font-label-mono text-xs text-text-muted">
              {openings.length} {openings.length === 1 ? 'Role' : 'Roles'} Listed
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {openings.map((opening) => (
              <OpeningCard
                key={opening._id}
                opening={opening}
                onDeleteClick={(op) => setOpeningToDelete(op)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Reusable ConfirmDialog for Delete Opening */}
      <ConfirmDialog
        isOpen={Boolean(openingToDelete)}
        onClose={() => setOpeningToDelete(null)}
        onConfirm={() => {
          if (openingToDelete?._id) {
            deleteMutation.mutate(openingToDelete._id);
          }
        }}
        title="Delete Job Opening?"
        description={
          <span>
            Are you sure you want to delete <strong className="text-primary">{openingToDelete?.title}</strong>? This will remove the opening and all associated candidate pipeline rankings. This action cannot be undone.
          </span>
        }
        confirmText="Delete Opening"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default RecruiterDashboard;
