# 🏗️ Arquitectura - Universal Backup Microservice

Documentación de la arquitectura y estructura interna del microservicio.

## 📋 Índice

1. [Visión General](#-visión-general)
2. [Estructura de Directorios](#-estructura-de-directorios)
3. [Componentes Principales](#-componentes-principales)
4. [Flujo de Datos](#-flujo-de-datos)
5. [Patrones de Diseño](#-patrones-de-diseño)

---

## 🎯 Visión General

El Universal Backup Microservice es un sistema modular diseñado para:

- Analizar automáticamente cualquier base de datos Sequelize
- Resolver dependencias entre modelos
- Extraer datos con fragmentación inteligente
- Generar backups en múltiples formatos
- Programar backups automáticos
- Gestionar almacenamiento local y en la nube

### Principios de Diseño

- ✅ **Universal** - Funciona con cualquier BD Sequelize
- ✅ **Modular** - Componentes independientes y reutilizables
- ✅ **Escalable** - Maneja múltiples bases de datos
- ✅ **Seguro** - No almacena credenciales permanentemente
- ✅ **Flexible** - Múltiples formatos y opciones

---

## 📁 Estructura de Directorios

```
backup-microservice/
├── src/
│   ├── analyzer/           # Análisis de modelos y dependencias
│   │   ├── modelAnalyzer.js
│   │   └── dependencyResolver.js
│   ├── extractor/          # Extracción de datos
│   │   └── dataExtractor.js
│   ├── generator/          # Generación de archivos (futuro)
│   ├── scheduler/          # Programación de backups
│   │   └── cronScheduler.js
│   ├── api/                # Controladores REST
│   │   ├── backupController.js
│   │   └── advancedController.js
│   └── utils/              # Utilidades
│       ├── dbConnector.js
│       ├── backupComparator.js
│       ├── s3Uploader.js
│       └── metricsCollector.js
├── config/                 # Configuración
│   ├── services.json
│   └── schedules.json
├── backups/                # Backups generados
│   └── {database_name}/
│       └── {backup_id}/
├── documents/              # Documentación
├── server.js               # Servidor Express
├── .env                    # Variables de entorno
└── package.json
```

---

## 🔧 Componentes Principales

### 1. Analyzer (Analizador)

**Responsabilidad:** Inspeccionar estructura de BD y detectar dependencias.

#### modelAnalyzer.js

```javascript
// Funciones principales:
- analyzeDatabase(sequelize)
  → Detecta todos los modelos
  → Cuenta registros por tabla
  → Identifica asociaciones
  → Genera reporte completo

- detectModels(sequelize)
  → Usa information_schema
  → Crea modelos dinámicamente
  → Detecta tipos de datos

- detectAssociations(models)
  → Identifica claves foráneas
  → Mapea relaciones entre modelos
```

#### dependencyResolver.js

```javascript
// Funciones principales:
- resolveDependencies(models)
  → Ordenamiento topológico
  → Detecta dependencias circulares
  → Genera orden de extracción

- buildDependencyGraph(models)
  → Construye grafo de dependencias
  → Identifica nodos sin dependencias
```

**Flujo:**
```
BD → detectModels → detectAssociations → resolveDependencies → Orden
```

---

### 2. Extractor (Extractor)

**Responsabilidad:** Extraer datos con fragmentación y generar archivos.

#### dataExtractor.js

```javascript
// Funciones principales:
- extractData(sequelize, options)
  → Extrae datos en orden correcto
  → Fragmenta en chunks
  → Genera archivos por formato
  → Crea metadata

- extractModelData(model, chunkSize)
  → Extrae datos de un modelo
  → Fragmenta en partes
  → Retorna chunks con datos

- generateSeederFile(model, data, timestamp, part)
  → Genera archivo .cjs
  → Formato seguro (IDs específicos)
  → Métodos up/down
```

**Flujo:**
```
Orden → extractModelData → Chunks → generateSeederFile → Archivos
```

---

### 3. Scheduler (Programador)

**Responsabilidad:** Gestionar backups programados con cron.

#### cronScheduler.js

```javascript
// Funciones principales:
- scheduleBackup(config)
  → Crea cron job
  → Configura retención
  → Persiste configuración

- loadSchedules()
  → Carga schedules al inicio
  → Reactiva cron jobs

- cancelSchedule(id)
  → Detiene cron job
  → Elimina configuración

- cleanupOldBackups(database, retentionDays)
  → Elimina backups antiguos
  → Ejecuta automáticamente
```

**Flujo:**
```
Config → scheduleBackup → Cron Job → Backup → Cleanup
```

---

### 4. Utils (Utilidades)

#### dbConnector.js

```javascript
// Funciones principales:
- connectToDatabase(dbConfig)
  → Crea conexión Sequelize
  → Configura pool
  → Valida conexión

- closeConnection(sequelize)
  → Cierra conexión
  → Libera recursos
```

#### backupComparator.js

```javascript
// Funciones principales:
- compareBackups(database, backupId1, backupId2)
  → Lee metadata de ambos
  → Compara archivos
  → Detecta diferencias
  → Genera reporte
```

#### s3Uploader.js

```javascript
// Funciones principales:
- uploadBackupToS3(database, backupId, s3Config)
  → Comprime backup a ZIP
  → Sube a S3
  → Retorna URL pública
```

#### metricsCollector.js

```javascript
// Funciones principales:
- collectMetrics()
  → Estadísticas de backups
  → Información de almacenamiento
  → Estado de schedules
  → Métricas por BD
```

---

### 5. API Controllers

#### backupController.js

```javascript
// Endpoints básicos:
- POST /api/backup/analyze
- POST /api/backup/extract
- GET /api/backup/list
- DELETE /api/backup/:database/:backupId
```

#### advancedController.js

```javascript
// Endpoints avanzados:
- POST /api/advanced/schedule
- GET /api/advanced/schedules
- DELETE /api/advanced/schedule/:id
- POST /api/advanced/compare
- POST /api/advanced/upload-s3
- GET /api/advanced/metrics
```

---

## 🔄 Flujo de Datos

### Análisis de Base de Datos

```
Request → dbConnector → modelAnalyzer → dependencyResolver → Response
   ↓           ↓              ↓                  ↓
dbConfig   Sequelize    Detectar Modelos   Ordenar Modelos
                        Detectar Asociaciones
```

### Extracción de Backup

```
Request → dbConnector → dataExtractor → Archivos → Response
   ↓           ↓              ↓            ↓
dbConfig   Sequelize    Extraer Datos   Seeders
options                 Fragmentar      JSON/SQL
                        Generar
```

### Backup Programado

```
Schedule Config → cronScheduler → Cron Job → dataExtractor → Cleanup
       ↓               ↓              ↓            ↓            ↓
   Persistir      Crear Job    Ejecutar      Generar      Eliminar
                               Periódico      Backup       Antiguos
```

### Upload a S3

```
Backup → Comprimir → S3 Upload → URL Pública
  ↓         ↓           ↓            ↓
Local     ZIP       AWS SDK      Response
```

---

## 🎨 Patrones de Diseño

### 1. Singleton Pattern

**Uso:** Conexiones de base de datos

```javascript
// Una sola conexión por análisis/extracción
const sequelize = await connectToDatabase(dbConfig);
// ... operaciones
await closeConnection(sequelize);
```

### 2. Factory Pattern

**Uso:** Creación de modelos dinámicos

```javascript
// Crear modelos basados en information_schema
const model = sequelize.define(tableName, attributes, options);
```

### 3. Strategy Pattern

**Uso:** Múltiples formatos de backup

```javascript
// Estrategia según formato
switch (format) {
  case 'seeders': return generateSeederFile();
  case 'json': return generateJSONFile();
  case 'sql': return generateSQLFile();
}
```

### 4. Observer Pattern

**Uso:** Cron jobs y eventos

```javascript
// Observar ejecución de backups programados
cronJob.on('complete', () => {
  console.log('Backup completed');
  cleanupOldBackups();
});
```

### 5. Repository Pattern

**Uso:** Acceso a datos de backups

```javascript
// Abstracción de acceso a backups
class BackupRepository {
  list() { /* ... */ }
  get(id) { /* ... */ }
  delete(id) { /* ... */ }
}
```

---

## 🔐 Seguridad

### Gestión de Credenciales

```javascript
// NO almacenar credenciales
const sequelize = await connectToDatabase(dbConfig);
// Usar solo en memoria
await closeConnection(sequelize);
// Liberar recursos
```

### Validación de Entrada

```javascript
// Validar configuración de BD
if (!dbConfig.host || !dbConfig.database) {
  throw new Error('Invalid database configuration');
}
```

### Sanitización de Datos

```javascript
// Escapar valores en seeders
const sanitizedValue = JSON.stringify(value);
```

---

## 📊 Performance

### Connection Pooling

```javascript
{
  pool: {
    max: 5,      // Máximo 5 conexiones
    min: 0,      // Mínimo 0 conexiones
    acquire: 30000,  // 30s timeout
    idle: 10000      // 10s idle
  }
}
```

### Chunking

```javascript
// Fragmentar en chunks de 300 registros
const chunkSize = 300;
for (let i = 0; i < total; i += chunkSize) {
  const chunk = await Model.findAll({
    limit: chunkSize,
    offset: i
  });
}
```

### Lazy Loading

```javascript
// Cargar modelos solo cuando se necesitan
const models = await detectModels(sequelize);
```

---

## 🧪 Testing

### Estructura de Tests (Futuro)

```
tests/
├── unit/
│   ├── analyzer.test.js
│   ├── extractor.test.js
│   └── scheduler.test.js
├── integration/
│   ├── backup.test.js
│   └── api.test.js
└── e2e/
    └── full-backup.test.js
```

---

## 🚀 Escalabilidad

### Múltiples Bases de Datos

```javascript
// Organización por BD
backups/
├── database1/
├── database2/
└── database3/
```

### Paralelización (Futuro)

```javascript
// Extraer múltiples modelos en paralelo
await Promise.all(
  models.map(model => extractModelData(model))
);
```

---

## 📝 Convenciones de Código

### Naming

- **Archivos:** camelCase (modelAnalyzer.js)
- **Funciones:** camelCase (analyzeDatabase)
- **Clases:** PascalCase (BackupRepository)
- **Constantes:** UPPER_SNAKE_CASE (CHUNK_SIZE)

### Comentarios

```javascript
/**
 * Analiza estructura de base de datos
 * @param {Sequelize} sequelize - Instancia de Sequelize
 * @returns {Promise<Object>} Reporte de análisis
 */
async function analyzeDatabase(sequelize) {
  // Implementación
}
```

### Error Handling

```javascript
try {
  await operation();
} catch (error) {
  console.error('Error:', error);
  throw new Error(`Operation failed: ${error.message}`);
}
```

---

## 🔗 Recursos

- [API Endpoints](API-ENDPOINTS.md)
- [Características Avanzadas](ADVANCED-FEATURES.md)
- [Bases de Datos en la Nube](CLOUD-DATABASES.md)
- [Ejemplos](EXAMPLES.md)
