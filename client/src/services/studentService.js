import api from './api';

export const studentService = {
  /**
   * Fetch current authenticated student profile
   */
  async getMyProfile() {
    const response = await api.get('/students/me');
    return response.data;
  },

  /**
   * Update student profile fields
   * @param {{ skills?: string[], interests?: string[], availability?: string, githubUsername?: string, linkedinUrl?: string, portfolioUrl?: string }} data
   */
  async updateProfile(data) {
    const response = await api.put('/students/me', data);
    return response.data;
  },

  /**
   * Sync GitHub stats from GitHub API
   * @param {string} [githubUsername]
   */
  async syncGithub(githubUsername) {
    const response = await api.post('/students/sync-github', { githubUsername });
    return response.data;
  },

  /**
   * Get student profile by ID
   * @param {string} id
   */
  async getStudentById(id) {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },
};

export default studentService;

