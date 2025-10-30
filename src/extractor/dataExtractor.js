import fs from 'fs/promises';
import path from 'path';

/**
 * Extractor de datos de modelos Sequelize
 */
class DataExtractor {
    constructor(backupDir = './backups') {
        this.backupDir = backupDir;
    }

    /**
     * Extrae datos de todos los modelos en orden
     */
    async extractData(sequelize, entitiesOrder, options = {}) {
        const {
            chunkSize = 300,
            format = 'seeders',
            dbName = 'unknown'
        } = options;

        console.log('\n🚀 Iniciando extracción de datos...\n');

        // Crear directorio de backup organizado por BD
        const backupId = this.generateBackupId();
        const dbFolder = path.join(this.backupDir, dbName);
        const backupPath = path.join(dbFolder, backupId);
        await fs.mkdir(backupPath, { recursive: true });

        const results = {
            backupId,
            database: dbName,
            backupPath,
            files: [],
            totalRecords: 0,
            timestamp: new Date().toISOString()
        };

        // Extraer cada modelo en orden
        for (const [modelName, config] of Object.entries(entitiesOrder)) {
            try {
                const model = sequelize.models[modelName];
                
                if (!model) {
                    console.log(`⚠️  Modelo no encontrado: ${modelName}`);
                    continue;
                }

                const data = await model.findAll({ raw: true });

                if (data.length === 0) {
                    console.log(`ℹ️  Sin registros: ${modelName}`);
                    continue;
                }

                console.log(`📊 Extrayendo: ${modelName} (${data.length} registros)`);

                // Fragmentar y guardar
                const files = await this.saveData(
                    backupPath,
                    modelName,
                    config,
                    data,
                    chunkSize,
                    format
                );

                results.files.push(...files);
                results.totalRecords += data.length;

            } catch (error) {
                console.error(`❌ Error extrayendo ${modelName}:`, error.message);
            }
        }

        // Guardar metadata
        await this.saveMetadata(backupPath, results);

        console.log(`\n✅ Extracción completada:`);
        console.log(`   📁 Backup ID: ${backupId}`);
        console.log(`   📊 Registros: ${results.totalRecords}`);
        console.log(`   📂 Ubicación: ${backupPath}\n`);

        return results;
    }

    /**
     * Guarda datos en formato especificado
     */
    async saveData(backupPath, modelName, config, data, chunkSize, format) {
        const files = [];
        const totalChunks = Math.ceil(data.length / chunkSize);

        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const chunkIndex = Math.floor(i / chunkSize) + 1;

            const filename = totalChunks > 1
                ? `${config.timestamp}-${config.tableName}-part-${chunkIndex}`
                : `${config.timestamp}-${config.tableName}`;

            let filePath;
            if (format === 'seeders') {
                filePath = await this.saveAsSeeder(backupPath, filename, config.tableName, chunk, config.description);
            } else if (format === 'json') {
                filePath = await this.saveAsJSON(backupPath, filename, chunk);
            }

            files.push(filePath);
        }

        return files;
    }

    /**
     * Guarda como seeder de Sequelize
     */
    async saveAsSeeder(backupPath, filename, tableName, data, description) {
        const ids = data.map(record => record.id);

        const content = `// ${description} - Extraído automáticamente
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('${tableName}', ${JSON.stringify(data, null, 2)}, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('${tableName}', {
            id: ${JSON.stringify(ids)}
        }, {});
    }
};`;

        const filePath = path.join(backupPath, `${filename}.cjs`);
        await fs.writeFile(filePath, content);
        return filePath;
    }

    /**
     * Guarda como JSON
     */
    async saveAsJSON(backupPath, filename, data) {
        const filePath = path.join(backupPath, `${filename}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return filePath;
    }

    /**
     * Guarda metadata del backup
     */
    async saveMetadata(backupPath, results) {
        const metadataPath = path.join(backupPath, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(results, null, 2));
    }

    /**
     * Genera ID único para backup
     */
    generateBackupId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `backup-${year}${month}${day}-${hour}${minute}${second}`;
    }
}

export default DataExtractor;
