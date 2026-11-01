const router = require('express').Router();
const ctrl = require('../../controllers/admin/settingsController');

router.get('/', ctrl.get);
router.patch('/', ctrl.update);

module.exports = router;