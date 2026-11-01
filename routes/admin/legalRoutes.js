const router = require('express').Router();
const ctrl = require('../../controllers/admin/legalController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:slug', ctrl.getOne);
router.get('/:slug/versions', ctrl.getVersions);
router.patch('/:slug', ctrl.update);
router.post('/:slug/publish', ctrl.publish);

module.exports = router;