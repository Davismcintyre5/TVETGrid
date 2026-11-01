const router = require('express').Router();
const protect = require('../../middleware/client/auth');
const ctrl = require('../../controllers/client/authController');

router.post('/register', ctrl.register);
router.post('/verify-token', ctrl.verifyByToken);   // ← email link (long token)
router.post('/verify-code', ctrl.verifyByCode);     // ← SMS 6-digit code
router.post('/resend-verification', ctrl.resendVerification);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.me);
router.patch('/password', protect, ctrl.changePassword);

module.exports = router;