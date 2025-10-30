import express from 'express';
import backupTester from '../testing/backupTester.js';

const router = express.Router();

/**
 * POST /api/test/run
 * Ejecuta suite de tests automáticos
 */
router.post('/run', async (req, res) => {
    try {
        const { dbConfig, tests = ['all'] } = req.body;

        if (!dbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'dbConfig is required'
            });
        }

        console.log('🧪 Ejecutando tests automáticos...');
        const results = await backupTester.runTests(dbConfig, tests);

        res.json({
            success: results.success,
            summary: {
                total: results.results.length,
                passed: results.passed,
                failed: results.failed
            },
            results: results.results
        });

    } catch (error) {
        console.error('Error en tests:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/test/available
 * Lista tests disponibles
 */
router.get('/available', (req, res) => {
    res.json({
        success: true,
        tests: [
            {
                id: 'all',
                name: 'Todos los Tests',
                description: 'Ejecuta suite completa'
            },
            {
                id: 'fullBackup',
                name: 'Backup Completo',
                description: 'Crea primer backup'
            },
            {
                id: 'secondBackup',
                name: 'Segundo Backup',
                description: 'Verifica que no se rompe'
            },
            {
                id: 'comparison',
                name: 'Comparación',
                description: 'Compara ambos backups'
            },
            {
                id: 'integrity',
                name: 'Integridad',
                description: 'Valida archivos y metadata'
            }
        ]
    });
});

export default router;
