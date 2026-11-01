const router = require('express').Router();
const ctrl = require('../../controllers/admin/healthController');

router.get('/', ctrl.simple);
router.get('/detailed', ctrl.detailed);

module.exports = router;