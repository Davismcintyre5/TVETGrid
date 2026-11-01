const router = require('express').Router();
const ctrl = require('../../controllers/client/courseController');

router.get('/', ctrl.listAll);
router.get('/mine', ctrl.mine);
router.post('/choose', ctrl.chooseCourse);
router.patch('/preferred', ctrl.setPreferredCourse);
router.get('/:id', ctrl.getOne);
router.get('/:courseId/subjects', ctrl.listSubjects);

module.exports = router;