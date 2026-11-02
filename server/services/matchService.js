/**
 * Match Service
 * Compares student skills against opening requiredSkills using weighted overlap.
 */

/**
 * Calculates a match score (0 - 100) based on skill overlap.
 * @param {string[]} studentSkills - Array of skills from student profile
 * @param {string[]} requiredSkills - Array of required skills from job opening
 * @returns {number} Score from 0 to 100
 */
const calculateMatchScore = (studentSkills = [], requiredSkills = []) => {
  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    return 100; // No requirements specified, full match
  }

  if (!Array.isArray(studentSkills) || studentSkills.length === 0) {
    return 0; // Requirements exist but student has no skills
  }

  const normalizedRequired = requiredSkills
    .map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
    .filter(Boolean);

  if (normalizedRequired.length === 0) {
    return 100;
  }

  const studentSkillSet = new Set(
    studentSkills
      .map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
      .filter(Boolean)
  );

  let matchCount = 0;
  for (const requiredSkill of normalizedRequired) {
    if (studentSkillSet.has(requiredSkill)) {
      matchCount++;
    }
  }

  const score = Math.round((matchCount / normalizedRequired.length) * 100);
  return Math.max(0, Math.min(100, score));
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
 * Calculates match scores for openings against student skills and returns them ranked.
 * @param {string[]} studentSkills
 * @param {Array} openings
 * @returns {Array} Openings with matchScore property attached, sorted descending
 */
const recommendOpeningsForStudent = (studentSkills = [], openings = []) => {
  const scoredOpenings = openings.map((opening) => {
    const openingObj = opening.toObject ? opening.toObject() : { ...opening };
    const matchScore = calculateMatchScore(studentSkills, opening.requiredSkills);
    return {
      ...openingObj,
      matchScore,
    };
  });

  return scoredOpenings.sort((a, b) => b.matchScore - a.matchScore);
};

module.exports = {
  calculateMatchScore,
  rankCandidates,
  recommendOpeningsForStudent,
};

