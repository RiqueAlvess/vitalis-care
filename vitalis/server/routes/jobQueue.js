const express = require('express');
const router = express.Router();
const jobQueueController = require('../controllers/jobQueueController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

// Obter todos os jobs do usuário
router.get('/', jobQueueController.getJobs);

// Obter um job específico
router.get('/:id', jobQueueController.getJob);

// Repetir um job que falhou
router.post('/:id/retry', jobQueueController.retryJob);

// Cancelar um job pendente
router.post('/:id/cancel', jobQueueController.cancelJob);

module.exports = router;
