const express = require('express');
const router = express.Router();
const absenteismoController = require('../controllers/absenteismoController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware.authenticate);

router.get('/', absenteismoController.getAbsenteismo);
router.post('/sync', absenteismoController.syncAbsenteismo);
router.get('/dashboard', absenteismoController.getDashboardData);

module.exports = router;
