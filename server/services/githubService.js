const Student = require('../models/Student');

/**
 * Constructs request headers for GitHub API, injecting GITHUB_TOKEN if available.
 */
const getHeaders = () => {
  const headers = {
    'User-Agent': 'TalentMatch-Backend',
    Accept: 'application/vnd.github.v3+json',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim() && token !== 'your_github_token_here') {
    headers.Authorization = `token ${token.trim()}`;
  }

  return headers;
};

/**
 * Fetches public GitHub user metrics: repo count, top languages, and estimated contributions.
 * @param {string} username - GitHub username
 * @returns {Promise<{contributions: number, topLanguages: string[], repoCount: number}>}
 */
const fetchGithubUserData = async (username) => {
  if (!username || typeof username !== 'string') {
    throw new Error('Valid GitHub username is required');
  }

  const cleanUsername = username.trim();
  const headers = getHeaders();

  // 1. Fetch user profile for repo count
  const userRes = await fetch(`https://api.github.com/users/${cleanUsername}`, { headers });
  if (userRes.status === 404) {
    throw new Error(`GitHub user "${cleanUsername}" not found`);
  }
  if (!userRes.ok) {
    throw new Error(`GitHub API user request failed with status ${userRes.status}`);
  }
  const userData = await userRes.json();
  const repoCount = userData.public_repos || 0;

  // 2. Fetch public repos to compute top languages
  let topLanguages = [];
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${cleanUsername}/repos?per_page=100&sort=pushed`,
      { headers }
    );
    if (reposRes.ok) {
      const repos = await reposRes.json();
      if (Array.isArray(repos)) {
        const langFrequency = {};
        for (const repo of repos) {
          if (repo.language) {
            langFrequency[repo.language] = (langFrequency[repo.language] || 0) + 1;
          }
        }
        topLanguages = Object.entries(langFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([lang]) => lang);
      }
    }
  } catch (err) {
    console.error('Error fetching GitHub repos for languages:', err.message);
  }

  // 3. Fetch public events to compute contribution activity
  let contributions = 0;
  try {
    const eventsRes = await fetch(
      `https://api.github.com/users/${cleanUsername}/events?per_page=100`,
      { headers }
    );
    if (eventsRes.ok) {
      const events = await eventsRes.json();
      if (Array.isArray(events)) {
        for (const event of events) {
          if (event.type === 'PushEvent') {
            const commitCount = event.payload?.commits?.length || 1;
            contributions += commitCount;
          } else if (
            ['PullRequestEvent', 'IssuesEvent', 'CreateEvent', 'PullRequestReviewEvent'].includes(
              event.type
            )
          ) {
            contributions += 1;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching GitHub events for contributions:', err.message);
  }

  return {
    contributions,
    topLanguages,
    repoCount,
  };
};

/**
 * Fetches GitHub stats for a user and caches them onto their Student document.
 * @param {string|mongoose.Types.ObjectId} userId - User or Student ID
 * @param {string} [username] - Optional GitHub username to set or override
 * @returns {Promise<Object>} Updated student document
 */
const syncStudentGithubData = async (userId, username) => {
  let student = await Student.findOne({ userId });
  if (!student) {
    student = await Student.findById(userId);
  }
  if (!student) {
    throw new Error('Student profile not found');
  }

  const targetUsername = username || student.githubUsername;
  if (!targetUsername) {
    throw new Error('No GitHub username associated with this student profile');
  }

  const stats = await fetchGithubUserData(targetUsername);

  student.githubUsername = targetUsername.trim();
  student.githubStats = stats;
  await student.save();

  return student;
};

module.exports = {
  fetchGithubUserData,
  syncStudentGithubData,
};

