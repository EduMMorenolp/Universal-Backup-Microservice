import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

/**
 * Uploader de backups a S3
 */
class S3Uploader {
    constructor() {
        this.s3Client = null;
    }

    initializeClient(config) {
        this.s3Client = new S3Client({
            region: config.region || 'us-east-1',
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
            }
        });
    }

    /**
     * Comprime y sube backup a S3 con metadatos
     */
    async uploadBackup(dbName, backupId, s3Config) {
        this.initializeClient(s3Config);

        const backupPath = path.join(process.env.BACKUP_DIR || './backups', dbName, backupId);
        const zipPath = `${backupPath}.zip`;

        // Leer metadata del backup
        const metadataPath = path.join(backupPath, 'metadata.json');
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

        // Comprimir backup
        await this.compressBackup(backupPath, zipPath);

        // Obtener tamaño del zip
        const stats = await fs.stat(zipPath);
        const zipSize = stats.size;

        // Subir ZIP a S3 con metadatos
        const zipKey = `backups/${dbName}/${backupId}.zip`;
        await this.uploadToS3WithMetadata(zipPath, s3Config.bucket, zipKey, {
            database: dbName,
            backupId,
            timestamp: metadata.timestamp,
            totalRecords: metadata.totalRecords?.toString() || '0',
            totalFiles: metadata.totalFiles?.toString() || '0',
            format: metadata.format || 'seeders',
            microserviceVersion: process.env.npm_package_version || '1.0.0',
            size: zipSize.toString()
        });

        // Crear y subir manifest.json
        const manifest = {
            backupId,
            database: dbName,
            timestamp: metadata.timestamp,
            summary: {
                totalRecords: metadata.totalRecords || 0,
                totalFiles: metadata.totalFiles || 0,
                format: metadata.format || 'seeders',
                chunkSize: metadata.chunkSize || 300,
                size: zipSize,
                sizeFormatted: this.formatBytes(zipSize)
            },
            microservice: {
                name: 'Universal Backup Microservice',
                version: process.env.npm_package_version || '1.0.0'
            },
            s3: {
                bucket: s3Config.bucket,
                region: s3Config.region || 'us-east-1',
                zipKey,
                manifestKey: `backups/${dbName}/${backupId}/manifest.json`
            },
            uploadedAt: new Date().toISOString()
        };

        const manifestKey = `backups/${dbName}/${backupId}/manifest.json`;
        await this.uploadJSON(manifest, s3Config.bucket, manifestKey);

        // Eliminar zip temporal
        await fs.unlink(zipPath);

        return {
            bucket: s3Config.bucket,
            zipKey,
            manifestKey,
            zipUrl: `https://${s3Config.bucket}.s3.amazonaws.com/${zipKey}`,
            manifestUrl: `https://${s3Config.bucket}.s3.amazonaws.com/${manifestKey}`,
            size: zipSize,
            sizeFormatted: this.formatBytes(zipSize),
            manifest
        };
    }

    async compressBackup(sourcePath, outputPath) {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));

            archive.pipe(output);
            archive.directory(sourcePath, false);
            archive.finalize();
        });
    }

    async uploadToS3WithMetadata(filePath, bucket, key, metadata) {
        const fileContent = await fs.readFile(filePath);

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileContent,
            Metadata: metadata,
            ContentType: 'application/zip'
        });

        await this.s3Client.send(command);
    }

    async uploadJSON(jsonData, bucket, key) {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: JSON.stringify(jsonData, null, 2),
            ContentType: 'application/json'
        });

        await this.s3Client.send(command);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

export default new S3Uploader();
