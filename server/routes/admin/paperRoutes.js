const router = require('express').Router();
const ctrl = require('../../controllers/admin/paperController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);

router.post('/upload/sign', ctrl.sign);
router.post('/upload/confirm', ctrl.confirm);

router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.patch('/:id/rename', ctrl.rename);
router.patch('/:id/replace', ctrl.replace);
router.patch('/:id/questions', ctrl.updateQuestions);
router.delete('/:id', ctrl.remove);

module.exports = router;