const router = require('express').Router();
const ctrl = require('../../controllers/admin/legalController');
const auth = require('../../middleware/admin/auth');
const requireAdmin = require('../../middleware/admin/requireAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(auth, requireAdmin);

router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);
router.get('/:slug/versions', ctrl.versions);
router.post('/', auditLog('legal:create'), ctrl.create);
router.patch('/:slug', auditLog('legal:update'), ctrl.update);
router.post('/:slug/publish', auditLog('legal:publish'), ctrl.publish);

module.exports = router;