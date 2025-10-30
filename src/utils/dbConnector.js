import { Sequelize } from 'sequelize';

/**
 * Conector de base de datos
 * Conecta a cualquier BD Sequelize y carga modelos dinámicamente
 */
class DBConnector {
    /**
     * Conecta a una base de datos
     */
    async connect(dbConfig) {
        const sequelize = new Sequelize(
            dbConfig.database,
            dbConfig.username,
            dbConfig.password,
            {
                host: dbConfig.host,
                port: dbConfig.port,
                dialect: dbConfig.dialect || 'postgres',
                logging: false,
                pool: {
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                }
            }
        );

        try {
            await sequelize.authenticate();
            console.log(`✅ Conectado a: ${dbConfig.database}`);
            
            // Cargar modelos automáticamente
            await this.loadModels(sequelize);
            
            return sequelize;
        } catch (error) {
            console.error(`❌ Error conectando a ${dbConfig.database}:`, error.message);
            throw error;
        }
    }

    /**
     * Carga modelos automáticamente desde la BD
     */
    async loadModels(sequelize) {
        try {
            // Obtener todas las tablas
            const [tables] = await sequelize.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `);

            console.log(`📋 Encontradas ${tables.length} tablas`);

            // Definir modelos dinámicamente
            for (const { table_name } of tables) {
                await this.defineModel(sequelize, table_name);
            }

            // Cargar asociaciones después de definir todos los modelos
            await this.loadAssociations(sequelize);

        } catch (error) {
            console.error('❌ Error cargando modelos:', error.message);
        }
    }

    /**
     * Define un modelo dinámicamente desde la estructura de tabla
     */
    async defineModel(sequelize, tableName) {
        try {
            // Obtener columnas de la tabla
            const [columns] = await sequelize.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = '${tableName}'
                ORDER BY ordinal_position;
            `);

            const attributes = {};
            
            for (const col of columns) {
                attributes[col.column_name] = {
                    type: this.mapDataType(col.data_type),
                    allowNull: col.is_nullable === 'YES',
                    primaryKey: col.column_name === 'id'
                };
            }

            // Nombre del modelo en PascalCase
            const modelName = this.toPascalCase(tableName);

            sequelize.define(modelName, attributes, {
                tableName,
                timestamps: false,
                underscored: true
            });

        } catch (error) {
            console.error(`❌ Error definiendo modelo ${tableName}:`, error.message);
        }
    }

    /**
     * Carga asociaciones desde claves foráneas
     */
    async loadAssociations(sequelize) {
        try {
            const [foreignKeys] = await sequelize.query(`
                SELECT
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY';
            `);

            for (const fk of foreignKeys) {
                const sourceModel = this.toPascalCase(fk.table_name);
                const targetModel = this.toPascalCase(fk.foreign_table_name);

                if (sequelize.models[sourceModel] && sequelize.models[targetModel]) {
                    sequelize.models[sourceModel].belongsTo(
                        sequelize.models[targetModel],
                        { foreignKey: fk.column_name }
                    );
                }
            }

        } catch (error) {
            console.error('❌ Error cargando asociaciones:', error.message);
        }
    }

    /**
     * Mapea tipos de datos SQL a Sequelize
     */
    mapDataType(sqlType) {
        const { DataTypes } = Sequelize;
        
        const typeMap = {
            'integer': DataTypes.INTEGER,
            'bigint': DataTypes.BIGINT,
            'character varying': DataTypes.STRING,
            'text': DataTypes.TEXT,
            'boolean': DataTypes.BOOLEAN,
            'timestamp without time zone': DataTypes.DATE,
            'timestamp with time zone': DataTypes.DATE,
            'date': DataTypes.DATEONLY,
            'uuid': DataTypes.UUID,
            'json': DataTypes.JSON,
            'jsonb': DataTypes.JSONB
        };

        return typeMap[sqlType] || DataTypes.STRING;
    }

    /**
     * Convierte snake_case a PascalCase
     */
    toPascalCase(str) {
        return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    /**
     * Cierra conexión
     */
    async disconnect(sequelize) {
        await sequelize.close();
        console.log('🔌 Conexión cerrada');
    }
}

const dbConnector = new DBConnector();

export const connectToDatabase = (dbConfig) => dbConnector.connect(dbConfig);
export const closeConnection = (sequelize) => dbConnector.disconnect(sequelize);

export default dbConnector;
