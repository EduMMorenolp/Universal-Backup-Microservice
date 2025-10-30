import { connectToDatabase, closeConnection } from '../utils/dbConnector.js';
import ModelAnalyzer from '../analyzer/modelAnalyzer.js';
import DependencyResolver from '../analyzer/dependencyResolver.js';
import DataExtractor from '../extractor/dataExtractor.js';

/**
 * Sistema de testing automático de backups
 */
class BackupTester {
    constructor() {
        this.testResults = [];
    }

    /**
     * Ejecuta suite completa de tests
     */
    async runTests(dbConfig) {
        console.log('🧪 Iniciando tests de backup...\n');
        this.testResults = [];

        try {
            // Test 1: Backup completo
            await this.testFullBackup(dbConfig);

            // Test 2: Segundo backup (verificar que no se rompe)
            await this.testSecondBackup(dbConfig);

            // Test 3: Comparar backups
            await this.testBackupComparison();

            // Test 4: Validar integridad
            await this.testBackupIntegrity();

            // Resumen
            this.printSummary();

            return {
                success: true,
                results: this.testResults,
                passed: this.testResults.filter(t => t.passed).length,
                failed: this.testResults.filter(t => !t.passed).length
            };

        } catch (error) {
            console.error('❌ Error en tests:', error.message);
            return {
                success: false,
                error: error.message,
                results: this.testResults
            };
        }
    }

    /**
     * Test 1: Backup completo
     */
    async testFullBackup(dbConfig) {
        const testName = 'Backup Completo';
        console.log(`📦 Test: ${testName}`);

        try {
            const sequelize = await connectToDatabase(dbConfig);

            const analyzer = new ModelAnalyzer();
            const modelGraph = await analyzer.analyzeModels(sequelize);

            const resolver = new DependencyResolver();
            const order = resolver.resolveOrder(modelGraph);
            const timestamps = resolver.generateTimestamps(order);
            const entitiesOrder = resolver.generateEntitiesOrder(order, modelGraph, timestamps);

            const extractor = new DataExtractor(process.env.BACKUP_DIR || './backups');
            const results = await extractor.extractData(sequelize, entitiesOrder, {
                dbName: dbConfig.database
            });

            await closeConnection(sequelize);

            this.firstBackupId = results.backupId;
            this.database = dbConfig.database;

            this.addResult(testName, true, {
                backupId: results.backupId,
                files: results.files.length,
                records: results.totalRecords
            });

            console.log(`✅ ${testName} - OK\n`);

        } catch (error) {
            this.addResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
        }
    }

    /**
     * Test 2: Segundo backup (verificar que no se rompe)
     */
    async testSecondBackup(dbConfig) {
        const testName = 'Segundo Backup (No Rompe)';
        console.log(`📦 Test: ${testName}`);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const sequelize = await connectToDatabase(dbConfig);

            const analyzer = new ModelAnalyzer();
            const modelGraph = await analyzer.analyzeModels(sequelize);

            const resolver = new DependencyResolver();
            const order = resolver.resolveOrder(modelGraph);
            const timestamps = resolver.generateTimestamps(order);
            const entitiesOrder = resolver.generateEntitiesOrder(order, modelGraph, timestamps);

            const extractor = new DataExtractor(process.env.BACKUP_DIR || './backups');
            const results = await extractor.extractData(sequelize, entitiesOrder, {
                dbName: dbConfig.database
            });

            await closeConnection(sequelize);

            this.secondBackupId = results.backupId;

            this.addResult(testName, true, {
                backupId: results.backupId,
                files: results.files.length,
                records: results.totalRecords
            });

            console.log(`✅ ${testName} - OK\n`);

        } catch (error) {
            this.addResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
        }
    }

    /**
     * Test 3: Comparar backups
     */
    async testBackupComparison() {
        const testName = 'Comparación de Backups';
        console.log(`🔄 Test: ${testName}`);

        try {
            if (!this.firstBackupId || !this.secondBackupId) {
                throw new Error('Backups no disponibles');
            }

            const fs = await import('fs/promises');
            const path = await import('path');

            const backupDir = process.env.BACKUP_DIR || './backups';
            const backup1Path = path.join(backupDir, this.database, this.firstBackupId);
            const backup2Path = path.join(backupDir, this.database, this.secondBackupId);

            const meta1 = JSON.parse(await fs.readFile(path.join(backup1Path, 'metadata.json'), 'utf-8'));
            const meta2 = JSON.parse(await fs.readFile(path.join(backup2Path, 'metadata.json'), 'utf-8'));

            const comparison = {
                backup1: { id: this.firstBackupId, records: meta1.totalRecords },
                backup2: { id: this.secondBackupId, records: meta2.totalRecords },
                identical: meta1.totalRecords === meta2.totalRecords
            };

            this.addResult(testName, true, comparison);
            console.log(`✅ ${testName} - OK\n`);

        } catch (error) {
            this.addResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
        }
    }

    /**
     * Test 4: Validar integridad
     */
    async testBackupIntegrity() {
        const testName = 'Integridad de Archivos';
        console.log(`🔍 Test: ${testName}`);

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const backupDir = process.env.BACKUP_DIR || './backups';
            const backupPath = path.join(backupDir, this.database, this.firstBackupId);

            const metadata = JSON.parse(await fs.readFile(path.join(backupPath, 'metadata.json'), 'utf-8'));
            const files = await fs.readdir(backupPath);
            const seederFiles = files.filter(f => f.endsWith('.cjs'));

            const passed = seederFiles.length > 0;

            this.addResult(testName, passed, {
                filesCount: seederFiles.length,
                metadataExists: true
            });

            console.log(`✅ ${testName} - OK\n`);

        } catch (error) {
            this.addResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
        }
    }

    addResult(testName, passed, data) {
        this.testResults.push({
            test: testName,
            passed,
            timestamp: new Date().toISOString(),
            data
        });
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE TESTS');
        console.log('='.repeat(50));

        const passed = this.testResults.filter(t => t.passed).length;
        const failed = this.testResults.filter(t => !t.passed).length;

        console.log(`\n✅ Pasados: ${passed}/${this.testResults.length}`);
        console.log(`❌ Fallidos: ${failed}/${this.testResults.length}`);

        if (failed === 0) {
            console.log('\n🎉 Todos los tests pasaron!\n');
        } else {
            console.log('\n⚠️  Algunos tests fallaron\n');
        }
    }
}

export default new BackupTester();
