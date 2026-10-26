const router = require('express').Router();
const ctrl = require('../../controllers/admin/courseController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', auditLog('course:create'), ctrl.create);
router.patch('/:id', auditLog('course:update'), ctrl.update);
router.delete('/:id', auditLog('course:delete'), ctrl.remove);

module.exports = router;