import api from './api';

export const notificationService = {
  /**
   * Fetch latest notifications and unread count for logged-in user
   */
  async getNotifications() {
    const response = await api.get('/notifications');
    return response.data;
  },

  /**
   * Mark a single notification as read
   * @param {string} id
   */
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

export default notificationService;
