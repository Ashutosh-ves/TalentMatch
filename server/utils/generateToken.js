const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = {
    id: user._id ? user._id.toString() : user.id || user,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

module.exports = generateToken;
