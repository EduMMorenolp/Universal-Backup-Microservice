import fs from 'fs/promises';
import path from 'path';

/**
 * Extractor de backups incrementales
 */
class IncrementalExtractor {
    /**
     * Detecta cambios desde el último backup
     */
    async detectChanges(sequelize, baseBackupPath, models) {
        const changes = {
            new: {},
            modified: {},
            deleted: {}
        };

        // Leer metadata del backup base
        const baseMetadata = JSON.parse(
            await fs.readFile(path.join(baseBackupPath, 'metadata.json'), 'utf-8')
        );

        const baseTimestamp = new Date(baseMetadata.timestamp);

        for (const modelName of models) {
            const Model = sequelize.models[modelName];
            if (!Model) continue;

            // Verificar si el modelo tiene updated_at
            const hasUpdatedAt = Model.rawAttributes.updated_at || Model.rawAttributes.updatedAt;
            if (!hasUpdatedAt) {
                console.log(`⚠️  Modelo ${modelName} sin updated_at, omitiendo...`);
                continue;
            }

            // Detectar registros nuevos o modificados
            const changedRecords = await Model.findAll({
                where: {
                    updated_at: {
                        [sequelize.Sequelize.Op.gt]: baseTimestamp
                    }
                },
                raw: true
            });

            if (changedRecords.length > 0) {
                // Separar nuevos de modificados
                const newRecords = [];
                const modifiedRecords = [];

                for (const record of changedRecords) {
                    const createdAt = new Date(record.created_at);
                    if (createdAt > baseTimestamp) {
                        newRecords.push(record);
                    } else {
                        modifiedRecords.push(record);
                    }
                }

                if (newRecords.length > 0) {
                    changes.new[modelName] = newRecords;
                }
                if (modifiedRecords.length > 0) {
                    changes.modified[modelName] = modifiedRecords;
                }
            }

            // Detectar eliminaciones (soft delete)
            const hasIsDeleted = Model.rawAttributes.is_deleted || Model.rawAttributes.isDeleted;
            if (hasIsDeleted) {
                const deletedRecords = await Model.findAll({
                    where: {
                        is_deleted: true,
                        updated_at: {
                            [sequelize.Sequelize.Op.gt]: baseTimestamp
                        }
                    },
                    raw: true
                });

                if (deletedRecords.length > 0) {
                    changes.deleted[modelName] = deletedRecords;
                }
            }
        }

        return changes;
    }

    /**
     * Extrae backup incremental
     */
    async extractIncremental(sequelize, baseBackupId, database, options = {}) {
        const backupDir = process.env.BACKUP_DIR || './backups';
        const baseBackupPath = path.join(backupDir, database, baseBackupId);

        // Verificar que existe el backup base
        try {
            await fs.access(baseBackupPath);
        } catch (error) {
            throw new Error(`Base backup not found: ${baseBackupId}`);
        }

        // Obtener modelos ordenados
        const modelNames = Object.keys(sequelize.models);

        // Detectar cambios
        console.log('🔍 Detectando cambios desde último backup...');
        const changes = await this.detectChanges(sequelize, baseBackupPath, modelNames);

        // Contar cambios
        const stats = {
            new: Object.values(changes.new).reduce((sum, arr) => sum + arr.length, 0),
            modified: Object.values(changes.modified).reduce((sum, arr) => sum + arr.length, 0),
            deleted: Object.values(changes.deleted).reduce((sum, arr) => sum + arr.length, 0)
        };

        console.log(`📊 Cambios detectados: ${stats.new} nuevos, ${stats.modified} modificados, ${stats.deleted} eliminados`);

        // Crear directorio para backup incremental (separado)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '');
        const backupId = `incremental-${timestamp}`;
        const backupPath = path.join(backupDir, database, backupId);
        await fs.mkdir(backupPath, { recursive: true });

        // Generar seeders incrementales
        let fileCount = 0;
        const chunkSize = options.chunkSize || 300;

        for (const [modelName, records] of Object.entries(changes.new)) {
            fileCount += await this.generateIncrementalSeeders(
                backupPath,
                modelName,
                records,
                'new',
                chunkSize
            );
        }

        for (const [modelName, records] of Object.entries(changes.modified)) {
            fileCount += await this.generateIncrementalSeeders(
                backupPath,
                modelName,
                records,
                'modified',
                chunkSize
            );
        }

        for (const [modelName, records] of Object.entries(changes.deleted)) {
            fileCount += await this.generateIncrementalSeeders(
                backupPath,
                modelName,
                records,
                'deleted',
                chunkSize
            );
        }

        // Crear metadata
        const metadata = {
            backupId,
            database,
            timestamp: new Date().toISOString(),
            type: 'incremental',
            basedOn: baseBackupId,
            format: options.format || 'seeders',
            chunkSize,
            changes: stats,
            totalRecords: stats.new + stats.modified,
            totalFiles: fileCount
        };

        await fs.writeFile(
            path.join(backupPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        return {
            backupId,
            type: 'incremental',
            basedOn: baseBackupId,
            changes: stats,
            files: fileCount,
            path: backupPath
        };
    }

    /**
     * Genera seeders incrementales
     */
    async generateIncrementalSeeders(backupPath, modelName, records, changeType, chunkSize) {
        const tableName = this.toSnakeCase(modelName);
        let fileCount = 0;

        // Fragmentar en chunks
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const partNumber = Math.floor(i / chunkSize) + 1;
            const timestamp = Date.now() + fileCount;
            
            const fileName = `${timestamp}-inc-${changeType}-${tableName}-part-${partNumber}.cjs`;
            const filePath = path.join(backupPath, fileName);

            const seederContent = this.generateSeederContent(tableName, chunk, changeType);
            await fs.writeFile(filePath, seederContent);

            fileCount++;
        }

        return fileCount;
    }

    /**
     * Genera contenido del seeder incremental
     */
    generateSeederContent(tableName, records, changeType) {
        const ids = records.map(r => `'${r.id}'`).join(', ');

        if (changeType === 'deleted') {
            // Para registros eliminados: marcar is_deleted = true
            return `module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('${tableName}', 
      { is_deleted: true },
      { id: [${ids}] }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('${tableName}', 
      { is_deleted: false },
      { id: [${ids}] }
    );
  }
};
`;
        } else if (changeType === 'new') {
            // Para registros nuevos: INSERT
            const values = records.map(record => {
                const fields = Object.entries(record)
                    .map(([key, value]) => {
                        if (value === null) return `${key}: null`;
                        if (typeof value === 'string') return `${key}: '${value.replace(/'/g, "''")}'`;
                        if (value instanceof Date) return `${key}: new Date('${value.toISOString()}')`;
                        if (typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
                        return `${key}: ${value}`;
                    })
                    .join(', ');
                return `{ ${fields} }`;
            }).join(',\n      ');

            return `module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('${tableName}', [
      ${values}
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('${tableName}', {
      id: [${ids}]
    }, {});
  }
};
`;
        } else {
            // Para registros modificados: UPDATE
            const updates = records.map(record => {
                const setFields = Object.entries(record)
                    .filter(([key]) => key !== 'id')
                    .map(([key, value]) => {
                        if (value === null) return `${key} = NULL`;
                        if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
                        if (value instanceof Date) return `${key} = '${value.toISOString()}'`;
                        if (typeof value === 'object') return `${key} = '${JSON.stringify(value)}'`;
                        return `${key} = ${value}`;
                    })
                    .join(', ');
                
                return `UPDATE ${tableName} SET ${setFields} WHERE id = '${record.id}';`;
            }).join('\n    ');

            return `module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(\`
    ${updates}
    \`);
  },

  async down(queryInterface, Sequelize) {
    // Rollback de modificaciones requiere backup previo
    console.log('Rollback de modificaciones no implementado');
  }
};
`;
        }
    }

    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}

export default new IncrementalExtractor();
