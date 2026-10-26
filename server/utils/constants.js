const ROLES = Object.freeze({
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
});

const MEETING_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
});

const INVITE_RSVP = Object.freeze({
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  ATTENDED: 'attended',
  EXPIRED: 'expired',
});

const INVITE_CHANNEL = Object.freeze({
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
});

const PAPER_MODE = Object.freeze({
  EXAM: 'exam',
  REVIEW: 'review',
});

const VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  ENROLLED: 'enrolled',
  PRIVATE: 'private',
});

const DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
});

const WHATSAPP_MODE = Object.freeze({
  LINK: 'link',
  CLOUD: 'cloud',
});

const BACKUP_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  RUNNING: 'running',
});

module.exports = {
  ROLES,
  MEETING_STATUS,
  INVITE_RSVP,
  INVITE_CHANNEL,
  PAPER_MODE,
  VISIBILITY,
  DIFFICULTY,
  WHATSAPP_MODE,
  BACKUP_STATUS,
};