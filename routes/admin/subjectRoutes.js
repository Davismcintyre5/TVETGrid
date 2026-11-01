const router = require('express').Router();
const ctrl = require('../../controllers/admin/subjectController');

router.get('/course/:courseId', ctrl.listForCourse);
router.post('/', ctrl.create);
router.patch('/reorder', ctrl.reorder);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;