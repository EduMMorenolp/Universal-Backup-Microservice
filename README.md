# 🔄 Universal Backup Microservice

Microservicio universal de backup y análisis de bases de datos Sequelize para cualquier proyecto.

## 🎯 Características

### Características Básicas
- ✅ **Análisis Automático** - Inspecciona estructura de BD y modelos
- ✅ **Resolución de Dependencias** - Ordena modelos según claves foráneas
- ✅ **Backup Universal** - Funciona con cualquier BD Sequelize
- ✅ **Multi-Formato** - Genera seeders, JSON o SQL
- ✅ **API REST** - Endpoints para análisis y extracción
- ✅ **Multi-Servicio** - Gestiona múltiples bases de datos
- ✅ **Local y Nube** - Soporta bases de datos locales y en la nube

### Características Avanzadas
- ✅ **Backups Programados** - Cron scheduling con retención automática
- ✅ **Comparación de Backups** - Detecta diferencias entre backups
- ✅ **Upload a S3 con Metadatos** - Compresión, metadatos estructurados y manifest.json
- ✅ **Restore Completo** - Restauración con transacciones y rollback automático
- ✅ **Métricas Completas** - Estadísticas de backups y base de datos
- ✅ **Backup Incremental** - Base para backups diferenciales (en desarrollo)

## 🚀 Instalación

```bash
cd backup-microservice
npm install
```

## ⚙️ Configuración

### 1. Variables de Entorno

Copiar `.env.example` a `.env`:

```env
PORT=4000
BACKUP_DIR=./backups

# AWS S3 (opcional - para upload a S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name
```

### 2. Configurar Servicios

Editar `config/services.json`:

```json
{
  "services": [
    {
      "name": "my-backend",
      "database": {
        "host": "localhost",
        "port": 5432,
        "database": "my_database",
        "username": "postgres",
        "password": "password"
      }
    }
  ]
}
```

## 🎮 Uso

### Iniciar Microservicio

```bash
npm start
# o en desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:4000`

## 📚 Documentación

La documentación completa está organizada en la carpeta `documents/`:

- **[API-ENDPOINTS.md](documents/API-ENDPOINTS.md)** - Documentación completa de todos los endpoints
- **[ADVANCED-FEATURES.md](documents/ADVANCED-FEATURES.md)** - Guía de características avanzadas
- **[CLOUD-DATABASES.md](documents/CLOUD-DATABASES.md)** - Configuración para bases de datos en la nube
- **[ARCHITECTURE.md](documents/ARCHITECTURE.md)** - Arquitectura y estructura del microservicio
- **[EXAMPLES.md](documents/EXAMPLES.md)** - Ejemplos de uso y casos prácticos

## 🔧 API Endpoints - Resumen

### Básicos
- `GET /health` - Health check
- `POST /api/backup/analyze` - Analizar base de datos
- `POST /api/backup/extract` - Extraer backup
- `GET /api/backup/list` - Listar backups
- `DELETE /api/backup/:database/:backupId` - Eliminar backup

### Avanzados
- `POST /api/advanced/schedule` - Programar backup automático
- `GET /api/advanced/schedules` - Listar backups programados
- `DELETE /api/advanced/schedule/:id` - Cancelar backup programado
- `POST /api/advanced/compare` - Comparar dos backups
- `POST /api/advanced/upload-s3` - Subir backup a S3 con metadatos
- `GET /api/advanced/metrics` - Obtener métricas

### Restore
- `POST /api/restore` - Restaurar backup en BD destino
- `POST /api/restore/info` - Obtener información de backup
- `POST /api/restore/validate` - Validar BD destino
- `POST /api/restore/clean` - Limpiar BD destino

Ver documentación completa en [documents/API-ENDPOINTS.md](documents/API-ENDPOINTS.md)

## 📊 Flujo de Trabajo Básico

### 1. Analizar Base de Datos

```bash
curl -X POST http://localhost:4000/api/backup/analyze \
  -H "Content-Type: application/json" \
  -d '{"dbConfig": {"host": "localhost", "port": 5432, "database": "my_db", "username": "postgres", "password": "pass"}}'
```

### 2. Generar Backup

```bash
curl -X POST http://localhost:4000/api/backup/extract \
  -H "Content-Type: application/json" \
  -d '{"dbConfig": {...}, "options": {"chunkSize": 300, "format": "seeders"}}'
```

### 3. Restaurar Backup

```bash
curl -X POST http://localhost:4000/api/restore \
  -H "Content-Type: application/json" \
  -d '{"database": "my_db", "backupId": "backup-20250128-143022", "targetDbConfig": {...}, "options": {"force": true}}'
```

## 🎯 Casos de Uso

1. **Backup Automático** - Programar backups diarios con retención
2. **Migración de Datos** - Entre entornos (dev → staging → prod)
3. **Disaster Recovery** - Restore rápido con seeders generados
4. **Análisis de Estructura** - Documentar y entender BD
5. **Datos de Prueba** - Generar datasets consistentes
6. **Auditoría** - Comparar backups para detectar cambios
7. **Almacenamiento Cloud** - Upload automático a S3

## 📁 Estructura de Backups

Los backups se organizan por nombre de base de datos:

```
backups/
├── my_database/
│   ├── backup-20250128-143022/
│   │   ├── metadata.json
│   │   ├── 20250128120000-roles.cjs
│   │   ├── 20250128120001-users-part-1.cjs
│   │   └── ...
│   └── backup-20250128-150000/
│       └── ...
└── another_database/
    └── backup-20250128-160000/
        └── ...
```

## 🌐 Bases de Datos Soportadas

Compatible con cualquier PostgreSQL accesible por red:

- **Local** - PostgreSQL en localhost
- **AWS RDS** - Amazon Relational Database Service
- **Google Cloud SQL** - Google Cloud Platform
- **Azure Database** - Microsoft Azure
- **Heroku Postgres** - Heroku managed database
- **DigitalOcean** - Managed Databases
- **Cualquier PostgreSQL** - Con acceso de red

Ver configuración detallada en [documents/CLOUD-DATABASES.md](documents/CLOUD-DATABASES.md)

## 🔒 Seguridad

- ✅ No almacena credenciales (solo en memoria durante conexión)
- ✅ Conexiones temporales y cerradas después de uso
- ✅ Backups locales por defecto
- ✅ Soporte SSL para conexiones seguras
- ✅ Sin acceso externo por defecto
- ✅ Credenciales S3 opcionales y configurables

## 🚀 Características Destacadas

### Backups Programados
```javascript
// Backup diario a las 2 AM, retención de 7 días
{
  "schedule": "0 2 * * *",
  "retentionDays": 7
}
```

### Comparación de Backups
```javascript
// Detecta diferencias entre dos backups
{
  "backupId1": "backup-20250128-143022",
  "backupId2": "backup-20250128-150000"
}
```

### Upload a S3 con Metadatos
```javascript
// Comprime, sube con metadatos y genera manifest.json
{
  "backupId": "backup-20250128-143022",
  "s3Config": {
    "bucket": "my-backups",
    "region": "us-east-1"
  }
}
// Genera:
// - backup.zip con metadatos (database, records, version, size)
// - manifest.json con resumen completo
```

### Restore con Transacciones
```javascript
// Restaura con rollback automático en caso de error
{
  "database": "my_database",
  "backupId": "backup-20250128-143022",
  "targetDbConfig": {...},
  "options": {
    "force": true  // Limpia BD automáticamente
  }
}
```

### Métricas Completas
- Total de backups por base de datos
- Tamaño total de backups
- Estadísticas de registros
- Información de tablas

## 📦 Tecnologías

- **Node.js** - Runtime
- **Express** - API REST
- **Sequelize** - ORM y análisis de modelos
- **PostgreSQL** - Base de datos soportada
- **node-cron** - Scheduling de backups
- **AWS SDK** - Upload a S3
- **archiver** - Compresión de backups

## 📝 Notas Importantes

- Compatible con PostgreSQL (local y nube)
- Requiere Sequelize en servicios objetivo
- Genera seeders con formato seguro (IDs específicos en down)
- Fragmentación automática en chunks de 300 registros
- Funciona con cualquier BD accesible por red
- Backups organizados por nombre de base de datos

## 🔄 Roadmap

- [x] Análisis automático de modelos
- [x] Resolución de dependencias
- [x] Extracción con chunking
- [x] Backups programados (cron)
- [x] Comparación de backups
- [x] Upload a S3 con metadatos y manifest
- [x] Restore con transacciones y rollback
- [x] Métricas y estadísticas
- [x] Backup incremental completo
- [ ] Anonimización de datos
- [ ] Dashboard web
- [ ] Soporte para MySQL
- [ ] Notificaciones (email/webhook)
- [ ] Download desde S3
- [ ] Restore desde S3

## 📖 Documentación Adicional

- [Postman Collection](Universal%20Backup%20Microservice.postman_collection.json) - Colección completa de endpoints
- [CHANGELOG.md](CHANGELOG.md) - Historial de cambios

## 🤝 Contribución

Este es un microservicio universal diseñado para ser independiente y reutilizable en cualquier proyecto.

## 📄 Licencia

MIT

---

**Microservicio universal para cualquier proyecto Sequelize**
