const router = require('express').Router();
const ctrl = require('../../controllers/admin/noteController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', auditLog('note:create'), ctrl.create);
router.patch('/:id', auditLog('note:update'), ctrl.update);
router.delete('/:id', auditLog('note:delete'), ctrl.remove);

router.post('/:id/generate-questions', auditLog('note:generate-questions'), ctrl.generateQuestions);

module.exports = router;