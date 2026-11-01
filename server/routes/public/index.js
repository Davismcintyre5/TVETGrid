const router = require('express').Router();

router.use('/site', require('./siteRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/', require('./contentRoutes'));

module.exports = router;