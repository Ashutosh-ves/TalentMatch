import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { openingService } from '../../services/openingService';
import { studentService } from '../../services/studentService';

export function StudentDashboard() {
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
  const recommendations = recsData?.recommendations || [];

  const githubActive = Boolean(student?.githubUsername);
  const skillsCount = student?.skills?.length || 0;
  const profileCompletion = Math.min(
    100,
    (githubActive ? 40 : 0) + Math.min(40, skillsCount * 10) + (student?.availability ? 20 : 0)
  );

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

        {/* Empty State */}
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

        {/* Openings Cards List */}
        {!isRecsLoading && recommendations.length > 0 && (
          <div className="flex flex-col gap-6">
            {recommendations.map((opening) => {
              const recruiterName = opening.recruiterId?.name || 'Partner Company';
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
                        <Link to={`/student/openings/${opening._id}`}>{opening.title}</Link>
                      </h3>
                      <p className="font-body-md text-xs md:text-sm text-text-muted">
                        {recruiterName} • {opening.availabilityNeeds || 'Flexible'}
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
