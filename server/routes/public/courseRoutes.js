const router = require('express').Router();
const ctrl = require('../../controllers/public/courseController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.get('/:courseId/subjects', ctrl.listSubjects);

module.exports = router;