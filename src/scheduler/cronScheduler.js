import cron from 'node-cron';
import DBConnector from '../utils/dbConnector.js';
import ModelAnalyzer from '../analyzer/modelAnalyzer.js';
import DependencyResolver from '../analyzer/dependencyResolver.js';
import DataExtractor from '../extractor/dataExtractor.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Gestor de backups programados con cron
 */
class CronScheduler {
    constructor() {
        this.jobs = new Map();
        this.schedulesFile = './config/schedules.json';
    }

    /**
     * Carga schedules guardados
     */
    async loadSchedules() {
        try {
            const data = await fs.readFile(this.schedulesFile, 'utf-8');
            const schedules = JSON.parse(data);
            
            for (const schedule of schedules) {
                await this.scheduleBackup(schedule);
            }
            
            console.log(`✅ Cargados ${schedules.length} backups programados`);
        } catch (error) {
            console.log('ℹ️  No hay schedules previos');
        }
    }

    /**
     * Guarda schedules en archivo
     */
    async saveSchedules() {
        const schedules = Array.from(this.jobs.values()).map(job => job.config);
        await fs.writeFile(this.schedulesFile, JSON.stringify(schedules, null, 2));
    }

    /**
     * Programa un backup automático
     */
    async scheduleBackup(config) {
        const { id, dbConfig, schedule, retention, options = {} } = config;

        if (!cron.validate(schedule)) {
            throw new Error('Invalid cron expression');
        }

        if (this.jobs.has(id)) {
            this.jobs.get(id).task.stop();
        }

        const task = cron.schedule(schedule, async () => {
            console.log(`\n⏰ Ejecutando backup programado: ${id}`);
            await this.executeBackup(id, dbConfig, options, retention);
        });

        this.jobs.set(id, { task, config });
        await this.saveSchedules();

        console.log(`✅ Backup programado: ${id} (${schedule})`);
        return { id, schedule };
    }

    async executeBackup(id, dbConfig, options, retention) {
        try {
            const connector = new DBConnector();
            const sequelize = await connector.connect(dbConfig);

            const analyzer = new ModelAnalyzer();
            const modelGraph = await analyzer.analyzeModels(sequelize);
            
            const resolver = new DependencyResolver();
            const order = resolver.resolveOrder(modelGraph);
            const timestamps = resolver.generateTimestamps(order);
            const entitiesOrder = resolver.generateEntitiesOrder(order, modelGraph, timestamps);

            const extractor = new DataExtractor(process.env.BACKUP_DIR || './backups');
            const results = await extractor.extractData(sequelize, entitiesOrder, {
                ...options,
                dbName: dbConfig.database
            });

            await connector.disconnect(sequelize);
            console.log(`✅ Backup completado: ${results.backupId}`);

            if (retention) {
                await this.applyRetention(dbConfig.database, retention);
            }

            return results;
        } catch (error) {
            console.error(`❌ Error en backup programado ${id}:`, error.message);
            throw error;
        }
    }

    async applyRetention(dbName, retentionDays) {
        try {
            const backupDir = path.join(process.env.BACKUP_DIR || './backups', dbName);
            const dirs = await fs.readdir(backupDir);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            let deleted = 0;
            for (const dir of dirs) {
                const metadataPath = path.join(backupDir, dir, 'metadata.json');
                try {
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                    const backupDate = new Date(metadata.timestamp);

                    if (backupDate < cutoffDate) {
                        await fs.rm(path.join(backupDir, dir), { recursive: true });
                        deleted++;
                        console.log(`🗑️  Backup eliminado (retención): ${dir}`);
                    }
                } catch (error) {
                    // Ignorar
                }
            }

            if (deleted > 0) {
                console.log(`✅ Retención aplicada: ${deleted} backups eliminados`);
            }
        } catch (error) {
            console.error('❌ Error aplicando retención:', error.message);
        }
    }

    async cancelSchedule(id) {
        if (!this.jobs.has(id)) {
            throw new Error('Schedule not found');
        }

        this.jobs.get(id).task.stop();
        this.jobs.delete(id);
        await this.saveSchedules();

        console.log(`✅ Backup cancelado: ${id}`);
    }

    listSchedules() {
        return Array.from(this.jobs.values()).map(job => ({
            id: job.config.id,
            database: job.config.dbConfig.database,
            schedule: job.config.schedule,
            retention: job.config.retention
        }));
    }
}

export default new CronScheduler();
