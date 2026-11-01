const router = require('express').Router();
const ctrl = require('../../controllers/client/dashboardController');

router.get('/', ctrl.overview);

module.exports = router;