const router = require('express').Router();
const ctrl = require('../../controllers/public/siteController');

router.get('/settings', ctrl.getPublicSettings);
router.get('/legal', ctrl.listLegal);
router.get('/legal/:slug', ctrl.getLegal);

module.exports = router;