import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openingService } from '../../services/openingService';
import { applicationService } from '../../services/applicationService';
import { studentService } from '../../services/studentService';

export function OpeningDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState(null);

  // Fetch opening details
  const {
    data: openingData,
    isLoading: isOpeningLoading,
    error: openingError,
  } = useQuery({
    queryKey: ['opening', id],
    queryFn: () => openingService.getOpeningById(id),
    enabled: Boolean(id),
  });

  // Fetch student profile for computing live match score
  const { data: profileData } = useQuery({
    queryKey: ['myStudentProfile'],
    queryFn: studentService.getMyProfile,
  });

  // Fetch student's existing applications to check if already applied
  const { data: appsData } = useQuery({
    queryKey: ['myApplications'],
    queryFn: applicationService.getMyApplications,
  });

  const opening = openingData?.opening;
  const student = profileData?.student;
  const applications = appsData?.applications || [];

  const existingApplication = applications.find(
    (app) => (app.openingId?._id || app.openingId) === id
  );
  const hasApplied = Boolean(existingApplication);

  // Calculate live match score based on student skills vs required skills
  const studentSkills = student?.skills || [];
  const requiredSkills = opening?.requiredSkills || [];

  let matchScore = 100;
  if (requiredSkills.length > 0) {
    if (studentSkills.length === 0) {
      matchScore = 0;
    } else {
      const studentSkillSet = new Set(studentSkills.map((s) => s.toLowerCase().trim()));
      const matchCount = requiredSkills.filter((s) =>
        studentSkillSet.has(s.toLowerCase().trim())
      ).length;
      matchScore = Math.round((matchCount / requiredSkills.length) * 100);
    }
  }

  // Apply Mutation
  const applyMutation = useMutation({
    mutationFn: () => applicationService.applyToOpening(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setFeedback({
        type: 'success',
        message: res.message || 'Application successfully submitted!',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit application.',
      });
    },
  });

  const handleApply = () => {
    setFeedback(null);
    applyMutation.mutate();
  };

  if (isOpeningLoading) {
    return (
      <div className="py-16 text-center font-label-mono text-xs text-text-muted animate-pulse">
        Loading opening details...
      </div>
    );
  }

  if (openingError || !opening) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error mb-6">
          <p className="font-bold font-label-sm text-sm">Opening Not Found</p>
          <p className="font-body-md text-xs mt-1">
            {openingError?.response?.data?.message || 'The requested role does not exist or has been removed.'}
          </p>
        </div>
        <Link
          to="/student/dashboard"
          className="font-label-mono text-xs uppercase tracking-wider text-primary underline"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const recruiterName = opening.recruiterId?.name || 'Partner Company';
  const recruiterEmail = opening.recruiterId?.email || '';

  return (
    <div className="py-6 max-w-[1200px] mx-auto flex flex-col gap-10">
      {/* Back Link */}
      <div>
        <Link
          to="/student/dashboard"
          className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Explore
        </Link>
      </div>

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
            className="text-text-muted hover:text-primary font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Hero Section matching stitch_talent_match_opening_details */}
      <section className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-end">
        <div className="flex flex-col gap-2">
          <span className="font-label-mono text-xs text-text-muted uppercase tracking-widest">
            {recruiterName}
          </span>
          <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold text-primary tracking-tighter m-0">
            {opening.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="font-label-mono text-xs text-primary bg-surface-container px-3 py-1 border border-border-hairline">
              {opening.availabilityNeeds || 'Full-Time'}
            </span>
            <span className="font-label-mono text-xs text-match-indicator bg-match-indicator/10 px-3 py-1 border border-match-indicator/30 uppercase tracking-wider font-semibold">
              Status: {opening.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-5 w-full md:w-auto">
          <div className="md:text-right">
            <span className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-0.5">
              Match Potential
            </span>
            <span className="font-display-xl text-4xl md:text-5xl font-extrabold text-match-indicator leading-none">
              {matchScore}%
            </span>
          </div>

          {hasApplied ? (
            <div className="inline-flex items-center gap-2 bg-surface-container border border-border-hairline px-8 py-3.5 font-label-mono text-xs uppercase tracking-widest text-primary font-bold">
              <span className="material-symbols-outlined text-base text-match-indicator">
                check_circle
              </span>
              Applied
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={applyMutation.isPending || opening.status !== 'active'}
              className="bg-primary text-on-primary font-label-mono text-xs px-10 py-4 hover:bg-match-indicator disabled:opacity-60 transition-colors uppercase tracking-widest font-bold cursor-pointer"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Apply Now'}
            </button>
          )}
        </div>
      </section>

      <hr className="border-border-hairline w-full" />

      {/* Match Breakdown & Overview (Bento Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Match Score Breakdown */}
        <div className="col-span-1 bg-surface-container-lowest border border-border-hairline p-8 flex flex-col gap-6">
          <h2 className="font-headline-md text-xl font-bold text-primary">Match Breakdown</h2>

          <div className="flex flex-col gap-6">
            {/* Category 1: Technical Skills */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center w-full text-xs font-label-mono">
                <span className="text-primary uppercase tracking-wider">Skill Alignment</span>
                <span className="text-match-indicator font-bold">{matchScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container">
                <div
                  className="h-full bg-match-indicator transition-all duration-500"
                  style={{ width: `${matchScore}%` }}
                ></div>
              </div>
            </div>

            {/* Category 2: GitHub Presence */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center w-full text-xs font-label-mono">
                <span className="text-primary uppercase tracking-wider">GitHub Sync</span>
                <span className="text-match-indicator font-bold">
                  {student?.githubUsername ? 'Active' : 'Missing'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container">
                <div
                  className="h-full bg-match-indicator transition-all duration-500"
                  style={{ width: student?.githubUsername ? '100%' : '20%' }}
                ></div>
              </div>
            </div>

            {/* Category 3: Engagement */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center w-full text-xs font-label-mono">
                <span className="text-primary uppercase tracking-wider">Availability Match</span>
                <span className="text-match-indicator font-bold">
                  {student?.availability ? 'Aligned' : 'Pending'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container">
                <div
                  className="h-full bg-match-indicator transition-all duration-500"
                  style={{ width: student?.availability ? '100%' : '30%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Role Description & Required Stack */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
          {/* About the Role */}
          <div className="bg-surface-container-lowest border border-border-hairline p-8 flex flex-col gap-4">
            <h2 className="font-headline-md text-xl font-bold text-primary">About the Role</h2>
            <p className="font-body-md text-sm text-text-muted leading-relaxed whitespace-pre-line">
              {opening.description || 'No detailed description provided for this opening.'}
            </p>
          </div>

          {/* Required Skills Stack */}
          <div className="bg-surface-container-lowest border border-border-hairline p-8 flex flex-col gap-4">
            <h2 className="font-headline-md text-xl font-bold text-primary">Required Stack</h2>
            <div className="flex flex-wrap gap-2.5">
              {requiredSkills.length > 0 ? (
                requiredSkills.map((skill) => {
                  const isMatched = studentSkills.some(
                    (s) => s.toLowerCase().trim() === skill.toLowerCase().trim()
                  );
                  return (
                    <span
                      key={skill}
                      className={`font-label-mono text-xs border px-3.5 py-1.5 flex items-center gap-1.5 ${
                        isMatched
                          ? 'border-match-indicator bg-match-indicator/5 text-primary font-semibold'
                          : 'border-border-hairline bg-surface text-text-muted'
                      }`}
                    >
                      {skill}
                      {isMatched && (
                        <span className="material-symbols-outlined text-[14px] text-match-indicator">
                          check
                        </span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs font-label-mono text-text-muted">
                  No specific stack keywords specified.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter Information Card */}
      <section className="bg-surface-container-lowest border border-border-hairline p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
            Posting Company
          </span>
          <h3 className="font-headline-md text-xl font-bold text-primary mt-1">
            {recruiterName}
          </h3>
          {recruiterEmail && (
            <p className="font-body-md text-xs text-text-muted mt-0.5">
              Contact: {recruiterEmail}
            </p>
          )}
        </div>

        <Link
          to="/student/applications"
          className="font-label-mono text-xs uppercase tracking-wider border border-border-hairline px-6 py-3 hover:border-primary transition-colors text-primary"
        >
          View All Applications
        </Link>
      </section>
    </div>
  );
}

export default OpeningDetails;
