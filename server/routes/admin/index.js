const router = require('express').Router();

const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');

router.use('/auth', require('./authRoutes'));

router.use(auth, requireAdmin);

router.use('/users', require('./userRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/topics', require('./topicRoutes'));
router.use('/lessons', require('./lessonRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/papers', require('./paperRoutes'));
router.use('/meetings', require('./meetingRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/backup', require('./backupRoutes'));
router.use('/legal', require('./legalRoutes'));

module.exports = router;