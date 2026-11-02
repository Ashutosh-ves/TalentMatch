import api from './api';

export const messageService = {
  /**
   * Get message history for an application
   * @param {string} applicationId
   */
  async getMessageHistory(applicationId) {
    const response = await api.get(`/messages/${applicationId}`);
    return response.data;
  },

  /**
   * Send a message via REST (fallback or initial)
   * @param {string} applicationId
   * @param {string} text
   */
  async sendMessage(applicationId, text) {
    const response = await api.post('/messages', { applicationId, text });
    return response.data;
  },
};

export default messageService;

