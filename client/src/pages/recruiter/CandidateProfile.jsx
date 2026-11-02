import { useState } from 'react';
import { useParams, useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentService from '../../services/studentService';
import openingService from '../../services/openingService';
import applicationService from '../../services/applicationService';

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

  // 3. Fetch Applications for this Opening (to find this student's application)
  const { data: applicationsData } = useQuery({
    queryKey: ['openingApplications', openingId],
    queryFn: () => applicationService.getApplicationsByOpening(openingId),
    enabled: !!openingId,
  });

  const student = studentData?.student;
  const user = student?.userId || {};
  const opening = openingData?.opening;

  // Find candidate's application if opening exists
  const applications = applicationsData?.applications || [];
  const currentApplication = applications.find((app) => {
    const appStudentId = app.studentId?._id || app.studentId;
    return appStudentId === id || (user._id && appStudentId === user._id) || app._id === id;
  });

  // Mutations for candidate application status updates
  const shortlistMutation = useMutation({
    mutationFn: (appId) => applicationService.shortlistApplication(appId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['openingApplications', openingId] });
      queryClient.invalidateQueries({ queryKey: ['openingCandidates', openingId] });
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
      queryClient.invalidateQueries({ queryKey: ['openingCandidates', openingId] });
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

  // Calculate Match Score and breakdown
  const studentSkills = student?.skills || [];
  const requiredSkills = opening?.requiredSkills || [];

  const normalizedStudentSkills = new Set(
    studentSkills.map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
  );

  const matchedSkills = requiredSkills.filter((s) =>
    normalizedStudentSkills.has(typeof s === 'string' ? s.toLowerCase().trim() : '')
  );

  const missingSkills = requiredSkills.filter(
    (s) => !normalizedStudentSkills.has(typeof s === 'string' ? s.toLowerCase().trim() : '')
  );

  const computedMatchScore =
    requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 100;

  // Use passed score, application score, or computed score
  const matchScore =
    location.state?.matchScore !== undefined
      ? location.state.matchScore
      : currentApplication?.matchScore !== undefined
      ? currentApplication.matchScore
      : opening
      ? computedMatchScore
      : null;

  const appStatus = currentApplication?.status;
  const isHighMatch = (matchScore ?? 0) >= 70;

  const githubStats = student?.githubStats || { contributions: 0, topLanguages: [], repoCount: 0 };
  const topLanguagesStr =
    Array.isArray(githubStats.topLanguages) && githubStats.topLanguages.length > 0
      ? githubStats.topLanguages.join(', ')
      : 'None recorded';

  if (isStudentLoading) {
    return (
      <div className="py-12 space-y-8 animate-pulse">
        <div className="h-6 bg-surface-container w-48 mb-8"></div>
        <div className="h-24 bg-surface-container w-full mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 h-80 bg-surface-container"></div>
          <div className="md:col-span-8 h-80 bg-surface-container"></div>
        </div>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="py-12">
        <div className="mb-6">
          <Link
            to={openingId ? `/recruiter/openings/${openingId}/candidates` : '/recruiter/dashboard'}
            className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1"
          >
            ← Back
          </Link>
        </div>
        <div className="bg-surface-container-lowest border border-border-hairline p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">person_off</span>
          <h2 className="font-headline-md text-xl font-bold text-primary mb-2">
            Candidate Profile Not Found
          </h2>
          <p className="font-body-md text-sm text-text-muted mb-6">
            The candidate profile you requested could not be retrieved or does not exist.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-primary text-on-primary font-label-mono text-xs uppercase font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 space-y-12">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to={openingId ? `/recruiter/openings/${openingId}/candidates` : '/recruiter/dashboard'}
          className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {opening ? `Back to ${opening.title} Candidates` : 'Back to Dashboard'}
        </Link>

        {opening && (
          <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
            Role: <span className="text-primary font-bold">{opening.title}</span>
          </span>
        )}
      </div>

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
            className="text-text-muted hover:text-primary font-bold text-sm"
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
              : user.email}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-1 font-label-mono text-xs">
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                {user.email}
              </a>
            )}

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
              <div className="font-label-mono text-xs text-text-muted uppercase tracking-widest">
                Match Score
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {currentApplication ? (
              <>
                <button
                  type="button"
                  onClick={() => shortlistMutation.mutate(currentApplication._id)}
                  disabled={appStatus === 'shortlisted' || shortlistMutation.isPending}
                  className={`flex-1 md:flex-initial px-8 py-3.5 font-label-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer rounded ${
                    appStatus === 'shortlisted'
                      ? 'bg-match-indicator text-on-primary cursor-default'
                      : 'bg-primary text-on-primary hover:bg-match-indicator disabled:opacity-50'
                  }`}
                >
                  {shortlistMutation.isPending
                    ? 'Updating...'
                    : appStatus === 'shortlisted'
                    ? 'Shortlisted'
                    : 'Shortlist Candidate'}
                </button>

                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(currentApplication._id)}
                  disabled={appStatus === 'rejected' || rejectMutation.isPending}
                  className={`flex-1 md:flex-initial px-6 py-3.5 border font-label-mono text-xs uppercase tracking-wider transition-colors cursor-pointer rounded ${
                    appStatus === 'rejected'
                      ? 'border-error text-error bg-error-container/20 cursor-default'
                      : 'border-border-hairline text-primary hover:border-error hover:text-error disabled:opacity-50'
                  }`}
                >
                  {rejectMutation.isPending
                    ? 'Updating...'
                    : appStatus === 'rejected'
                    ? 'Rejected'
                    : 'Reject'}
                </button>

                {(appStatus === 'shortlisted' || appStatus === 'accepted') && (
                  <Link
                    to={`/chat/${currentApplication._id}`}
                    className="flex-1 md:flex-initial px-6 py-3.5 bg-surface-container border border-border-hairline text-primary font-label-mono text-xs uppercase font-bold tracking-wider hover:bg-primary hover:text-on-primary transition-colors text-center rounded flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Interview Chat
                  </Link>
                )}
              </>
            ) : opening ? (
              <span className="font-label-mono text-xs text-text-muted px-4 py-3 bg-surface-container border border-border-hairline rounded">
                Candidate has not submitted an application yet
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Bento Grid Layout matching stitch design */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bio & Availability (Col 1-4) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg soft-shadow transition-shadow h-full flex flex-col justify-between">
            <div>
              <h2 className="font-headline-md text-xl font-bold mb-6 flex items-center gap-2 border-b border-border-hairline pb-4 text-primary">
                <span className="material-symbols-outlined">person</span> Professional Summary
              </h2>

              <p className="font-body-md text-sm text-text-muted mb-6 leading-relaxed">
                {student.interests && student.interests.length > 0
                  ? `Focusing on ${student.interests.join(', ')}. Demonstrated interest in building scalable, user-centric software applications.`
                  : 'Passionate student technologist ready to deliver impactful engineering solutions.'}
              </p>

              {student.interests && student.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-label-mono text-xs text-text-muted mb-2 uppercase tracking-widest">
                    Focus Areas
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {student.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-2.5 py-1 bg-surface-bright border border-border-hairline font-label-mono text-[11px] text-primary"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-bright p-5 rounded border border-border-hairline">
              <h3 className="font-label-mono text-xs text-text-muted mb-3 uppercase tracking-widest">
                Availability Details
              </h3>
              <ul className="flex flex-col gap-3 font-body-md text-xs text-primary">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-match-indicator">
                    check_circle
                  </span>
                  <span>{formatAvailability(student.availability)}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-match-indicator">
                    check_circle
                  </span>
                  <span>Direct Communication: {user.email || 'Provided'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-match-indicator">
                    check_circle
                  </span>
                  <span>Account Status: {user.status || 'Active'}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Tech Stack & GitHub (Col 5-12) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Tech Stack Section */}
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg soft-shadow transition-shadow">
            <h2 className="font-headline-md text-xl font-bold mb-6 flex items-center gap-2 border-b border-border-hairline pb-4 text-primary">
              <span className="material-symbols-outlined">code_blocks</span> Technical Stack
            </h2>

            {studentSkills.length === 0 ? (
              <p className="font-body-md text-sm text-text-muted">
                No technical skills recorded on this profile yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {studentSkills.map((skill) => {
                  const isMatching =
                    requiredSkills.length > 0 &&
                    requiredSkills.some(
                      (r) => r.toLowerCase().trim() === skill.toLowerCase().trim()
                    );

                  return (
                    <span
                      key={skill}
                      className={`px-3 py-1.5 font-label-mono text-xs border rounded transition-colors ${
                        isMatching
                          ? 'border-match-indicator bg-match-indicator/10 text-match-indicator font-bold'
                          : 'border-border-hairline bg-surface-bright text-primary'
                      }`}
                    >
                      {skill}
                      {isMatching && ' ✓'}
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {/* GitHub Stats Section (Strictly: contributions, topLanguages, repoCount only) */}
          <section className="bg-surface-container-lowest border border-border-hairline p-8 rounded-lg soft-shadow transition-shadow flex-grow">
            <div className="flex justify-between items-end border-b border-border-hairline pb-4 mb-6">
              <h2 className="font-headline-md text-xl font-bold flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">terminal</span> Developer Activity
              </h2>

              {student.githubUsername ? (
                <a
                  href={`https://github.com/${student.githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-label-mono text-xs text-match-indicator hover:underline flex items-center gap-1"
                >
                  View GitHub @{student.githubUsername}{' '}
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              ) : (
                <span className="font-label-mono text-xs text-text-muted">
                  GitHub not connected
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-surface-bright rounded border border-border-hairline">
                <div className="font-headline-lg text-3xl font-extrabold text-primary">
                  {githubStats.contributions || 0}+
                </div>
                <div className="font-label-mono text-[11px] text-text-muted uppercase tracking-widest mt-1">
                  Contributions (YTD)
                </div>
              </div>

              <div className="p-5 bg-surface-bright rounded border border-border-hairline">
                <div className="font-headline-lg text-2xl font-bold text-primary truncate">
                  {topLanguagesStr}
                </div>
                <div className="font-label-mono text-[11px] text-text-muted uppercase tracking-widest mt-1">
                  Top Languages
                </div>
              </div>

              <div className="p-5 bg-surface-bright rounded border border-border-hairline">
                <div className="font-headline-lg text-3xl font-extrabold text-primary">
                  {githubStats.repoCount || 0}
                </div>
                <div className="font-label-mono text-[11px] text-text-muted uppercase tracking-widest mt-1">
                  Repositories
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Match Breakdown Section */}
      <section className="bg-surface-container-lowest border border-border-hairline p-8 md:p-10 rounded-lg">
        <h2 className="font-headline-lg text-2xl font-bold mb-8 flex items-center gap-3 text-primary">
          <span
            className="material-symbols-outlined text-match-indicator"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            analytics
          </span>
          Match Breakdown {opening && `• ${opening.title}`}
        </h2>

        {opening ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* 1. Technical Fit */}
            <div>
              <div className="flex justify-between items-baseline mb-4 border-b border-border-hairline pb-2">
                <h3 className="font-headline-md text-base font-bold text-primary">Technical Fit</h3>
                <span className="font-label-mono text-xs text-match-indicator font-bold">
                  {matchedSkills.length}/{requiredSkills.length} Met
                </span>
              </div>
              <p className="font-body-md text-xs text-text-muted leading-relaxed mb-4">
                {matchedSkills.length === requiredSkills.length && requiredSkills.length > 0
                  ? 'Candidate possesses all required skills specified in the opening.'
                  : matchedSkills.length > 0
                  ? `Candidate demonstrates overlap with ${matchedSkills.length} out of ${requiredSkills.length} required skill requirements.`
                  : 'Candidate has not listed the specific technical requirements for this role.'}
              </p>

              {matchedSkills.length > 0 && (
                <div className="mb-2">
                  <span className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                    Matching Skills:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 font-label-mono text-[10px] font-bold"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div>
                  <span className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                    Missing Skills:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {missingSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-surface-container text-text-muted border border-border-hairline font-label-mono text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Availability Alignment */}
            <div>
              <div className="flex justify-between items-baseline mb-4 border-b border-border-hairline pb-2">
                <h3 className="font-headline-md text-base font-bold text-primary">
                  Availability Alignment
                </h3>
                <span className="font-label-mono text-xs text-match-indicator font-bold">
                  {student.availability ? 'Specified' : 'Flexible'}
                </span>
              </div>
              <p className="font-body-md text-xs text-text-muted leading-relaxed mb-3">
                Candidate reports availability as{' '}
                <strong className="text-primary">{formatAvailability(student.availability)}</strong>.
              </p>
              {opening.availabilityNeeds && (
                <div className="p-3 bg-surface-bright border border-border-hairline rounded font-label-mono text-xs text-text-muted">
                  Role Needs:{' '}
                  <span className="text-primary font-bold">
                    {formatAvailability(opening.availabilityNeeds)}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Developer Engagement */}
            <div>
              <div className="flex justify-between items-baseline mb-4 border-b border-border-hairline pb-2">
                <h3 className="font-headline-md text-base font-bold text-primary">
                  Activity & Engagement
                </h3>
                <span className="font-label-mono text-xs text-match-indicator font-bold">
                  {githubStats.contributions > 0 ? 'Active' : 'Unverified'}
                </span>
              </div>
              <p className="font-body-md text-xs text-text-muted leading-relaxed">
                {githubStats.contributions > 0
                  ? `Demonstrated commit history with ${githubStats.contributions} contributions and ${githubStats.repoCount} public repositories on GitHub.`
                  : 'No public GitHub contribution record synced yet for this candidate profile.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-text-muted font-body-md text-sm">
            Select a job opening to evaluate this candidate against specific role requirements and
            skills.
          </div>
        )}
      </section>
    </div>
  );
}

export default CandidateProfile;
