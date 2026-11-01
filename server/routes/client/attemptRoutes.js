const router = require('express').Router();
const ctrl = require('../../controllers/client/attemptController');

router.post('/', ctrl.submit);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

module.exports = router;