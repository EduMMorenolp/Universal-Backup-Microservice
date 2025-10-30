import express from 'express';
import { connectToDatabase, closeConnection } from '../utils/dbConnector.js';
import { restoreBackup, validateTargetDatabase, cleanDatabase, getBackupInfo } from '../restorer/backupRestorer.js';

const router = express.Router();

/**
 * POST /api/restore/info
 * Obtener información de un backup
 */
router.post('/info', async (req, res) => {
    try {
        const { database, backupId } = req.body;

        if (!database || !backupId) {
            return res.status(400).json({
                success: false,
                error: 'Database and backupId are required'
            });
        }

        const info = await getBackupInfo(database, backupId);

        res.json({
            success: true,
            backup: info
        });
    } catch (error) {
        console.error('Error getting backup info:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/restore/validate
 * Validar base de datos destino
 */
router.post('/validate', async (req, res) => {
    let sequelize;

    try {
        const { targetDbConfig } = req.body;

        if (!targetDbConfig) {
            return res.status(400).json({
                success: false,
                error: 'targetDbConfig is required'
            });
        }

        sequelize = await connectToDatabase(targetDbConfig);
        const validation = await validateTargetDatabase(sequelize);

        res.json({
            success: true,
            validation
        });
    } catch (error) {
        console.error('Error validating target database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (sequelize) {
            await closeConnection(sequelize);
        }
    }
});

/**
 * POST /api/restore/clean
 * Limpiar base de datos destino
 */
router.post('/clean', async (req, res) => {
    let sequelize;

    try {
        const { targetDbConfig } = req.body;

        if (!targetDbConfig) {
            return res.status(400).json({
                success: false,
                error: 'targetDbConfig is required'
            });
        }

        sequelize = await connectToDatabase(targetDbConfig);
        const result = await cleanDatabase(sequelize);

        res.json({
            success: true,
            message: 'Database cleaned successfully',
            result
        });
    } catch (error) {
        console.error('Error cleaning database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (sequelize) {
            await closeConnection(sequelize);
        }
    }
});

/**
 * POST /api/restore
 * Restaurar backup en base de datos destino
 */
router.post('/', async (req, res) => {
    let sequelize;

    try {
        const { database, backupId, targetDbConfig, options = {} } = req.body;

        // Validar parámetros
        if (!database || !backupId || !targetDbConfig) {
            return res.status(400).json({
                success: false,
                error: 'database, backupId and targetDbConfig are required'
            });
        }

        // Obtener info del backup
        const backupInfo = await getBackupInfo(database, backupId);

        // Conectar a BD destino
        sequelize = await connectToDatabase(targetDbConfig);

        // Validar BD destino
        const validation = await validateTargetDatabase(sequelize);

        // Si no está vacía y no se fuerza, rechazar
        if (!validation.isEmpty && !options.force) {
            return res.status(400).json({
                success: false,
                error: 'Target database is not empty. Use force: true to overwrite',
                validation
            });
        }

        // Limpiar BD si se fuerza
        if (options.force && !validation.isEmpty) {
            console.log('🗑️  Limpiando base de datos destino...');
            await cleanDatabase(sequelize);
        }

        // Ejecutar restore
        console.log(`📦 Iniciando restore de ${backupId}...`);
        const result = await restoreBackup(database, backupId, sequelize);

        if (result.success) {
            res.json({
                success: true,
                message: 'Backup restored successfully',
                backup: backupInfo,
                result: {
                    filesProcessed: result.filesProcessed,
                    recordsInserted: result.recordsInserted
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Restore failed',
                result
            });
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (sequelize) {
            await closeConnection(sequelize);
        }
    }
});

export default router;
