import api from './api';

export const applicationService = {
  /**
   * Apply to an opening
   * @param {string} openingId
   */
  async applyToOpening(openingId) {
    const response = await api.post('/applications', { openingId });
    return response.data;
  },

  /**
   * Get all applications submitted by the logged-in student
   */
  async getMyApplications() {
    const response = await api.get('/applications/my');
    return response.data;
  },

  /**
   * Get a single application by ID
   * @param {string} id
   */
  async getApplicationById(id) {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },
};

export default applicationService;

