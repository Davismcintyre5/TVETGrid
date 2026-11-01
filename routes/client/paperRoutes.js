const router = require('express').Router();
const ctrl = require('../../controllers/client/paperController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

module.exports = router;