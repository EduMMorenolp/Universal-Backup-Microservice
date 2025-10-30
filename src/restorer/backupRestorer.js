import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Restaurar backup en base de datos destino
 */
export const restoreBackup = async (database, backupId, targetSequelize) => {
    const backupDir = process.env.BACKUP_DIR || './backups';
    const backupPath = path.join(backupDir, database, backupId);

    // Verificar que existe el backup
    try {
        await fs.access(backupPath);
    } catch (error) {
        throw new Error(`Backup not found: ${database}/${backupId}`);
    }

    // Leer metadata
    const metadataPath = path.join(backupPath, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    // Obtener archivos seeders ordenados
    const files = await fs.readdir(backupPath);
    const seederFiles = files
        .filter(f => f.endsWith('.cjs'))
        .sort();

    console.log(`📦 Restaurando ${seederFiles.length} archivos...`);

    const transaction = await targetSequelize.transaction();
    const results = {
        success: false,
        filesProcessed: 0,
        recordsInserted: 0,
        errors: []
    };

    try {
        // Ejecutar cada seeder en orden
        for (const file of seederFiles) {
            const filePath = path.join(backupPath, file);
            console.log(`  ⏳ Procesando ${file}...`);

            try {
                // Importar seeder dinámicamente
                const seederModule = await import(`file://${filePath}`);
                const seeder = seederModule.default || seederModule;

                // Ejecutar método up con transaction
                await seeder.up(targetSequelize.getQueryInterface(), targetSequelize.Sequelize, { transaction });

                results.filesProcessed++;
                console.log(`  ✅ ${file} completado`);
            } catch (error) {
                console.error(`  ❌ Error en ${file}:`, error.message);
                results.errors.push({
                    file,
                    error: error.message
                });
                throw error;
            }
        }

        // Commit si todo fue exitoso
        await transaction.commit();
        results.success = true;
        results.recordsInserted = metadata.totalRecords || 0;

        console.log('✅ Restore completado exitosamente');
        return results;

    } catch (error) {
        // Rollback automático en caso de error
        await transaction.rollback();
        console.error('❌ Restore fallido - Rollback ejecutado');
        
        results.success = false;
        results.error = error.message;
        return results;
    }
};

/**
 * Validar que la BD destino está vacía o confirmar sobrescritura
 */
export const validateTargetDatabase = async (targetSequelize) => {
    const queryInterface = targetSequelize.getQueryInterface();
    
    // Obtener todas las tablas
    const tables = await queryInterface.showAllTables();
    
    // Filtrar tablas del sistema
    const userTables = tables.filter(t => 
        !t.startsWith('SequelizeMeta') && 
        !t.startsWith('pg_')
    );

    if (userTables.length === 0) {
        return { isEmpty: true, tables: [] };
    }

    // Contar registros en cada tabla
    const tableCounts = await Promise.all(
        userTables.map(async (table) => {
            try {
                const [result] = await targetSequelize.query(
                    `SELECT COUNT(*) as count FROM "${table}"`
                );
                return { table, count: parseInt(result[0].count) };
            } catch (error) {
                return { table, count: 0, error: error.message };
            }
        })
    );

    const totalRecords = tableCounts.reduce((sum, t) => sum + t.count, 0);

    return {
        isEmpty: totalRecords === 0,
        tables: tableCounts,
        totalRecords
    };
};

/**
 * Limpiar base de datos antes de restore
 */
export const cleanDatabase = async (targetSequelize) => {
    const queryInterface = targetSequelize.getQueryInterface();
    const transaction = await targetSequelize.transaction();

    try {
        // Obtener todas las tablas
        const tables = await queryInterface.showAllTables();
        
        // Filtrar tablas del sistema
        const userTables = tables.filter(t => 
            !t.startsWith('SequelizeMeta') && 
            !t.startsWith('pg_')
        );

        console.log(`🗑️  Limpiando ${userTables.length} tablas...`);

        // Deshabilitar foreign key checks
        await targetSequelize.query('SET CONSTRAINTS ALL DEFERRED', { transaction });

        // Truncar cada tabla
        for (const table of userTables) {
            await targetSequelize.query(
                `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
                { transaction }
            );
            console.log(`  ✅ ${table} limpiada`);
        }

        await transaction.commit();
        console.log('✅ Base de datos limpiada');

        return { success: true, tablesCleared: userTables.length };
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error limpiando base de datos:', error.message);
        throw error;
    }
};

/**
 * Obtener información del backup
 */
export const getBackupInfo = async (database, backupId) => {
    const backupDir = process.env.BACKUP_DIR || './backups';
    const backupPath = path.join(backupDir, database, backupId);

    try {
        const metadataPath = path.join(backupPath, 'metadata.json');
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

        const files = await fs.readdir(backupPath);
        const seederFiles = files.filter(f => f.endsWith('.cjs'));

        return {
            backupId,
            database,
            timestamp: metadata.timestamp,
            totalRecords: metadata.totalRecords,
            totalFiles: seederFiles.length,
            format: metadata.format,
            chunkSize: metadata.chunkSize,
            path: backupPath
        };
    } catch (error) {
        throw new Error(`Cannot read backup info: ${error.message}`);
    }
};
