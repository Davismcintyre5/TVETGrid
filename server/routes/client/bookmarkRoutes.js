const router = require('express').Router();
const ctrl = require('../../controllers/client/bookmarkController');

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.delete('/:paperId', ctrl.remove);

module.exports = router;