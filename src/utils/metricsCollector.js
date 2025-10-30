import fs from 'fs/promises';
import path from 'path';

/**
 * Recolector de métricas de backups
 */
class MetricsCollector {
    /**
     * Recolecta métricas generales
     */
    async collectMetrics() {
        const backupDir = process.env.BACKUP_DIR || './backups';
        
        const metrics = {
            timestamp: new Date().toISOString(),
            databases: {},
            totals: {
                databases: 0,
                backups: 0,
                totalRecords: 0,
                totalFiles: 0,
                totalSize: 0
            }
        };

        try {
            const dbDirs = await fs.readdir(backupDir);

            for (const dbName of dbDirs) {
                const dbPath = path.join(backupDir, dbName);
                const stat = await fs.stat(dbPath);

                if (!stat.isDirectory()) continue;

                const dbMetrics = await this.collectDatabaseMetrics(dbPath, dbName);
                metrics.databases[dbName] = dbMetrics;

                metrics.totals.databases++;
                metrics.totals.backups += dbMetrics.backupCount;
                metrics.totals.totalRecords += dbMetrics.totalRecords;
                metrics.totals.totalFiles += dbMetrics.totalFiles;
                metrics.totals.totalSize += dbMetrics.totalSize;
            }
        } catch (error) {
            console.error('Error recolectando métricas:', error.message);
        }

        return metrics;
    }

    async collectDatabaseMetrics(dbPath, dbName) {
        const metrics = {
            backupCount: 0,
            totalRecords: 0,
            totalFiles: 0,
            totalSize: 0,
            latestBackup: null,
            oldestBackup: null
        };

        const backupDirs = await fs.readdir(dbPath);

        for (const backupId of backupDirs) {
            const metadataPath = path.join(dbPath, backupId, 'metadata.json');
            
            try {
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                
                metrics.backupCount++;
                metrics.totalRecords += metadata.totalRecords;
                metrics.totalFiles += metadata.files.length;

                const backupSize = await this.getDirectorySize(path.join(dbPath, backupId));
                metrics.totalSize += backupSize;

                const backupDate = new Date(metadata.timestamp);
                if (!metrics.latestBackup || backupDate > new Date(metrics.latestBackup.timestamp)) {
                    metrics.latestBackup = {
                        id: backupId,
                        timestamp: metadata.timestamp,
                        records: metadata.totalRecords
                    };
                }

                if (!metrics.oldestBackup || backupDate < new Date(metrics.oldestBackup.timestamp)) {
                    metrics.oldestBackup = {
                        id: backupId,
                        timestamp: metadata.timestamp,
                        records: metadata.totalRecords
                    };
                }
            } catch (error) {
                // Ignorar
            }
        }

        return metrics;
    }

    async getDirectorySize(dirPath) {
        let size = 0;
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                size += await this.getDirectorySize(filePath);
            } else {
                size += stat.size;
            }
        }

        return size;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}

export default new MetricsCollector();
