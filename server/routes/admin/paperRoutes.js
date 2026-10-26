const router = require('express').Router();
const ctrl = require('../../controllers/admin/paperController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', auditLog('paper:create'), ctrl.create);
router.patch('/:id', auditLog('paper:update'), ctrl.update);
router.delete('/:id', auditLog('paper:delete'), ctrl.remove);

router.patch('/:id/questions', auditLog('paper:save-questions'), ctrl.saveQuestions);

module.exports = router;