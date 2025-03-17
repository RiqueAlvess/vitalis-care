const express = require('express');
const router = express.Router();
const planosController = require('../controllers/planosController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

router.get('/atual', planosController.getPlanoAtual);
router.post('/premium', planosController.atualizarParaPremium);
router.get('/acesso/:recurso', planosController.verificarAcesso);

module.exports = router;
