const router = require('express').Router();
const protect = require('../../middleware/admin/auth');
const ctrl = require('../../controllers/admin/authController');

router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.me);
router.patch('/password', protect, ctrl.changePassword);

module.exports = router;