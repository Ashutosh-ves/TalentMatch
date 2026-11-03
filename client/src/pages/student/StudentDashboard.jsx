import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { openingService } from '../../services/openingService';
import { studentService } from '../../services/studentService';
import { useDebounce } from '../../hooks/useDebounce';

export function StudentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedSkills, setSelectedSkills] = useState([]);

  const {
    data: recsData,
    isLoading: isRecsLoading,
    error: recsError,
  } = useQuery({
    queryKey: ['recommendedOpenings'],
    queryFn: openingService.getRecommendations,
  });

  const { data: profileData } = useQuery({
    queryKey: ['myStudentProfile'],
    queryFn: studentService.getMyProfile,
  });

  const student = profileData?.student;
  const recommendations = useMemo(() => recsData?.recommendations || [], [recsData?.recommendations]);

  const githubActive = Boolean(student?.githubUsername);
  const skillsCount = student?.skills?.length || 0;
  const profileCompletion = Math.min(
    100,
    (githubActive ? 40 : 0) + Math.min(40, skillsCount * 10) + (student?.availability ? 20 : 0)
  );

  // Extract unique required skills from all recommendation openings
  const availableSkills = useMemo(() => {
    const set = new Set();
    recommendations.forEach((op) => {
      op.requiredSkills?.forEach((sk) => {
        if (sk && sk.trim()) set.add(sk.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recommendations]);

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
  };

  // Filter recommendations by debounced search and active skill filters
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((opening) => {
      if (debouncedSearchQuery.trim()) {
        const term = debouncedSearchQuery.toLowerCase();
        const titleMatch = (opening.title || '').toLowerCase().includes(term);
        const companyMatch = (opening.companyName || opening.recruiterId?.name || '').toLowerCase().includes(term);
        const descMatch = (opening.description || '').toLowerCase().includes(term);
        if (!titleMatch && !companyMatch && !descMatch) {
          return false;
        }
      }

      if (selectedSkills.length > 0) {
        const opSkills = (opening.requiredSkills || []).map((s) => s.toLowerCase().trim());
        const hasAllSelected = selectedSkills.every((s) =>
          opSkills.includes(s.toLowerCase().trim())
        );
        if (!hasAllSelected) return false;
      }

      return true;
    });
  }, [recommendations, debouncedSearchQuery, selectedSkills]);

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedSkills.length > 0);

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-6">
      {/* Sidebar: Profile Status & Strength */}
      <aside className="w-full lg:w-1/4 flex flex-col gap-8">
        <div className="bg-surface-container-lowest border border-border-hairline p-8 flex flex-col gap-6">
          <h2 className="font-headline-md text-xl font-bold text-primary">Profile Status</h2>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-label-mono">
              <span className="text-on-surface-variant">Integration</span>
              <span className="text-primary flex items-center gap-1 font-semibold">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    githubActive ? 'text-match-indicator' : 'text-text-muted'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {githubActive ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {githubActive ? 'GitHub Active' : 'Not Connected'}
              </span>
            </div>

            <div className="w-full bg-surface-container h-1.5 mt-2">
              <div
                className="bg-primary h-1.5 transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] font-label-mono text-text-muted mt-1">
              <span>Strength</span>
              <span>{profileCompletion}%</span>
            </div>
          </div>

          <div className="border-t border-border-hairline pt-6">
            <p className="font-body-md text-xs text-text-muted mb-4 leading-relaxed">
              {githubActive
                ? `Synced ${student.githubStats?.repoCount || 0} repositories and ${
                    student.githubStats?.contributions || 0
                  } contributions.`
                : 'Connect your GitHub and specify skills to improve match precision.'}
            </p>
            <Link
              to="/student/profile"
              className="w-full block text-center border border-border-hairline text-primary font-label-mono text-xs py-3 hover:border-primary hover:bg-black hover:text-white transition-all uppercase tracking-wider font-semibold"
            >
              Update Profile & Skills
            </Link>
          </div>
        </div>

        {/* Minimalist Editorial Accent Box */}
        <div className="bg-surface-container-lowest border border-border-hairline p-8 flex flex-col justify-between min-h-[160px]">
          <span className="font-label-mono text-[11px] text-text-muted uppercase tracking-widest">
            Discovery Engine
          </span>
          <div>
            <div className="font-display-xl text-3xl font-bold tracking-tight text-primary">
              100%
            </div>
            <p className="font-body-md text-xs text-text-muted mt-1">
              Direct skill matching based on repository commits and stack keywords.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Canvas: Recommended Openings */}
      <section className="w-full lg:w-3/4 flex flex-col gap-6">
        <div>
          <h1 className="font-display-xl text-2xl md:text-4xl font-extrabold text-primary tracking-tighter">
            Recommended Openings
          </h1>
          <p className="font-body-md text-sm text-text-muted mt-1">
            Roles automatically ranked by skill alignment with your profile.
          </p>
        </div>

        {/* Search & Skill Filter Bar */}
        <div className="bg-surface-container-lowest border border-border-hairline p-5 flex flex-col gap-4">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-0 text-text-muted text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search openings by role, company, or tech stack..."
              className="w-full bg-transparent border-0 border-b-2 border-border-hairline py-2.5 pl-7 pr-8 font-label-mono text-xs text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors rounded-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 text-text-muted hover:text-primary text-base font-bold cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {availableSkills.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-mono text-[11px] text-text-muted uppercase tracking-wider">
                  Filter by Required Skill
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-label-mono text-[11px] text-primary hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`font-label-mono text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary font-bold'
                          : 'bg-surface-container-low border-border-hairline text-primary hover:border-primary'
                      }`}
                    >
                      {isSelected ? `✓ ${skill}` : skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isRecsLoading && (
          <div className="flex flex-col gap-4 py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest border border-border-hairline p-8 animate-pulse"
              >
                <div className="h-6 bg-surface-container w-1/3 mb-4"></div>
                <div className="h-4 bg-surface-container w-1/4 mb-6"></div>
                <div className="h-10 bg-surface-container w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {recsError && (
          <div className="p-6 bg-error-container text-on-error-container border-l-4 border-error">
            <p className="font-bold font-label-sm text-sm">Failed to load recommendations</p>
            <p className="text-xs font-body-md mt-1">{recsError.message}</p>
          </div>
        )}

        {/* Empty State (No openings from backend) */}
        {!isRecsLoading && !recsError && recommendations.length === 0 && (
          <div className="bg-surface-container-lowest border border-dashed border-border-hairline p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
              work_outline
            </span>
            <h3 className="font-headline-md text-lg font-bold text-primary mb-2">
              No Openings Found
            </h3>
            <p className="font-body-md text-xs text-text-muted max-w-md mx-auto mb-6">
              There are currently no active job openings matching your profile. Make sure to populate
              your skills or check back soon!
            </p>
            <Link
              to="/student/profile"
              className="inline-block px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors"
            >
              Configure Skills
            </Link>
          </div>
        )}

        {/* Empty Filter State (Filtered out by search or skill) */}
        {!isRecsLoading &&
          !recsError &&
          recommendations.length > 0 &&
          filteredRecommendations.length === 0 && (
            <div className="bg-surface-container-lowest border border-dashed border-border-hairline p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
                filter_alt_off
              </span>
              <h3 className="font-headline-md text-lg font-bold text-primary mb-2">
                No Matching Openings
              </h3>
              <p className="font-body-md text-xs text-text-muted max-w-md mx-auto mb-6">
                No recommended openings matched your current search and skill filter combination.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-block px-6 py-3 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-wider hover:bg-match-indicator transition-colors cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          )}

        {/* Openings Cards List */}
        {!isRecsLoading && filteredRecommendations.length > 0 && (
          <div className="flex flex-col gap-6">
            {filteredRecommendations.map((opening) => {
              const companyDisplayName = opening.companyName || opening.recruiterId?.name || 'Company';
              const matchScore = typeof opening.matchScore === 'number' ? opening.matchScore : 0;
              const isHighMatch = matchScore >= 70;

              return (
                <article
                  key={opening._id}
                  className="bg-surface-container-lowest border border-border-hairline p-6 md:p-8 flex flex-col gap-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-headline-md text-xl md:text-2xl font-bold text-primary mb-1 group-hover:text-match-indicator transition-colors">
                        <Link
                          to={`/student/openings/${opening._id}`}
                          state={{
                            matchScore,
                            matchBreakdown: opening.matchBreakdown,
                            companyName: opening.companyName,
                          }}
                        >
                          {opening.title}
                        </Link>
                      </h3>
                      <p className="font-body-md text-xs md:text-sm text-text-muted">
                        {companyDisplayName} • {opening.availabilityNeeds || 'Flexible'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-display-xl text-3xl md:text-4xl font-extrabold tracking-tighter leading-none block ${
                          isHighMatch ? 'text-match-indicator' : 'text-primary'
                        }`}
                      >
                        {matchScore}%
                      </span>
                      <span className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider">
                        Match Score
                      </span>
                    </div>
                  </div>

                  {opening.description && (
                    <p className="font-body-md text-xs md:text-sm text-text-muted line-clamp-2 leading-relaxed">
                      {opening.description}
                    </p>
                  )}

                  <div className="border-t border-border-hairline pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap gap-2 items-center font-label-mono text-xs text-primary">
                      {opening.requiredSkills && opening.requiredSkills.length > 0 ? (
                        opening.requiredSkills.map((skill, idx) => (
                          <span key={skill} className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-surface-container-low border border-border-hairline">
                              {skill}
                            </span>
                            {idx < opening.requiredSkills.length - 1 && (
                              <span className="text-border-hairline hidden sm:inline">•</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-muted">General Requirements</span>
                      )}
                    </div>

                    <Link
                      to={`/student/openings/${opening._id}`}
                      state={{
                        matchScore,
                        matchBreakdown: opening.matchBreakdown,
                        companyName: opening.companyName,
                      }}
                      className="shrink-0 px-6 py-3 border border-border-hairline text-primary hover:border-primary hover:bg-black hover:text-white transition-all font-label-mono text-xs uppercase tracking-wider font-semibold"
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentDashboard;
