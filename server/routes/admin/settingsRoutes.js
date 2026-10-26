const router = require('express').Router();
const ctrl = require('../../controllers/admin/settingsController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.get);
router.patch('/', auditLog('settings:update'), ctrl.update);

module.exports = router;