# 📡 API Endpoints - Universal Backup Microservice

Documentación completa de todos los endpoints disponibles.

## 🏥 Health & Info

### GET /health

Health check del microservicio.

**Request:**
```bash
GET http://localhost:4000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T14:30:22.000Z",
  "uptime": 3600,
  "services": {
    "database": "ready"
  }
}
```

---

## 🔍 Análisis de Base de Datos

### POST /api/backup/analyze

Analiza la estructura de una base de datos, detecta modelos, dependencias y genera orden de extracción.

**Request:**
```bash
POST http://localhost:4000/api/backup/analyze
Content-Type: application/json

{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "my_database",
    "username": "postgres",
    "password": "password"
  }
}
```

**Response:**
```json
{
  "success": true,
  "database": "my_database",
  "report": {
    "totalModels": 15,
    "totalRecords": 1000,
    "models": [
      {
        "name": "User",
        "tableName": "users",
        "recordCount": 100,
        "dependencies": ["Role"]
      }
    ]
  },
  "order": ["Role", "User", "Post", "Comment"],
  "entitiesOrder": {
    "Role": {
      "timestamp": "20250128120000",
      "tableName": "roles",
      "description": "Role"
    },
    "User": {
      "timestamp": "20250128120001",
      "tableName": "users",
      "description": "User"
    }
  }
}
```

**Características:**
- Detecta automáticamente todos los modelos
- Identifica claves foráneas y dependencias
- Genera orden correcto de extracción
- Crea timestamps únicos para cada modelo
- Cuenta registros por tabla

---

## 💾 Extracción de Backups

### POST /api/backup/extract

Extrae datos de la base de datos y genera backup en formato seeders, JSON o SQL.

**Request:**
```bash
POST http://localhost:4000/api/backup/extract
Content-Type: application/json

{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "my_database",
    "username": "postgres",
    "password": "password"
  },
  "options": {
    "chunkSize": 300,
    "format": "seeders"
  }
}
```

**Options:**
- `chunkSize` (default: 300) - Registros por archivo
- `format` (default: "seeders") - Formato: "seeders", "json", "sql"

**Response:**
```json
{
  "success": true,
  "database": "my_database",
  "backupId": "backup-20250128-143022",
  "files": 20,
  "records": 1000,
  "path": "./backups/my_database/backup-20250128-143022",
  "metadata": {
    "timestamp": "2025-01-28T14:30:22.000Z",
    "format": "seeders",
    "chunkSize": 300
  }
}
```

**Características:**
- Fragmentación automática en chunks
- Formato seguro con IDs específicos
- Metadata completa del backup
- Organización por base de datos

---

## 📋 Gestión de Backups

### GET /api/backup/list

Lista todos los backups disponibles organizados por base de datos.

**Request:**
```bash
GET http://localhost:4000/api/backup/list
```

**Response:**
```json
{
  "success": true,
  "backupsByDatabase": {
    "my_database": [
      {
        "id": "backup-20250128-143022",
        "timestamp": "2025-01-28T14:30:22.000Z",
        "records": 1000,
        "files": 20,
        "size": "2.5 MB"
      },
      {
        "id": "backup-20250128-150000",
        "timestamp": "2025-01-28T15:00:00.000Z",
        "records": 1050,
        "files": 21,
        "size": "2.6 MB"
      }
    ],
    "another_database": [
      {
        "id": "backup-20250128-160000",
        "timestamp": "2025-01-28T16:00:00.000Z",
        "records": 500,
        "files": 10,
        "size": "1.2 MB"
      }
    ]
  }
}
```

---

### DELETE /api/backup/:database/:backupId

Elimina un backup específico.

**Request:**
```bash
DELETE http://localhost:4000/api/backup/my_database/backup-20250128-143022
```

**Response:**
```json
{
  "success": true,
  "message": "Backup deleted successfully",
  "database": "my_database",
  "backupId": "backup-20250128-143022"
}
```

---

## ⏰ Backups Programados

### POST /api/advanced/schedule

Programa un backup automático con cron expression y retención.

**Request:**
```bash
POST http://localhost:4000/api/advanced/schedule
Content-Type: application/json

{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "my_database",
    "username": "postgres",
    "password": "password"
  },
  "schedule": "0 2 * * *",
  "retentionDays": 7,
  "options": {
    "chunkSize": 300,
    "format": "seeders"
  }
}
```

**Cron Expressions:**
- `"0 2 * * *"` - Diario a las 2 AM
- `"0 */6 * * *"` - Cada 6 horas
- `"0 0 * * 0"` - Semanal (domingos a medianoche)
- `"0 0 1 * *"` - Mensual (día 1 a medianoche)

**Response:**
```json
{
  "success": true,
  "message": "Backup scheduled successfully",
  "scheduleId": "schedule-1706451022000",
  "schedule": "0 2 * * *",
  "nextRun": "2025-01-29T02:00:00.000Z",
  "retentionDays": 7
}
```

**Características:**
- Cron scheduling flexible
- Retención automática de backups antiguos
- Persistencia de configuración
- Ejecución automática en startup

---

### GET /api/advanced/schedules

Lista todos los backups programados activos.

**Request:**
```bash
GET http://localhost:4000/api/advanced/schedules
```

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": "schedule-1706451022000",
      "database": "my_database",
      "schedule": "0 2 * * *",
      "retentionDays": 7,
      "nextRun": "2025-01-29T02:00:00.000Z",
      "lastRun": "2025-01-28T02:00:00.000Z",
      "status": "active"
    }
  ]
}
```

---

### DELETE /api/advanced/schedule/:id

Cancela un backup programado.

**Request:**
```bash
DELETE http://localhost:4000/api/advanced/schedule/schedule-1706451022000
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule cancelled successfully",
  "scheduleId": "schedule-1706451022000"
}
```

---

## 🔄 Comparación de Backups

### POST /api/advanced/compare

Compara dos backups y detecta diferencias en registros y archivos.

**Request:**
```bash
POST http://localhost:4000/api/advanced/compare
Content-Type: application/json

{
  "database": "my_database",
  "backupId1": "backup-20250128-143022",
  "backupId2": "backup-20250128-150000"
}
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "backup1": {
      "id": "backup-20250128-143022",
      "timestamp": "2025-01-28T14:30:22.000Z",
      "records": 1000,
      "files": 20
    },
    "backup2": {
      "id": "backup-20250128-150000",
      "timestamp": "2025-01-28T15:00:00.000Z",
      "records": 1050,
      "files": 21
    },
    "differences": {
      "recordsDiff": 50,
      "filesDiff": 1,
      "newFiles": ["20250128120015-new-table.cjs"],
      "removedFiles": [],
      "modifiedFiles": ["20250128120001-users-part-1.cjs"]
    }
  }
}
```

**Características:**
- Detecta archivos nuevos, eliminados y modificados
- Calcula diferencias en cantidad de registros
- Útil para auditoría y tracking de cambios

---

## ☁️ Upload a S3

### POST /api/advanced/upload-s3

Comprime un backup a ZIP y lo sube a AWS S3.

**Request:**
```bash
POST http://localhost:4000/api/advanced/upload-s3
Content-Type: application/json

{
  "database": "my_database",
  "backupId": "backup-20250128-143022",
  "s3Config": {
    "bucket": "my-backups",
    "region": "us-east-1",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup uploaded to S3 successfully",
  "s3": {
    "bucket": "my-backups",
    "key": "backups/my_database/backup-20250128-143022.zip",
    "url": "https://my-backups.s3.us-east-1.amazonaws.com/backups/my_database/backup-20250128-143022.zip",
    "size": "1.8 MB"
  }
}
```

**Características:**
- Compresión automática a ZIP
- Upload directo a S3
- URL pública del backup
- Reduce tamaño y tiempo de transferencia

---

## 📊 Métricas

### GET /api/advanced/metrics

Obtiene métricas completas de backups y base de datos.

**Request:**
```bash
GET http://localhost:4000/api/advanced/metrics
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "backups": {
      "total": 15,
      "byDatabase": {
        "my_database": 10,
        "another_database": 5
      },
      "totalSize": "25.5 MB",
      "oldest": "2025-01-20T10:00:00.000Z",
      "newest": "2025-01-28T16:00:00.000Z"
    },
    "schedules": {
      "active": 2,
      "total": 3
    },
    "storage": {
      "used": "25.5 MB",
      "available": "50 GB"
    }
  }
}
```

**Características:**
- Estadísticas completas de backups
- Información de almacenamiento
- Métricas por base de datos
- Schedules activos

---

## 🔐 Seguridad

### Credenciales
- No se almacenan credenciales de BD
- Conexiones temporales cerradas después de uso
- Credenciales S3 opcionales y configurables

### SSL/TLS
Para conexiones seguras, agregar en `dbConfig`:
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": false
    }
  }
}
```

---

## 📝 Códigos de Error

- `200` - Success
- `400` - Bad Request (parámetros inválidos)
- `404` - Not Found (backup no encontrado)
- `500` - Internal Server Error

**Formato de Error:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 🔗 Recursos

- [Postman Collection](../Universal%20Backup%20Microservice.postman_collection.json)
- [Características Avanzadas](ADVANCED-FEATURES.md)
- [Bases de Datos en la Nube](CLOUD-DATABASES.md)
