import { DataTypes } from 'sequelize';

/**
 * Analizador de esquemas de base de datos
 */
class SchemaAnalyzer {
    /**
     * Extrae estructura completa de tablas
     */
    async extractSchema(sequelize) {
        const queryInterface = sequelize.getQueryInterface();
        const tables = await queryInterface.showAllTables();
        const schema = {};

        for (const tableName of tables) {
            const attributes = await queryInterface.describeTable(tableName);
            const indexes = await queryInterface.showIndex(tableName);
            
            schema[tableName] = {
                tableName,
                attributes: this.formatAttributes(attributes),
                indexes: this.formatIndexes(indexes),
                constraints: await this.getConstraints(queryInterface, tableName)
            };
        }

        return schema;
    }

    /**
     * Compara dos esquemas y detecta diferencias
     */
    compareSchemas(oldSchema, newSchema) {
        const changes = {
            newTables: [],
            droppedTables: [],
            modifiedTables: []
        };

        // Tablas nuevas
        for (const tableName in newSchema) {
            if (!oldSchema[tableName]) {
                changes.newTables.push({
                    tableName,
                    definition: newSchema[tableName]
                });
            }
        }

        // Tablas eliminadas
        for (const tableName in oldSchema) {
            if (!newSchema[tableName]) {
                changes.droppedTables.push(tableName);
            }
        }

        // Tablas modificadas
        for (const tableName in newSchema) {
            if (oldSchema[tableName]) {
                const tableChanges = this.compareTable(oldSchema[tableName], newSchema[tableName]);
                if (tableChanges.hasChanges) {
                    changes.modifiedTables.push({
                        tableName,
                        changes: tableChanges
                    });
                }
            }
        }

        return changes;
    }

    /**
     * Compara una tabla específica
     */
    compareTable(oldTable, newTable) {
        const changes = {
            hasChanges: false,
            addedColumns: [],
            droppedColumns: [],
            modifiedColumns: [],
            addedIndexes: [],
            droppedIndexes: []
        };

        // Columnas añadidas
        for (const colName in newTable.attributes) {
            if (!oldTable.attributes[colName]) {
                changes.addedColumns.push({
                    name: colName,
                    definition: newTable.attributes[colName]
                });
                changes.hasChanges = true;
            }
        }

        // Columnas eliminadas
        for (const colName in oldTable.attributes) {
            if (!newTable.attributes[colName]) {
                changes.droppedColumns.push(colName);
                changes.hasChanges = true;
            }
        }

        // Columnas modificadas
        for (const colName in newTable.attributes) {
            if (oldTable.attributes[colName]) {
                if (JSON.stringify(oldTable.attributes[colName]) !== JSON.stringify(newTable.attributes[colName])) {
                    changes.modifiedColumns.push({
                        name: colName,
                        old: oldTable.attributes[colName],
                        new: newTable.attributes[colName]
                    });
                    changes.hasChanges = true;
                }
            }
        }

        return changes;
    }

    /**
     * Formatea atributos de tabla
     */
    formatAttributes(attributes) {
        const formatted = {};
        
        for (const [name, attr] of Object.entries(attributes)) {
            formatted[name] = {
                type: attr.type,
                allowNull: attr.allowNull,
                defaultValue: attr.defaultValue,
                primaryKey: attr.primaryKey || false,
                autoIncrement: attr.autoIncrement || false
            };
        }

        return formatted;
    }

    /**
     * Formatea índices
     */
    formatIndexes(indexes) {
        return indexes.map(index => ({
            name: index.name,
            unique: index.unique,
            fields: index.fields
        }));
    }

    /**
     * Obtiene constraints de tabla
     */
    async getConstraints(queryInterface, tableName) {
        try {
            const constraints = await queryInterface.getForeignKeyReferencesForTable(tableName);
            return constraints.map(constraint => ({
                name: constraint.constraintName,
                columnName: constraint.columnName,
                referencedTableName: constraint.referencedTableName,
                referencedColumnName: constraint.referencedColumnName
            }));
        } catch (error) {
            return [];
        }
    }
}

export default SchemaAnalyzer;