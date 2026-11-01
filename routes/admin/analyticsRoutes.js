const router = require('express').Router();
const ctrl = require('../../controllers/admin/analyticsController');

router.get('/attempts', ctrl.attempts);
router.get('/mastery', ctrl.mastery);
router.get('/attendance', ctrl.attendance);
router.get('/invites', ctrl.invites);

module.exports = router;