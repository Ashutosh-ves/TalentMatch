import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openingService } from '../../services/openingService';
import { applicationService } from '../../services/applicationService';

export function OpeningCandidates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Fetch opening info
  const { data: openingData } = useQuery({
    queryKey: ['opening', id],
    queryFn: () => openingService.getOpeningById(id),
    enabled: Boolean(id),
  });

  // Fetch ranked candidates
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['openingRankedCandidates', id],
    queryFn: () => openingService.getOpeningRankedCandidates(id),
    enabled: Boolean(id),
  });

  const opening = openingData?.opening;
  const rawCandidates = candidatesData?.candidates || [];

  // Shortlist Mutation
  const shortlistMutation = useMutation({
    mutationFn: (appId) => applicationService.shortlistApplication(appId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['openingRankedCandidates', id] });
      setFeedback({
        type: 'success',
        message: res.message || 'Candidate application shortlisted.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to shortlist candidate.',
      });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (appId) => applicationService.rejectApplication(appId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['openingRankedCandidates', id] });
      setFeedback({
        type: 'success',
        message: res.message || 'Candidate application rejected.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reject candidate.',
      });
    },
  });

  // Skill filter toggle
  const toggleSkillFilter = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Filter candidates by search and selected skills
  const filteredCandidates = rawCandidates.filter((cand) => {
    const studentName = cand.studentId?.name || '';
    const studentEmail = cand.studentId?.email || '';
    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

    // Match selected skills if any are toggled
    const studentSkills = cand.studentSkills || [];
    const matchesSkills =
      selectedSkills.length === 0 ||
      selectedSkills.every((s) =>
        studentSkills.some((sk) => sk.toLowerCase().trim() === s.toLowerCase().trim())
      );

    return matchesSearch && matchesSkills;
  });

  // Average Match Score
  const avgMatch =
    rawCandidates.length > 0
      ? Math.round(
          rawCandidates.reduce((acc, c) => acc + (c.matchScore || 0), 0) / rawCandidates.length
        )
      : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 border border-match-indicator text-match-indicator text-[11px] font-label-mono bg-match-indicator/10 uppercase font-bold">
            ACCEPTED
          </span>
        );
      case 'shortlisted':
        return (
          <span className="px-2.5 py-0.5 border border-secondary text-secondary text-[11px] font-label-mono bg-secondary/10 uppercase font-bold">
            SHORTLISTED
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 border border-border-hairline text-text-muted text-[11px] font-label-mono bg-surface-container uppercase">
            REJECTED
          </span>
        );
      case 'applied':
      default:
        return (
          <span className="px-2.5 py-0.5 border border-border-hairline text-text-muted text-[11px] font-label-mono bg-surface uppercase">
            APPLIED
          </span>
        );
    }
  };

  return (
    <div className="py-6 max-w-[1440px] mx-auto flex flex-col gap-8">
      {/* Feedback Alert */}
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

      {/* Header Section matching stitch_talent_match_opening_candidates */}
      <header className="border-b border-border-hairline pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 text-text-muted font-label-mono text-xs">
              <Link to="/recruiter/dashboard" className="hover:text-primary transition-colors">
                Postings
              </Link>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-bold">REQ-{id ? id.slice(-6).toUpperCase() : '000'}</span>
            </div>
            <h1 className="font-display-xl text-2xl md:text-4xl font-extrabold text-primary tracking-tight mb-2">
              Candidates: {opening?.title || 'Engineering Role'}
            </h1>
            <p className="font-body-md text-sm text-text-muted">
              Ranked by Match Score against requirements.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-label-mono text-xs text-text-muted uppercase mb-0.5">
                Total Candidates
              </p>
              <p className="font-headline-md text-2xl font-bold text-primary">
                {rawCandidates.length}
              </p>
            </div>
            <div className="h-10 w-px bg-border-hairline hidden md:block"></div>
            <div className="text-right">
              <p className="font-label-mono text-xs text-text-muted uppercase mb-0.5">Avg. Match</p>
              <p className="font-headline-md text-2xl font-bold text-match-indicator">
                {avgMatch}%
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Bar with Search and Skills */}
      <section className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between pb-2">
        <div className="flex-1 w-full relative">
          <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-text-muted text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name or email..."
            className="w-full bg-transparent border-0 border-b-2 border-border-hairline py-3 pl-8 pr-4 font-label-mono text-xs text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors rounded-none"
          />
        </div>

        {/* Skill filters */}
        {opening?.requiredSkills && opening.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider mr-1">
              Filter:
            </span>
            {opening.requiredSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  type="button"
                  key={skill}
                  onClick={() => toggleSkillFilter(skill)}
                  className={`px-3 py-1 font-label-mono text-xs transition-colors flex items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'border-primary bg-primary text-on-primary font-bold'
                      : 'border-border-hairline text-text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {skill}
                  {isSelected && <span className="material-symbols-outlined text-[13px]">close</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-border-hairline p-8 animate-pulse"
            >
              <div className="h-6 bg-surface-container w-1/4 mb-4"></div>
              <div className="h-4 bg-surface-container w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error">
          <p className="font-bold font-label-sm text-sm">Failed to load candidates</p>
          <p className="text-xs font-body-md mt-1">{error.message}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCandidates.length === 0 && (
        <div className="bg-surface-container-lowest border border-dashed border-border-hairline p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
            group_off
          </span>
          <h3 className="font-headline-md text-lg font-bold text-primary mb-2">
            No Candidates Found
          </h3>
          <p className="font-body-md text-xs text-text-muted max-w-md mx-auto">
            {rawCandidates.length === 0
              ? 'No students have applied to this opening yet. As students discover this role, they will appear ranked by match score.'
              : 'No candidates matched your search and skill filters.'}
          </p>
        </div>
      )}

      {/* Ranked Candidate List matching stitch_talent_match_opening_candidates */}
      {!isLoading && filteredCandidates.length > 0 && (
        <section className="space-y-4">
          {filteredCandidates.map((candidate) => {
            const student = candidate.studentId || {};
            const studentId = student._id || candidate._id;
            const matchScore = typeof candidate.matchScore === 'number' ? candidate.matchScore : 0;
            const isHighMatch = matchScore >= 70;

            return (
              <article
                key={candidate._id}
                className="bg-surface-container-lowest border border-border-hairline p-6 md:p-8 hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all group"
              >
                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                  {/* Score Column */}
                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 md:w-36 shrink-0">
                    <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center font-display-xl font-bold text-lg uppercase">
                      {(student.name || 'S')[0]}
                    </div>
                    <div className="text-center">
                      <p
                        className={`font-display-xl text-3xl md:text-4xl font-extrabold leading-none tracking-tighter ${
                          isHighMatch ? 'text-match-indicator' : 'text-primary'
                        }`}
                      >
                        {matchScore}%
                      </p>
                      <p className="font-label-mono text-[10px] text-text-muted uppercase mt-0.5">
                        Match
                      </p>
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 border-l-0 md:border-l border-border-hairline pt-4 md:pt-0 md:pl-8">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div>
                        <h2 className="font-headline-md text-lg md:text-xl font-bold text-primary hover:text-match-indicator transition-colors">
                          <Link
                            to={`/recruiter/candidates/${studentId}?openingId=${id}`}
                            state={{ matchScore, openingId: id }}
                          >
                            {student.name || 'Student Candidate'}
                          </Link>
                        </h2>
                        <p className="font-body-md text-xs text-text-muted">
                          {student.email} • Applied {formatDate(candidate.appliedAt)}
                        </p>
                      </div>

                      <div>{getStatusBadge(candidate.status)}</div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 font-label-mono text-xs text-primary mt-4">
                      {opening?.requiredSkills?.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-surface-container-low border border-border-hairline">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="flex flex-row md:flex-col gap-2.5 shrink-0 md:w-36 md:pl-6 border-t md:border-t-0 border-border-hairline pt-4 md:pt-0">
                    <button
                      type="button"
                      onClick={() => shortlistMutation.mutate(candidate._id)}
                      disabled={candidate.status === 'shortlisted' || shortlistMutation.isPending}
                      className="flex-1 md:w-full bg-primary text-on-primary font-label-mono text-xs py-3 px-4 hover:bg-match-indicator disabled:opacity-50 transition-colors uppercase font-bold cursor-pointer"
                    >
                      {candidate.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectMutation.mutate(candidate._id)}
                      disabled={candidate.status === 'rejected' || rejectMutation.isPending}
                      className="flex-1 md:w-full border border-border-hairline text-primary font-label-mono text-xs py-3 px-4 hover:border-error hover:text-error disabled:opacity-50 transition-colors uppercase cursor-pointer"
                    >
                      {candidate.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/recruiter/candidates/${studentId}?openingId=${id}`, {
                          state: { matchScore, openingId: id },
                        })
                      }
                      className="flex-1 md:w-full border border-border-hairline text-text-muted hover:text-primary font-label-mono text-xs py-2 px-4 transition-colors uppercase text-center"
                    >
                      Profile →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default OpeningCandidates;
