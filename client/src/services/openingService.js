import api from './api';

export const openingService = {
  /**
   * Fetch recommended openings for the logged-in student ranked by matchScore
   */
  async getRecommendations() {
    const response = await api.get('/openings/recommendations');
    return response.data;
  },

  /**
   * Get single opening details by ID
   * @param {string} id
   */
  async getOpeningById(id) {
    const response = await api.get(`/openings/${id}`);
    return response.data;
  },

  /**
   * Get all active openings
   */
  async getAllOpenings() {
    const response = await api.get('/openings');
    return response.data;
  },

  /**
   * Get openings created by the logged-in recruiter
   */
  async getMyOpenings() {
    const response = await api.get('/openings/my');
    return response.data;
  },

  /**
   * Create a new job opening (recruiter)
   * @param {{ title: string, description?: string, requiredSkills?: string[], availabilityNeeds?: string, status?: 'draft' | 'active' | 'closed' }} data
   */
  async createOpening(data) {
    const response = await api.post('/openings', data);
    return response.data;
  },

  /**
   * Update a job opening
   * @param {string} id
   * @param {{ title?: string, description?: string, requiredSkills?: string[], availabilityNeeds?: string, status?: 'draft' | 'active' | 'closed' }} data
   */
  async updateOpening(id, data) {
    const response = await api.put(`/openings/${id}`, data);
    return response.data;
  },

  /**
   * Delete a job opening
   * @param {string} id
   */
  async deleteOpening(id) {
    const response = await api.delete(`/openings/${id}`);
    return response.data;
  },

  /**
   * Get candidates for an opening ranked by matchScore
   * @param {string} id
   */
  async getOpeningRankedCandidates(id) {
    const response = await api.get(`/openings/${id}/candidates`);
    return response.data;
  },
};

export default openingService;
