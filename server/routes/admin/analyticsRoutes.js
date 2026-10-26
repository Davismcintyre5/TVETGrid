const router = require('express').Router();
const ctrl = require('../../controllers/admin/analyticsController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');

router.use(auth, requireAdmin);

router.get('/attempts', ctrl.attempts);
router.get('/mastery', ctrl.mastery);
router.get('/attendance', ctrl.attendance);
router.get('/invites', ctrl.invites);

module.exports = router;