const router = require('express').Router();
const ctrl = require('../../controllers/admin/lessonController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', auditLog('lesson:create'), ctrl.create);
router.patch('/:id', auditLog('lesson:update'), ctrl.update);
router.delete('/:id', auditLog('lesson:delete'), ctrl.remove);

router.post('/upload/sign', ctrl.uploadSign);
router.post('/upload/confirm', ctrl.confirmUpload);

router.post('/:id/summarize', ctrl.summarizeTranscript);

module.exports = router;