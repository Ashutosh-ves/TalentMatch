import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState(null);

  // 1. Fetch pending recruiters
  const {
    data: pendingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pendingRecruiters'],
    queryFn: () => adminService.getPendingRecruiters(),
  });

  const recruiters = pendingData?.recruiters || [];

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id) => adminService.approveRecruiter(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecruiters'] });
      setFeedback({
        type: 'success',
        message: res.message || 'Recruiter account approved successfully.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to approve recruiter.',
      });
    },
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id) => adminService.rejectRecruiter(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pendingRecruiters'] });
      setFeedback({
        type: 'success',
        message: res.message || 'Recruiter account marked as rejected.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to reject recruiter.',
      });
    },
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatWebsiteUrl = (url) => {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  return (
    <div className="py-8 md:py-16">
      {/* Header matching stitch design */}
      <header className="mb-12 md:mb-16">
        <h1 className="font-display-xl text-3xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight mb-4">
          Pending Registrations
        </h1>
        <p className="font-body-lg text-base md:text-lg text-on-surface-variant max-w-2xl">
          Review and approve incoming recruiter accounts to grant them access to the talent gallery.
        </p>
      </header>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`mb-8 p-4 flex items-center justify-between border-l-4 ${
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
            className="text-text-muted hover:text-primary font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Registrations Table/List Area matching stitch design */}
      <div className="bg-surface-container-lowest border border-border-hairline w-full overflow-hidden">
        {/* Table Header (Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-6 border-b border-border-hairline p-6 bg-surface-bright font-label-mono text-xs text-on-surface-variant uppercase tracking-wider">
          <div className="col-span-3">Company Name</div>
          <div className="col-span-3">Recruiter Name</div>
          <div className="col-span-3">Website URL</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-container w-full rounded"></div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center text-error font-body-md text-sm">
            Failed to load pending registrations: {error.message}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recruiters.length === 0 && (
          <div className="p-16 text-center text-text-muted font-body-md text-sm">
            <span className="material-symbols-outlined text-4xl mb-2 text-text-muted">
              verified
            </span>
            <p className="font-semibold text-primary">No pending registrations</p>
            <p className="text-xs text-text-muted mt-1">
              All recruiter registration requests have been processed.
            </p>
          </div>
        )}

        {/* List Items */}
        {!isLoading && !error && recruiters.length > 0 && (
          <div className="flex flex-col">
            {recruiters.map((recruiter) => {
              const companyName = recruiter.companyName || recruiter.name || 'Company';
              const recruiterName = recruiter.name || 'Recruiter';
              const rawWebsite = recruiter.websiteUrl || '';
              const displayUrl = rawWebsite
                ? formatWebsiteUrl(rawWebsite)
                : recruiter.email || '—';
              const href = rawWebsite
                ? rawWebsite.startsWith('http')
                  ? rawWebsite
                  : `https://${rawWebsite}`
                : `mailto:${recruiter.email}`;

              const isActionPending =
                approveMutation.isPending || rejectMutation.isPending;

              return (
                <div
                  key={recruiter._id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-6 border-b border-border-hairline last:border-b-0 items-center hover:bg-surface-bright transition-colors duration-150"
                >
                  {/* Company */}
                  <div className="col-span-1 md:col-span-3">
                    <span className="md:hidden font-label-mono text-xs text-on-surface-variant block mb-1 uppercase tracking-wider">
                      Company
                    </span>
                    <span className="font-headline-md text-base md:text-lg text-primary font-bold">
                      {companyName}
                    </span>
                  </div>

                  {/* Recruiter */}
                  <div className="col-span-1 md:col-span-3">
                    <span className="md:hidden font-label-mono text-xs text-on-surface-variant block mb-1 uppercase tracking-wider">
                      Recruiter
                    </span>
                    <span className="font-body-lg text-sm text-primary">
                      {recruiterName}
                    </span>
                    <span className="text-xs text-text-muted block mt-0.5">
                      {recruiter.email}
                    </span>
                  </div>

                  {/* Website */}
                  <div className="col-span-1 md:col-span-3">
                    <span className="md:hidden font-label-mono text-xs text-on-surface-variant block mb-1 uppercase tracking-wider">
                      Website
                    </span>
                    <a
                      href={href}
                      target={rawWebsite ? '_blank' : undefined}
                      rel="noreferrer"
                      className="font-label-mono text-xs text-text-muted hover:text-primary transition-colors underline truncate block max-w-[220px]"
                    >
                      {displayUrl}
                    </a>
                  </div>

                  {/* Date */}
                  <div className="col-span-1 md:col-span-1">
                    <span className="md:hidden font-label-mono text-xs text-on-surface-variant block mb-1 uppercase tracking-wider">
                      Date
                    </span>
                    <span className="font-label-mono text-xs text-on-surface-variant">
                      {formatDate(recruiter.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 flex flex-row justify-start md:justify-end gap-3 mt-4 md:mt-0">
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={() => rejectMutation.mutate(recruiter._id)}
                      className="bg-transparent border border-border-hairline text-primary font-label-mono text-xs px-4 py-2 hover:border-error hover:text-error disabled:opacity-50 transition-colors duration-200 w-full md:w-auto text-center uppercase font-bold cursor-pointer"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={() => approveMutation.mutate(recruiter._id)}
                      className="bg-primary text-on-primary font-label-mono text-xs px-4 py-2 hover:bg-secondary disabled:opacity-50 transition-colors duration-200 w-full md:w-auto text-center uppercase font-bold cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
