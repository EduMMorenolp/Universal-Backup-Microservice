import express from 'express';
import cronScheduler from '../scheduler/cronScheduler.js';
import backupComparator from '../utils/backupComparator.js';
import s3Uploader from '../utils/s3Uploader.js';
import metricsCollector from '../utils/metricsCollector.js';

const router = express.Router();

/**
 * POST /api/advanced/schedule
 * Programa un backup automático
 */
router.post('/schedule', async (req, res) => {
    try {
        const { id, dbConfig, schedule, retention, options } = req.body;

        if (!id || !dbConfig || !schedule) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'id, dbConfig and schedule are required'
            });
        }

        const result = await cronScheduler.scheduleBackup({
            id,
            dbConfig,
            schedule,
            retention: retention || 30,
            options: options || {}
        });

        res.json({
            success: true,
            message: 'Backup scheduled successfully',
            schedule: result
        });
    } catch (error) {
        console.error('Error scheduling backup:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/advanced/schedules
 * Lista backups programados
 */
router.get('/schedules', (req, res) => {
    try {
        const schedules = cronScheduler.listSchedules();
        res.json({
            success: true,
            schedules
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * DELETE /api/advanced/schedule/:id
 * Cancela un backup programado
 */
router.delete('/schedule/:id', async (req, res) => {
    try {
        await cronScheduler.cancelSchedule(req.params.id);
        res.json({
            success: true,
            message: 'Schedule cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * POST /api/advanced/compare
 * Compara dos backups
 */
router.post('/compare', async (req, res) => {
    try {
        const { dbName, backupId1, backupId2 } = req.body;

        if (!dbName || !backupId1 || !backupId2) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'dbName, backupId1 and backupId2 are required'
            });
        }

        const comparison = await backupComparator.compareBackups(dbName, backupId1, backupId2);

        res.json({
            success: true,
            comparison
        });
    } catch (error) {
        console.error('Error comparing backups:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * POST /api/advanced/upload-s3
 * Sube backup a S3
 */
router.post('/upload-s3', async (req, res) => {
    try {
        const { dbName, backupId, s3Config } = req.body;

        if (!dbName || !backupId || !s3Config) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'dbName, backupId and s3Config are required'
            });
        }

        const result = await s3Uploader.uploadBackup(dbName, backupId, s3Config);

        res.json({
            success: true,
            message: 'Backup uploaded to S3 successfully with metadata and manifest',
            upload: {
                bucket: result.bucket,
                zipUrl: result.zipUrl,
                manifestUrl: result.manifestUrl,
                size: result.sizeFormatted
            },
            manifest: result.manifest
        });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/advanced/metrics
 * Obtiene métricas de backups
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await metricsCollector.collectMetrics();

        // Formatear tamaños
        metrics.totals.totalSizeFormatted = metricsCollector.formatSize(metrics.totals.totalSize);
        
        for (const dbName in metrics.databases) {
            metrics.databases[dbName].totalSizeFormatted = metricsCollector.formatSize(
                metrics.databases[dbName].totalSize
            );
        }

        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error collecting metrics:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

export default router;
