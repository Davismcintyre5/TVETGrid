const router = require('express').Router();
const ctrl = require('../../controllers/admin/backupController');

router.get('/settings', ctrl.getSettings);
router.patch('/settings', ctrl.updateSettings);

router.post('/create', ctrl.create);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.get('/:id/download', ctrl.download);
router.post('/:id/email', ctrl.email);
router.post('/:id/restore', ctrl.restore);
router.delete('/:id', ctrl.remove);

module.exports = router;