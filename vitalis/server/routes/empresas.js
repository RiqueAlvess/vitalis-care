const express = require('express');
const router = express.Router();
const empresasController = require('../controllers/empresasController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

router.get('/', empresasController.getEmpresas);
router.get('/:id', empresasController.getEmpresa);
router.post('/sync', empresasController.syncEmpresas);

module.exports = router;
