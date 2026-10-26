const router = require('express').Router();

const publicRoutes = require('./public');
const clientRoutes = require('./client');
const adminRoutes = require('./admin');

router.use(publicRoutes);
router.use(clientRoutes);
router.use('/admin', adminRoutes);

module.exports = router;