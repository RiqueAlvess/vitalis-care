const express = require('express');
const router = express.Router();
const apiConfigController = require('../controllers/apiConfigController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

// Rotas de configuração de API
router.get('/', apiConfigController.getConfigurations);
router.post('/:apiType', apiConfigController.saveConfiguration);
router.post('/test', apiConfigController.testConnection);

module.exports = router;
