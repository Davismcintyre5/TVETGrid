const router = require('express').Router();
const ctrl = require('../../controllers/client/meetingController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);

router.get('/:id', ctrl.getOne);
router.get('/:id/participants', ctrl.listParticipants);

router.patch('/:id', ctrl.update);
router.post('/:id/start', ctrl.start);
router.post('/:id/cancel', ctrl.cancel);
router.post('/:id/invite', ctrl.invite);

router.post('/:id/join', ctrl.join);
router.post('/:id/leave', ctrl.leave);

router.patch('/:id/settings', ctrl.updateSettings);
router.post('/:id/mute-all', ctrl.muteAll);
router.post('/:id/unmute-all', ctrl.unmuteAll);
router.post('/:id/participants/:participantId/mute', ctrl.muteParticipant);
router.post('/:id/participants/:participantId/unmute', ctrl.unmuteParticipant);
router.post('/:id/participants/:participantId/remove', ctrl.removeParticipant);
router.post('/:id/end', ctrl.endMeeting);

module.exports = router;