const express = require('express');
const router = express.Router();
const funcionariosController = require('../controllers/funcionariosController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

router.get('/', funcionariosController.getFuncionarios);
router.get('/:id', funcionariosController.getFuncionario);
router.post('/sync', funcionariosController.syncFuncionarios);

module.exports = router;
