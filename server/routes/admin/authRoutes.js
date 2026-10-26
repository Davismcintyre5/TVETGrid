const router = require('express').Router();
const ctrl = require('../../controllers/admin/authController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const clientRateLimiter = require('../../middleware/client/rateLimiter');

router.post('/login', clientRateLimiter, ctrl.login);
router.post('/refresh', ctrl.refresh);

router.use(auth, requireAdmin);

router.post('/logout', ctrl.logout);
router.get('/me', ctrl.me);
router.patch('/password', ctrl.changePassword);

module.exports = router;