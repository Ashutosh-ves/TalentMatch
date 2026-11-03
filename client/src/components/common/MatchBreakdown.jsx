// Canonical languages mapping matching server/services/matchService.js
const PROGRAMMING_LANGUAGES = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  node: 'JavaScript',
  nodejs: 'JavaScript',
  'node.js': 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  python3: 'Python',
  java: 'Java',
  c: 'C',
  'c++': 'C++',
  cpp: 'C++',
  'c#': 'C#',
  csharp: 'C#',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  dart: 'Dart',
  html: 'HTML',
  html5: 'HTML',
  css: 'CSS',
  css3: 'CSS',
  shell: 'Shell',
  bash: 'Shell',
  sh: 'Shell',
  sql: 'SQL',
};

const getCanonicalLanguage = (str) => {
  if (typeof str !== 'string') return null;
  const key = str.toLowerCase().trim();
  return PROGRAMMING_LANGUAGES[key] || null;
};

/**
 * Reusable 3-row Match Breakdown component matching server matchBreakdown contract:
 * 1. Skills (60%)
 * 2. GitHub languages (25%)
 * 3. Availability (15%)
 */
export function MatchBreakdown({
  breakdown,
  requiredSkills = [],
  openingAvailability = '',
  className = '',
}) {
  const skillsData = breakdown?.skills || null;
  const githubData = breakdown?.github || null;
  const availabilityData = breakdown?.availability || null;

  // 1. Skills Component (60%)
  const isSkillsApplicable = skillsData ? skillsData.applicable !== false : true;
  const skillsScore = typeof skillsData?.score === 'number' ? skillsData.score : null;
  const matchedSkills = Array.isArray(skillsData?.matched) ? skillsData.matched : [];
  const missingSkills = Array.isArray(skillsData?.missing) ? skillsData.missing : [];

  // 2. GitHub Languages Component (25%)
  const isGithubApplicable = githubData ? githubData.applicable !== false : false;
  const githubScore = typeof githubData?.score === 'number' ? githubData.score : null;
  const matchedLanguages = Array.isArray(githubData?.matched) ? githubData.matched : [];

  // Derive missing languages if not explicitly passed
  let missingLanguages = [];
  if (isGithubApplicable) {
    if (Array.isArray(githubData?.missing)) {
      missingLanguages = githubData.missing;
    } else {
      const requiredLangs = [];
      (requiredSkills || []).forEach((s) => {
        const canonical = getCanonicalLanguage(s);
        if (canonical && !requiredLangs.includes(canonical)) {
          requiredLangs.push(canonical);
        }
      });
      const matchedSet = new Set(matchedLanguages.map((l) => l.toLowerCase()));
      missingLanguages = requiredLangs.filter((l) => !matchedSet.has(l.toLowerCase()));
    }
  }

  // 3. Availability Component (15%)
  const isAvailabilityApplicable = availabilityData ? availabilityData.applicable !== false : false;
  const availabilityScore = typeof availabilityData?.score === 'number' ? availabilityData.score : null;
  const studentAvailability = availabilityData?.studentValue || '';
  const openingAvailabilityVal = availabilityData?.openingValue || openingAvailability || '';
  const isAvailabilityMatched = availabilityScore === 100;

  const rows = [
    {
      id: 'skills',
      title: 'Skills (60%)',
      applicable: isSkillsApplicable,
      score: skillsScore,
      matched: matchedSkills,
      missing: missingSkills,
      emptyMessage: 'No specific skills required.',
    },
    {
      id: 'github',
      title: 'GitHub languages (25%)',
      applicable: isGithubApplicable,
      score: githubScore,
      matched: matchedLanguages,
      missing: missingLanguages,
      emptyMessage: 'No verified languages matched.',
    },
    {
      id: 'availability',
      title: 'Availability (15%)',
      applicable: isAvailabilityApplicable,
      score: availabilityScore,
      isAvailability: true,
      studentValue: studentAvailability,
      openingValue: openingAvailabilityVal,
      isMatched: isAvailabilityMatched,
    },
  ];

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-col gap-2.5 pb-5 border-b border-border-hairline last:border-b-0 last:pb-0"
        >
          {/* Row Header: Title & Score / Not applicable */}
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-label-mono text-xs uppercase tracking-wider text-primary font-bold">
              {row.title}
            </span>
            <div>
              {row.applicable ? (
                <span className="font-label-mono text-xs font-bold text-match-indicator">
                  {row.score ?? 0}%
                </span>
              ) : (
                <span className="font-label-mono text-xs text-text-muted italic bg-surface-container px-2 py-0.5 border border-border-hairline">
                  Not applicable
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar (when applicable and score is a number) */}
          {row.applicable && typeof row.score === 'number' && (
            <div className="w-full h-1.5 bg-surface-container overflow-hidden">
              <div
                className="h-full bg-match-indicator transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, row.score))}%` }}
              />
            </div>
          )}

          {/* Chips Display */}
          {row.applicable ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {row.isAvailability ? (
                /* Availability Chips */
                row.isMatched ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-match-indicator border border-match-indicator/30 font-label-mono text-[11px] font-semibold">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    {row.studentValue ? `Aligned: ${row.studentValue}` : 'Aligned'}
                  </span>
                ) : (
                  <>
                    {row.studentValue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container text-text-muted border border-border-hairline font-label-mono text-[11px]">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        Student: {row.studentValue}
                      </span>
                    )}
                    {row.openingValue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 font-label-mono text-[11px]">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        Required: {row.openingValue}
                      </span>
                    )}
                  </>
                )
              ) : (
                /* Skills & GitHub Chips */
                <>
                  {row.matched.map((item) => (
                    <span
                      key={`matched-${item}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-match-indicator border border-match-indicator/30 font-label-mono text-[11px] font-semibold"
                    >
                      <span className="material-symbols-outlined text-[13px]">check</span>
                      {item}
                    </span>
                  ))}
                  {row.missing.map((item) => (
                    <span
                      key={`missing-${item}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container text-text-muted border border-border-hairline font-label-mono text-[11px]"
                    >
                      <span className="material-symbols-outlined text-[13px] text-text-muted">close</span>
                      {item}
                    </span>
                  ))}
                  {row.matched.length === 0 && row.missing.length === 0 && (
                    <span className="font-label-mono text-xs text-text-muted">
                      {row.emptyMessage}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-xs font-label-mono text-text-muted">
              Not applicable for this opening.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MatchBreakdown;
