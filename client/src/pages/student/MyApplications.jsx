import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationService } from '../../services/applicationService';

export function MyApplications() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['myApplications'],
    queryFn: applicationService.getMyApplications,
  });

  const applications = data?.applications || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <div className="inline-flex items-center px-3 py-1 border border-match-indicator text-match-indicator font-label-mono text-xs bg-match-indicator/10 uppercase tracking-wider font-bold">
            <span className="w-2 h-2 rounded-full bg-match-indicator mr-2 animate-pulse"></span>
            ACCEPTED
          </div>
        );
      case 'shortlisted':
        return (
          <div className="inline-flex items-center px-3 py-1 border border-secondary text-secondary font-label-mono text-xs bg-secondary/10 uppercase tracking-wider font-bold">
            <span className="w-2 h-2 rounded-full bg-secondary mr-2 animate-pulse"></span>
            SHORTLISTED
          </div>
        );
      case 'rejected':
        return (
          <div className="inline-flex items-center px-3 py-1 border border-border-hairline text-text-muted font-label-mono text-xs bg-surface-container uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-text-muted mr-2"></span>
            REJECTED
          </div>
        );
      case 'applied':
      default:
        return (
          <div className="inline-flex items-center px-3 py-1 border border-border-hairline text-text-muted font-label-mono text-xs bg-surface uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-text-muted mr-2"></span>
            APPLIED
          </div>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="py-6 max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Page Header matching stitch_talent_match_my_applications */}
      <header>
        <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold text-primary tracking-tighter mb-2">
          My Applications
        </h1>
        <p className="font-body-md text-sm text-text-muted">
          Track the real-time status of your submissions across companies.
        </p>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-border-hairline p-8 animate-pulse"
            >
              <div className="h-5 bg-surface-container w-1/4 mb-3"></div>
              <div className="h-4 bg-surface-container w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error">
          <p className="font-bold font-label-sm text-sm">Failed to load applications</p>
          <p className="text-xs font-body-md mt-1">{error.message}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && applications.length === 0 && (
        <div className="bg-surface-container-lowest border border-dashed border-border-hairline p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
            description
          </span>
          <h3 className="font-headline-md text-lg font-bold text-primary mb-2">
            No Applications Submitted Yet
          </h3>
          <p className="font-body-md text-xs text-text-muted max-w-md mx-auto mb-6">
            You haven't applied to any job openings yet. Explore recommended roles on your dashboard
            and submit your portfolio!
          </p>
          <Link
            to="/student/dashboard"
            className="inline-block px-8 py-3.5 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors font-bold"
          >
            Explore Openings
          </Link>
        </div>
      )}

      {/* Applications List */}
      {!isLoading && applications.length > 0 && (
        <div className="flex flex-col gap-4">
          {applications.map((app) => {
            const opening = app.openingId || {};
            const recruiter = opening.recruiterId || {};
            const companyName = recruiter.name || 'Partner Company';
            const openingId = opening._id || app.openingId;
            const canChat = app.status === 'shortlisted' || app.status === 'accepted';

            return (
              <div
                key={app._id}
                className="group flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 md:p-8 bg-surface-container-lowest border border-border-hairline hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-300"
              >
                {/* Opening & Company Info */}
                <div className="flex items-center gap-6 md:gap-8 flex-grow">
                  <div className="w-16 h-16 shrink-0 bg-surface-container border border-border-hairline flex items-center justify-center font-display-xl font-bold text-xl text-primary uppercase">
                    {companyName[0]}
                  </div>

                  <div>
                    <div className="font-label-mono text-xs text-text-muted mb-1 uppercase tracking-widest">
                      {companyName}
                    </div>
                    <h2 className="font-headline-md text-lg md:text-xl font-bold text-primary mb-1">
                      {opening.title || 'Job Opening'}
                    </h2>
                    <div className="font-body-md text-xs text-text-muted flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span>Applied {formatDate(app.appliedAt)}</span>
                      {typeof app.matchScore === 'number' && (
                        <span className="ml-2 font-label-mono text-primary font-semibold">
                          • {app.matchScore}% Match
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Column & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 shrink-0 border-t border-border-hairline lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-8 mt-2 lg:mt-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-[11px] text-text-muted uppercase tracking-widest">
                      Status
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Enter Chat on Shortlisted / Accepted */}
                    {canChat && (
                      <Link
                        to={`/chat/${app._id}`}
                        className="px-6 py-3.5 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors flex items-center justify-center gap-2 font-bold"
                      >
                        Enter Chat
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    )}

                    {/* View Details Link */}
                    {openingId && (
                      <Link
                        to={`/student/openings/${openingId}`}
                        className="px-5 py-3 border border-border-hairline text-primary font-label-mono text-xs uppercase tracking-wider hover:border-primary transition-colors text-center"
                      >
                        View Opening
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyApplications;
