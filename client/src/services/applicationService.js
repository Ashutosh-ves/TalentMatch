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

  /**
   * Get all applications for a specific opening (recruiter - owner)
   * @param {string} openingId
   */
  async getApplicationsByOpening(openingId) {
    const response = await api.get(`/applications/opening/${openingId}`);
    return response.data;
  },

  /**
   * Shortlist candidate application
   * @param {string} id
   */
  async shortlistApplication(id) {
    const response = await api.patch(`/applications/${id}/shortlist`);
    return response.data;
  },

  /**
   * Reject candidate application
   * @param {string} id
   */
  async rejectApplication(id) {
    const response = await api.patch(`/applications/${id}/reject`);
    return response.data;
  },

  /**
   * Accept candidate application
   * @param {string} id
   */
  async acceptApplication(id) {
    const response = await api.patch(`/applications/${id}/accept`);
    return response.data;
  },
};

export default applicationService;
