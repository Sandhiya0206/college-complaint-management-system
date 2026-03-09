const Notification = require('../models/Notification');

const createNotification = async (userId, type, title, message, complaintId = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      complaintId,
      isRead: false
    });
    return notification;
  } catch (err) {
    console.error('Notification creation error:', err);
    return null;
  }
};

const getUnreadNotifications = async (userId, limit = 20) => {
  return await Notification.find({ userId, isRead: false })
    .populate('complaintId', 'complaintId category status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const getAllNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ userId })
      .populate('complaintId', 'complaintId category status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ userId })
  ]);
  return { notifications, total, page, pages: Math.ceil(total / limit) };
};

const markAsRead = async (userId, notificationIds = null) => {
  const query = { userId };
  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }
  await Notification.updateMany(query, { isRead: true });
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

module.exports = {
  createNotification,
  getUnreadNotifications,
  getAllNotifications,
  markAsRead,
  getUnreadCount
};
