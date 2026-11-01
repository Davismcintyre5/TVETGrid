const router = require('express').Router();
const ctrl = require('../../controllers/admin/userController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.patch('/:id/role', ctrl.changeRole);
router.patch('/:id/disable', ctrl.disable);
router.patch('/:id/enable', ctrl.enable);
router.delete('/:id', ctrl.remove);

module.exports = router;