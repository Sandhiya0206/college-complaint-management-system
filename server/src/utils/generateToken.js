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
  const token = signJWT(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
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
