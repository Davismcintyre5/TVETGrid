const router = require('express').Router();
const ctrl = require('../../controllers/client/meetingInviteController');

// ─── My invites (as invitee) ────────────────────────
router.get('/invited-to', ctrl.listMyInvites);

// ─── Meeting-specific invites (host only) ───────────
router.get('/:id/invites', ctrl.listInvites);
router.post('/:id/invites', ctrl.addInvites);
router.delete('/:id/invites/:inviteId', ctrl.removeInvite);

module.exports = router;