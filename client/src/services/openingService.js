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
};

export default openingService;

