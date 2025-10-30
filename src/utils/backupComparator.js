import fs from 'fs/promises';
import path from 'path';

/**
 * Comparador de backups
 */
class BackupComparator {
    /**
     * Compara dos backups y retorna diferencias
     */
    async compareBackups(dbName, backupId1, backupId2) {
        const backupDir = process.env.BACKUP_DIR || './backups';
        
        const backup1Path = path.join(backupDir, dbName, backupId1);
        const backup2Path = path.join(backupDir, dbName, backupId2);

        const metadata1 = await this.loadMetadata(backup1Path);
        const metadata2 = await this.loadMetadata(backup2Path);

        const comparison = {
            backup1: {
                id: backupId1,
                timestamp: metadata1.timestamp,
                records: metadata1.totalRecords
            },
            backup2: {
                id: backupId2,
                timestamp: metadata2.timestamp,
                records: metadata2.totalRecords
            },
            differences: {
                recordsDiff: metadata2.totalRecords - metadata1.totalRecords,
                filesDiff: metadata2.files.length - metadata1.files.length
            },
            details: []
        };

        // Comparar archivos
        const files1 = new Set(metadata1.files.map(f => path.basename(f)));
        const files2 = new Set(metadata2.files.map(f => path.basename(f)));

        const newFiles = [...files2].filter(f => !files1.has(f));
        const removedFiles = [...files1].filter(f => !files2.has(f));

        if (newFiles.length > 0) {
            comparison.details.push({
                type: 'new_files',
                count: newFiles.length,
                files: newFiles
            });
        }

        if (removedFiles.length > 0) {
            comparison.details.push({
                type: 'removed_files',
                count: removedFiles.length,
                files: removedFiles
            });
        }

        return comparison;
    }

    async loadMetadata(backupPath) {
        const metadataPath = path.join(backupPath, 'metadata.json');
        const data = await fs.readFile(metadataPath, 'utf-8');
        return JSON.parse(data);
    }
}

export default new BackupComparator();
