const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')}`,
      });
    }

    // For recruiter posting/sensitive actions, also enforce status === 'approved'
    if (req.user.role === 'recruiter' && req.user.status !== 'approved') {
      const message =
        req.user.status === 'rejected'
          ? 'Forbidden: Recruiter account was rejected'
          : 'Forbidden: Recruiter account status is pending approval';

      return res.status(403).json({
        success: false,
        message,
      });
    }

    next();
  };
};

// Check role without requiring recruiter status === 'approved' (for profile management, etc.)
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

roleMiddleware.checkRole = checkRole;

module.exports = roleMiddleware;
