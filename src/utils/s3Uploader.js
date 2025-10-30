import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';

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
     * Comprime y sube backup a S3
     */
    async uploadBackup(dbName, backupId, s3Config) {
        this.initializeClient(s3Config);

        const backupPath = path.join(process.env.BACKUP_DIR || './backups', dbName, backupId);
        const zipPath = `${backupPath}.zip`;

        // Comprimir backup
        await this.compressBackup(backupPath, zipPath);

        // Subir a S3
        const key = `${dbName}/${backupId}.zip`;
        await this.uploadToS3(zipPath, s3Config.bucket, key);

        // Eliminar zip temporal
        await fs.unlink(zipPath);

        return {
            bucket: s3Config.bucket,
            key,
            url: `https://${s3Config.bucket}.s3.amazonaws.com/${key}`
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

    async uploadToS3(filePath, bucket, key) {
        const fileContent = await fs.readFile(filePath);

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileContent
        });

        await this.s3Client.send(command);
    }
}

export default new S3Uploader();
