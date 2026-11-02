import api from './api';

export const adminService = {
  /**
   * Get all recruiters with status === 'pending'
   */
  async getPendingRecruiters() {
    const response = await api.get('/admin/recruiters/pending');
    return response.data;
  },

  /**
   * Approve a pending recruiter
   * @param {string} id - Recruiter User _id or profile _id
   */
  async approveRecruiter(id) {
    const response = await api.patch(`/admin/recruiters/${id}/approve`);
    return response.data;
  },

  /**
   * Reject a recruiter
   * @param {string} id - Recruiter User _id or profile _id
   */
  async rejectRecruiter(id) {
    const response = await api.patch(`/admin/recruiters/${id}/reject`);
    return response.data;
  },

  /**
   * Update recruiter status
   * @param {string} id
   * @param {'approved' | 'rejected'} status
   */
  async updateRecruiterStatus(id, status) {
    const response = await api.patch(`/admin/recruiters/${id}/status`, { status });
    return response.data;
  },
};

export default adminService;

