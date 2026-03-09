const { SOCKET_EVENTS, ROOMS } = require('../utils/socketEvents');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`🔌 Socket connected: ${user?.id} (${user?.role || 'unknown'})`);

    // Auto-join room based on role
    if (user) {
      if (user.role === 'admin') {
        socket.join(ROOMS.ADMIN);
        console.log(`👑 Admin ${user.id} joined admin_room`);
      } else if (user.role === 'worker') {
        socket.join(ROOMS.WORKER(user.id));
        console.log(`🔧 Worker ${user.id} joined worker_${user.id}`);
      } else if (user.role === 'student') {
        socket.join(ROOMS.STUDENT(user.id));
        console.log(`🎓 Student ${user.id} joined student_${user.id}`);
      }
    }

    // Manual room join (for role with userId)
    socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ role, userId }) => {
      try {
        if (role === 'admin') {
          socket.join(ROOMS.ADMIN);
        } else if (role === 'worker' && userId) {
          socket.join(ROOMS.WORKER(userId));
        } else if (role === 'student' && userId) {
          socket.join(ROOMS.STUDENT(userId));
        }
        socket.emit('room_joined', { room: role, userId });
      } catch (err) {
        console.error('Join room error:', err);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, ({ role, userId }) => {
      try {
        if (role === 'admin') {
          socket.leave(ROOMS.ADMIN);
        } else if (role === 'worker' && userId) {
          socket.leave(ROOMS.WORKER(userId));
        } else if (role === 'student' && userId) {
          socket.leave(ROOMS.STUDENT(userId));
        }
      } catch (err) {
        console.error('Leave room error:', err);
      }
    });

    socket.on('typing_remark', ({ complaintId, workerId }) => {
      socket.to(ROOMS.ADMIN).emit('worker_typing', { complaintId, workerId });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${user?.id} — ${reason}`);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });
};

module.exports = { socketHandler };
