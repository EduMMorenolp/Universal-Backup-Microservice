import express from 'express';
import DBConnector from '../utils/dbConnector.js';
import ModelAnalyzer from '../analyzer/modelAnalyzer.js';
import DependencyResolver from '../analyzer/dependencyResolver.js';
import DataExtractor from '../extractor/dataExtractor.js';
import incrementalExtractor from '../extractor/incrementalExtractor.js';

const router = express.Router();

/**
 * POST /api/backup/analyze
 * Analiza estructura de BD y genera orden de dependencias
 */
router.post('/analyze', async (req, res) => {
    try {
        const { dbConfig } = req.body;

        if (!dbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Database configuration is required'
            });
        }

        // Conectar a BD
        const connector = new DBConnector();
        const sequelize = await connector.connect(dbConfig);

        // Analizar modelos
        const analyzer = new ModelAnalyzer();
        const modelGraph = await analyzer.analyzeModels(sequelize);

        // Resolver orden de dependencias
        const resolver = new DependencyResolver();
        const order = resolver.resolveOrder(modelGraph);
        const timestamps = resolver.generateTimestamps(order);
        const entitiesOrder = resolver.generateEntitiesOrder(order, modelGraph, timestamps);

        // Generar reporte
        const report = analyzer.generateReport(modelGraph);

        await connector.disconnect(sequelize);

        res.json({
            success: true,
            database: dbConfig.database,
            report,
            order,
            entitiesOrder
        });

    } catch (error) {
        console.error('Error en análisis:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * POST /api/backup/extract
 * Extrae datos de BD y genera backup (completo o incremental)
 */
router.post('/extract', async (req, res) => {
    try {
        const { dbConfig, options = {} } = req.body;

        if (!dbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Database configuration is required'
            });
        }

        // Conectar a BD
        const connector = new DBConnector();
        const sequelize = await connector.connect(dbConfig);

        // Verificar si es backup incremental
        if (options.incremental && options.basedOn) {
            console.log('🔄 Generando backup incremental...');
            const results = await incrementalExtractor.extractIncremental(
                sequelize,
                options.basedOn,
                dbConfig.database,
                options
            );

            await connector.disconnect(sequelize);

            return res.json({
                success: true,
                database: dbConfig.database,
                backupId: results.backupId,
                type: 'incremental',
                basedOn: results.basedOn,
                changes: results.changes,
                files: results.files,
                path: results.path
            });
        }

        // Backup completo
        console.log('📦 Generando backup completo...');
        const analyzer = new ModelAnalyzer();
        const modelGraph = await analyzer.analyzeModels(sequelize);
        
        const resolver = new DependencyResolver();
        const order = resolver.resolveOrder(modelGraph);
        const timestamps = resolver.generateTimestamps(order);
        const entitiesOrder = resolver.generateEntitiesOrder(order, modelGraph, timestamps);

        // Extraer datos
        const extractor = new DataExtractor(process.env.BACKUP_DIR || './backups');
        const results = await extractor.extractData(sequelize, entitiesOrder, {
            ...options,
            dbName: dbConfig.database
        });

        await connector.disconnect(sequelize);

        res.json({
            success: true,
            database: results.database,
            backupId: results.backupId,
            type: 'full',
            files: results.files.length,
            records: results.totalRecords,
            path: results.backupPath
        });

    } catch (error) {
        console.error('Error en extracción:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/backup/list
 * Lista todos los backups disponibles organizados por BD
 */
router.get('/list', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const backupDir = process.env.BACKUP_DIR || './backups';
        const backupsByDatabase = {};

        const dbDirs = await fs.readdir(backupDir);
        
        for (const dbName of dbDirs) {
            const dbPath = path.join(backupDir, dbName);
            const stat = await fs.stat(dbPath);
            
            if (!stat.isDirectory()) continue;
            
            backupsByDatabase[dbName] = [];
            
            const backupDirs = await fs.readdir(dbPath);
            
            for (const backupId of backupDirs) {
                const metadataPath = path.join(dbPath, backupId, 'metadata.json');
                try {
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                    backupsByDatabase[dbName].push({
                        id: backupId,
                        timestamp: metadata.timestamp,
                        records: metadata.totalRecords,
                        files: metadata.files.length
                    });
                } catch (error) {
                    // Ignorar directorios sin metadata
                }
            }
            
            // Ordenar por timestamp descendente
            backupsByDatabase[dbName].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        res.json({
            success: true,
            backupsByDatabase
        });

    } catch (error) {
        console.error('Error listando backups:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

export default router;
