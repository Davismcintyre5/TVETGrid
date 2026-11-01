const router = require('express').Router();
const protect = require('../../middleware/admin/auth');

const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

router.use(protect);

router.use('/users', require('./userRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/subjects', require('./subjectRoutes'));
router.use('/papers', require('./paperRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/meetings', require('./meetingRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/backup', require('./backupRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/legal', require('./legalRoutes'));

module.exports = router;