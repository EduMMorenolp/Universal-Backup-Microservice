/**
 * Analizador de modelos Sequelize
 * Inspecciona estructura y dependencias automáticamente
 */
class ModelAnalyzer {
    /**
     * Analiza todos los modelos de una instancia Sequelize
     */
    async analyzeModels(sequelize) {
        const models = Object.keys(sequelize.models);
        const modelGraph = {};

        console.log(`\n🔍 Analizando ${models.length} modelos...\n`);

        for (const modelName of models) {
            const model = sequelize.models[modelName];
            
            modelGraph[modelName] = {
                tableName: model.tableName,
                attributes: this.getAttributes(model),
                associations: this.getAssociations(model),
                dependencies: this.getDependencies(model),
                recordCount: await this.getRecordCount(model)
            };

            console.log(`✅ ${modelName}: ${modelGraph[modelName].recordCount} registros`);
        }

        return modelGraph;
    }

    /**
     * Obtiene atributos del modelo
     */
    getAttributes(model) {
        const attributes = {};
        
        for (const [key, attr] of Object.entries(model.rawAttributes)) {
            attributes[key] = {
                type: attr.type.constructor.name,
                allowNull: attr.allowNull,
                primaryKey: attr.primaryKey || false,
                autoIncrement: attr.autoIncrement || false
            };
        }

        return attributes;
    }

    /**
     * Obtiene asociaciones del modelo
     */
    getAssociations(model) {
        const associations = [];
        
        for (const [key, association] of Object.entries(model.associations)) {
            associations.push({
                name: key,
                type: association.associationType,
                target: association.target.name,
                foreignKey: association.foreignKey
            });
        }

        return associations;
    }

    /**
     * Identifica dependencias (belongsTo = depende de otro modelo)
     */
    getDependencies(model) {
        const dependencies = [];
        
        for (const [key, association] of Object.entries(model.associations)) {
            if (association.associationType === 'BelongsTo') {
                dependencies.push(association.target.name);
            }
        }

        return dependencies;
    }

    /**
     * Cuenta registros del modelo
     */
    async getRecordCount(model) {
        try {
            return await model.count();
        } catch (error) {
            return 0;
        }
    }

    /**
     * Genera reporte de análisis
     */
    generateReport(modelGraph) {
        const report = {
            totalModels: Object.keys(modelGraph).length,
            totalRecords: 0,
            models: []
        };

        for (const [modelName, data] of Object.entries(modelGraph)) {
            report.totalRecords += data.recordCount;
            report.models.push({
                name: modelName,
                table: data.tableName,
                records: data.recordCount,
                dependencies: data.dependencies.length,
                associations: data.associations.length
            });
        }

        return report;
    }
}

export default ModelAnalyzer;
