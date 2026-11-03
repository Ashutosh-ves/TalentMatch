const Recruiter = require('../models/Recruiter');

/**
 * Attaches a top-level `companyName` to opening objects in a single batched Recruiter lookup.
 * Fallback to recruiter's user name if no Recruiter document or companyName is found.
 *
 * @param {Object|Array} openings - Single opening object/document or array of openings
 * @returns {Promise<Object|Array>} - Modified openings with companyName attached
 */
const attachCompanyName = async (openings) => {
  if (!openings) return openings;
  const isArray = Array.isArray(openings);
  const list = isArray ? openings : [openings];

  if (list.length === 0) return openings;

  // Extract unique recruiter user IDs
  const recruiterUserIds = [
    ...new Set(
      list
        .map((op) => {
          if (!op) return null;
          const recId = op.recruiterId?._id || op.recruiterId;
          return recId ? recId.toString() : null;
        })
        .filter(Boolean)
    ),
  ];

  if (recruiterUserIds.length === 0) {
    for (const op of list) {
      if (op && typeof op === 'object' && !op.companyName) {
        op.companyName = op.recruiterId?.name || '';
      }
    }
    return openings;
  }

  // Exactly 1 batched lookup to avoid N+1 queries
  const recruiterDocs = await Recruiter.find({ userId: { $in: recruiterUserIds } }).lean();
  const companyMap = new Map();
  for (const r of recruiterDocs) {
    if (r.companyName && typeof r.companyName === 'string' && r.companyName.trim()) {
      companyMap.set(r.userId.toString(), r.companyName.trim());
    }
  }

  for (const op of list) {
    if (!op || typeof op !== 'object') continue;
    const recId = (op.recruiterId?._id || op.recruiterId || '').toString();
    const fallbackName = op.recruiterId?.name || '';
    op.companyName = companyMap.get(recId) || fallbackName;
  }

  return openings;
};

module.exports = { attachCompanyName };

