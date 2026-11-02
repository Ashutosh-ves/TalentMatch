import api from './api';

export const authService = {
  /**
   * Register a new user (student or recruiter)
   * @param {{ name: string, email: string, password: string, role: 'student' | 'recruiter', companyName?: string }} data
   */
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Login with email and password
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Get current authenticated user details
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;

