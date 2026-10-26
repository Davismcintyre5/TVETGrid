const router = require('express').Router();
const ctrl = require('../../controllers/admin/topicController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/course/:id', ctrl.listByCourse);
router.post('/', auditLog('topic:create'), ctrl.create);
router.patch('/reorder', auditLog('topic:reorder'), ctrl.reorder);
router.patch('/:id', auditLog('topic:update'), ctrl.update);
router.delete('/:id', auditLog('topic:delete'), ctrl.remove);

module.exports = router;