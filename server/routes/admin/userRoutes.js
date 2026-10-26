const router = require('express').Router();
const ctrl = require('../../controllers/admin/userController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id', auditLog('user:update'), ctrl.update);
router.patch('/:id/role', auditLog('user:change-role'), ctrl.changeRole);
router.patch('/:id/disable', auditLog('user:disable'), ctrl.disable);
router.patch('/:id/enable', auditLog('user:enable'), ctrl.enable);

module.exports = router;