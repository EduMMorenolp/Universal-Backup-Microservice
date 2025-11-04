import express from 'express';
import dbConnector from '../utils/dbConnector.js';
import SchemaAnalyzer from '../analyzer/schemaAnalyzer.js';
import MigrationGenerator from '../generator/migrationGenerator.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

/**
 * POST /api/schema/extract
 * Extrae estructura completa de tablas y genera migraciones
 */
router.post('/extract', async (req, res) => {
    try {
        const { dbConfig } = req.body;

        if (!dbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Database configuration is required'
            });
        }

        // Conectar a BD
        const sequelize = await dbConnector.connect(dbConfig);

        // Analizar esquema
        const analyzer = new SchemaAnalyzer();
        const schema = await analyzer.extractSchema(sequelize);

        // Generar migraciones
        const generator = new MigrationGenerator(process.env.BACKUP_DIR || './backups');
        const results = await generator.saveSchemaAsMigrations(dbConfig.database, schema);

        await dbConnector.disconnect(sequelize);

        res.json({
            success: true,
            database: results.database,
            backupId: results.backupId,
            type: 'schema',
            tables: results.tables,
            files: results.files.length,
            path: results.backupPath
        });

    } catch (error) {
        console.error('Error extrayendo esquema:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * POST /api/schema/incremental
 * Detecta cambios en estructura y genera migraciones incrementales
 */
router.post('/incremental', async (req, res) => {
    try {
        const { baseDbConfig, currentDbConfig, baseSchemaId } = req.body;

        if (!baseDbConfig && !baseSchemaId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Either baseDbConfig or baseSchemaId is required'
            });
        }

        if (!currentDbConfig) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'currentDbConfig is required'
            });
        }

        let baseSchema;

        // Opción 1: Cargar esquema desde archivo
        if (baseSchemaId) {
            const backupDir = process.env.BACKUP_DIR || './backups';
            const baseSchemaPath = path.resolve(backupDir, baseDbConfig?.database || currentDbConfig.database, baseSchemaId, 'metadata.json');
            
            try {
                const baseMetadata = JSON.parse(await fs.readFile(baseSchemaPath, 'utf-8'));
                baseSchema = baseMetadata.schema;
                
                if (!baseSchema) {
                    throw new Error('Schema property not found in metadata');
                }
            } catch (error) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: `Base schema not found: ${baseSchemaId}`,
                    details: error.message,
                    path: baseSchemaPath
                });
            }
        }
        // Opción 2: Extraer esquema de BD base en vivo
        else if (baseDbConfig) {
            const baseSequelize = await dbConnector.connect(baseDbConfig);
            const analyzer = new SchemaAnalyzer();
            baseSchema = await analyzer.extractSchema(baseSequelize);
            await dbConnector.disconnect(baseSequelize);
        }

        // Conectar a BD actual y obtener esquema
        const currentSequelize = await dbConnector.connect(currentDbConfig);
        const analyzer = new SchemaAnalyzer();
        const currentSchema = await analyzer.extractSchema(currentSequelize);

        // Comparar esquemas
        const changes = analyzer.compareSchemas(baseSchema, currentSchema);

        // Verificar si hay cambios
        if (changes.newTables.length === 0 && 
            changes.droppedTables.length === 0 && 
            changes.modifiedTables.length === 0) {
            
            await dbConnector.disconnect(currentSequelize);
            
            return res.json({
                success: true,
                database: currentDbConfig.database,
                message: 'No schema changes detected',
                changes: {
                    newTables: 0,
                    droppedTables: 0,
                    modifiedTables: 0
                }
            });
        }

        // Generar migraciones incrementales
        const backupDir = process.env.BACKUP_DIR || './backups';
        const generator = new MigrationGenerator(backupDir);
        const results = await generator.saveIncrementalMigrations(
            currentDbConfig.database, 
            changes, 
            baseSchemaId || 'live-comparison'
        );

        await dbConnector.disconnect(currentSequelize);

        res.json({
            success: true,
            database: results.database,
            backupId: results.backupId,
            type: 'schema-incremental',
            basedOn: results.basedOn,
            changes: {
                newTables: changes.newTables.length,
                droppedTables: changes.droppedTables.length,
                modifiedTables: changes.modifiedTables.length
            },
            files: results.files.length,
            path: results.backupPath
        });

    } catch (error) {
        console.error('Error en esquema incremental:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

export default router;