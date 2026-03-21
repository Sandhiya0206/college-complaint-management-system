const jwt = require('jsonwebtoken');

const signJWT = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const verifyJWT = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const sendTokenResponse = (user, statusCode, res) => {
  // Support both Mongoose (_id) and Sequelize (id) models
  const userId = user._id || user.id;
  const token = signJWT(userId);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: userId,
      _id: userId, // for backward compatibility
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
      phone: user.phone
    }
  });
};

module.exports = { signJWT, verifyJWT, sendTokenResponse };
