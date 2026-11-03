/**
 * Match Service
 * Computes weighted matching score and detailed breakdown between a Student and an Opening.
 */

// Recognised programming languages and alias mapping
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

/**
 * Normalises a skill or language name to its canonical programming language if recognised.
 * @param {string} str
 * @returns {string|null}
 */
const getCanonicalLanguage = (str) => {
  if (typeof str !== 'string') return null;
  const key = str.toLowerCase().trim();
  return PROGRAMMING_LANGUAGES[key] || null;
};

/**
 * Computes weighted match score and breakdown between a student and an opening.
 * score = round(sum(weight_i * s_i) / sum(weight_i of applicable components))
 *
 * Components:
 * - skills (weight 60): % of opening.requiredSkills found in student.skills (case-insensitive, trimmed).
 *   Applicable if opening has required skills.
 * - github (weight 25): applicable only if >= 1 required skill is a recognised programming language.
 *   s = % of those language skills present in student.githubStats.topLanguages (0 if no GitHub stats).
 * - availability (weight 15): applicable if both student.availability and opening.availabilityNeeds are set.
 *   s = 100 if equal (case-insensitive), else 0.
 *
 * @param {Object} student - Student profile (skills, availability, githubStats)
 * @param {Object} opening - Opening document (requiredSkills, availabilityNeeds)
 * @returns {{ score: number, breakdown: Object }}
 */
const computeMatch = (student, opening) => {
  const studentSkills = Array.isArray(student?.skills) ? student.skills : [];
  const rawRequiredSkills = Array.isArray(opening?.requiredSkills) ? opening.requiredSkills : [];

  // 1. Skills Component (Weight: 60)
  const normalizedRequiredSkills = rawRequiredSkills
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);

  const skillsApplicable = normalizedRequiredSkills.length > 0;
  const studentSkillSet = new Set(
    studentSkills
      .map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
      .filter(Boolean)
  );

  const matchedSkills = [];
  const missingSkills = [];

  for (const reqSkill of normalizedRequiredSkills) {
    if (studentSkillSet.has(reqSkill.toLowerCase())) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  const skillsScore = skillsApplicable
    ? Math.round((matchedSkills.length / normalizedRequiredSkills.length) * 100)
    : 100;

  const skillsBreakdown = {
    score: skillsScore,
    weight: 60,
    matched: matchedSkills,
    missing: missingSkills,
    applicable: skillsApplicable,
  };

  // 2. GitHub Component (Weight: 25)
  // Applicable only if at least one required skill is a recognised programming language
  const requiredLanguages = [];
  for (const skill of normalizedRequiredSkills) {
    const canonical = getCanonicalLanguage(skill);
    if (canonical && !requiredLanguages.includes(canonical)) {
      requiredLanguages.push(canonical);
    }
  }

  const githubApplicable = requiredLanguages.length > 0;

  const studentTopLanguages = Array.isArray(student?.githubStats?.topLanguages)
    ? student.githubStats.topLanguages
    : [];

  const studentLangSet = new Set();
  for (const lang of studentTopLanguages) {
    const canonical = getCanonicalLanguage(lang) || (typeof lang === 'string' ? lang.trim() : null);
    if (canonical) {
      studentLangSet.add(canonical.toLowerCase());
    }
  }

  const matchedLanguages = githubApplicable
    ? requiredLanguages.filter((lang) => studentLangSet.has(lang.toLowerCase()))
    : [];

  const githubScore = githubApplicable
    ? (studentTopLanguages.length > 0
        ? Math.round((matchedLanguages.length / requiredLanguages.length) * 100)
        : 0)
    : 0;

  const githubBreakdown = {
    score: githubScore,
    weight: 25,
    matched: matchedLanguages,
    applicable: githubApplicable,
  };

  // 3. Availability Component (Weight: 15)
  // Applicable if both student.availability and opening.availabilityNeeds are set
  const studentAvailability = typeof student?.availability === 'string' ? student.availability.trim() : '';
  const openingAvailability = typeof opening?.availabilityNeeds === 'string' ? opening.availabilityNeeds.trim() : '';
  const availabilityApplicable = Boolean(studentAvailability && openingAvailability);

  const availabilityScore = availabilityApplicable
    ? (studentAvailability.toLowerCase() === openingAvailability.toLowerCase() ? 100 : 0)
    : 0;

  const availabilityBreakdown = {
    score: availabilityScore,
    weight: 15,
    studentValue: studentAvailability,
    openingValue: openingAvailability,
    applicable: availabilityApplicable,
  };

  // Calculate Weighted Composite Score
  let applicableWeightsSum = 0;
  let weightedScoresSum = 0;

  if (skillsApplicable) {
    applicableWeightsSum += 60;
    weightedScoresSum += 60 * skillsScore;
  }
  if (githubApplicable) {
    applicableWeightsSum += 25;
    weightedScoresSum += 25 * githubScore;
  }
  if (availabilityApplicable) {
    applicableWeightsSum += 15;
    weightedScoresSum += 15 * availabilityScore;
  }

  const finalScore = applicableWeightsSum > 0
    ? Math.round(weightedScoresSum / applicableWeightsSum)
    : 100;

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    breakdown: {
      skills: skillsBreakdown,
      github: githubBreakdown,
      availability: availabilityBreakdown,
    },
  };
};

/**
 * Ranks applications by matchScore descending.
 * @param {Array} applications
 * @returns {Array} Sorted applications
 */
const rankCandidates = (applications = []) => {
  return [...applications].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
};

/**
 * Calculates match scores and breakdowns for openings against a student profile, returning them ranked.
 * @param {Object|Array} studentOrSkills - Student profile object (or skills array for backward compatibility)
 * @param {Array} openings - Array of opening documents/objects
 * @returns {Array} Openings with matchScore and matchBreakdown attached, sorted descending
 */
const recommendOpeningsForStudent = (studentOrSkills, openings = []) => {
  const student = Array.isArray(studentOrSkills)
    ? { skills: studentOrSkills }
    : (studentOrSkills || {});

  const scoredOpenings = openings.map((opening) => {
    const openingObj = opening.toObject ? opening.toObject() : { ...opening };
    const { score, breakdown } = computeMatch(student, openingObj);
    return {
      ...openingObj,
      matchScore: score,
      matchBreakdown: breakdown,
    };
  });

  return scoredOpenings.sort((a, b) => b.matchScore - a.matchScore);
};

module.exports = {
  computeMatch,
  rankCandidates,
  recommendOpeningsForStudent,
};
