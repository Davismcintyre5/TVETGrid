const router = require('express').Router();
const ctrl = require('../../controllers/admin/backupController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/settings', ctrl.getSettings);
router.patch('/settings', auditLog('backup:settings'), ctrl.updateSettings);

router.post('/create', auditLog('backup:create'), ctrl.createNow);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/download', auditLog('backup:download'), ctrl.download);
router.post('/:id/email', auditLog('backup:email'), ctrl.emailTo);
router.post('/:id/restore', auditLog('backup:restore'), ctrl.restore);
router.delete('/:id', auditLog('backup:delete'), ctrl.remove);

module.exports = router;