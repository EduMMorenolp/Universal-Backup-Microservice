import express from 'express';
import backupTester from '../testing/backupTester.js';

const router = express.Router();

/**
 * POST /api/test/run
 * Ejecuta suite de tests automáticos
 */
router.post('/run', async (req, res) => {
    try {
        const { dbConfig } = req.body;

        if (!dbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'dbConfig is required'
            });
        }

        console.log('🧪 Ejecutando tests automáticos...');
        const results = await backupTester.runTests(dbConfig);

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

export default router;
