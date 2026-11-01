const router = require('express').Router();
const ctrl = require('../../controllers/public/contentController');

router.get('/papers', ctrl.listPapers);
router.get('/papers/:id', ctrl.getPaper);
router.get('/notes', ctrl.listNotes);
router.get('/notes/:id', ctrl.getNote);

module.exports = router;