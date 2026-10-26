const router = require('express').Router();
const ctrl = require('../../controllers/admin/meetingController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/attendance', ctrl.attendance);
router.get('/:id/recording', ctrl.recording);

module.exports = router;