const SOCKET_EVENTS = {
  // Server → Client
  COMPLAINT_CREATED: 'complaint_created',
  COMPLAINT_ASSIGNED: 'complaint_assigned',
  STATUS_CHANGED: 'status_changed',
  COMPLAINT_RESOLVED: 'complaint_resolved',
  COMPLAINT_REJECTED: 'complaint_rejected',
  COMPLAINT_ESCALATED: 'complaint_escalated',
  WORKER_REASSIGNED: 'worker_reassigned',
  NOTIFICATION_NEW: 'notification_new',

  // Client → Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  TYPING_REMARK: 'typing_remark',

  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error'
};

const ROOMS = {
  ADMIN: 'admin_room',
  WORKER: (id) => `worker_${id}`,
  STUDENT: (id) => `student_${id}`
};

module.exports = { SOCKET_EVENTS, ROOMS };
