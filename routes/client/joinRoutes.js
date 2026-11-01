const router = require('express').Router();
const optionalAuth = require('../../middleware/client/optionalAuth');
const ctrl = require('../../controllers/client/joinController');

router.get('/:token', ctrl.lookup);
router.post('/:token', optionalAuth, ctrl.join);

module.exports = router;