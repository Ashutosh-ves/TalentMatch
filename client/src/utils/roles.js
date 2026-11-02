export const ROLES = {
  STUDENT: 'student',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
};

export const getRoleDashboard = (role) => {
  switch (role) {
    case ROLES.STUDENT:
      return '/student/dashboard';
    case ROLES.RECRUITER:
      return '/recruiter/dashboard';
    case ROLES.ADMIN:
      return '/admin/dashboard';
    default:
      return '/';
  }
};
