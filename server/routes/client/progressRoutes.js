const router = require('express').Router();
const ctrl = require('../../controllers/client/progressController');

router.get('/', ctrl.overview);
router.get('/revision', ctrl.revisionQueue);

module.exports = router;