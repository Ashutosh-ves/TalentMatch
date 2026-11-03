import { useState } from 'react';
import { useParams, useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentService from '../../services/studentService';
import openingService from '../../services/openingService';
import applicationService from '../../services/applicationService';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MatchBreakdown } from '../../components/common/MatchBreakdown';

const AVAILABILITY_LABELS = {
  immediate: 'Immediate (Ready to start)',
  two_weeks: '2 Weeks Notice',
  one_month: '1 Month Notice',
  summer_2025: 'Summer 2025 Internship',
  part_time: 'Part-time only',
  flexible: 'Flexible / Open to discussion',
};

const formatAvailability = (val) => AVAILABILITY_LABELS[val] || val || 'Actively Looking';

export function CandidateProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const openingId = searchParams.get('openingId') || location.state?.openingId || '';
  const [feedback, setFeedback] = useState(null);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);

  // 1. Fetch Student Profile
  const {
    data: studentData,
    isLoading: isStudentLoading,
    error: studentError,
  } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id),
    enabled: !!id,
  });

  // 2. Fetch Opening Details (if openingId provided)
  const { data: openingData } = useQuery({
    queryKey: ['opening', openingId],
    queryFn: () => openingService.getOpeningById(openingId),
    enabled: !!openingId,
  });

  // 3. Fetch Ranked Candidates for this Opening (contains live server matchBreakdown & matchScore)
  const { data: candidatesData } = useQuery({
    queryKey: ['openingRankedCandidates', openingId],
    queryFn: () => openingService.getOpeningRankedCandidates(openingId),
    enabled: !!openingId,
  });

  // 4. Fetch Applications for this Opening as secondary lookup
  const { data: applicationsData } = useQuery({
    queryKey: ['openingApplications', openingId],
    queryFn: () => applicationService.getApplicationsByOpening(openingId),
    enabled: !!openingId,
  });

  const student = studentData?.student;
  const user = student?.userId || {};
  const opening = openingData?.opening;

  // Find candidate's application across ranked candidates or application list
  const candidates = candidatesData?.candidates || [];
  const applications = applicationsData?.applications || [];

  const currentCandidate = candidates.find((app) => {
    const appStudentId = (app.studentId?._id || app.studentId || '').toString();
    const studentUserId = (user._id || '').toString();
    const studentDocId = (student?._id || '').toString();
    return (
      appStudentId === id ||
      appStudentId === studentUserId ||
      app._id === id ||
      studentDocId === id
    );
  });

  const currentApplication =
    currentCandidate ||
    applications.find((app) => {
      const appStudentId = (app.studentId?._id || app.studentId || '').toString();
      const studentUserId = (user._id || '').toString();
      const studentDocId = (student?._id || '').toString();
      return (
        appStudentId === id ||
        appStudentId === studentUserId ||
        app._id === id ||
        studentDocId === id
      );
    });

  // 5. Fetch single application detail if application ID exists (ensures live matchBreakdown from GET /api/applications/:id)
  const { data: appDetailData } = useQuery({
    queryKey: ['application', currentApplication?._id],
    queryFn: () => applicationService.getApplicationById(currentApplication._id),
    enabled: Boolean(currentApplication?._id),
  });

  // Server matchBreakdown & matchScore (no client-side recomputation)
  const matchBreakdown =
    location.state?.matchBreakdown ||
    currentCandidate?.matchBreakdown ||
    appDetailData?.application?.matchBreakdown ||
    currentApplication?.matchBreakdown ||
    null;

  const matchScore =
    location.state?.matchScore !== undefined
      ? location.state.matchScore
      : currentCandidate?.matchScore !== undefined
      ? currentCandidate.matchScore
      : appDetailData?.application?.matchScore !== undefined
      ? appDetailData.application.matchScore
      : typeof currentApplication?.matchScore === 'number'
      ? currentApplication.matchScore
      : null;

  // Mutations for candidate application status updates
  const shortlistMutation = useMutation({
    mutationFn: (appId) => applicationService.shortlistApplication(appId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['openingApplications', openingId] });
      queryClient.invalidateQueries({ queryKey: ['openingRankedCandidates', openingId] });
      queryClient.invalidateQueries({ queryKey: ['application', currentApplication?._id] });
      setFeedback({
        type: 'success',
        message: res.message || 'Candidate successfully shortlisted!',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to shortlist candidate',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (appId) => applicationService.rejectApplication(appId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['openingApplications', openingId] });
      queryClient.invalidateQueries({ queryKey: ['openingRankedCandidates', openingId] });
      queryClient.invalidateQueries({ queryKey: ['application', currentApplication?._id] });
      setFeedback({
        type: 'success',
        message: res.message || 'Candidate application marked as rejected.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to reject candidate',
      });
    },
  });

  const appStatus = currentApplication?.status;
  const isHighMatch = (matchScore ?? 0) >= 70;

  const githubStats = student?.githubStats || { contributions: 0, topLanguages: [], repoCount: 0 };
  const topLanguagesStr =
    Array.isArray(githubStats.topLanguages) && githubStats.topLanguages.length > 0
      ? githubStats.topLanguages.join(', ')
      : 'None recorded';

  // Company Name with graceful fallback to recruiter name
  const companyDisplayName = opening?.companyName || opening?.recruiterId?.name || 'Company';

  if (isStudentLoading) {
    return (
      <div className="py-20 text-center font-label-mono text-xs text-text-muted animate-pulse">
        Loading candidate profile...
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error mb-6">
          <p className="font-bold font-label-sm text-sm">Candidate Not Found</p>
          <p className="font-body-md text-xs mt-1">
            {studentError?.response?.data?.message ||
              'The requested candidate profile does not exist or has been removed.'}
          </p>
        </div>
        <Link
          to={openingId ? `/recruiter/openings/${openingId}/candidates` : '/recruiter/dashboard'}
          className="font-label-mono text-xs uppercase tracking-wider text-primary underline"
        >
          ← Return to Candidates
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-[1200px] mx-auto flex flex-col gap-10">
      {/* Top Navigation / Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs font-label-mono text-text-muted m-0 p-0 list-none">
          <li>
            <Link
              to={openingId ? `/recruiter/openings/${openingId}/candidates` : '/recruiter/dashboard'}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Candidates
            </Link>
          </li>
          {opening && (
            <>
              <li>/</li>
              <li className="text-primary font-bold">{opening.title}</li>
              {companyDisplayName && (
                <>
                  <li>•</li>
                  <li className="text-text-muted">{companyDisplayName}</li>
                </>
              )}
            </>
          )}
        </ol>
      </nav>

      {/* Feedback Banner */}
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

      {/* Header Section matching stitch_talent_match_candidate_profile */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border-hairline pb-8">
        <div className="flex flex-col gap-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full w-max">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
              {formatAvailability(student.availability)}
            </span>
          </div>

          <h1 className="font-display-xl text-3xl md:text-5xl lg:text-6xl text-primary font-bold leading-none tracking-tight">
            {user.name || 'Candidate'}
          </h1>

          <p className="font-headline-md text-base md:text-lg text-text-muted">
            {student.interests && student.interests.length > 0
              ? student.interests.join(' • ')
              : 'Software Engineering • Web Applications'}
          </p>

          <div className="flex flex-wrap items-center gap-6 font-label-mono text-xs mt-2">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="material-symbols-outlined text-base">mail</span>
              {user.email || 'No email provided'}
            </span>

            {student.linkedinUrl && (
              <a
                href={
                  student.linkedinUrl.startsWith('http')
                    ? student.linkedinUrl
                    : `https://${student.linkedinUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-text-muted hover:text-match-indicator transition-colors"
              >
                <span className="material-symbols-outlined text-sm">link</span> LinkedIn
              </a>
            )}

            {student.portfolioUrl && (
              <a
                href={
                  student.portfolioUrl.startsWith('http')
                    ? student.portfolioUrl
                    : `https://${student.portfolioUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-text-muted hover:text-match-indicator transition-colors"
              >
                <span className="material-symbols-outlined text-sm">link</span> Portfolio
              </a>
            )}

            {student.githubUsername && (
              <a
                href={`https://github.com/${student.githubUsername}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-text-muted hover:text-match-indicator transition-colors"
              >
                <span className="material-symbols-outlined text-sm">terminal</span> @
                {student.githubUsername}
              </a>
            )}
          </div>
        </div>

        {/* Match Score & Recruiter Actions Column */}
        <div className="flex flex-col items-start md:items-end gap-6 shrink-0 w-full md:w-auto">
          {matchScore !== null && (
            <div className="text-left md:text-right">
              <div
                className={`font-display-xl text-5xl md:text-6xl font-extrabold leading-none mb-1 tracking-tighter ${
                  isHighMatch ? 'text-match-indicator' : 'text-primary'
                }`}
              >
                {matchScore}%
              </div>
              <span className="font-label-mono text-xs text-text-muted uppercase tracking-widest">
                Overall Match Score
              </span>
            </div>
          )}

          {currentApplication && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {appStatus === 'shortlisted' ? (
                <div className="flex items-center gap-3">
                  <span className="px-4 py-3 bg-secondary/10 border border-secondary text-secondary font-label-mono text-xs uppercase tracking-wider font-bold">
                    ✓ Shortlisted
                  </span>
                  <button
                    onClick={() => navigate(`/chat/${currentApplication._id}`)}
                    className="px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-widest font-bold hover:bg-match-indicator transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    Interview Chat
                  </button>
                </div>
              ) : appStatus === 'accepted' ? (
                <div className="flex items-center gap-3">
                  <span className="px-4 py-3 bg-match-indicator/10 border border-match-indicator text-match-indicator font-label-mono text-xs uppercase tracking-wider font-bold">
                    ✓ Accepted
                  </span>
                  <button
                    onClick={() => navigate(`/chat/${currentApplication._id}`)}
                    className="px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-widest font-bold hover:bg-match-indicator transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    Interview Chat
                  </button>
                </div>
              ) : appStatus === 'rejected' ? (
                <span className="px-4 py-3 bg-surface-container border border-border-hairline text-text-muted font-label-mono text-xs uppercase tracking-wider">
                  Rejected
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => shortlistMutation.mutate(currentApplication._id)}
                    disabled={shortlistMutation.isPending}
                    className="px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-widest font-bold hover:bg-match-indicator disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {shortlistMutation.isPending ? 'Shortlisting...' : 'Shortlist Candidate'}
                  </button>
                  <button
                    onClick={() => setIsRejectConfirmOpen(true)}
                    disabled={rejectMutation.isPending}
                    className="px-4 py-3 border border-border-hairline text-text-muted hover:text-error hover:border-error font-label-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Bento Grid: Bio / Availability & Tech Stack / GitHub */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Bio & Availability (Col 1-4) */}
        <div className="md:col-span-4 flex flex-col gap-8">
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg flex flex-col justify-between h-full">
            <div>
              <h2 className="font-headline-md text-lg font-bold border-b border-border-hairline pb-4 mb-4 text-primary">
                Candidate Bio
              </h2>
              <p className="font-body-md text-xs md:text-sm text-text-muted leading-relaxed">
                Focused engineering candidate active in modern web architectures and distributed
                backends. Demonstrated history of repository maintenance and team collaboration.
              </p>
            </div>

            <div className="bg-surface-bright p-5 rounded border border-border-hairline mt-6">
              <h3 className="font-label-mono text-xs text-text-muted mb-3 uppercase tracking-widest">
                Availability Details
              </h3>
              <ul className="flex flex-col gap-3 font-body-md text-xs md:text-sm list-none p-0 m-0">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-match-indicator">
                    check_circle
                  </span>
                  <span>{formatAvailability(student.availability)}</span>
                </li>
                {student.availability && (
                  <li className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>Preference: {student.availability}</span>
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>

        {/* Tech Stack & GitHub Stats (Col 5-12) */}
        <div className="md:col-span-8 flex flex-col gap-8">
          {/* Tech Stack */}
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg">
            <h2 className="font-headline-md text-lg font-bold mb-6 flex items-center gap-2 border-b border-border-hairline pb-4 text-primary">
              <span className="material-symbols-outlined text-base">code_blocks</span>
              Technical Stack & Skills
            </h2>

            <div className="flex flex-wrap gap-2">
              {student.skills && student.skills.length > 0 ? (
                student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3.5 py-1.5 bg-surface-container border border-border-hairline font-label-mono text-xs text-primary"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-text-muted font-body-md text-xs">
                  No skills listed on this candidate profile.
                </span>
              )}
            </div>
          </section>

          {/* GitHub Cached Stats Preview */}
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg flex-grow">
            <div className="flex justify-between items-end border-b border-border-hairline pb-4 mb-6">
              <div>
                <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider block mb-1">
                  Verified Metrics
                </span>
                <h2 className="font-headline-md text-lg font-bold text-primary m-0 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">terminal</span>
                  GitHub Activity
                </h2>
              </div>
              {student.githubUsername && (
                <a
                  href={`https://github.com/${student.githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-label-mono text-xs text-match-indicator hover:underline flex items-center gap-1"
                >
                  View GitHub
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface-bright p-5 border border-border-hairline flex flex-col justify-between">
                <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                  Public Repos
                </span>
                <div className="font-display-xl text-3xl md:text-4xl font-extrabold text-primary mt-2">
                  {githubStats.repoCount ?? 0}
                </div>
              </div>

              <div className="bg-surface-bright p-5 border border-border-hairline flex flex-col justify-between">
                <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                  Contributions (YTD)
                </span>
                <div className="font-display-xl text-3xl md:text-4xl font-extrabold text-match-indicator mt-2">
                  {githubStats.contributions ?? 0}
                </div>
              </div>

              <div className="bg-surface-bright p-5 border border-border-hairline flex flex-col justify-between">
                <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                  Top Languages
                </span>
                <div className="font-body-md text-xs text-primary font-bold mt-2 truncate">
                  {topLanguagesStr}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Match Breakdown Section — 3 Server Rows: Skills (60%), GitHub languages (25%), Availability (15%) */}
      <section className="bg-surface-container-lowest border border-border-hairline p-8 md:p-10 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border-hairline pb-4 mb-6">
          <h2 className="font-headline-lg text-2xl font-bold flex items-center gap-3 text-primary">
            <span
              className="material-symbols-outlined text-match-indicator"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              analytics
            </span>
            Match Breakdown {opening && `• ${opening.title}`}
          </h2>
          {matchScore !== null && (
            <span className="font-display-xl text-2xl font-extrabold text-match-indicator">
              {matchScore}%
            </span>
          )}
        </div>

        {opening ? (
          <MatchBreakdown
            breakdown={matchBreakdown}
            requiredSkills={opening.requiredSkills}
            openingAvailability={opening.availabilityNeeds}
          />
        ) : (
          <div className="text-center py-6 text-text-muted font-body-md text-sm">
            Select a job opening to evaluate this candidate against specific role requirements and
            skills.
          </div>
        )}
      </section>

      {/* ConfirmDialog for Reject Candidate */}
      <ConfirmDialog
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={() => {
          if (currentApplication?._id) {
            rejectMutation.mutate(currentApplication._id);
            setIsRejectConfirmOpen(false);
          }
        }}
        title="Reject Candidate Application?"
        description={
          <span>
            Are you sure you want to mark the application from{' '}
            <strong className="text-primary">{user.name || user.email || 'this candidate'}</strong>{' '}
            as rejected?
          </span>
        }
        confirmText="Reject Application"
        confirmVariant="danger"
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}

export default CandidateProfile;
