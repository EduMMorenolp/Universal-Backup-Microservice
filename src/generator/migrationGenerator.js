import fs from 'fs/promises';
import path from 'path';

/**
 * Generador de migraciones de Sequelize
 */
class MigrationGenerator {
    constructor(backupDir = './backups') {
        this.backupDir = backupDir;
    }

    /**
     * Genera migración para crear tabla
     */
    generateCreateTableMigration(tableName, definition) {
        const attributes = this.formatAttributesForMigration(definition.attributes);
        
        return `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('${tableName}', ${JSON.stringify(attributes, null, 8)});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('${tableName}');
    }
};`;
    }

    /**
     * Genera migración para eliminar tabla
     */
    generateDropTableMigration(tableName) {
        return `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.dropTable('${tableName}');
    },

    async down(queryInterface, Sequelize) {
        // Nota: No se puede recrear automáticamente la tabla eliminada
        // Revisar backup de esquema para restaurar manualmente
        throw new Error('Cannot automatically recreate dropped table ${tableName}');
    }
};`;
    }

    /**
     * Genera migración para modificar tabla
     */
    generateAlterTableMigration(tableName, changes) {
        let upCommands = [];
        let downCommands = [];

        // Columnas añadidas
        for (const col of changes.addedColumns) {
            const attr = this.formatAttributeForMigration(col.definition);
            upCommands.push(`        await queryInterface.addColumn('${tableName}', '${col.name}', ${JSON.stringify(attr, null, 12)});`);
            downCommands.push(`        await queryInterface.removeColumn('${tableName}', '${col.name}');`);
        }

        // Columnas eliminadas
        for (const colName of changes.droppedColumns) {
            upCommands.push(`        await queryInterface.removeColumn('${tableName}', '${colName}');`);
            downCommands.push(`        // Nota: No se puede recrear automáticamente la columna '${colName}'`);
        }

        // Columnas modificadas
        for (const col of changes.modifiedColumns) {
            const attr = this.formatAttributeForMigration(col.new);
            upCommands.push(`        await queryInterface.changeColumn('${tableName}', '${col.name}', ${JSON.stringify(attr, null, 12)});`);
            const oldAttr = this.formatAttributeForMigration(col.old);
            downCommands.push(`        await queryInterface.changeColumn('${tableName}', '${col.name}', ${JSON.stringify(oldAttr, null, 12)});`);
        }

        return `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
${upCommands.join('\n')}
    },

    async down(queryInterface, Sequelize) {
${downCommands.reverse().join('\n')}
    }
};`;
    }

    /**
     * Guarda esquema completo como migraciones
     */
    async saveSchemaAsMigrations(dbName, schema) {
        const backupId = this.generateSchemaBackupId();
        const dbFolder = path.join(this.backupDir, dbName);
        const backupPath = path.join(dbFolder, backupId);
        await fs.mkdir(backupPath, { recursive: true });

        const files = [];
        let timestamp = Date.now();

        for (const [tableName, definition] of Object.entries(schema)) {
            const migration = this.generateCreateTableMigration(tableName, definition);
            const filename = `${timestamp}-create-${tableName}.js`;
            const filePath = path.join(backupPath, filename);
            
            await fs.writeFile(filePath, migration);
            files.push(filePath);
            timestamp += 1000; // Incrementar timestamp
        }

        // Guardar metadata
        const metadata = {
            backupId,
            database: dbName,
            type: 'schema',
            timestamp: new Date().toISOString(),
            tables: Object.keys(schema).length,
            files: files.length,
            schema
        };

        await fs.writeFile(
            path.join(backupPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        return {
            backupId,
            database: dbName,
            backupPath,
            files,
            tables: Object.keys(schema).length
        };
    }

    /**
     * Guarda cambios incrementales como migraciones
     */
    async saveIncrementalMigrations(dbName, changes, baseSchemaId) {
        const backupId = this.generateIncrementalSchemaId();
        const dbFolder = path.join(this.backupDir, dbName);
        const backupPath = path.join(dbFolder, backupId);
        await fs.mkdir(backupPath, { recursive: true });

        const files = [];
        let timestamp = Date.now();

        // Tablas nuevas
        for (const table of changes.newTables) {
            const migration = this.generateCreateTableMigration(table.tableName, table.definition);
            const filename = `${timestamp}-create-${table.tableName}.js`;
            const filePath = path.join(backupPath, filename);
            
            await fs.writeFile(filePath, migration);
            files.push(filePath);
            timestamp += 1000;
        }

        // Tablas eliminadas
        for (const tableName of changes.droppedTables) {
            const migration = this.generateDropTableMigration(tableName);
            const filename = `${timestamp}-drop-${tableName}.js`;
            const filePath = path.join(backupPath, filename);
            
            await fs.writeFile(filePath, migration);
            files.push(filePath);
            timestamp += 1000;
        }

        // Tablas modificadas
        for (const table of changes.modifiedTables) {
            const migration = this.generateAlterTableMigration(table.tableName, table.changes);
            const filename = `${timestamp}-alter-${table.tableName}.js`;
            const filePath = path.join(backupPath, filename);
            
            await fs.writeFile(filePath, migration);
            files.push(filePath);
            timestamp += 1000;
        }

        // Guardar metadata
        const metadata = {
            backupId,
            database: dbName,
            type: 'schema-incremental',
            basedOn: baseSchemaId,
            timestamp: new Date().toISOString(),
            changes,
            files: files.length
        };

        await fs.writeFile(
            path.join(backupPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        return {
            backupId,
            database: dbName,
            backupPath,
            files,
            changes,
            basedOn: baseSchemaId
        };
    }

    /**
     * Formatea atributos para migración
     */
    formatAttributesForMigration(attributes) {
        const formatted = {};
        
        for (const [name, attr] of Object.entries(attributes)) {
            formatted[name] = this.formatAttributeForMigration(attr);
        }

        return formatted;
    }

    /**
     * Formatea un atributo individual
     */
    formatAttributeForMigration(attr) {
        const formatted = {
            type: `Sequelize.${attr.type}`,
            allowNull: attr.allowNull
        };

        if (attr.primaryKey) formatted.primaryKey = true;
        if (attr.autoIncrement) formatted.autoIncrement = true;
        if (attr.defaultValue !== null && attr.defaultValue !== undefined) {
            formatted.defaultValue = attr.defaultValue;
        }

        return formatted;
    }

    /**
     * Genera ID para backup de esquema
     */
    generateSchemaBackupId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `schema-${year}${month}${day}-${hour}${minute}${second}`;
    }

    /**
     * Genera ID para backup incremental de esquema
     */
    generateIncrementalSchemaId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `schema-incremental-${year}${month}${day}-${hour}${minute}${second}`;
    }
}

export default MigrationGenerator;