/**
 * Resolvedor de dependencias
 * Ordena modelos según claves foráneas usando ordenamiento topológico
 */
class DependencyResolver {
    /**
     * Resuelve orden de extracción basado en dependencias
     */
    resolveOrder(modelGraph) {
        const visited = new Set();
        const visiting = new Set();
        const order = [];

        const visit = (modelName) => {
            if (visited.has(modelName)) return;
            
            if (visiting.has(modelName)) {
                console.warn(`⚠️  Dependencia circular detectada en: ${modelName}`);
                return;
            }

            visiting.add(modelName);
            
            // Visitar dependencias primero
            const dependencies = modelGraph[modelName]?.dependencies || [];
            for (const dep of dependencies) {
                if (modelGraph[dep]) {
                    visit(dep);
                }
            }
            
            visiting.delete(modelName);
            visited.add(modelName);
            order.push(modelName);
        };

        // Visitar todos los modelos
        for (const modelName of Object.keys(modelGraph)) {
            visit(modelName);
        }

        return order;
    }

    /**
     * Genera timestamps automáticos para cada modelo
     */
    generateTimestamps(orderedModels) {
        const baseDate = new Date();
        const result = {};

        orderedModels.forEach((modelName, index) => {
            const timestamp = new Date(baseDate.getTime() + index * 1000);
            result[modelName] = {
                timestamp: this.formatTimestamp(timestamp),
                order: index + 1
            };
        });

        return result;
    }

    /**
     * Formatea timestamp para nombres de archivo
     */
    formatTimestamp(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}${hour}${minute}${second}`;
    }

    /**
     * Genera configuración de entitiesOrder
     */
    generateEntitiesOrder(orderedModels, modelGraph, timestamps) {
        const entitiesOrder = {};

        orderedModels.forEach((modelName) => {
            const model = modelGraph[modelName];
            entitiesOrder[modelName] = {
                timestamp: timestamps[modelName].timestamp,
                tableName: model.tableName,
                description: this.generateDescription(modelName)
            };
        });

        return entitiesOrder;
    }

    /**
     * Genera descripción automática del modelo
     */
    generateDescription(modelName) {
        // Convertir CamelCase a palabras
        const words = modelName.replace(/([A-Z])/g, ' $1').trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
}

export default DependencyResolver;
