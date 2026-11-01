const router = require('express').Router();
const ctrl = require('../../controllers/client/profileController');

router.get('/', ctrl.me);
router.patch('/', ctrl.update);

router.post('/avatar/sign', ctrl.signAvatarUpload);
router.post('/avatar/confirm', ctrl.confirmAvatarUpload);
router.delete('/avatar', ctrl.removeAvatar);

module.exports = router;