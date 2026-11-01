const router = require('express').Router();
const protect = require('../../middleware/client/auth');

// Public — no auth
router.use('/auth', require('./authRoutes'));
router.use('/join', require('./joinRoutes'));

// Protected
router.use(protect);

router.use('/dashboard', require('./dashboardRoutes'));
router.use('/profile', require('./profileRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/papers', require('./paperRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/attempts', require('./attemptRoutes'));
router.use('/progress', require('./progressRoutes'));
router.use('/bookmarks', require('./bookmarkRoutes'));

// Meetings — invites FIRST (has /invited-to static route)
router.use('/meetings', require('./meetingInviteRoutes'));
router.use('/meetings', require('./meetingRoutes'));

// AI — to build
// router.use('/ai', require('./aiRoutes'));

module.exports = router;