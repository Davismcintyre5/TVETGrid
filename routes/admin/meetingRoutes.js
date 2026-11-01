const router = require('express').Router();
const ctrl = require('../../controllers/admin/meetingController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.get('/:id/attendance', ctrl.attendance);
router.get('/:id/recording', ctrl.recording);

module.exports = router;