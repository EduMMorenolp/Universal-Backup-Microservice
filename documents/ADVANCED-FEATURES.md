# 🚀 Características Avanzadas - Universal Backup Microservice

Guía completa de las características avanzadas implementadas.

## 📑 Índice

1. [Backups Programados](#-backups-programados)
2. [Comparación de Backups](#-comparación-de-backups)
3. [Upload a S3](#️-upload-a-s3)
4. [Métricas y Estadísticas](#-métricas-y-estadísticas)
5. [Backup Incremental](#-backup-incremental)

---

## ⏰ Backups Programados

### Descripción

Sistema de scheduling automático usando cron expressions para ejecutar backups periódicos con retención automática.

### Características

- ✅ Cron expressions estándar
- ✅ Retención automática de backups antiguos
- ✅ Persistencia de configuración
- ✅ Carga automática en startup
- ✅ Múltiples schedules simultáneos

### Uso Básico

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

### Cron Expressions

| Expression | Descripción | Uso |
|------------|-------------|-----|
| `0 2 * * *` | Diario a las 2 AM | Backups diarios |
| `0 */6 * * *` | Cada 6 horas | Backups frecuentes |
| `0 0 * * 0` | Domingos a medianoche | Backups semanales |
| `0 0 1 * *` | Día 1 de cada mes | Backups mensuales |
| `*/30 * * * *` | Cada 30 minutos | Testing/desarrollo |

### Retención Automática

El sistema elimina automáticamente backups más antiguos que `retentionDays`:

```javascript
// Ejemplo: retención de 7 días
{
  "retentionDays": 7
}

// Backups más antiguos que 7 días se eliminan automáticamente
```

### Gestión de Schedules

**Listar schedules activos:**
```bash
GET http://localhost:4000/api/advanced/schedules
```

**Cancelar schedule:**
```bash
DELETE http://localhost:4000/api/advanced/schedule/:scheduleId
```

### Persistencia

Los schedules se guardan en `config/schedules.json` y se cargan automáticamente al iniciar el servidor.

### Casos de Uso

1. **Backup Diario de Producción**
   ```json
   {
     "schedule": "0 2 * * *",
     "retentionDays": 30
   }
   ```

2. **Backup Cada 6 Horas**
   ```json
   {
     "schedule": "0 */6 * * *",
     "retentionDays": 7
   }
   ```

3. **Backup Semanal**
   ```json
   {
     "schedule": "0 0 * * 0",
     "retentionDays": 90
   }
   ```

---

## 🔄 Comparación de Backups

### Descripción

Compara dos backups y detecta diferencias en archivos y registros para auditoría y tracking de cambios.

### Características

- ✅ Detecta archivos nuevos
- ✅ Detecta archivos eliminados
- ✅ Detecta archivos modificados
- ✅ Calcula diferencias en registros
- ✅ Útil para auditoría

### Uso Básico

```bash
POST http://localhost:4000/api/advanced/compare
Content-Type: application/json

{
  "database": "my_database",
  "backupId1": "backup-20250128-143022",
  "backupId2": "backup-20250128-150000"
}
```

### Respuesta Detallada

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
      "newFiles": [
        "20250128120015-new-table.cjs"
      ],
      "removedFiles": [],
      "modifiedFiles": [
        "20250128120001-users-part-1.cjs"
      ]
    }
  }
}
```

### Interpretación de Resultados

- **recordsDiff**: Diferencia en cantidad total de registros
- **filesDiff**: Diferencia en cantidad de archivos
- **newFiles**: Archivos presentes en backup2 pero no en backup1
- **removedFiles**: Archivos presentes en backup1 pero no en backup2
- **modifiedFiles**: Archivos con diferente tamaño entre backups

### Casos de Uso

1. **Auditoría de Cambios**
   - Detectar qué cambió entre dos momentos
   - Tracking de crecimiento de datos

2. **Validación de Migraciones**
   - Comparar antes/después de migración
   - Verificar integridad de datos

3. **Análisis de Crecimiento**
   - Monitorear crecimiento de tablas
   - Identificar tablas con más actividad

---

## ☁️ Upload a S3

### Descripción

Comprime backups a formato ZIP y los sube automáticamente a AWS S3 para almacenamiento en la nube.

### Características

- ✅ Compresión automática a ZIP
- ✅ Upload directo a S3
- ✅ Configuración flexible de bucket/región
- ✅ URL pública del backup
- ✅ Reduce tamaño y tiempo de transferencia

### Configuración

**Opción 1: Variables de Entorno (.env)**
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_BUCKET_NAME=my-backups
```

**Opción 2: Configuración en Request**
```json
{
  "s3Config": {
    "bucket": "my-backups",
    "region": "us-east-1",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

### Uso Básico

```bash
POST http://localhost:4000/api/advanced/upload-s3
Content-Type: application/json

{
  "database": "my_database",
  "backupId": "backup-20250128-143022",
  "s3Config": {
    "bucket": "my-backups",
    "region": "us-east-1"
  }
}
```

### Respuesta

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

### Estructura en S3

```
my-backups/
└── backups/
    ├── my_database/
    │   ├── backup-20250128-143022.zip
    │   └── backup-20250128-150000.zip
    └── another_database/
        └── backup-20250128-160000.zip
```

### Casos de Uso

1. **Disaster Recovery**
   - Backups seguros en la nube
   - Acceso desde cualquier ubicación

2. **Almacenamiento a Largo Plazo**
   - Liberar espacio local
   - Retención extendida en S3

3. **Distribución de Backups**
   - Compartir backups entre equipos
   - Descargar desde URL pública

### Seguridad

- Credenciales no se almacenan permanentemente
- Soporte para IAM roles (recomendado en producción)
- Buckets privados por defecto (configurar ACL según necesidad)

---

## 📊 Métricas y Estadísticas

### Descripción

Sistema completo de métricas para monitorear backups, almacenamiento y estado del microservicio.

### Características

- ✅ Estadísticas de backups
- ✅ Métricas por base de datos
- ✅ Información de almacenamiento
- ✅ Estado de schedules
- ✅ Análisis temporal

### Uso Básico

```bash
GET http://localhost:4000/api/advanced/metrics
```

### Respuesta Completa

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
    },
    "databases": {
      "my_database": {
        "backups": 10,
        "totalRecords": 10000,
        "totalSize": "20 MB",
        "lastBackup": "2025-01-28T16:00:00.000Z"
      }
    }
  }
}
```

### Métricas Disponibles

| Métrica | Descripción |
|---------|-------------|
| `backups.total` | Total de backups |
| `backups.byDatabase` | Backups por BD |
| `backups.totalSize` | Tamaño total |
| `backups.oldest` | Backup más antiguo |
| `backups.newest` | Backup más reciente |
| `schedules.active` | Schedules activos |
| `storage.used` | Almacenamiento usado |
| `storage.available` | Espacio disponible |

### Casos de Uso

1. **Monitoreo de Capacidad**
   - Verificar espacio disponible
   - Planificar limpieza de backups

2. **Análisis de Actividad**
   - Frecuencia de backups
   - Crecimiento de datos

3. **Dashboard/Reporting**
   - Integrar con sistemas de monitoreo
   - Generar reportes automáticos

---

## 🔄 Backup Incremental

### Descripción

Base para implementación de backups incrementales que solo extraen datos modificados desde el último backup.

### Estado Actual

⚠️ **En Desarrollo** - Fundación implementada, funcionalidad completa pendiente.

### Fundación Implementada

- ✅ Metadata de backups con timestamps
- ✅ Comparación de backups
- ✅ Detección de cambios
- ✅ Estructura para tracking de modificaciones

### Próximos Pasos

1. **Tracking de Cambios**
   - Detectar registros nuevos/modificados
   - Usar timestamps de BD

2. **Extracción Diferencial**
   - Solo extraer cambios desde último backup
   - Reducir tiempo y tamaño

3. **Restore Incremental**
   - Aplicar backups incrementales en orden
   - Reconstruir estado completo

### Uso Futuro (Planificado)

```bash
POST http://localhost:4000/api/backup/extract
Content-Type: application/json

{
  "dbConfig": {...},
  "options": {
    "incremental": true,
    "basedOn": "backup-20250128-143022"
  }
}
```

---

## 🔧 Configuración Avanzada

### Combinación de Características

**Backup Programado + S3 Upload:**
```json
{
  "schedule": "0 2 * * *",
  "retentionDays": 7,
  "uploadToS3": true,
  "s3Config": {
    "bucket": "my-backups",
    "region": "us-east-1"
  }
}
```

**Comparación Automática:**
```javascript
// Comparar último backup con anterior
const backups = await listBackups();
const latest = backups[0];
const previous = backups[1];
await compareBackups(latest.id, previous.id);
```

---

## 📈 Mejores Prácticas

1. **Backups Programados**
   - Programar en horarios de baja actividad
   - Configurar retención según necesidad
   - Monitorear ejecuciones

2. **Upload a S3**
   - Usar IAM roles en producción
   - Configurar lifecycle policies en S3
   - Habilitar versionado de bucket

3. **Comparación**
   - Comparar backups periódicamente
   - Detectar anomalías temprano
   - Documentar cambios significativos

4. **Métricas**
   - Revisar métricas regularmente
   - Configurar alertas de capacidad
   - Integrar con sistemas de monitoreo

---

## 🔗 Recursos

- [API Endpoints](API-ENDPOINTS.md)
- [Bases de Datos en la Nube](CLOUD-DATABASES.md)
- [Arquitectura](ARCHITECTURE.md)
